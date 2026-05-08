/**
 * Jira 服务 - 将 AI 生成的内容推送到 Jira
 * 支持创建 Issue、Epic、Story、Task 等
 */

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  defaultProject?: string;
  defaultType?: 'Epic' | 'Story' | 'Task' | 'Bug' | 'Subtask';
}

export interface JiraIssue {
  project: string;
  type: string;
  summary: string;
  description: string;
  priority?: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
  labels?: string[];
  assignee?: string;
  parentKey?: string; // 用于创建子任务
}

export interface JiraResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}

export class JiraService {
  private config: JiraConfig;

  constructor(config: JiraConfig) {
    this.config = config;
  }

  /**
   * 从 AI 提示词生成 Jira Issue 内容
   */
  async generateFromPrompt(prompt: string, model: string): Promise<{ success: boolean; issue?: JiraIssue; error?: string }> {
    try {
      const systemPrompt = `你是一个专业的 Jira Issue 助手。请根据用户描述生成 Jira Issue。

规则：
1. 输出标准 JSON 格式
2. 包含：project（项目KEY）、type（类型）、summary（摘要）、description（描述）、priority（优先级）
3. description 使用 Jira 格式（支持 **粗体**、*斜体*、- 列表等）
4. 如果是子任务，通过 parentKey 指定父任务
5. 只输出 JSON，不要解释

示例输出：
{
  "project": "FLOW",
  "type": "Story",
  "summary": "用户登录功能",
  "description": "**背景**\\n用户需要登录才能使用系统功能\\n\\n**验收标准**\\n- 能够使用用户名密码登录\\n- 登录失败显示错误提示\\n- 记住登录状态",
  "priority": "High",
  "labels": ["auth", "backend"]
}`;

      let apiKey: string;
      let baseUrl: string;
      let endpoint: string;
      let modelId: string;

      if (model === 'openai') {
        apiKey = process.env.OPENAI_API_KEY || '';
        baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
        endpoint = '/chat/completions';
        modelId = process.env.OPENAI_MODEL || 'gpt-4o';
      } else {
        apiKey = process.env.MINIMAX_API_KEY || '';
        baseUrl = process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1';
        endpoint = '/text/chatcompletion_v2';
        modelId = 'MiniMax-Text-01';
      }

      if (!apiKey) {
        return { success: false, error: 'API key 未配置' };
      }

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: prompt }
      ];

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ model: modelId, messages, temperature: 0.7 })
      });

      if (!response.ok) {
        return { success: false, error: `API 错误: ${response.status}` };
      }

      const data = await response.json() as { choices?: { message: { content: string } }[] };
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return { success: false, error: 'AI 返回为空' };
      }

      // 提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { success: false, error: '无法解析 AI 返回内容' };
      }

      const issue = JSON.parse(jsonMatch[0]) as JiraIssue;
      return { success: true, issue };
    } catch (error) {
      return { success: false, error: `生成失败: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * 创建 Jira Issue
   */
  async createIssue(issue: JiraIssue): Promise<JiraResult> {
    const { baseUrl, email, apiToken } = this.config;

    if (!baseUrl || !email || !apiToken) {
      return { success: false, error: 'Jira 配置不完整' };
    }

    try {
      const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
      
      const fields: Record<string, unknown> = {
        project: { key: issue.project },
        issuetype: { name: issue.type },
        summary: issue.summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: issue.description.split('\n').map(line => ({
                type: 'text',
                text: line.replace(/^\*\*|\*\*$|\*_|_$/g, '')
              }))
            }
          ]
        }
      };

      if (issue.priority) {
        fields['priority'] = { name: issue.priority };
      }

      if (issue.labels && issue.labels.length > 0) {
        fields['labels'] = issue.labels;
      }

      if (issue.parentKey) {
        fields['parent'] = { key: issue.parentKey };
      }

      const response = await fetch(`${baseUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Jira API 错误: ${response.status} - ${error}` };
      }

      const result = await response.json() as { key: string; self: string };
      return {
        success: true,
        key: result.key,
        url: `${baseUrl}/browse/${result.key}`
      };
    } catch (error) {
      return { success: false, error: `创建失败: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * 一键生成并推送 Jira
   */
  async generateAndPushToJira(prompt: string, model: string): Promise<JiraResult> {
    // 1. 用 AI 生成 Issue 内容
    const generated = await this.generateFromPrompt(prompt, model);
    if (!generated.success || !generated.issue) {
      return { success: false, error: generated.error };
    }

    const issue = generated.issue;

    // 2. 如果没指定项目，使用默认项目
    if (!issue.project && this.config.defaultProject) {
      issue.project = this.config.defaultProject;
    }

    // 3. 如果没指定类型，使用默认类型
    if (!issue.type && this.config.defaultType) {
      issue.type = this.config.defaultType;
    }

    // 4. 创建 Jira Issue
    return await this.createIssue(issue);
  }
}

export default JiraService;
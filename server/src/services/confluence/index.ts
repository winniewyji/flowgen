/**
 * Confluence 服务 - 将 AI 生成的内容推送到 Confluence
 * 支持创建页面、博客文章等
 */

export interface ConfluenceConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  defaultSpace?: string;
  defaultParentPageId?: string;
}

export interface ConfluencePage {
  space: string;
  title: string;
  content: string; // HTML 格式
  parentPageId?: string;
  labels?: string[];
}

export interface ConfluenceResult {
  success: boolean;
  pageId?: string;
  url?: string;
  error?: string;
}

export class ConfluenceService {
  private config: ConfluenceConfig;

  constructor(config: ConfluenceConfig) {
    this.config = config;
  }

  /**
   * 从 AI 提示词生成 Confluence 页面内容
   */
  async generateFromPrompt(prompt: string, model: string): Promise<{ success: boolean; page?: ConfluencePage; error?: string }> {
    try {
      const systemPrompt = `你是一个专业的 Confluence 文档助手。请根据用户描述生成 Confluence 页面内容。

规则：
1. 输出标准 JSON 格式
2. 包含：space（空间KEY）、title（标题）、content（HTML 内容）
3. content 使用 Confluence Wiki 格式（可以用简单的 HTML 标签）
4. 支持的格式：h1-h3、p、ul/ol/li、table、code、blockquote
5. 内容要结构清晰，适合团队协作
6. 只输出 JSON，不要解释

示例输出：
{
  "space": "DEV",
  "title": "用户登录功能设计文档",
  "content": "<h1>概述</h1><p>本文档描述用户登录功能的实现细节。</p><h2>需求</h2><ul><li>支持用户名密码登录</li><li>支持记住登录状态</li></ul><h2>技术方案</h2><p>使用 JWT 进行身份验证。</p>",
  "labels": ["backend", "auth"]
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

      const page = JSON.parse(jsonMatch[0]) as ConfluencePage;
      return { success: true, page };
    } catch (error) {
      return { success: false, error: `生成失败: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * 创建 Confluence 页面
   */
  async createPage(page: ConfluencePage): Promise<ConfluenceResult> {
    const { baseUrl, email, apiToken } = this.config;

    if (!baseUrl || !email || !apiToken) {
      return { success: false, error: 'Confluence 配置不完整' };
    }

    try {
      const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

      const body = {
        type: 'page',
        title: page.title,
        space: { key: page.space },
        body: {
          wiki: {
            value: page.content,
            representation: 'wiki'
          }
        },
        version: { number: 1 }
      };

      if (page.parentPageId) {
        (body as Record<string, unknown>).ancestors = [{ id: page.parentPageId }];
      }

      const response = await fetch(`${baseUrl}/rest/api/content`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Confluence API 错误: ${response.status} - ${error}` };
      }

      const result = await response.json() as { id: string; _links: { tinyui: string } };
      const pageUrl = baseUrl.replace('/wiki', '') + result._links.tinyui;

      return {
        success: true,
        pageId: result.id,
        url: pageUrl
      };
    } catch (error) {
      return { success: false, error: `创建失败: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * 一键生成并推送 Confluence
   */
  async generateAndPushToConfluence(prompt: string, model: string): Promise<ConfluenceResult> {
    // 1. 用 AI 生成页面内容
    const generated = await this.generateFromPrompt(prompt, model);
    if (!generated.success || !generated.page) {
      return { success: false, error: generated.error };
    }

    const page = generated.page;

    // 2. 如果没指定空间，使用默认空间
    if (!page.space && this.config.defaultSpace) {
      page.space = this.config.defaultSpace;
    }

    // 3. 如果没指定父页面，使用默认父页面
    if (!page.parentPageId && this.config.defaultParentPageId) {
      page.parentPageId = this.config.defaultParentPageId;
    }

    // 4. 创建 Confluence 页面
    return await this.createPage(page);
  }
}

export default ConfluenceService;
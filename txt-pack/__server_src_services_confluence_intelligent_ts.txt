/**
 * Confluence 智能服务 - 从 Confluence 获取内容并智能分析
 * 支持指定 Space、页面链接、内容提取
 */
import type { GenerateResult } from '../ai/types.js';

export interface ConfluenceConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export interface ConfluenceContent {
  pageId?: string;
  spaceKey?: string;
  title: string;
  content: string;
  url?: string;
}

export interface ConfluenceFetchResult {
  success: boolean;
  content?: ConfluenceContent;
  error?: string;
}

interface ConfluencePageResponse {
  id: string;
  title: string;
  body?: {
    storage?: {
      value: string;
    };
    wiki?: {
      value: string;
    };
  };
  _links?: {
    tinyui?: string;
  };
  space?: {
    key: string;
  };
}

interface ConfluenceSearchResponse {
  results?: Array<{
    id: string;
    title: string;
    excerpt: string;
    url: string;
    space?: {
      key: string;
    };
  }>;
  size?: number;
}

/**
 * 创建 Confluence API 认证头
 */
function createAuth(email: string, apiToken: string): string {
  return Buffer.from(`${email}:${apiToken}`).toString('base64');
}

/**
 * 获取页面内容
 */
export async function fetchPageById(
  pageId: string,
  config: ConfluenceConfig
): Promise<ConfluenceFetchResult> {
  try {
    const auth = createAuth(config.email, config.apiToken);
    
    const response = await fetch(`${config.baseUrl}/rest/api/content/${pageId}?expand=body.storage`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Confluence API 错误: ${response.status} - ${error}` };
    }

    const data = await response.json() as ConfluencePageResponse;
    
    // 清理 HTML 内容，提取纯文本
    let content = data.body?.storage?.value 
      || data.body?.wiki?.value 
      || '';
    
    // 简单清理 HTML 标签
    content = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      success: true,
      content: {
        pageId: data.id,
        title: data.title,
        content: content,
        spaceKey: data.space?.key,
        url: data._links?.tinyui ? `${config.baseUrl.replace('/wiki', '')}${data._links.tinyui}` : undefined
      }
    };
  } catch (error) {
    return { success: false, error: `获取页面失败: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * 获取 Space 下所有页面（简化实现）
 */
export async function fetchPagesBySpace(
  spaceKey: string,
  config: ConfluenceConfig,
  limit: number = 20
): Promise<{ success: boolean; pages?: ConfluenceContent[]; error?: string }> {
  try {
    const auth = createAuth(config.email, config.apiToken);
    
    const response = await fetch(
      `${config.baseUrl}/rest/api/content?spaceKey=${spaceKey}&limit=${limit}&expand=body.storage`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Confluence API 错误: ${response.status} - ${error}` };
    }

    const data = await response.json() as { results?: ConfluencePageResponse[] };
    
    const pages: ConfluenceContent[] = (data.results || []).map(page => {
      let content = page.body?.storage?.value || page.body?.wiki?.value || '';
      content = content
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        pageId: page.id,
        title: page.title,
        content: content,
        spaceKey: page.space?.key
      };
    });

    return { success: true, pages };
  } catch (error) {
    return { success: false, error: `获取页面失败: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * 搜索 Confluence 内容
 */
export async function searchConfluence(
  query: string,
  spaceKey?: string,
  config: ConfluenceConfig
): Promise<{ success: boolean; results?: ConfluenceContent[]; error?: string }> {
  try {
    const auth = createAuth(config.email, config.apiToken);
    
    let url = `${config.baseUrl}/rest/api/content/search?cql=text~"${encodeURIComponent(query)}"`;
    if (spaceKey) {
      url += ` AND space="${spaceKey}"`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Confluence 搜索错误: ${response.status}` };
    }

    const data = await response.json() as ConfluenceSearchResponse;
    
    const results: ConfluenceContent[] = (data.results || []).map(item => ({
      pageId: item.id,
      title: item.title,
      content: item.excerpt || '',
      spaceKey: item.space?.key,
      url: item.url
    }));

    return { success: true, results };
  } catch (error) {
    return { success: false, error: `搜索失败: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * 解析 Confluence URL
 * 支持格式：
 * - https://xxx.atlassian.net/wiki/spaces/XXX/pages/123456
 * - https://xxx.atlassian.net/wiki/spaces/XXX/overview
 * - 直接页面 ID
 */
export function parseConfluenceUrl(url: string): { type: 'page' | 'space'; key?: string; pageId?: string } | null {
  try {
    // 匹配页面 URL
    const pageMatch = url.match(/spaces\/([^/]+)\/pages\/(\d+)/);
    if (pageMatch) {
      return { type: 'page', key: pageMatch[1], pageId: pageMatch[2] };
    }

    // 匹配 Space URL
    const spaceMatch = url.match(/spaces\/([^/]+)/);
    if (spaceMatch) {
      return { type: 'space', key: spaceMatch[1] };
    }

    // 直接是数字ID
    if (/^\d+$/.test(url)) {
      return { type: 'page', pageId: url };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 智能分析 Confluence 内容
 */
export async function analyzeConfluenceContent(
  content: ConfluenceContent,
  prompt: string,
  outputFormat: string,
  model: string
): Promise<GenerateResult> {
  try {
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

    const formatInstructions: Record<string, string> = {
      'flowchart': '请根据以下内容生成一个 Mermaid 流程图。只输出代码，不要解释。',
      'summary': '请简洁地总结以下内容的主要信息。',
      'table': '请将以下内容整理成 Markdown 表格格式。',
      'outline': '请为以下内容生成一个详细的大纲结构。',
      'mindmap': '请根据以下内容生成一个思维导图（Mermaid 格式）。'
    };

    const systemPrompt = `你是一个专业的文档分析助手。请根据以下内容，按照用户要求进行处理。`;
    const instruction = formatInstructions[outputFormat] || formatInstructions['summary'];

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `文档标题：${content.title}\n\n内容：\n${content.content.substring(0, 30000)}\n\n要求：${prompt}\n\n${instruction}` }
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
      return { success: false, error: `${model} API 错误: ${response.status}` };
    }

    const data = await response.json() as { choices?: { message: { content: string } }[] };
    const resultContent = data.choices?.[0]?.message?.content;

    if (!resultContent) {
      return { success: false, error: 'AI 返回为空' };
    }

    return { success: true, code: resultContent, text: resultContent };
  } catch (error) {
    return { success: false, error: `分析失败: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export default {
  fetchPageById,
  fetchPagesBySpace,
  searchConfluence,
  parseConfluenceUrl,
  analyzeConfluenceContent
};
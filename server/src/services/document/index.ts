/**
 * 文档生成服务 - 支持生成 PPT、Excel、Word 等
 * 基于 AI 提示词生成结构化文档内容
 */
import type { GenerateResult } from './ai/types.js';

export type DocumentType = 'pptx' | 'xlsx' | 'docx' | 'markdown';

interface DocumentOptions {
  prompt: string;
  type: DocumentType;
  model: string;
}

/**
 * 根据提示词生成 PPT 幻灯片结构
 */
export async function generatePPT(prompt: string, model: string): Promise<GenerateResult> {
  const systemPrompt = `你是一个专业的 PPT 制作助手。请根据用户描述生成 PPT 大纲和内容结构。

规则：
1. 输出 JSON 格式的幻灯片结构
2. 每个幻灯片包含：标题、要点、备注
3. 幻灯片数量建议 5-15 页
4. 只输出 JSON，不要解释

示例输出格式：
{
  "title": "演示文稿标题",
  "slides": [
    { "title": "封面", "content": ["要点1", "要点2"], "notes": "备注信息" },
    { "title": "目录", "content": ["章节1", "章节2"], "notes": "" }
  ]
}`;

  return generateDocumentContent(prompt, systemPrompt, model);
}

/**
 * 根据提示词生成 Excel 结构
 */
export async function generateExcel(prompt: string, model: string): Promise<GenerateResult> {
  const systemPrompt = `你是一个专业的 Excel 数据分析师。请根据用户描述生成数据结构。

规则：
1. 输出 JSON 格式的表格结构
2. 包含：表名、列定义、示例数据（3-5行）
3. 列定义包含：列名、类型、说明
4. 只输出 JSON，不要解释

示例输出格式：
{
  "sheetName": "工作表名称",
  "columns": [
    { "name": "列1", "type": "string", "description": "说明" },
    { "name": "列2", "type": "number", "description": "说明" }
  ],
  "data": [
    { "列1": "值1", "列2": 100 },
    { "列1": "值2", "列2": 200 }
  ]
}`;

  return generateDocumentContent(prompt, systemPrompt, model);
}

/**
 * 根据提示词生成 Word/Markdown 文档
 */
export async function generateDocument(prompt: string, model: string): Promise<GenerateResult> {
  const systemPrompt = `你是一个专业的文档撰写助手。请根据用户描述生成结构化文档。

规则：
1. 支持生成 Markdown 格式的完整文档
2. 包含：标题、章节、内容要点
3. 文档结构清晰，层次分明
4. 可以包含表格、列表等元素
5. 直接输出文档内容，不要解释

文档结构：
# 主标题

## 第一章

内容...

### 第一节

详细内容和要点...`;

  return generateDocumentContent(prompt, systemPrompt, model);
}

/**
 * 通用的 AI 文档内容生成
 */
async function generateDocumentContent(
  userPrompt: string,
  systemPrompt: string,
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
      return { success: false, error: `${model} API key 未配置` };
    }

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt }
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
      const error = await response.text();
      return { success: false, error: `${model} API 错误: ${response.status}` };
    }

    const data = await response.json() as { choices?: { message: { content: string } }[] };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: 'AI 返回为空' };
    }

    return { success: true, code: content };
  } catch (error) {
    return { success: false, error: `生成失败: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * 导出为 PPTX 文件（生成 XML 结构）
 */
export function generatePPTX(data: {
  title: string;
  slides: { title: string; content: string[]; notes?: string }[];
}): { success: boolean; file?: string; error?: string } {
  try {
    // 这里生成简化版 PPTX 结构（ZIP 格式）
    // 实际使用时需要使用 proper-pptx 或类似的库
    const content = JSON.stringify(data, null, 2);
    return { success: true, file: content };
  } catch (error) {
    return { success: false, error: `PPTX 生成失败: ${error}` };
  }
}

/**
 * 导出为 XLSX 文件（生成 CSV 结构）
 */
export function generateXLSX(data: {
  sheetName: string;
  columns: { name: string; type: string; description?: string }[];
  data: Record<string, unknown>[];
}): { success: boolean; file?: string; error?: string } {
  try {
    const headers = data.columns.map(c => c.name).join(',');
    const rows = data.data.map(row => 
      data.columns.map(c => {
        const val = row[c.name];
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return String(val ?? '');
      }).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    return { success: true, file: csv };
  } catch (error) {
    return { success: false, error: `XLSX 生成失败: ${error}` };
  }
}

export * from './ai/types.js';
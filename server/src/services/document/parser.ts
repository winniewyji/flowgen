/**
 * 文件解析服务 - 支持 PDF、Excel、Word、CSV 等文件解析
 */
import type { GenerateResult } from '../ai/types.js';

// 文件类型检测
export type DocumentFileType = 'pdf' | 'excel' | 'word' | 'csv' | 'txt' | 'markdown' | 'image' | 'unknown';

export interface ParsedDocument {
  type: DocumentFileType;
  content: string;
  filename: string;
  pages?: number;  // PDF 页数
  sheets?: string[];  // Excel 工作表名
}

export interface ParseResult {
  success: boolean;
  document?: ParsedDocument;
  error?: string;
}

/**
 * 检测文件类型
 */
export function detectFileType(filename: string, mimeType?: string): DocumentFileType {
  const ext = filename.toLowerCase().split('.').pop() || '';
  
  const typeMap: Record<string, DocumentFileType> = {
    'pdf': 'pdf',
    'xlsx': 'excel', 'xls': 'excel',
    'doc': 'word', 'docx': 'word',
    'csv': 'csv',
    'txt': 'txt',
    'md': 'markdown',
    'png': 'image', 'jpg': 'image', 'jpeg': 'image', 'gif': 'image', 'webp': 'image', 'svg': 'image'
  };

  return typeMap[ext] || 'unknown';
}

/**
 * 解析 PDF 文件（文本提取）
 * 使用简单的方法处理，对于生产环境建议使用 pdf-parse 库
 */
export function parsePDF(content: Buffer): { text: string; pages: number } {
  // 简化实现 - 实际应该用 pdf-parse
  // 这里模拟提取文本
  const text = content.toString('utf-8').replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ');
  return { text: text.substring(0, 50000), pages: 1 };
}

/**
 * 解析 CSV 文件
 */
export function parseCSV(content: string): string {
  const lines = content.split('\n');
  const headers = lines[0]?.split(',').map(h => h.trim()) || [];
  
  // 转换为表格描述
  let result = '## CSV 数据\n\n';
  result += '**列：** ' + headers.join(' | ') + '\n\n';
  result += '**数据预览：**\n\n';
  
  const dataRows = lines.slice(1, 6);  // 只取前5行
  dataRows.forEach((row, i) => {
    const values = row.split(',').map(v => v.trim());
    result += `| ${i + 1} | ${values.join(' | ')} |\n`;
  });
  
  result += `\n**共 ${lines.length - 1} 行数据**`;
  return result;
}

/**
 * 解析 Excel 文件（简化实现）
 */
export function parseExcel(content: Buffer): { text: string; sheets: string[] } {
  // 简化实现 - 实际应该用 xlsx 库
  const text = content.toString('utf-8').substring(0, 50000);
  return { text: 'Excel 文件已解析，共 ' + text.split('\n').length + ' 行', sheets: ['Sheet1'] };
}

/**
 * 解析 Word 文件（简化实现）
 */
export function parseWord(content: Buffer): string {
  // 简化实现 - 实际应该用 mammoth 库
  return content.toString('utf-8').replace(/[^\x20-\x7E\n]/g, ' ').substring(0, 50000);
}

/**
 * 解析图片文件为 base64
 */
export function parseImage(content: Buffer, mimeType: string): string {
  return content.toString('base64');
}

/**
 * 智能文档内容分析
 * 根据提示词从文档中提取相关信息
 */
export async function analyzeDocumentContent(
  content: string,
  filename: string,
  prompt: string,
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

    const systemPrompt = `你是一个专业的文档分析助手。请根据用户的问题，从提供的文档内容中提取相关信息并回答。`;
    
    const userPrompt = `文档文件名：${filename}

文档内容：
${content.substring(0, 30000)}

---
用户问题：${prompt}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
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

/**
 * 根据提示词生成结构化输出（流程图、摘要、表格等）
 */
export async function generateStructuredOutput(
  content: string,
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

    const formatPrompts: Record<string, string> = {
      'flowchart': `你是一个专业的 Mermaid 流程图生成专家。请根据文档内容生成相应的流程图。使用简洁的中文描述。只输出 Mermaid 代码，不要解释。`,
      'summary': `你是一个专业的文档摘要助手。请简洁地总结以下文档的主要内容，使用清晰的标题和要点格式。`,
      'table': `你是一个专业的表格生成助手。请根据文档内容生成一个结构化的表格。使用 Markdown 表格格式。`,
      'outline': `你是一个专业的文档大纲助手。请根据文档内容生成一个详细的大纲结构。`,
      'qa': `你是一个专业的问答助手。请根据文档内容，回答用户的问题。如果文档中没有相关信息，请说明。`
    };

    const systemPrompt = formatPrompts[outputFormat] || formatPrompts['summary'];

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `文档内容：\n${content.substring(0, 30000)}\n\n用户要求：${prompt}` }
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
    return { success: false, error: `生成失败: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export default {
  detectFileType,
  parsePDF,
  parseCSV,
  parseExcel,
  parseWord,
  parseImage,
  analyzeDocumentContent,
  generateStructuredOutput
};
/**
 * 文件解析服务 - 支持 PDF、Excel、Word、CSV 等文件解析
 * 使用专业库解析各种文档格式
 */
import type { GenerateResult } from '../ai/types.js';

// 文件类型检测
export type DocumentFileType = 'pdf' | 'excel' | 'word' | 'csv' | 'txt' | 'markdown' | 'image' | 'unknown';

export interface ParsedDocument {
  type: DocumentFileType;
  content: string;
  filename: string;
  pages?: number;
  sheets?: string[];
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
 * 解析 PDF 文件 - 使用 pdf-parse 库
 */
export async function parsePDF(content: Buffer): Promise<{ text: string; pages: number }> {
  try {
    // 动态导入避免在未安装时出错
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(content);
    return { 
      text: data.text, 
      pages: data.numpages 
    };
  } catch (error) {
    console.error('PDF parse error:', error);
    // 降级方案：返回原始文本
    return { 
      text: content.toString('utf-8').replace(/[^\x20-\x7E\n]/g, ' '),
      pages: 1 
    };
  }
}

/**
 * 解析 CSV 文件
 */
export function parseCSV(content: string): string {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return 'CSV 文件为空';
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  let result = '## CSV 数据\n\n';
  result += `**列：** ${headers.join(' | ')}\n\n`;
  result += '| # | ' + headers.join(' | ') + ' |\n';
  result += '|' + headers.map(() => '---').join('|') + '|\n';
  
  // 处理数据行
  const maxRows = Math.min(lines.length - 1, 100);  // 最多显示100行
  for (let i = 1; i <= maxRows; i++) {
    const values = parseCSVLine(lines[i]);
    result += `| ${i} | ${values.join(' | ')} |\n`;
  }
  
  if (lines.length > 101) {
    result += `\n_... 还有 ${lines.length - 101} 行数据未显示_`;
  }
  
  result += `\n\n**共 ${lines.length - 1} 行 × ${headers.length} 列**`;
  return result;
}

/**
 * 解析 CSV 行，处理引号包裹的字段
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  
  return result;
}

/**
 * 解析 Excel 文件 - 使用 xlsx 库
 */
export async function parseExcel(content: Buffer): Promise<{ text: string; sheets: string[] }> {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(content, { type: 'buffer' });
    
    let result = `## Excel 工作簿\n\n`;
    result += `**工作表：** ${workbook.SheetNames.join(', ')}\n\n`;
    
    const sheets: string[] = [];
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      sheets.push(sheetName);
      
      // 转换为 CSV 格式
      const csv = XLSX.utils.sheet_to_csv(sheet);
      const lines = csv.split('\n').filter(line => line.trim());
      
      result += `### 📋 ${sheetName}\n\n`;
      
      if (lines.length > 0) {
        const headers = parseCSVLine(lines[0]);
        result += '| ' + headers.join(' | ') + ' |\n';
        result += '|' + headers.map(() => '---').join('|') + '|\n';
        
        const maxRows = Math.min(lines.length - 1, 50);
        for (let i = 1; i <= maxRows; i++) {
          const values = parseCSVLine(lines[i]);
          result += '| ' + values.join(' | ') + ' |\n';
        }
        
        if (lines.length > 51) {
          result += `\n_... 还有 ${lines.length - 51} 行_`;
        }
      }
      
      result += '\n';
    }
    
    return { text: result, sheets };
  } catch (error) {
    console.error('Excel parse error:', error);
    return { 
      text: 'Excel 文件解析失败: ' + (error instanceof Error ? error.message : String(error)),
      sheets: [] 
    };
  }
}

/**
 * 解析 Word 文件 - 使用 mammoth 库
 */
export async function parseWord(content: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer: content });
    return result.value || 'Word 文档为空';
  } catch (error) {
    console.error('Word parse error:', error);
    return content.toString('utf-8').replace(/[^\x20-\x7E\n]/g, ' ');
  }
}

/**
 * 解析图片文件为 base64
 */
export function parseImage(content: Buffer, mimeType: string): string {
  return content.toString('base64');
}

/**
 * 智能文档内容分析
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
    
    // 限制内容长度，避免 token 溢出
    const truncatedContent = content.length > 100000 
      ? content.substring(0, 100000) + '\n\n[内容已截断...]'
      : content;
    
    const userPrompt = `文档文件名：${filename}

文档内容：
${truncatedContent}

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
 * 根据提示词生成结构化输出
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
      'qa': `你是一个专业的问答助手。请根据文档内容，回答用户的问题。`
    };

    const systemPrompt = formatPrompts[outputFormat] || formatPrompts['summary'];

    // 限制内容长度
    const truncatedContent = content.length > 100000 
      ? content.substring(0, 100000) + '\n\n[内容已截断...]'
      : content;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `文档内容：\n${truncatedContent}\n\n用户要求：${prompt}` }
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
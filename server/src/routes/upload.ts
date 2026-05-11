/**
 * 上传路由 - 处理多类型文件上传和 Confluence 内容获取
 * 支持高并发场景，优化文件并行处理
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { analyzeImage, extractDiagramFromImage } from '../services/vision/index.js';
import { 
  detectFileType, 
  parseCSV, 
  parsePDF, 
  parseExcel, 
  parseWord, 
  analyzeDocumentContent, 
  generateStructuredOutput 
} from '../services/document/parser.js';
import { 
  fetchPageById, 
  fetchPagesBySpace, 
  searchConfluence, 
  parseConfluenceUrl,
  analyzeConfluenceContent 
} from '../services/confluence/intelligent.js';

const router = Router();

// 上传配置 - 可通过环境变量调整
const UPLOAD_CONFIG = {
  maxFiles: parseInt(process.env.MAX_UPLOAD_FILES || '20', 10),        // 最大文件数
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '50', 10) * 1024 * 1024,  // 单文件最大 50MB
  maxTotalSize: parseInt(process.env.MAX_TOTAL_SIZE || '200', 10) * 1024 * 1024,  // 总大小最大 200MB
  supportedTypes: ['pdf', 'excel', 'word', 'csv', 'txt', 'markdown', 'image'],
  maxConcurrentAI: parseInt(process.env.MAX_CONCURRENT_AI || '5', 10),  // 最大并发 AI 请求
  aiTimeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '60000', 10),     // AI 请求超时 60s
};

// 获取 Confluence 配置
function getConfluenceConfig() {
  return {
    baseUrl: process.env.CONFLUENCE_BASE_URL || '',
    email: process.env.CONFLUENCE_EMAIL || '',
    apiToken: process.env.CONFLUENCE_API_TOKEN || ''
  };
}

// ============ 文件上传 API ============

// 解析 base64 图片数据
function parseBase64Image(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

// 信号量，控制并发 AI 请求数量
let activeAIRequests = 0;
const aiSemaphore = async <T>(fn: () => Promise<T>): Promise<T> => {
  while (activeAIRequests >= UPLOAD_CONFIG.maxConcurrentAI) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  activeAIRequests++;
  try {
    return await fn();
  } finally {
    activeAIRequests--;
  }
};

// 带超时的 fetch
const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number): Promise<globalThis.Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * 多文件上传接口
 * 支持：PDF, Excel, Word, CSV, TXT, 图片 等
 * 并行处理文件，支持高并发
 */
router.post('/upload/files', async (req: Request, res: Response) => {
  // 设置响应超时，防止连接过早关闭
  req.setTimeout(UPLOAD_CONFIG.aiTimeoutMs * 2);
  
  try {
    const { files, prompt, outputFormat, model } = req.body as {
      files?: Array<{ name: string; data: string; mimeType?: string }>;
      prompt?: string;
      outputFormat?: 'flowchart' | 'summary' | 'table' | 'outline' | 'text';
      model?: string;
    };

    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: '缺少文件数据' });
      return;
    }

    // 验证文件数量
    if (files.length > UPLOAD_CONFIG.maxFiles) {
      res.status(400).json({ 
        success: false, 
        error: `文件数量超过限制，最多 ${UPLOAD_CONFIG.maxFiles} 个文件` 
      });
      return;
    }

    // 计算总大小并验证
    let totalSize = 0;
    for (const file of files) {
      // 估算 base64 大小（大约是原文件的 4/3）
      const base64Size = file.data ? file.data.length : 0;
      const estimatedSize = (base64Size * 3) / 4;
      totalSize += estimatedSize;
      
      if (estimatedSize > UPLOAD_CONFIG.maxFileSize) {
        res.status(400).json({ 
          success: false, 
          error: `文件 ${file.name} 超过大小限制 (最大 ${Math.round(UPLOAD_CONFIG.maxFileSize / 1024 / 1024)}MB)` 
        });
        return;
      }
    }

    if (totalSize > UPLOAD_CONFIG.maxTotalSize) {
      res.status(400).json({ 
        success: false, 
        error: `总文件大小超过限制 (最大 ${Math.round(UPLOAD_CONFIG.maxTotalSize / 1024 / 1024)}MB)` 
      });
      return;
    }

    console.log(`📤 开始处理 ${files.length} 个文件，总大小约 ${Math.round(totalSize / 1024 / 1024)}MB`);

    const finalModel = model || 'minimax';
    const finalOutputFormat = outputFormat || 'text';
    const analysisPrompt = prompt || '请分析这个文档的内容，提取关键信息。';

    // 并行处理所有文件（使用 Promise.allSettled 确保部分失败不影响其他）
    const fileResults = await Promise.all(
      files.map(file => 
        aiSemaphore(async () => {
          try {
            return await processSingleFile(file, finalModel, finalOutputFormat, analysisPrompt);
          } catch (err) {
            return {
              filename: file.name,
              success: false,
              type: 'unknown',
              error: err instanceof Error ? err.message : '处理失败'
            };
          }
        })
      )
    );

    // 如果指定了输出格式，对所有内容进行汇总生成
    if (finalOutputFormat !== 'text' && fileResults.length > 0) {
      const combinedContent = fileResults
        .filter(r => r.success && r.content)
        .map(r => `【${r.filename}】\n${r.content}`)
        .join('\n\n---\n\n');

      const structuredResult = await aiSemaphore(() => 
        generateStructuredOutput(combinedContent, analysisPrompt, finalOutputFormat, finalModel)
      );

      res.json({
        success: true,
        results: fileResults,
        structuredOutput: structuredResult.success ? structuredResult.code : null
      });
    } else {
      res.json({
        success: true,
        results: fileResults
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
});

// 单文件处理辅助函数
async function processSingleFile(
  file: { name: string; data: string; mimeType?: string },
  model: string,
  outputFormat: string,
  prompt: string
): Promise<{ filename: string; success: boolean; type: string; content?: string; error?: string }> {
  const fileType = detectFileType(file.name, file.mimeType);
  
  // 处理 base64 数据
  let content = file.data;
  if (content.startsWith('data:')) {
    const parsed = parseBase64Image(content);
    if (parsed) {
      content = Buffer.from(parsed.base64, 'base64').toString('utf-8');
    }
  } else {
    try {
      content = Buffer.from(content, 'base64').toString('utf-8');
    } catch {
      // 保持原样
    }
  }

  let parsedContent = '';
  
  switch (fileType) {
    case 'csv':
      parsedContent = parseCSV(content);
      break;
    case 'image':
      if (outputFormat === 'flowchart') {
        const diagramResult = await extractDiagramFromImage(file.data, 'openai');
        return {
          filename: file.name,
          success: diagramResult.success,
          type: 'diagram',
          content: diagramResult.diagramCode || (diagramResult as any).text,
          error: diagramResult.error
        };
      } else {
        const imageResult = await analyzeImage(file.data, prompt, 'openai');
        return {
          filename: file.name,
          success: imageResult.success,
          type: 'image_analysis',
          content: (imageResult as any).text,
          error: imageResult.error
        };
      }
    case 'pdf':
      try {
        const pdfResult = await parsePDF(Buffer.from(content));
        parsedContent = pdfResult.text;
      } catch {
        parsedContent = content.substring(0, 50000);
      }
      break;
    case 'excel':
      try {
        const excelResult = await parseExcel(Buffer.from(content));
        parsedContent = excelResult.text;
      } catch {
        parsedContent = content.substring(0, 50000);
      }
      break;
    case 'word':
      try {
        parsedContent = await parseWord(Buffer.from(content));
      } catch {
        parsedContent = content.substring(0, 50000);
      }
      break;
    case 'txt':
    case 'markdown':
      parsedContent = content.substring(0, 100000);
    default:
      parsedContent = content.substring(0, 10000);
  }

  // 使用 AI 分析文档内容（带超时控制）
  const analysisResult = await aiSemaphore(() => 
    Promise.race([
      analyzeDocumentContent(parsedContent, file.name, prompt, model),
      new Promise<ReturnType<typeof analyzeDocumentContent>>((_, reject) => 
        setTimeout(() => reject(new Error('AI 请求超时')), UPLOAD_CONFIG.aiTimeoutMs)
      )
    ])
  );

  return {
    filename: file.name,
    success: analysisResult.success,
    type: fileType,
    content: (analysisResult as any).text || analysisResult.code,
    error: analysisResult.error
  };
}

// 上传并分析图片
router.post('/upload/image', async (req: Request, res: Response) => {
  try {
    const { image, prompt, action, model } = req.body as {
      image?: string;
      prompt?: string;
      action?: 'analyze' | 'extract-diagram';
      model?: string;
    };

    if (!image) {
      res.status(400).json({ success: false, error: '缺少图片数据' });
      return;
    }

    const finalModel: string = model || 'openai';
    const finalAction: string = action || 'analyze';

    // 解析 base64
    let imageBase64 = image;
    if (image.startsWith('data:')) {
      const parsed = parseBase64Image(image);
      if (!parsed) {
        res.status(400).json({ success: false, error: '无效的图片格式' });
        return;
      }
      imageBase64 = parsed.base64;
    }

    let result;
    if (finalAction === 'extract-diagram') {
      result = await extractDiagramFromImage(imageBase64, finalModel);
    } else {
      result = await analyzeImage(imageBase64, prompt || '', finalModel);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
});

// 分析文档内容
router.post('/upload/document', async (req: Request, res: Response) => {
  try {
    const { content, filename, prompt, model } = req.body as {
      content?: string;
      filename?: string;
      prompt?: string;
      model?: string;
    };

    if (!content) {
      res.status(400).json({ success: false, error: '缺少文档内容' });
      return;
    }

    const result = await analyzeDocumentContent(
      content,
      filename || '文档',
      prompt || '请分析这个文档的内容',
      model || 'minimax'
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
});

// 多模态对话（图片 + 文本）
router.post('/upload/multimodal', async (req: Request, res: Response) => {
  try {
    const { messages, model } = req.body as {
      messages?: Array<{ role: string; content: string; image?: string }>;
      model?: string;
    };

    if (!messages || messages.length === 0) {
      res.status(400).json({ success: false, error: '缺少消息内容' });
      return;
    }

    const finalModel: string = model || 'openai';
    
    if (finalModel !== 'openai') {
      res.status(400).json({ success: false, error: '多模态对话需要使用 OpenAI GPT-4o 模型' });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      res.status(400).json({ success: false, error: 'OpenAI API key 未配置' });
      return;
    }

    // 构建 OpenAI 格式的消息
    const openAIMessages = messages.map(msg => {
      if (msg.image) {
        let imageBase64 = msg.image;
        if (msg.image.startsWith('data:')) {
          const parsed = parseBase64Image(msg.image);
          if (parsed) imageBase64 = parsed.base64;
        }
        
        return {
          role: msg.role,
          content: [
            { type: 'text' as const, text: msg.content },
            { 
              type: 'image_url' as const, 
              image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'high' }
            }
          ]
        };
      }
      return { role: msg.role, content: msg.content };
    });

    const response = await fetch(`${process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: openAIMessages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      res.status(response.status).json({ success: false, error: errorData });
      return;
    }

    const data = await response.json() as { choices?: { message: { content: string } }[] };
    const content = data.choices?.[0]?.message?.content;

    res.json({
      success: true,
      text: content,
      description: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
});

// ============ Confluence 智能获取 API ============

/**
 * 从 Confluence URL 获取内容并分析
 * POST /api/confluence/fetch
 * Body: { url: string, prompt: string, outputFormat: string, model: string }
 */
router.post('/confluence/fetch', async (req: Request, res: Response) => {
  try {
    const { url, prompt, outputFormat, model } = req.body as {
      url?: string;
      prompt?: string;
      outputFormat?: 'flowchart' | 'summary' | 'table' | 'outline' | 'text' | 'mindmap';
      model?: string;
    };

    if (!url) {
      res.status(400).json({ success: false, error: '缺少 Confluence URL' });
      return;
    }

    const config = getConfluenceConfig();
    if (!config.baseUrl || !config.email || !config.apiToken) {
      res.status(400).json({ success: false, error: 'Confluence 未配置' });
      return;
    }

    const parsed = parseConfluenceUrl(url);
    if (!parsed) {
      res.status(400).json({ success: false, error: '无效的 Confluence URL 格式' });
      return;
    }

    let confluenceContent;
    let fetchResult;

    if (parsed.type === 'page' && parsed.pageId) {
      fetchResult = await fetchPageById(parsed.pageId, config);
      if (!fetchResult.success || !fetchResult.content) {
        res.status(500).json({ success: false, error: fetchResult.error });
        return;
      }
      confluenceContent = fetchResult.content;
    } else if (parsed.type === 'space' && parsed.key) {
      fetchResult = await fetchPagesBySpace(parsed.key, config, 10);
      if (!fetchResult.success || !fetchResult.pages) {
        res.status(500).json({ success: false, error: fetchResult.error });
        return;
      }
      
      // 合并 Space 下所有页面的内容
      confluenceContent = {
        title: `Space: ${parsed.key}`,
        content: fetchResult.pages.map(p => `## ${p.title}\n${p.content}`).join('\n\n'),
        spaceKey: parsed.key
      };
    } else {
      res.status(400).json({ success: false, error: '无法解析 URL' });
      return;
    }

    // 如果指定了输出格式，用 AI 生成结构化输出
    if (outputFormat && outputFormat !== 'text') {
      const finalModel = model || 'minimax';
      const analysisResult = await analyzeConfluenceContent(
        confluenceContent,
        prompt || '',
        outputFormat,
        finalModel
      );

      res.json({
        success: analysisResult.success,
        content: confluenceContent,
        structuredOutput: analysisResult.success ? analysisResult.code : null,
        error: analysisResult.error
      });
    } else {
      res.json({
        success: true,
        content: confluenceContent
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
});

/**
 * 搜索 Confluence 内容
 * POST /api/confluence/search
 */
router.post('/confluence/search', async (req: Request, res: Response) => {
  try {
    const { query, spaceKey, prompt, outputFormat, model } = req.body as {
      query?: string;
      spaceKey?: string;
      prompt?: string;
      outputFormat?: string;
      model?: string;
    };

    if (!query) {
      res.status(400).json({ success: false, error: '缺少搜索关键词' });
      return;
    }

    const config = getConfluenceConfig();
    if (!config.baseUrl || !config.email || !config.apiToken) {
      res.status(400).json({ success: false, error: 'Confluence 未配置' });
      return;
    }

    const searchResult = await searchConfluence(query, config, spaceKey);
    if (!searchResult.success) {
      res.status(500).json({ success: false, error: searchResult.error });
      return;
    }

    // 如果有结果且指定了输出格式，对第一个结果进行分析
    if (searchResult.results && searchResult.results.length > 0 && outputFormat && outputFormat !== 'text') {
      const pageResult = await fetchPageById(searchResult.results[0].pageId!, config);
      if (pageResult.success && pageResult.content) {
        const finalModel = model || 'minimax';
        const analysisResult = await analyzeConfluenceContent(
          pageResult.content,
          prompt || '',
          outputFormat,
          finalModel
        );

        res.json({
          success: true,
          searchResults: searchResult.results,
          structuredOutput: analysisResult.success ? analysisResult.code : null
        });
        return;
      }
    }

    res.json({
      success: true,
      searchResults: searchResult.results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
});

/**
 * 获取 Confluence Space 下的所有页面
 * POST /api/confluence/space/pages
 */
router.post('/confluence/space/pages', async (req: Request, res: Response) => {
  try {
    const { spaceKey, limit } = req.body as {
      spaceKey?: string;
      limit?: number;
    };

    if (!spaceKey) {
      res.status(400).json({ success: false, error: '缺少 Space Key' });
      return;
    }

    const config = getConfluenceConfig();
    if (!config.baseUrl || !config.email || !config.apiToken) {
      res.status(400).json({ success: false, error: 'Confluence 未配置' });
      return;
    }

    const result = await fetchPagesBySpace(spaceKey, config, limit || 20);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
});

export default router;
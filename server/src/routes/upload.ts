/**
 * 上传路由 - 处理文件上传和内容提取
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { analyzeImage, extractDiagramFromImage, analyzeDocument } from '../services/vision/index.js';

const router = Router();

// 解析 base64 图片数据
function parseBase64Image(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
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
      result = await analyzeImage(imageBase64, prompt, finalModel);
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
    const { content, prompt, model } = req.body as {
      content?: string;
      prompt?: string;
      model?: string;
    };

    if (!content) {
      res.status(400).json({ success: false, error: '缺少文档内容' });
      return;
    }

    const result = await analyzeDocument(content, prompt, model || 'minimax');
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

export default router;
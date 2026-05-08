/**
 * Vision 服务 - 图片分析和内容提取
 * 支持上传图片、PDF、文档等，提取其中的内容
 */
import type { GenerateResult } from '../ai/types.js';

export type FileType = 'image' | 'pdf' | 'document' | 'excel';

export interface VisionResult {
  success: boolean;
  text?: string;
  description?: string;
  diagramCode?: string;  // 如果检测到流程图，返回 Mermaid 代码
  error?: string;
}

interface MiniMaxVisionResponse {
  choices?: { message: { content: string } }[];
  error?: { message?: string };
}

interface OpenAIVisionResponse {
  choices?: { message: { content: string } }[];
  error?: { message?: string };
}

/**
 * 使用 Vision API 分析图片内容
 */
export async function analyzeImage(
  imageBase64: string,
  prompt: string,
  model: string
): Promise<VisionResult> {
  try {
    let apiKey: string;
    let baseUrl: string;
    let endpoint: string;
    let modelId: string;

    if (model === 'openai') {
      apiKey = process.env.OPENAI_API_KEY || '';
      baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
      endpoint = '/chat/completions';
      modelId = 'gpt-4o'; // GPT-4o 支持 vision
    } else {
      apiKey = process.env.MINIMAX_API_KEY || '';
      baseUrl = process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1';
      endpoint = '/text/chatcompletion_v2';
      modelId = 'MiniMax-Text-01'; // MiniMax 文本模型
    }

    if (!apiKey) {
      return { success: false, error: 'API key 未配置' };
    }

    let messages: Record<string, unknown>[];
    let requestBody: Record<string, unknown>;

    if (model === 'openai') {
      // OpenAI Vision 格式
      messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt || '请分析这张图片的内容，如果是图表，请描述其结构和关系。'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high'
              }
            }
          ]
        }
      ];
      requestBody = { model: modelId, messages, temperature: 0.7 };
    } else {
      // MiniMax 暂不支持 vision，使用图片描述提示词
      messages = [
        {
          role: 'system',
          content: '你是一个专业的图像分析助手。请详细描述图片中的内容、图表结构、流程信息。'
        },
        {
          role: 'user',
          content: `[图片数据]\n${prompt || '请分析这张图片的内容'}`
        }
      ];
      requestBody = { model: modelId, messages, temperature: 0.7 };
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.text();
      return { success: false, error: `${model} API 错误: ${response.status} - ${errorData}` };
    }

    const data = model === 'openai' 
      ? (response.json() as Promise<OpenAIVisionResponse>)
      : (response.json() as Promise<MiniMaxVisionResponse>);

    const result = await data;

    if (result.error) {
      return { success: false, error: result.error.message || 'Vision API 错误' };
    }

    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'AI 返回为空' };
    }

    return {
      success: true,
      text: content,
      description: content
    };
  } catch (error) {
    return { success: false, error: `分析失败: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * 检测图片中的流程图并转换为 Mermaid 代码
 */
export async function extractDiagramFromImage(
  imageBase64: string,
  model: string
): Promise<VisionResult> {
  try {
    const systemPrompt = `你是一个专业的图表分析专家。请分析这张图片：
1. 如果是流程图/架构图/时序图等，请识别其中的节点和连接关系
2. 用 Mermaid 语法描述这个图表
3. 只输出 Mermaid 代码，不要解释

请注意：
- 节点用简洁的中文描述
- 连接线用 --> 或 -->>
- 决策点用 {} 表示
- 并行或分支用 [] 表示

示例输出：
flowchart TD
    A[开始] --> B[输入数据]
    B --> C{验证?}
    C -->|是| D[处理]
    C -->|否| E[报错]`;

    let apiKey: string;
    let baseUrl: string;
    let endpoint: string;
    let modelId: string;

    if (model === 'openai') {
      apiKey = process.env.OPENAI_API_KEY || '';
      baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
      endpoint = '/chat/completions';
      modelId = 'gpt-4o';
    } else {
      return { success: false, error: '流程图提取需要使用 OpenAI GPT-4o 模型' };
    }

    if (!apiKey) {
      return { success: false, error: 'API key 未配置' };
    }

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: systemPrompt
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: 'high'
            }
          }
        ]
      }
    ];

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model: modelId, messages, temperature: 0.3 })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return { success: false, error: `OpenAI API 错误: ${response.status}` };
    }

    const data = await response.json() as OpenAIVisionResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: 'AI 返回为空' };
    }

    // 提取 Mermaid 代码
    const mermaidMatch = content.match(/```(?:mermaid)?\n?([\s\S]*?)```/);
    const diagramCode = mermaidMatch ? mermaidMatch[1].trim() : content.trim();

    return {
      success: true,
      text: content,
      description: '已识别图表内容',
      diagramCode
    };
  } catch (error) {
    return { success: false, error: `提取失败: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * 分析 PDF 或文档文件
 */
export async function analyzeDocument(
  textContent: string,
  prompt: string,
  model: string
): Promise<VisionResult> {
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

    const systemPrompt = '你是一个专业的文档分析助手。请分析用户提供的内容，提取关键信息。';
    const userPrompt = `${systemPrompt}\n\n文档内容：\n${textContent}\n\n分析要求：${prompt || '提取主要内容结构'}`;

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
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: 'AI 返回为空' };
    }

    return {
      success: true,
      text: content,
      description: content
    };
  } catch (error) {
    return { success: false, error: `分析失败: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export default {
  analyzeImage,
  extractDiagramFromImage,
  analyzeDocument
};
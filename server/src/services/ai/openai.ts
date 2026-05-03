import dotenv from 'dotenv';
dotenv.config();

import type { GenerateOptions, GenerateResult } from './types.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChoice {
  message: {
    content: string;
  };
}

export async function generateWithOpenAI(
  prompt: string,
  systemPrompt: string
): Promise<GenerateResult> {
  if (!OPENAI_API_KEY) {
    return { success: false, error: 'OpenAI API key 未配置' };
  }

  try {
    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return { success: false, error: `OpenAI API 错误: ${response.status} - ${errorData}` };
    }

    const data = await response.json() as { choices?: OpenAIChoice[]; error?: { message?: string } };
    
    if (data.error) {
      return { success: false, error: data.error.message || 'OpenAI API 错误' };
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'OpenAI 返回为空' };
    }

    // 提取 Mermaid 代码块
    const mermaidMatch = content.match(/```(?:mermaid)?\n?([\s\S]*?)```/);
    const code = mermaidMatch ? mermaidMatch[1].trim() : content.trim();

    return { success: true, code };
  } catch (error) {
    return { success: false, error: `请求失败: ${error instanceof Error ? error.message : String(error)}` };
  }
}
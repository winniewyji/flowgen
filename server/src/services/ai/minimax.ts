import dotenv from 'dotenv';
dotenv.config();

import type { GenerateOptions, GenerateResult } from './types.js';

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1';

interface MiniMaxMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface MiniMaxChoice {
  message: {
    content: string;
  };
}

export async function generateWithMiniMax(
  prompt: string,
  systemPrompt: string
): Promise<GenerateResult> {
  if (!MINIMAX_API_KEY) {
    return { success: false, error: 'MiniMax API key 未配置' };
  }

  try {
    const messages: MiniMaxMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    const response = await fetch(`${MINIMAX_BASE_URL}/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return { success: false, error: `MiniMax API 错误: ${response.status} - ${errorData}` };
    }

    const data = await response.json() as { choices?: MiniMaxChoice[]; error?: { message?: string } };
    
    if (data.error) {
      return { success: false, error: data.error.message || 'MiniMax API 错误' };
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'MiniMax 返回为空' };
    }

    // 提取 Mermaid 代码块
    const mermaidMatch = content.match(/```(?:mermaid)?\n?([\s\S]*?)```/);
    const code = mermaidMatch ? mermaidMatch[1].trim() : content.trim();

    return { success: true, code };
  } catch (error) {
    return { success: false, error: `请求失败: ${error instanceof Error ? error.message : String(error)}` };
  }
}
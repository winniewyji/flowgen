import type { AIModel, GenerateOptions, GenerateResult } from './types.js';
import { generateWithMiniMax } from './minimax.js';
import { generateWithOpenAI } from './openai.js';

export const availableModels: AIModel[] = [
  { id: 'minimax', name: 'MiniMax', enabled: !!process.env.MINIMAX_API_KEY },
  { id: 'openai', name: 'ChatGPT', enabled: !!process.env.OPENAI_API_KEY }
];

export function getEnabledModels(): AIModel[] {
  return availableModels.filter(m => m.enabled);
}

export async function generateDiagram(options: GenerateOptions): Promise<GenerateResult> {
  const { prompt, chartType, model } = options;
  
  // 导入提示词模板
  const { getSystemPrompt, getUserPrompt } = await import('../../prompts/diagram.js');
  
  const systemPrompt = getSystemPrompt(chartType);
  const userPrompt = getUserPrompt(prompt, chartType);

  switch (model) {
    case 'openai':
      return await generateWithOpenAI(userPrompt, systemPrompt);
    case 'minimax':
    default:
      return await generateWithMiniMax(userPrompt, systemPrompt);
  }
}

export * from './types.js';
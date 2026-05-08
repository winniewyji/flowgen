import type { AIModel, GenerateOptions, GenerateResult } from './types.js';
import { generateWithMiniMax } from './minimax.js';
import { generateWithOpenAI } from './openai.js';

// ============ AI 响应缓存 - 支持多人同时访问 ============
interface CacheEntry {
  result: GenerateResult;
  timestamp: number;
}

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟缓存
const DEFAULT_CACHE_MAX_SIZE = 500; // 最多缓存 500 条

// 简单 LRU 缓存实现
class LRUCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize = DEFAULT_CACHE_MAX_SIZE, ttlMs = DEFAULT_CACHE_TTL_MS) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  private makeKey(prompt: string, chartType: string, model: string): string {
    // 简单 hash：实际生产环境建议用 crypto
    return `${model}:${chartType}:${prompt.slice(0, 100)}`;
  }


  get(prompt: string, chartType: string, model: string): GenerateResult | null {
    const key = this.makeKey(prompt, chartType, model);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    
    // 移到末尾（模拟 LRU）
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.result;
  }

  set(prompt: string, chartType: string, model: string, result: GenerateResult): void {
    const key = this.makeKey(prompt, chartType, model);
    
    // 如果缓存已满，删除最老的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    
    this.cache.set(key, { result, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

const responseCache = new LRUCache();

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

  // 检查缓存（仅对成功结果缓存）
  const cached = responseCache.get(prompt, chartType, model);
  if (cached && cached.success) {
    console.log(`📦 [Cache Hit] ${model}:${chartType}`);
    return { ...cached, code: `%% Cache Hit\n${cached.code}` };
  }

  let result: GenerateResult;

  switch (model) {
    case 'openai':
      result = await generateWithOpenAI(userPrompt, systemPrompt);
      break;
    case 'minimax':
    default:
      result = await generateWithMiniMax(userPrompt, systemPrompt);
      break;
  }

  // 缓存成功结果
  if (result.success && result.code) {
    responseCache.set(prompt, chartType, model, result);
  }

  return result;
}

// 清除缓存的导出函数
export function clearDiagramCache(): void {
  responseCache.clear();
}

export * from './types.js';
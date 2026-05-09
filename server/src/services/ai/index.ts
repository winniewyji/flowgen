import type { AIModel, GenerateOptions, GenerateResult } from './types.js';
import { generateWithMiniMax } from './minimax.js';
import { generateWithOpenAI } from './openai.js';

// ============ 引入成本控制和智能调度 ============
import { tokenOptimizer, smartModelRouter, budgetTracker } from '../cost-control/index.js';
import { smartScheduler, type TaskComplexity } from '../smart-scheduler/index.js';
import { eliteMemory, selfImproving } from '../memory/index.js';

// ============ AI 响应缓存 - 支持多人同时访问 ============
interface CacheEntry {
  result: GenerateResult;
  timestamp: number;
  model: string;
  chartType: string;
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
    
    this.cache.set(key, { result, timestamp: Date.now(), model, chartType });
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

/**
 * 生成图表（集成成本控制+智能调度+记忆）
 */
export async function generateDiagram(options: GenerateOptions): Promise<GenerateResult> {
  const startTime = Date.now();
  const { prompt, chartType, model } = options;
  
  // 导入提示词模板
  const { getSystemPrompt, getUserPrompt } = await import('../../prompts/diagram.js');
  
  const systemPrompt = getSystemPrompt(chartType);
  const userPrompt = getUserPrompt(prompt, chartType);

  // ============ 成本控制检查 ============
  const budgetCheck = budgetTracker.checkAllowRequest();
  if (!budgetCheck.allowed) {
    return {
      success: false,
      error: `日预算已超出 (${budgetCheck.status.dailyCost.toFixed(4)}/${budgetCheck.status.limit})，请明天再试`
    };
  }

  // ============ 智能模型路由 ============
  const enabledModels = getEnabledModels().map(m => m.id);
  const routing = smartModelRouter.route(prompt, chartType, enabledModels);
  
  // 通信模式强制使用便宜模型
  const effectiveModel = smartModelRouter.isCommunicationPattern(prompt)
    ? smartModelRouter.getForcedModel()
    : (model || routing.recommendedModel);

  // 记录任务复杂度
  eliteMemory.setCurrentTask(`生成 ${chartType} 图表`);

  // 检查缓存（仅对成功结果缓存）
  const cached = responseCache.get(prompt, chartType, effectiveModel);
  if (cached && cached.success) {
    console.log(`📦 [Cache Hit] ${effectiveModel}:${chartType}`);
    
    // 记录缓存命中（节省成本）
    tokenOptimizer.recordCost(effectiveModel, chartType, 0, 0, 0); // 缓存不收费
    
    return { ...cached, code: `%% Cache Hit\n${cached.code}` };
  }

  let result: GenerateResult;

  try {
    switch (effectiveModel) {
      case 'openai':
        result = await generateWithOpenAI(userPrompt, systemPrompt);
        break;
      case 'minimax':
      default:
        result = await generateWithMiniMax(userPrompt, systemPrompt);
        break;
    }

    // 记录成功成本
    if (result.success && result.code) {
      // 估算 token 数量（简化估算）
      const estimatedPromptTokens = userPrompt.length / 4;
      const estimatedCompletionTokens = result.code.length / 4;
      const cost = tokenOptimizer.estimateCost(
        estimatedPromptTokens,
        estimatedCompletionTokens,
        effectiveModel
      );
      
      tokenOptimizer.recordCost(
        effectiveModel,
        chartType,
        estimatedPromptTokens,
        estimatedCompletionTokens,
        cost
      );

      // 缓存成功结果
      responseCache.set(prompt, chartType, effectiveModel, result);
    }

    // ============ 性能验证 ============
    const elapsed = Date.now() - startTime;
    const perfValidation = smartScheduler.validatePerformance(routing.complexity, elapsed);
    
    if (!perfValidation.passed) {
      console.log(`⚠️ [Performance] 复杂度: ${routing.complexity}, 目标: ${perfValidation.target}ms, 实际: ${perfValidation.actual}ms`);
    } else {
      console.log(`✅ [Performance] ${routing.complexity} - ${elapsed}ms (目标: ${perfValidation.target}ms)`);
    }

    return result;

  } catch (error) {
    // 记录错误到自学习系统
    await selfImproving.logError(
      'generateDiagram',
      `AI 生成失败: ${chartType}`,
      error instanceof Error ? error.message : String(error),
      `Model: ${effectiveModel}, Prompt: ${prompt.slice(0, 100)}...`,
      '检查 API 配置和网络连接'
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    };
  }
}

// 清除缓存的导出函数
export function clearDiagramCache(): void {
  responseCache.clear();
}

// 获取成本统计
export function getCostStats() {
  return tokenOptimizer.getStats();
}

// 获取预算状态
export function getBudgetStatus() {
  return budgetTracker.getStatus();
}

// 生成成本报告
export function generateCostReport(): string {
  return budgetTracker.generateReport();
}

export * from './types.js';
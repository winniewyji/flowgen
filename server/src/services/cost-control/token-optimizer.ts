/**
 * Token Optimizer Service - FlowGen
 * 结合 openclaw-token-optimizer 技能的成本控制能力
 */

import type { ChartType } from '../ai/types.js';

// 成本追踪
interface CostEntry {
  timestamp: number;
  model: string;
  chartType: ChartType;
  promptTokens: number;
  completionTokens: number;
  cost: number;
}

interface CostStats {
  totalCost: number;
  totalRequests: number;
  avgCostPerRequest: number;
  byModel: Record<string, number>;
  byChartType: Record<string, number>;
}

// 简单缓存 TTL 配置 (align with openclaw-token-optimizer)
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟

// 成本统计（内存存储，生产环境建议用 Redis）
const costHistory: CostEntry[] = [];
const DAILY_COST_LIMIT = 5.0; // $5/天限制

export class TokenOptimizer {
  private requestCount = 0;
  private dailyCost = 0;
  private lastResetDate = new Date().toDateString();

  /**
   * 检查是否超过日预算
   */
  canProceed(): { allowed: boolean; reason?: string; dailyCost: number; limit: number } {
    this.checkDailyReset();
    
    if (this.dailyCost >= DAILY_COST_LIMIT) {
      return {
        allowed: false,
        reason: `日预算 ${DAILY_COST_LIMIT} 已用完 (${this.dailyCost.toFixed(4)})`,
        dailyCost: this.dailyCost,
        limit: DAILY_COST_LIMIT
      };
    }
    
    return { allowed: true, dailyCost: this.dailyCost, limit: DAILY_COST_LIMIT };
  }

  /**
   * 记录一次 API 调用成本
   */
  recordCost(model: string, chartType: ChartType, promptTokens: number, completionTokens: number, cost: number): void {
    this.checkDailyReset();
    
    const entry: CostEntry = {
      timestamp: Date.now(),
      model,
      chartType,
      promptTokens,
      completionTokens,
      cost
    };
    
    costHistory.push(entry);
    this.dailyCost += cost;
    this.requestCount++;
    
    // 保持历史记录不过大 (只保留最近 1000 条)
    if (costHistory.length > 1000) {
      costHistory.shift();
    }
  }

  /**
   * 获取成本统计
   */
  getStats(): CostStats {
    this.checkDailyReset();
    
    const stats: CostStats = {
      totalCost: this.dailyCost,
      totalRequests: this.requestCount,
      avgCostPerRequest: this.requestCount > 0 ? this.dailyCost / this.requestCount : 0,
      byModel: {},
      byChartType: {}
    };
    
    for (const entry of costHistory) {
      stats.byModel[entry.model] = (stats.byModel[entry.model] || 0) + entry.cost;
      stats.byChartType[entry.chartType] = (stats.byChartType[entry.chartType] || 0) + entry.cost;
    }
    
    return stats;
  }

  /**
   * 获取缓存 key（用于 LRU 缓存）
   */
  getCacheKey(prompt: string, chartType: string, model: string): string {
    return `${model}:${chartType}:${prompt.slice(0, 100)}`;
  }

  /**
   * 计算预估成本（基于 token 数量）
   */
  estimateCost(promptTokens: number, completionTokens: number, model: string): number {
    // 简化估算：实际价格请参考各平台定价
    const pricePerKT = {
      'minimax': 0.1,    // $/1000 tokens
      'openai': 15.0,    // GPT-4o $15/1M
    }[model] || 1.0;
    
    return ((promptTokens + completionTokens) / 1000) * pricePerKT;
  }

  /**
   * 检查是否应该使用缓存（节省成本）
   */
  shouldUseCache(lastCacheTime: number | null): boolean {
    if (!lastCacheTime) return false;
    return Date.now() - lastCacheTime < CACHE_TTL_MS;
  }

  /**
   * 获取 Heartbeat 优化间隔（与 openclaw-token-optimizer 一致）
   */
  getHeartbeatInterval(): number {
    // 55min = 保持 Anthropic cache warm
    return 55 * 60 * 1000;
  }

  private checkDailyReset(): void {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyCost = 0;
      this.requestCount = 0;
      this.lastResetDate = today;
    }
  }
}

// 单例导出
export const tokenOptimizer = new TokenOptimizer();

// 导出类型
export type { CostEntry, CostStats };
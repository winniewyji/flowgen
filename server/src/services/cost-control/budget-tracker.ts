/**
 * Token Budget Tracker - FlowGen
 * 追踪和告警日常使用成本
 */

import { tokenOptimizer } from './token-optimizer.js';

interface BudgetStatus {
  status: 'ok' | 'warning' | 'exceeded';
  dailyCost: number;
  limit: number;
  percentUsed: number;
  alert: string | null;
}

const WARNING_THRESHOLD = 0.8; // 80% 警告

export class BudgetTracker {
  private readonly dailyLimit: number;
  private readonly warnThreshold: number;

  constructor(dailyLimit = 5.0, warnThreshold = WARNING_THRESHOLD) {
    this.dailyLimit = dailyLimit;
    this.warnThreshold = warnThreshold;
  }

  /**
   * 获取当前预算状态
   */
  getStatus(): BudgetStatus {
    const stats = tokenOptimizer.getStats();
    const percentUsed = (stats.totalCost / this.dailyLimit) * 100;

    let status: BudgetStatus['status'] = 'ok';
    let alert: string | null = null;

    if (percentUsed >= 100) {
      status = 'exceeded';
      alert = `日预算已超出！当前 ${stats.totalCost.toFixed(4)} / ${this.dailyLimit}`;
    } else if (percentUsed >= this.warnThreshold * 100) {
      status = 'warning';
      alert = `日预算使用已达 ${percentUsed.toFixed(1)}%，注意控制成本`;
    }

    return {
      status,
      dailyCost: stats.totalCost,
      limit: this.dailyLimit,
      percentUsed,
      alert
    };
  }

  /**
   * 检查是否可以继续请求
   */
  checkAllowRequest(): { allowed: boolean; status: BudgetStatus } {
    const status = this.getStatus();
    return {
      allowed: status.status !== 'exceeded',
      status
    };
  }

  /**
   * 生成成本报告
   */
  generateReport(): string {
    const status = this.getStatus();
    const stats = tokenOptimizer.getStats();

    let report = `📊 **FlowGen 成本报告**\n\n`;
    report += `💰 今日成本: $${status.dailyCost.toFixed(4)} / $${status.limit}\n`;
    report += `📈 使用比例: ${status.percentUsed.toFixed(1)}%\n`;
    report += `🔢 总请求数: ${stats.totalRequests}\n`;
    report += `📉 平均成本: $${stats.avgCostPerRequest.toFixed(4)}/请求\n\n`;

    if (Object.keys(stats.byModel).length > 0) {
      report += `**按模型分布:**\n`;
      for (const [model, cost] of Object.entries(stats.byModel)) {
        report += `  - ${model}: $${cost.toFixed(4)}\n`;
      }
    }

    if (Object.keys(stats.byChartType).length > 0) {
      report += `\n**按图表类型分布:**\n`;
      for (const [type, cost] of Object.entries(stats.byChartType)) {
        report += `  - ${type}: $${cost.toFixed(4)}\n`;
      }
    }

    if (status.alert) {
      report += `\n⚠️ ${status.alert}`;
    }

    return report;
  }

  /**
   * 重置日统计（通常自动触发）
   */
  reset(): void {
    // 重置由 tokenOptimizer 内部按日期自动处理
    // 这里只是记录日志
    console.log('[BudgetTracker] 日统计已重置');
  }
}

export const budgetTracker = new BudgetTracker();
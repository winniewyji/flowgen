/**
 * Smart Task Scheduler - FlowGen
 * 结合 openclaw-smart-scheduler 的任务分类和路由能力
 */

import type { ChartType } from '../ai/types.js';

// 任务复杂度
export type TaskComplexity = 'simple' | 'medium' | 'complex';

// 调度结果
export interface ScheduleResult {
  complexity: TaskComplexity;
  estimatedTime: number; // ms
  recommendedModel: string;
  routing: string;
  latencyTarget: number; // 目标延迟 ms
}

// 简单任务关键词
const SIMPLE_PATTERNS = [
  '报价', '查询', '状态', '设置', '记录', '删除',
  'hi', 'hello', 'thanks', 'ok', 'yes', 'no', '好', '是', '否',
  '简单', '基础'
];

// 复杂任务关键词
const COMPLEX_PATTERNS = [
  '设计', '分析', '研究', '创建', '优化', '系统', '架构',
  '设计一个', '分析一下', '帮我创建', '如何实现', '架构设计',
  '复杂', '详细'
];

export class SmartScheduler {
  /**
   * 分析任务复杂度
   */
  analyzeComplexity(prompt: string, chartType?: string): TaskComplexity {
    const text = prompt.toLowerCase();
    const length = prompt.trim().length;

    // 长度判断
    if (length < 15) return 'simple';
    if (length > 100) return 'complex';

    // 关键词判断
    for (const pattern of COMPLEX_PATTERNS) {
      if (text.includes(pattern.toLowerCase())) {
        return 'complex';
      }
    }

    for (const pattern of SIMPLE_PATTERNS) {
      if (text.includes(pattern.toLowerCase())) {
        return 'simple';
      }
    }

    // 图表类型判断
    if (chartType === 'class' || chartType === 'er') {
      return 'complex';
    }

    return 'medium';
  }

  /**
   * 生成调度决策
   */
  schedule(prompt: string, chartType: ChartType, availableModels: string[]): ScheduleResult {
    const complexity = this.analyzeComplexity(prompt, chartType);

    // 预估时间
    const estimatedTime = {
      simple: 500,
      medium: 3000,
      complex: 10000
    }[complexity];

    // 目标延迟
    const latencyTarget = {
      simple: 500,
      medium: 3000,
      complex: 10000
    }[complexity];

    // 路由决策
    let recommendedModel = 'minimax';
    let routing = '';

    if (complexity === 'simple') {
      routing = '直接路由 → MiniMax (秒级响应)';
      recommendedModel = 'minimax';
    } else if (complexity === 'medium') {
      routing = availableModels.includes('minimax')
        ? '优先 MiniMax → 质量不够再切换'
        : `使用 ${availableModels[0] || 'minimax'}`;
      recommendedModel = availableModels.includes('minimax') ? 'minimax' : (availableModels[0] || 'minimax');
    } else {
      routing = '深度分析 → GPT-4o (高质量)';
      recommendedModel = availableModels.includes('openai') ? 'openai' : (availableModels[0] || 'minimax');
    }

    return {
      complexity,
      estimatedTime,
      recommendedModel,
      routing,
      latencyTarget
    };
  }

  /**
   * 获取性能目标
   */
  getPerformanceTargets(): { simple: number; medium: number; complex: number } {
    return {
      simple: 500,   // < 500ms
      medium: 3000,  // < 3s
      complex: 10000 // < 10s
    };
  }

  /**
   * 验证是否满足性能目标
   */
  validatePerformance(complexity: TaskComplexity, actualTime: number): {
    passed: boolean;
    target: number;
    actual: number;
    overhead: number;
  } {
    const targets = this.getPerformanceTargets();
    const target = targets[complexity];

    return {
      passed: actualTime <= target,
      target,
      actual: actualTime,
      overhead: actualTime - target
    };
  }

  /**
   * 获取复杂度描述（用于日志）
   */
  getComplexityLabel(complexity: TaskComplexity): string {
    const labels = {
      simple: '⚡ 简单任务 (秒级响应)',
      medium: '🎯 中等任务 (3秒内)',
      complex: '🧠 复杂任务 (深度分析)'
    };
    return labels[complexity];
  }
}

export const smartScheduler = new SmartScheduler();
/**
 * Smart Model Router - FlowGen
 * 结合 openclaw-smart-scheduler 的任务分类能力
 * 自动选择最优模型
 */

export type TaskComplexity = 'simple' | 'medium' | 'complex';

export interface RoutingResult {
  recommendedModel: string;
  complexity: TaskComplexity;
  reason: string;
  costSavings: number; // 预估节省百分比
}

// 简单任务关键词
const SIMPLE_PATTERNS = [
  '查询', '状态', '设置', '记录', '删除', '简单', '基础',
  'hi', 'hello', 'thanks', 'ok', 'yes', 'no', '好', '是', '否'
];

// 复杂任务关键词
const COMPLEX_PATTERNS = [
  '设计', '分析', '研究', '创建', '优化', '系统', '架构',
  '设计一个', '分析一下', '帮我创建', '如何实现', '架构设计'
];

export class SmartModelRouter {
  /**
   * 分析任务复杂度
   */
  classifyTask(prompt: string, chartType: string): TaskComplexity {
    const text = prompt.toLowerCase();
    
    // 复杂任务检查
    for (const pattern of COMPLEX_PATTERNS) {
      if (text.includes(pattern.toLowerCase())) {
        return 'complex';
      }
    }
    
    // 简单任务检查
    for (const pattern of SIMPLE_PATTERNS) {
      if (text.includes(pattern.toLowerCase())) {
        return 'simple';
      }
    }
    
    // 默认策略：
    // - 图表生成默认中等复杂度
    // - ER 图和类图通常较复杂
    if (chartType === 'class' || chartType === 'er') {
      return 'complex';
    }
    
    return 'medium';
  }

  /**
   * 路由到最优模型
   */
  route(prompt: string, chartType: string, availableModels: string[]): RoutingResult {
    const complexity = this.classifyTask(prompt, chartType);
    
    // 简单任务 → MiniMax (免费/低成本)
    if (complexity === 'simple') {
      return {
        recommendedModel: 'minimax',
        complexity,
        reason: '简单任务，使用 MiniMax 高性价比模型',
        costSavings: 50
      };
    }
    
    // 中等任务 → 检查可用性，优先 MiniMax
    if (complexity === 'medium') {
      if (availableModels.includes('minimax')) {
        return {
          recommendedModel: 'minimax',
          complexity,
          reason: '中等复杂度任务，使用 MiniMax 平衡成本与质量',
          costSavings: 30
        };
      }
      return {
        recommendedModel: availableModels[0] || 'minimax',
        complexity,
        reason: '使用可用模型',
        costSavings: 0
      };
    }
    
    // 复杂任务 → OpenAI (更高质量)
    if (complexity === 'complex') {
      if (availableModels.includes('openai')) {
        return {
          recommendedModel: 'openai',
          complexity,
          reason: '复杂任务，切换到 GPT-4o 获取更高质量',
          costSavings: 0 // 复杂任务不节省
        };
      }
      // 回退到 minimax
      return {
        recommendedModel: 'minimax',
        complexity,
        reason: '复杂任务但 OpenAI 不可用，使用 MiniMax',
        costSavings: 0
      };
    }
    
    // 默认回退
    return {
      recommendedModel: availableModels[0] || 'minimax',
      complexity,
      reason: '默认路由',
      costSavings: 0
    };
  }

  /**
   * 检测通信模式（永远不用贵模型处理）
   */
  isCommunicationPattern(prompt: string): boolean {
    const text = prompt.trim().toLowerCase();
    
    const commPatterns = [
      'hi', 'hey', 'hello', 'yo',
      'thanks', 'thank you', 'thx',
      'ok', 'sure', 'got it', 'understood',
      'yes', 'no', 'yep', 'nope',
      '好', '是', '否', '行'
    ];
    
    return commPatterns.includes(text) || text.length < 10;
  }

  /**
   * 获取强制使用的模型（用于通信模式）
   */
  getForcedModel(): string {
    return 'minimax'; // 通信模式强制使用 MiniMax
  }
}

export const smartModelRouter = new SmartModelRouter();
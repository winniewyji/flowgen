import { Router } from 'express';
import type { Request, Response } from 'express';
import { getCostStats, getBudgetStatus, generateCostReport, clearDiagramCache } from '../services/ai/index.js';
import { budgetTracker } from '../services/cost-control/index.js';

const router = Router();

/**
 * 获取成本统计
 */
router.get('/cost/stats', (_req: Request, res: Response) => {
  try {
    const stats = getCostStats();
    res.json({
      success: true,
      data: {
        totalCost: stats.totalCost.toFixed(4),
        totalRequests: stats.totalRequests,
        avgCostPerRequest: stats.avgCostPerRequest.toFixed(4),
        byModel: stats.byModel,
        byChartType: stats.byChartType
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取成本统计失败'
    });
  }
});

/**
 * 获取预算状态
 */
router.get('/cost/budget', (_req: Request, res: Response) => {
  try {
    const status = getBudgetStatus();
    res.json({
      success: true,
      data: {
        status: status.status,
        dailyCost: status.dailyCost.toFixed(4),
        limit: status.limit,
        percentUsed: status.percentUsed.toFixed(1),
        alert: status.alert
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取预算状态失败'
    });
  }
});

/**
 * 获取详细成本报告
 */
router.get('/cost/report', (_req: Request, res: Response) => {
  try {
    const report = generateCostReport();
    res.json({
      success: true,
      data: { report }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '生成成本报告失败'
    });
  }
});

/**
 * 清除图表缓存
 */
router.post('/cost/cache/clear', (_req: Request, res: Response) => {
  try {
    clearDiagramCache();
    res.json({
      success: true,
      message: '缓存已清除'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '清除缓存失败'
    });
  }
});

/**
 * 重置日预算统计
 */
router.post('/cost/reset', (_req: Request, res: Response) => {
  try {
    budgetTracker.reset();
    res.json({
      success: true,
      message: '日统计已重置'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '重置失败'
    });
  }
});

export default router;
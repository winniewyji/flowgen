import { Router } from 'express';
import type { Request, Response } from 'express';
import { eliteMemory, selfImproving } from '../services/memory/index.js';
import type { MemoryEntry } from '../services/memory/elite-longterm-memory.js';

const router = Router();

/**
 * 记住用户偏好
 */
router.post('/preference', async (req: Request, res: Response) => {
  try {
    const { text } = req.body as { text: string };
    if (!text) {
      res.status(400).json({ success: false, error: '缺少 text 参数' });
      return;
    }

    eliteMemory.rememberPreference(text);
    res.json({ success: true, message: '偏好已记住' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '记录偏好失败'
    });
  }
});

/**
 * 记住决策
 */
router.post('/decision', async (req: Request, res: Response) => {
  try {
    const { decision, context } = req.body as { decision: string; context?: string };
    if (!decision) {
      res.status(400).json({ success: false, error: '缺少 decision 参数' });
      return;
    }

    eliteMemory.rememberDecision(decision, context || '');
    res.json({ success: true, message: '决策已记住' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '记录决策失败'
    });
  }
});

/**
 * 记住事实
 */
router.post('/fact', async (req: Request, res: Response) => {
  try {
    const { text, importance } = req.body as { text: string; importance?: number };
    if (!text) {
      res.status(400).json({ success: false, error: '缺少 text 参数' });
      return;
    }

    eliteMemory.rememberFact(text, importance || 0.7);
    res.json({ success: true, message: '事实已记住' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '记录事实失败'
    });
  }
});

/**
 * 记录教训
 */
router.post('/lesson', async (req: Request, res: Response) => {
  try {
    const { text } = req.body as { text: string };
    if (!text) {
      res.status(400).json({ success: false, error: '缺少 text 参数' });
      return;
    }

    eliteMemory.rememberLesson(text);
    res.json({ success: true, message: '教训已记住' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '记录教训失败'
    });
  }
});

/**
 * 搜索记忆
 */
router.get('/recall', async (req: Request, res: Response) => {
  try {
    const { q, limit } = req.query as { q?: string; limit?: string };
    if (!q) {
      res.status(400).json({ success: false, error: '缺少 q 参数' });
      return;
    }

    const results = eliteMemory.recall(q, parseInt(limit || '5', 10));
    res.json({
      success: true,
      data: {
        query: q,
        results
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '搜索失败'
    });
  }
});

/**
 * 获取当前状态
 */
router.get('/state', (_req: Request, res: Response) => {
  try {
    const state = eliteMemory.getCurrentState();
    res.json({ success: true, data: state });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取状态失败'
    });
  }
});

/**
 * 获取待处理学习项统计
 */
router.get('/learnings/pending', async (_req: Request, res: Response) => {
  try {
    const pending = await selfImproving.getPendingLearnings();
    res.json({ success: true, data: pending });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取失败'
    });
  }
});

/**
 * 记录用户纠正
 */
router.post('/learnings/correction', async (req: Request, res: Response) => {
  try {
    const { summary, details, suggestedAction, area } = req.body as {
      summary: string;
      details?: string;
      suggestedAction?: string;
      area?: 'frontend' | 'backend' | 'ai' | 'config';
    };

    if (!summary) {
      res.status(400).json({ success: false, error: '缺少 summary 参数' });
      return;
    }

    await selfImproving.logCorrection(
      summary,
      details || '',
      suggestedAction || '',
      area || 'ai'
    );

    res.json({ success: true, message: '纠正已记录' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '记录失败'
    });
  }
});

/**
 * 记录错误
 */
router.post('/learnings/error', async (req: Request, res: Response) => {
  try {
    const {
      skillOrCommand,
      summary,
      errorMessage,
      context,
      suggestedFix,
      reproducible
    } = req.body as {
      skillOrCommand: string;
      summary: string;
      errorMessage: string;
      context?: string;
      suggestedFix?: string;
      reproducible?: boolean;
    };

    if (!skillOrCommand || !summary || !errorMessage) {
      res.status(400).json({ success: false, error: '缺少必要参数' });
      return;
    }

    await selfImproving.logError(
      skillOrCommand,
      summary,
      errorMessage,
      context || '',
      suggestedFix || '',
      reproducible || false
    );

    res.json({ success: true, message: '错误已记录' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '记录失败'
    });
  }
});

/**
 * 记录功能请求
 */
router.post('/learnings/feature', async (req: Request, res: Response) => {
  try {
    const {
      capability,
      userContext,
      suggestedImplementation,
      complexity
    } = req.body as {
      capability: string;
      userContext?: string;
      suggestedImplementation?: string;
      complexity?: 'simple' | 'medium' | 'complex';
    };

    if (!capability) {
      res.status(400).json({ success: false, error: '缺少 capability 参数' });
      return;
    }

    await selfImproving.logFeatureRequest(
      capability,
      userContext || '',
      suggestedImplementation || '',
      complexity || 'medium'
    );

    res.json({ success: true, message: '功能请求已记录' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '记录失败'
    });
  }
});

export default router;
/**
 * Memory Routes - FlowGen
 * 支持多用户隔离的记忆 API
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { multiUserMemory } from '../services/memory/index.js';

const router = Router();

/**
 * 从 Header 或 Body 获取 userId
 * 实际项目中应从 JWT/_SESSION 中解析
 */
function getUserId(req: Request): string {
  // 优先级: Header > Body > Query
  return (req.headers['x-user-id'] as string) || 
         (req.body as any)?.userId || 
         (req.query as any)?.userId || 
         'anonymous';
}

// ============ 共享记忆 API (Shared) ============

/**
 * 获取共享最佳实践
 */
router.get('/shared/practices', (req: Request, res: Response) => {
  try {
    const category = req.query.category as string;
    const practices = multiUserMemory.getShared().getBestPractices(category);
    res.json({ success: true, data: { practices } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

/**
 * 添加共享最佳实践
 */
router.post('/shared/practices', (req: Request, res: Response) => {
  try {
    const { category, title, content, author } = req.body;
    if (!category || !title || !content) {
      res.status(400).json({ success: false, error: '缺少必要参数' });
      return;
    }
    
    const practice = multiUserMemory.addSharedBestPractice(
      category,
      title,
      content,
      author || getUserId(req)
    );
    
    res.json({ success: true, data: { practice }, message: '已添加共享最佳实践' });
  } catch (error) {
    res.status(500).json({ success: false, error: '添加失败' });
  }
});

/**
 * 获取共享错误记录
 */
router.get('/shared/errors', (req: Request, res: Response) => {
  try {
    const errors = multiUserMemory.getShared().getSharedErrors();
    res.json({ success: true, data: { errors } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

/**
 * 添加共享错误
 */
router.post('/shared/errors', (req: Request, res: Response) => {
  try {
    const { errorType, description, solution } = req.body;
    if (!errorType || !description) {
      res.status(400).json({ success: false, error: '缺少必要参数' });
      return;
    }
    
    multiUserMemory.addSharedError(
      errorType,
      description,
      solution || '',
      getUserId(req)
    );
    
    res.json({ success: true, message: '已添加共享错误记录' });
  } catch (error) {
    res.status(500).json({ success: false, error: '添加失败' });
  }
});

// ============ 私有记忆 API (User-Specific) ============

/**
 * 记住用户偏好 (私有)
 */
router.post('/preference', (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { text } = req.body;
    
    if (!text) {
      res.status(400).json({ success: false, error: '缺少 text 参数' });
      return;
    }

    multiUserMemory.rememberPreference(userId, text);
    res.json({ success: true, message: `用户 ${userId} 偏好已记住` });
  } catch (error) {
    res.status(500).json({ success: false, error: '记录失败' });
  }
});

/**
 * 记住决策 (私有)
 */
router.post('/decision', (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { decision, context } = req.body;
    
    if (!decision) {
      res.status(400).json({ success: false, error: '缺少 decision 参数' });
      return;
    }

    multiUserMemory.rememberDecision(userId, decision, context || '');
    res.json({ success: true, message: `用户 ${userId} 决策已记住` });
  } catch (error) {
    res.status(500).json({ success: false, error: '记录失败' });
  }
});

/**
 * 记住事实 (私有)
 */
router.post('/fact', (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { text, importance } = req.body;
    
    if (!text) {
      res.status(400).json({ success: false, error: '缺少 text 参数' });
      return;
    }

    multiUserMemory.rememberFact(userId, text, importance || 0.7);
    res.json({ success: true, message: `用户 ${userId} 事实已记住` });
  } catch (error) {
    res.status(500).json({ success: false, error: '记录失败' });
  }
});

/**
 * 记录教训 (私有)
 */
router.post('/lesson', (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { text } = req.body;
    
    if (!text) {
      res.status(400).json({ success: false, error: '缺少 text 参数' });
      return;
    }

    multiUserMemory.rememberLesson(userId, text);
    res.json({ success: true, message: `用户 ${userId} 教训已记录` });
  } catch (error) {
    res.status(500).json({ success: false, error: '记录失败' });
  }
});

/**
 * 搜索记忆 (私有 + 共享)
 */
router.get('/recall', (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { q, limit } = req.query;
    
    if (!q) {
      res.status(400).json({ success: false, error: '缺少 q 参数' });
      return;
    }

    const results = multiUserMemory.search(userId, q as string);
    res.json({
      success: true,
      data: {
        query: q,
        private: results.private,
        shared: results.shared
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '搜索失败' });
  }
});

/**
 * 获取用户当前状态
 */
router.get('/state', (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const state = multiUserMemory.forUser(userId).getSessionState();
    res.json({ success: true, data: { userId, ...state } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取状态失败' });
  }
});

/**
 * 设置当前任务
 */
router.post('/state/task', (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { task } = req.body;
    
    if (!task) {
      res.status(400).json({ success: false, error: '缺少 task 参数' });
      return;
    }

    multiUserMemory.forUser(userId).setCurrentTask(task);
    res.json({ success: true, message: `用户 ${userId} 任务已更新` });
  } catch (error) {
    res.status(500).json({ success: false, error: '设置失败' });
  }
});

/**
 * 设置上下文
 */
router.post('/state/context', (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { key, value } = req.body;
    
    if (!key || !value) {
      res.status(400).json({ success: false, error: '缺少 key 或 value 参数' });
      return;
    }

    multiUserMemory.forUser(userId).setContext(key, value);
    res.json({ success: true, message: `用户 ${userId} 上下文已更新` });
  } catch (error) {
    res.status(500).json({ success: false, error: '设置失败' });
  }
});

// ============ 自学习记录 (私有) ============

/**
 * 记录用户纠正
 */
router.post('/learnings/correction', (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { summary, details, area } = req.body;
    
    if (!summary) {
      res.status(400).json({ success: false, error: '缺少 summary 参数' });
      return;
    }

    multiUserMemory.forUser(userId).logCorrection(summary, details || '', area || 'ai');
    res.json({ success: true, message: `用户 ${userId} 纠正已记录` });
  } catch (error) {
    res.status(500).json({ success: false, error: '记录失败' });
  }
});

/**
 * 记录错误
 */
router.post('/learnings/error', (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { skillOrCommand, errorMessage, context } = req.body;
    
    if (!skillOrCommand || !errorMessage) {
      res.status(400).json({ success: false, error: '缺少必要参数' });
      return;
    }

    multiUserMemory.forUser(userId).logError(skillOrCommand, errorMessage, context || '');
    res.json({ success: true, message: `用户 ${userId} 错误已记录` });
  } catch (error) {
    res.status(500).json({ success: false, error: '记录失败' });
  }
});

export default router;
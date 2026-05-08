import { Router } from 'express';
import type { Request, Response } from 'express';
import { generatePPT, generateExcel, generateDocument, generatePPTX, generateXLSX } from '../services/document/index.js';
import JiraService from '../services/jira/index.js';
import ConfluenceService from '../services/confluence/index.js';

const router = Router();

// ============ 文档生成 API ============

// 生成文档内容
router.post('/document/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, type, model } = req.body as {
      prompt?: string;
      type?: string;
      model?: string;
    };

    if (!prompt) {
      res.status(400).json({ success: false, error: '缺少 prompt 参数' });
      return;
    }

    const finalType = type || 'markdown';
    const finalModel = model || 'minimax';

    let result;
    switch (finalType) {
      case 'pptx':
        result = await generatePPT(prompt, finalModel);
        break;
      case 'xlsx':
        result = await generateExcel(prompt, finalModel);
        break;
      case 'pptx-export':
        const pptResult = await generatePPT(prompt, finalModel);
        if (pptResult.success && pptResult.code) {
          const data = JSON.parse(pptResult.code);
          result = generatePPTX(data);
        } else {
          result = pptResult;
        }
        break;
      case 'xlsx-export':
        const xlsResult = await generateExcel(prompt, finalModel);
        if (xlsResult.success && xlsResult.code) {
          const data = JSON.parse(xlsResult.code);
          result = generateXLSX(data);
        } else {
          result = xlsResult;
        }
        break;
      default:
        result = await generateDocument(prompt, finalModel);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
});

// ============ Jira API ============

// Jira 配置
const getJiraService = () => new JiraService({
  baseUrl: process.env.JIRA_BASE_URL || '',
  email: process.env.JIRA_EMAIL || '',
  apiToken: process.env.JIRA_API_TOKEN || '',
  defaultProject: process.env.JIRA_DEFAULT_PROJECT || undefined,
  defaultType: (process.env.JIRA_DEFAULT_TYPE as any) || 'Story'
});

// 生成 Jira Issue（仅生成，不推送）
router.post('/jira/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, model } = req.body as { prompt?: string; model?: string };
    if (!prompt) {
      res.status(400).json({ success: false, error: '缺少 prompt 参数' });
      return;
    }

    const jira = getJiraService();
    const result = await jira.generateFromPrompt(prompt, model || 'minimax');
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
});

// 生成并推送到 Jira
router.post('/jira/push', async (req: Request, res: Response) => {
  try {
    const { prompt, model } = req.body as { prompt?: string; model?: string };
    if (!prompt) {
      res.status(400).json({ success: false, error: '缺少 prompt 参数' });
      return;
    }

    const jira = getJiraService();
    const result = await jira.generateAndPushToJira(prompt, model || 'minimax');
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
});

// ============ Confluence API ============

// Confluence 配置
const getConfluenceService = () => new ConfluenceService({
  baseUrl: process.env.CONFLUENCE_BASE_URL || '',
  email: process.env.CONFLUENCE_EMAIL || '',
  apiToken: process.env.CONFLUENCE_API_TOKEN || '',
  defaultSpace: process.env.CONFLUENCE_DEFAULT_SPACE || undefined,
  defaultParentPageId: process.env.CONFLUENCE_DEFAULT_PARENT_PAGE_ID || undefined
});

// 生成 Confluence 页面（仅生成，不推送）
router.post('/confluence/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, model } = req.body as { prompt?: string; model?: string };
    if (!prompt) {
      res.status(400).json({ success: false, error: '缺少 prompt 参数' });
      return;
    }

    const confluence = getConfluenceService();
    const result = await confluence.generateFromPrompt(prompt, model || 'minimax');
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
});

// 生成并推送到 Confluence
router.post('/confluence/push', async (req: Request, res: Response) => {
  try {
    const { prompt, model } = req.body as { prompt?: string; model?: string };
    if (!prompt) {
      res.status(400).json({ success: false, error: '缺少 prompt 参数' });
      return;
    }

    const confluence = getConfluenceService();
    const result = await confluence.generateAndPushToConfluence(prompt, model || 'minimax');
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
});

export default router;
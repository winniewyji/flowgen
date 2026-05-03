import { Router } from 'express';
import type { Request, Response } from 'express';
import { generateDiagram, getEnabledModels } from '../services/ai/index.js';
import type { ChartType } from '../services/ai/types.js';

const router = Router();

// 获取可用模型
router.get('/models', (_req: Request, res: Response) => {
  const models = getEnabledModels();
  res.json({ models });
});

// 生成图表
router.post('/diagram/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, chartType, model } = req.body as {
      prompt?: string;
      chartType?: string;
      model?: string;
    };

    if (!prompt) {
      res.status(400).json({ success: false, error: '缺少 prompt 参数' });
      return;
    }

    const validChartTypes: ChartType[] = ['flowchart', 'sequence', 'gantt', 'class', 'state', 'er'];
    const validModels = ['minimax', 'openai'];

    const finalChartType: ChartType = (validChartTypes.includes(chartType as ChartType) 
      ? chartType 
      : 'flowchart') as ChartType;
    const finalModelStr: string = model || 'minimax';
    const finalModel: string = validModels.includes(finalModelStr) ? finalModelStr : 'minimax';

    const result = await generateDiagram({
      prompt,
      chartType: finalChartType,
      model: finalModel
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : '服务器内部错误' 
    });
  }
});

export default router;
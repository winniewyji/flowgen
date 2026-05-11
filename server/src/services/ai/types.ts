export type ChartType = 'flowchart' | 'sequence' | 'gantt' | 'class' | 'state' | 'er';

export interface AIModel {
  id: string;
  name: string;
  enabled: boolean;
  icon?: string;
}

export interface GenerateOptions {
  prompt: string;
  chartType: ChartType;
  model: string;
}

export interface GenerateResult {
  success: boolean;
  code?: string;
  text?: string;  // 兼容部分返回值
  error?: string;
}
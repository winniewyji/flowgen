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
  error?: string;
}
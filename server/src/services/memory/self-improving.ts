/**
 * Self-Improving Agent Integration - FlowGen
 * 结合 self-improving-agent 技能的能力
 * 持续学习、错误捕获、经验积累
 */

import fs from 'fs';
import path from 'path';

interface LearningEntry {
  id: string;
  type: 'correction' | 'error' | 'insight' | 'best_practice' | 'knowledge_gap';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'resolved' | 'promoted';
  area: 'frontend' | 'backend' | 'ai' | 'config';
  summary: string;
  details: string;
  suggestedAction: string;
  timestamp: string;
  source: string;
}

interface ErrorEntry {
  id: string;
  skillOrCommand: string;
  summary: string;
  errorMessage: string;
  context: string;
  suggestedFix: string;
  reproducible: boolean;
  timestamp: string;
}

interface FeatureRequest {
  id: string;
  capability: string;
  userContext: string;
  complexity: 'simple' | 'medium' | 'complex';
  suggestedImplementation: string;
  frequency: 'first_time' | 'recurring';
  timestamp: string;
}

// 学习记录目录
const LEARNINGS_DIR = path.join(process.cwd(), '.learnings');

export class SelfImprovingService {
  private initialized = false;

  /**
   * 初始化学习目录
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // 确保目录存在
    const dirs = [
      LEARNINGS_DIR,
      path.join(LEARNINGS_DIR, 'logs')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // 确保文件存在
    const files = [
      { name: 'LEARNINGS.md', header: '# Learnings\n\nCorrections, insights, and knowledge gaps captured during development.\n\n**Categories**: correction | insight | knowledge_gap | best_practice\n\n---\n' },
      { name: 'ERRORS.md', header: '# Errors\n\nCommand failures and integration errors.\n\n---\n' },
      { name: 'FEATURE_REQUESTS.md', header: '# Feature Requests\n\nCapabilities requested by the user.\n\n---\n' }
    ];

    for (const file of files) {
      const filePath = path.join(LEARNINGS_DIR, file.name);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, file.header);
      }
    }

    this.initialized = true;
    console.log('[SelfImproving] 学习系统已初始化');
  }

  /**
   * 记录一次纠正
   */
  async logCorrection(
    summary: string,
    details: string,
    suggestedAction: string,
    area: LearningEntry['area'] = 'ai'
  ): Promise<void> {
    await this.init();

    const entry: LearningEntry = {
      id: this.generateId('LRN'),
      type: 'correction',
      priority: 'medium',
      status: 'pending',
      area,
      summary,
      details,
      suggestedAction,
      timestamp: new Date().toISOString(),
      source: 'user_feedback'
    };

    const content = this.formatLearningEntry(entry);
    await this.appendToFile('LEARNINGS.md', content);

    console.log(`[SelfImproving] 记录纠正: ${entry.id} - ${summary}`);
  }

  /**
   * 记录一次错误
   */
  async logError(
    skillOrCommand: string,
    summary: string,
    errorMessage: string,
    context: string,
    suggestedFix: string,
    reproducible = false
  ): Promise<void> {
    await this.init();

    const entry: ErrorEntry = {
      id: this.generateId('ERR'),
      skillOrCommand,
      summary,
      errorMessage,
      context,
      suggestedFix,
      reproducible,
      timestamp: new Date().toISOString()
    };

    const content = this.formatErrorEntry(entry);
    await this.appendToFile('ERRORS.md', content);

    console.log(`[SelfImproving] 记录错误: ${entry.id} - ${skillOrCommand}`);
  }

  /**
   * 记录功能请求
   */
  async logFeatureRequest(
    capability: string,
    userContext: string,
    suggestedImplementation: string,
    complexity: FeatureRequest['complexity'] = 'medium'
  ): Promise<void> {
    await this.init();

    const entry: FeatureRequest = {
      id: this.generateId('FEAT'),
      capability,
      userContext,
      complexity,
      suggestedImplementation,
      frequency: 'first_time',
      timestamp: new Date().toISOString()
    };

    const content = this.formatFeatureRequest(entry);
    await this.appendToFile('FEATURE_REQUESTS.md', content);

    console.log(`[SelfImproving] 记录功能请求: ${entry.id} - ${capability}`);
  }

  /**
   * 记录洞察/最佳实践
   */
  async logInsight(summary: string, details: string, suggestedAction: string): Promise<void> {
    await this.logCorrection(summary, details, suggestedAction, 'ai');
    // 额外标记为 best_practice 类型（通过追加到 summary）
  }

  /**
   * 获取待处理的学习项
   */
  async getPendingLearnings(): Promise<{ learnings: number; errors: number; features: number }> {
    await this.init();

    const learnings = await this.countPending('LEARNINGS.md');
    const errors = await this.countPending('ERRORS.md');
    const features = await this.countPending('FEATURE_REQUESTS.md');

    return { learnings, errors, features };
  }

  /**
   * 解决一个学习项
   */
  async resolveEntry(fileName: string, entryId: string, resolution: string): Promise<void> {
    await this.init();

    const filePath = path.join(LEARNINGS_DIR, fileName);
    let content = fs.readFileSync(filePath, 'utf-8');

    // 查找并更新条目
    const pattern = new RegExp(`## \\[${entryId}\\]`, 'g');
    if (pattern.test(content)) {
      content = content.replace(pattern, `## [${entryId}]`);
      
      // 添加解决信息
      const resolvedBlock = `\n\n### Resolution\n- **Resolved**: ${new Date().toISOString()}\n- **Notes**: ${resolution}\n`;
      
      // 找到条目的结束位置（在下一个 ## 或文件末尾）
      const entryStart = content.indexOf(`## [${entryId}]`);
      const nextEntry = content.indexOf('\n## [', entryStart + entryId.length + 5);
      const entryEnd = nextEntry > 0 ? nextEntry : content.length;
      
      const before = content.slice(0, entryEnd);
      const after = content.slice(entryEnd);
      
      content = before + resolvedBlock + after;
      
      // 更新状态
      content = content.replace(
        `## [${entryId}]`,
        `## [${entryId}]\n**Status**: resolved`
      );
      
      fs.writeFileSync(filePath, content);
      console.log(`[SelfImproving] 已解决: ${entryId}`);
    }
  }

  private generateId(prefix: string): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${date}-${random}`;
  }

  private formatLearningEntry(entry: LearningEntry): string {
    return `
## [${entry.id}] ${entry.type}

**Logged**: ${entry.timestamp}
**Priority**: ${entry.priority}
**Status**: ${entry.status}
**Area**: ${entry.area}

### Summary
${entry.summary}

### Details
${entry.details}

### Suggested Action
${entry.suggestedAction}

### Metadata
- Source: ${entry.source}

---
`;
  }

  private formatErrorEntry(entry: ErrorEntry): string {
    return `
## [${entry.id}] ${entry.skillOrCommand}

**Logged**: ${entry.timestamp}
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
${entry.summary}

### Error
\`\`\`
${entry.errorMessage}
\`\`\`

### Context
${entry.context}

### Suggested Fix
${entry.suggestedFix}

### Metadata
- Reproducible: ${entry.reproducible ? 'yes' : 'no'}

---
`;
  }

  private formatFeatureRequest(entry: FeatureRequest): string {
    return `
## [${entry.id}] ${entry.capability}

**Logged**: ${entry.timestamp}
**Priority**: medium
**Status**: pending
**Area**: frontend

### Requested Capability
${entry.capability}

### User Context
${entry.userContext}

### Complexity Estimate
${entry.complexity}

### Suggested Implementation
${entry.suggestedImplementation}

### Metadata
- Frequency: ${entry.frequency}

---
`;
  }

  private async appendToFile(fileName: string, content: string): Promise<void> {
    const filePath = path.join(LEARNINGS_DIR, fileName);
    fs.appendFileSync(filePath, content);
  }

  private async countPending(fileName: string): Promise<number> {
    const filePath = path.join(LEARNINGS_DIR, fileName);
    if (!fs.existsSync(filePath)) return 0;

    const content = fs.readFileSync(filePath, 'utf-8');
    const matches = content.match(/\*\*Status\*\*: pending/g);
    return matches ? matches.length : 0;
  }
}

export const selfImproving = new SelfImprovingService();
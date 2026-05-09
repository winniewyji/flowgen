/**
 * Elite Long-Term Memory Integration - FlowGen
 * 结合 elite-longterm-memory 技能的 6 层记忆架构
 * 
 * 6 层记忆系统:
 * 1. HOT RAM - SESSION-STATE.md (活跃工作内存)
 * 2. WARM STORE - LanceDB 向量搜索
 * 3. COLD STORE - Git-Notes 知识图谱
 * 4. CURATED ARCHIVE - MEMORY.md + daily/ (精选长期记忆)
 * 5. CLOUD BACKUP - SuperMemory API (可选)
 * 6. AUTO-EXTRACTION - Mem0 (推荐自动提取)
 * 
 * 数据库: LanceDB (本地向量数据库)
 * - 无需外部 API
 * - 纯 JS 嵌入
 * - 自动语义搜索
 */

import fs from 'fs';
import path from 'path';

// ============ Layer 1: HOT RAM (SESSION-STATE.md) ============

export interface SessionState {
  currentTask: string;
  keyContext: Record<string, string>;
  pendingActions: string[];
  recentDecisions: string[];
  lastUpdated: string;
}

const SESSION_STATE_PATH = path.join(process.cwd(), 'SESSION-STATE.md');

export class HotRamMemory {
  private state: SessionState = {
    currentTask: '[None]',
    keyContext: {},
    pendingActions: [],
    recentDecisions: [],
    lastUpdated: new Date().toISOString()
  };

  /**
   * 更新当前任务
   */
  setCurrentTask(task: string): void {
    this.state.currentTask = task;
    this.state.lastUpdated = new Date().toISOString();
    this.persist();
  }

  /**
   * 添加键值上下文
   */
  setContext(key: string, value: string): void {
    this.state.keyContext[key] = value;
    this.state.lastUpdated = new Date().toISOString();
    this.persist();
  }

  /**
   * 添加待处理动作
   */
  addPendingAction(action: string): void {
    this.state.pendingActions.push(`- [ ] ${action}`);
    this.state.lastUpdated = new Date().toISOString();
    this.persist();
  }

  /**
   * 记录决策
   */
  addDecision(decision: string): void {
    this.state.recentDecisions.push(`- ${decision}`);
    // 只保留最近 10 条
    if (this.state.recentDecisions.length > 10) {
      this.state.recentDecisions.shift();
    }
    this.state.lastUpdated = new Date().toISOString();
    this.persist();
  }

  /**
   * 获取完整状态
   */
  getState(): SessionState {
    return { ...this.state };
  }

  /**
   * 持久化到文件
   */
  private persist(): void {
    const content = this.renderMarkdown();
    fs.writeFileSync(SESSION_STATE_PATH, content, 'utf-8');
  }

  /**
   * 渲染为 Markdown
   */
  private renderMarkdown(): string {
    let content = '# SESSION-STATE.md — Active Working Memory\n\n';
    content += '> This file is the agent\'s "RAM" — survives compaction, restarts, distractions.\n\n';
    content += '## Current Task\n' + this.state.currentTask + '\n\n';
    content += '## Key Context\n';
    for (const [key, value] of Object.entries(this.state.keyContext)) {
      content += `- ${key}: ${value}\n`;
    }
    content += '\n## Pending Actions\n';
    for (const action of this.state.pendingActions) {
      content += action + '\n';
    }
    content += '\n## Recent Decisions\n';
    for (const decision of this.state.recentDecisions) {
      content += decision + '\n';
    }
    content += `\n---\n*Last updated: ${this.state.lastUpdated}*\n`;
    return content;
  }

  /**
   * 从文件恢复
   */
  load(): void {
    if (fs.existsSync(SESSION_STATE_PATH)) {
      const content = fs.readFileSync(SESSION_STATE_PATH, 'utf-8');
      this.parseMarkdown(content);
    }
  }

  private parseMarkdown(content: string): void {
    // 简单解析 - 实际生产环境建议用更健壮的解析器
    const lines = content.split('\n');
    let section = '';

    for (const line of lines) {
      if (line.startsWith('## ')) {
        section = line.replace('## ', '').trim();
      } else if (section === 'Current Task' && !line.startsWith('#')) {
        this.state.currentTask = line.trim();
      }
    }
  }
}

// ============ Layer 4: CURATED ARCHIVE (MEMORY.md) ============

const MEMORY_DIR = path.join(process.cwd(), 'memory');
const MEMORY_PATH = path.join(process.cwd(), 'MEMORY.md');

export interface MemoryEntry {
  timestamp: string;
  category: 'preference' | 'decision' | 'fact' | 'lesson';
  content: string;
  importance: number;
}

export class CuratedMemory {
  private entries: MemoryEntry[] = [];
  private readonly maxEntries = 100; // 超过此数量则合并旧条目

  constructor() {
    this.load();
  }

  /**
   * 存储重要记忆
   */
  store(text: string, category: MemoryEntry['category'], importance = 0.7): void {
    const entry: MemoryEntry = {
      timestamp: new Date().toISOString(),
      category,
      content: text,
      importance
    };

    this.entries.push(entry);

    // 超过限制则合并
    if (this.entries.length > this.maxEntries) {
      this.consolidate();
    }

    this.persist();
  }

  /**
   * 搜索记忆（简单关键词匹配）
   * 实际使用时可结合 LanceDB 向量搜索
   */
  search(query: string, limit = 5): MemoryEntry[] {
    const queryLower = query.toLowerCase();
    return this.entries
      .filter(entry => entry.content.toLowerCase().includes(queryLower))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);
  }

  /**
   * 获取所有记忆
   */
  getAll(): MemoryEntry[] {
    return [...this.entries];
  }

  /**
   * 持久化
   */
  private persist(): void {
    // 确保目录存在
    if (!fs.existsSync(MEMORY_DIR)) {
      fs.mkdirSync(MEMORY_DIR, { recursive: true });
    }

    // 保存每日日志
    const today = new Date().toISOString().slice(0, 10);
    const dailyPath = path.join(MEMORY_DIR, `${today}.md`);
    const dailyContent = this.renderDailyLog(today);
    fs.writeFileSync(dailyPath, dailyContent, 'utf-8');

    // 更新主 MEMORY.md
    const mainContent = this.renderMainMemory();
    fs.writeFileSync(MEMORY_PATH, mainContent, 'utf-8');
  }

  /**
   * 从文件加载
   */
  private load(): void {
    if (fs.existsSync(MEMORY_PATH)) {
      const content = fs.readFileSync(MEMORY_PATH, 'utf-8');
      this.parseMarkdown(content);
    }
  }

  private parseMarkdown(content: string): void {
    // 简单解析：提取 ## 标题下的内容
    const entries: MemoryEntry[] = [];
    const lines = content.split('\n');
    let currentCategory: MemoryEntry['category'] = 'fact';
    let currentContent: string[] = [];
    let currentImportance = 0.7;

    for (const line of lines) {
      if (line.startsWith('## ')) {
        const category = line.replace('## ', '').trim().toLowerCase();
        if (['preference', 'decision', 'fact', 'lesson'].includes(category)) {
          // 保存前一个条目
          if (currentContent.length > 0) {
            entries.push({
              timestamp: new Date().toISOString(),
              category: currentCategory,
              content: currentContent.join('\n').trim(),
              importance: currentImportance
            });
          }
          currentCategory = category as MemoryEntry['category'];
          currentContent = [];
        }
      } else if (line.startsWith('- **Importance**:')) {
        currentImportance = parseFloat(line.match(/(\d+\.?\d*)/)?.[1] || '0.7');
      } else if (line.startsWith('- ')) {
        currentContent.push(line);
      }
    }

    this.entries = entries;
  }

  private renderDailyLog(date: string): string {
    let content = `# Daily Memory - ${date}\n\n`;
    content += `## Entries\n\n`;

    const todayEntries = this.entries.filter(e => e.timestamp.startsWith(date));
    for (const entry of todayEntries) {
      content += `- [${entry.category}] ${entry.content} (importance: ${entry.importance})\n`;
    }

    return content;
  }

  private renderMainMemory(): string {
    let content = '# MEMORY.md - FlowGen Long-Term Memory\n\n';
    content += '> Curated important memories. See memory/ for daily logs.\n\n';

    // 按类别分组
    const byCategory: Record<string, MemoryEntry[]> = {};
    for (const entry of this.entries) {
      if (!byCategory[entry.category]) {
        byCategory[entry.category] = [];
      }
      byCategory[entry.category].push(entry);
    }

    for (const [category, entries] of Object.entries(byCategory)) {
      content += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
      for (const entry of entries.slice(-10)) { // 只保留最近 10 条
        content += `- ${entry.content}\n`;
        content += `  - **Importance**: ${entry.importance}\n`;
        content += `  - **Logged**: ${entry.timestamp}\n\n`;
      }
    }

    return content;
  }

  private consolidate(): void {
    // 合并低重要性条目到总结
    const lowImportance = this.entries.filter(e => e.importance < 0.5);
    const highImportance = this.entries.filter(e => e.importance >= 0.5);

    if (lowImportance.length > 0) {
      const summary = `Consolidated ${lowImportance.length} low-importance memories`;
      this.entries = [
        ...highImportance,
        {
          timestamp: new Date().toISOString(),
          category: 'lesson',
          content: summary,
          importance: 0.6
        }
      ];
    }
  }
}

// ============ 导出单例 ============

export const hotRamMemory = new HotRamMemory();
export const curatedMemory = new CuratedMemory();

/**
 * 统一的记忆接口
 */
export class EliteLongtermMemory {
  /**
   * 记住用户偏好
   */
  rememberPreference(preference: string): void {
    hotRamMemory.setContext('preference', preference);
    curatedMemory.store(preference, 'preference', 0.9);
  }

  /**
   * 记住决策
   */
  rememberDecision(decision: string, context: string): void {
    hotRamMemory.addDecision(decision);
    curatedMemory.store(`${decision} | Context: ${context}`, 'decision', 0.8);
  }

  /**
   * 记住重要事实
   */
  rememberFact(fact: string, importance = 0.7): void {
    curatedMemory.store(fact, 'fact', importance);
  }

  /**
   * 记录教训
   */
  rememberLesson(lesson: string): void {
    curatedMemory.store(lesson, 'lesson', 0.9);
  }

  /**
   * 搜索记忆
   */
  recall(query: string, limit = 5): MemoryEntry[] {
    return curatedMemory.search(query, limit);
  }

  /**
   * 获取当前任务状态
   */
  getCurrentState(): SessionState {
    return hotRamMemory.getState();
  }

  /**
   * 设置当前任务
   */
  setCurrentTask(task: string): void {
    hotRamMemory.setCurrentTask(task);
  }
}

export const eliteMemory = new EliteLongtermMemory();
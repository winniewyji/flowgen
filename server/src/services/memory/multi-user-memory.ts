/**
 * Multi-User Memory System - FlowGen
 * 分层记忆：共享 + 私有
 * 
 * 架构：
 * memory/
 * ├── _shared/                    # 共享记忆 (所有人可见)
 * │   ├── best-practices.md        # 通用最佳实践
 * │   ├── common-facts.md          # 公共知识库
 * │   └── errors/                  # 共享错误记录
 * │       └── shared-errors.md
 * └── users/                       # 用户私有记忆
 *     ├── {userId}/
 *     │   ├── SESSION-STATE.md     # 活跃工作内存
 *     │   ├── MEMORY.md            # 精选长期记忆
 *     │   └── memory/              # 每日日志
 *     │       └── YYYY-MM-DD.md
 *     └── .learnings/             # 用户自学习记录 (私有)
 */

import fs from 'fs';
import path from 'path';

// ============ 常量 ============

const BASE_DIR = process.cwd();
const SHARED_DIR = path.join(BASE_DIR, 'memory', '_shared');
const USERS_DIR = path.join(BASE_DIR, 'memory', 'users');

// ============ 共享记忆 (Shared Memory) ============

export interface SharedBestPractice {
  id: string;
  category: string;
  title: string;
  content: string;
  author: string;
  timestamp: string;
  votes: number;
}

export class SharedMemory {
  private readonly sharedDir: string;

  constructor(sharedDir = SHARED_DIR) {
    this.sharedDir = sharedDir;
    this.ensureDirs();
  }

  private ensureDirs(): void {
    const dirs = [
      this.sharedDir,
      path.join(this.sharedDir, 'errors'),
      path.join(this.sharedDir, 'facts'),
      path.join(this.sharedDir, 'practices')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // 确保基础文件存在
    this.ensureFile(path.join(this.sharedDir, 'best-practices.md'), this.getBestPracticesTemplate());
    this.ensureFile(path.join(this.sharedDir, 'common-facts.md'), this.getCommonFactsTemplate());
    this.ensureFile(path.join(this.sharedDir, 'errors', 'shared-errors.md'), this.getSharedErrorsTemplate());
  }

  private ensureFile(filePath: string, defaultContent: string): void {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, defaultContent, 'utf-8');
    }
  }

  private getBestPracticesTemplate(): string {
    return `# 共享最佳实践

> 所有用户共享的开发和设计最佳实践

## 分类

### 代码规范
-

### 架构设计
-

### 性能优化
-

### 安全
-

---
*最后更新: ${new Date().toISOString()}*`;
  }

  private getCommonFactsTemplate(): string {
    return `# 公共知识库

> 所有用户共享的技术知识和文档

## 技术栈

### 前端 (Vue 3 + TypeScript)
-

### 后端 (Express + TypeScript)
-

### AI 模型
-

---
*最后更新: ${new Date().toISOString()}*`;
  }

  private getSharedErrorsTemplate(): string {
    return `# 共享错误记录

> 所有用户都会遇到的常见错误及解决方案

## API 错误

## 配置错误

## 运行时错误

---
*最后更新: ${new Date().toISOString()}*`;
  }

  /**
   * 添加共享最佳实践
   */
  addBestPractice(category: string, title: string, content: string, author: string): SharedBestPractice {
    const filePath = path.join(this.sharedDir, 'best-practices.md');
    const contentToAdd = `\n### ${title}\n${content}\n- **Author**: ${author}\n- **Date**: ${new Date().toISOString()}\n`;
    
    fs.appendFileSync(filePath, contentToAdd, 'utf-8');

    return {
      id: this.generateId(),
      category,
      title,
      content,
      author,
      timestamp: new Date().toISOString(),
      votes: 0
    };
  }

  /**
   * 添加共享错误记录
   */
  addSharedError(errorType: string, description: string, solution: string, author: string): void {
    const filePath = path.join(this.sharedDir, 'errors', 'shared-errors.md');
    const contentToAdd = `\n## ${errorType}\n\n**描述**: ${description}\n\n**解决方案**: ${solution}\n\n**报告人**: ${author} | **时间**: ${new Date().toISOString()}\n\n---\n`;
    
    fs.appendFileSync(filePath, contentToAdd, 'utf-8');
  }

  /**
   * 获取共享最佳实践
   */
  getBestPractices(category?: string): string {
    const filePath = path.join(this.sharedDir, 'best-practices.md');
    if (!fs.existsSync(filePath)) return '';
    
    let content = fs.readFileSync(filePath, 'utf-8');
    if (category) {
      // 简单过滤：实际生产环境需要更复杂的解析
      const lines = content.split('\n');
      let inCategory = false;
      let result = [];
      
      for (const line of lines) {
        if (line.startsWith('### ')) {
          inCategory = line.includes(category);
        }
        if (inCategory) result.push(line);
      }
      content = result.join('\n');
    }
    
    return content;
  }

  /**
   * 获取共享错误记录
   */
  getSharedErrors(): string {
    const filePath = path.join(this.sharedDir, 'errors', 'shared-errors.md');
    if (!fs.existsSync(filePath)) return '';
    return fs.readFileSync(filePath, 'utf-8');
  }

  private generateId(): string {
    return `shared_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}

// ============ 用户私有记忆 (Private Memory) ============

export interface UserMemoryEntry {
  id: string;
  type: 'preference' | 'decision' | 'fact' | 'lesson';
  content: string;
  importance: number;
  timestamp: string;
}

export class UserPrivateMemory {
  private readonly userId: string;
  private readonly userDir: string;

  constructor(userId: string, baseDir = USERS_DIR) {
    this.userId = this.sanitizeUserId(userId);
    this.userDir = path.join(baseDir, this.userId);
    this.ensureUserDirs();
  }

  private sanitizeUserId(userId: string): string {
    // 防止路径遍历攻击
    return userId.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);
  }

  private ensureUserDirs(): void {
    const dirs = [
      this.userDir,
      path.join(this.userDir, 'memory'),
      path.join(this.userDir, '.learnings')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // 确保用户文件存在
    this.ensureFile(path.join(this.userDir, 'SESSION-STATE.md'), this.getSessionStateTemplate());
    this.ensureFile(path.join(this.userDir, 'MEMORY.md'), this.getUserMemoryTemplate());
  }

  private ensureFile(filePath: string, defaultContent: string): void {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, defaultContent, 'utf-8');
    }
  }

  private getSessionStateTemplate(): string {
    return `# SESSION-STATE.md — ${this.userId} Active Working Memory

> User-specific "RAM" — survives compaction, restarts

## Current Task
[None]

## Key Context
[None yet]

## Pending Actions
- [ ] None

## Recent Decisions
[None yet]

---
*Last updated: ${new Date().toISOString()}*
*User: ${this.userId}*`;
  }

  private getUserMemoryTemplate(): string {
    return `# MEMORY.md - ${this.userId} Long-Term Memory

> User's private curated memories. See memory/ for daily logs.

## Preferences

## Decisions

## Facts

## Lessons

---
*Last updated: ${new Date().toISOString()}*`;
  }

  // ============ SESSION-STATE 操作 ============

  getSessionState(): { currentTask: string; keyContext: Record<string, string>; pendingActions: string[] } {
    const filePath = path.join(this.userDir, 'SESSION-STATE.md');
    if (!fs.existsSync(filePath)) {
      return { currentTask: '[None]', keyContext: {}, pendingActions: [] };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return this.parseSessionState(content);
  }

  setCurrentTask(task: string): void {
    const filePath = path.join(this.userDir, 'SESSION-STATE.md');
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // 简单替换：找到 "## Current Task" 后的内容
    content = content.replace(/## Current Task\n[\s\S]*?(?=\n## |$)/, `## Current Task\n${task}`);
    content = content.replace(/\*Last updated:.*?\*/, `*Last updated: ${new Date().toISOString()}*`);
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  setContext(key: string, value: string): void {
    const filePath = path.join(this.userDir, 'SESSION-STATE.md');
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // 追加到 Key Context 部分
    const newEntry = `\n- ${key}: ${value}`;
    content = content.replace(/(## Key Context\n)/, `$1${newEntry}`);
    content = content.replace(/\*Last updated:.*?\*/, `*Last updated: ${new Date().toISOString()}*`);
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  // ============ MEMORY 操作 ============

  store(type: UserMemoryEntry['type'], content: string, importance = 0.7): void {
    const filePath = path.join(this.userDir, 'MEMORY.md');
    let fileContent = fs.readFileSync(filePath, 'utf-8');

    const entry = `\n### ${type.charAt(0).toUpperCase() + type.slice(1)} [${new Date().toISOString()}]\n${content}\n- **Importance**: ${importance}\n`;
    
    // 根据类型追加到对应 section
    const sectionMarker = `## ${type.charAt(0).toUpperCase() + type.slice(1)}s`;
    if (fileContent.includes(sectionMarker)) {
      fileContent = fileContent.replace(sectionMarker, sectionMarker + entry);
    } else {
      fileContent += entry;
    }

    fs.writeFileSync(filePath, fileContent, 'utf-8');

    // 同时记录到每日日志
    this.addToDailyLog(type, content);
  }

  private addToDailyLog(type: string, content: string): void {
    const today = new Date().toISOString().slice(0, 10);
    const dailyFile = path.join(this.userDir, 'memory', `${today}.md`);
    
    const entry = `\n- [${type}] ${content} | User: ${this.userId} | Time: ${new Date().toISOString()}\n`;
    
    if (fs.existsSync(dailyFile)) {
      fs.appendFileSync(dailyFile, entry, 'utf-8');
    } else {
      const header = `# Daily Memory - ${today}\n\n## Entries\n\n`;
      fs.writeFileSync(dailyFile, header + entry, 'utf-8');
    }
  }

  search(query: string): UserMemoryEntry[] {
    const results: UserMemoryEntry[] = [];
    const queryLower = query.toLowerCase();

    // 搜索 MEMORY.md
    const memFile = path.join(this.userDir, 'MEMORY.md');
    if (fs.existsSync(memFile)) {
      const content = fs.readFileSync(memFile, 'utf-8');
      if (content.toLowerCase().includes(queryLower)) {
        // 简单解析，实际需要更复杂的提取
        results.push({
          id: this.generateId(),
          type: 'fact',
          content: content.substring(0, 200),
          importance: 0.7,
          timestamp: new Date().toISOString()
        });
      }
    }

    // 搜索每日日志
    const memoryDir = path.join(this.userDir, 'memory');
    if (fs.existsSync(memoryDir)) {
      const files = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(memoryDir, file), 'utf-8');
        if (content.toLowerCase().includes(queryLower)) {
          results.push({
            id: this.generateId(),
            type: 'fact',
            content: `Found in ${file}: ${content.substring(0, 100)}...`,
            importance: 0.5,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return results;
  }

  // ============ 自学习记录 (Private) ============

  getLearningsFile(): string {
    return path.join(this.userDir, '.learnings', 'LEARNINGS.md');
  }

  logCorrection(summary: string, details: string, area: string): void {
    const filePath = this.getLearningsFile();
    const entry = `\n## [LRN-${Date.now()}] correction\n\n**Summary**: ${summary}\n**Details**: ${details}\n**Area**: ${area}\n**Timestamp**: ${new Date().toISOString()}\n**User**: ${this.userId}\n\n---\n`;
    
    fs.appendFileSync(filePath, entry, 'utf-8');
  }

  logError(skillOrCommand: string, errorMessage: string, context: string): void {
    const filePath = path.join(this.userDir, '.learnings', 'ERRORS.md');
    const entry = `\n## [ERR-${Date.now()}] ${skillOrCommand}\n\n**Error**: ${errorMessage}\n**Context**: ${context}\n**Timestamp**: ${new Date().toISOString()}\n**User**: ${this.userId}\n\n---\n`;
    
    fs.appendFileSync(filePath, entry, 'utf-8');
  }

  private parseSessionState(content: string): { currentTask: string; keyContext: Record<string, string>; pendingActions: string[] } {
    const lines = content.split('\n');
    let currentTask = '[None]';
    const keyContext: Record<string, string> = {};
    const pendingActions: string[] = [];
    let section = '';

    for (const line of lines) {
      if (line.startsWith('## ')) {
        section = line.replace('## ', '').trim();
      } else if (section === 'Current Task' && !line.startsWith('#')) {
        currentTask = line.trim() || currentTask;
      } else if (section === 'Key Context' && line.startsWith('- ')) {
        const match = line.match(/- (.+?): (.+)/);
        if (match) keyContext[match[1]] = match[2];
      } else if (section === 'Pending Actions' && line.includes('- [ ]')) {
        pendingActions.push(line.replace('- [ ]', '').trim());
      }
    }

    return { currentTask, keyContext, pendingActions };
  }

  private generateId(): string {
    return `${this.userId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  getUserDir(): string {
    return this.userDir;
  }
}

// ============ 统一入口 ============

export class MultiUserMemory {
  private sharedMemory: SharedMemory;
  private userMemories: Map<string, UserPrivateMemory> = new Map();

  constructor() {
    this.sharedMemory = new SharedMemory();
  }

  /**
   * 获取用户的私有记忆
   */
  forUser(userId: string): UserPrivateMemory {
    if (!this.userMemories.has(userId)) {
      this.userMemories.set(userId, new UserPrivateMemory(userId));
    }
    return this.userMemories.get(userId)!;
  }

  /**
   * 获取共享记忆
   */
  getShared(): SharedMemory {
    return this.sharedMemory;
  }

  /**
   * 记住用户偏好 (私有)
   */
  rememberPreference(userId: string, preference: string): void {
    this.forUser(userId).store('preference', preference, 0.9);
  }

  /**
   * 记住决策 (私有)
   */
  rememberDecision(userId: string, decision: string, context: string): void {
    this.forUser(userId).store('decision', `${decision} | Context: ${context}`, 0.8);
  }

  /**
   * 记住事实 (私有)
   */
  rememberFact(userId: string, fact: string, importance = 0.7): void {
    this.forUser(userId).store('fact', fact, importance);
  }

  /**
   * 记录教训 (私有)
   */
  rememberLesson(userId: string, lesson: string): void {
    this.forUser(userId).store('lesson', lesson, 0.9);
  }

  /**
   * 添加共享最佳实践 (共享)
   */
  addSharedBestPractice(category: string, title: string, content: string, author: string): SharedBestPractice {
    return this.sharedMemory.addBestPractice(category, title, content, author);
  }

  /**
   * 添加共享错误 (共享)
   */
  addSharedError(errorType: string, description: string, solution: string, author: string): void {
    this.sharedMemory.addSharedError(errorType, description, solution, author);
  }

  /**
   * 搜索 (私有 + 共享)
   */
  search(userId: string, query: string): { private: UserMemoryEntry[]; shared: string } {
    const privateResults = this.forUser(userId).search(query);
    const sharedResults = this.sharedMemory.getBestPractices();
    
    return {
      private: privateResults,
      shared: sharedResults
    };
  }
}

export const multiUserMemory = new MultiUserMemory();
# FlowGen 研究发现

## Skills 调研结果

### 已安装 Skills (2026-05-09)

| Skill | 版本 | 用途 |
|-------|------|------|
| self-improving-agent | 3.0.21 | 持续学习、错误捕获 |
| elite-longterm-memory | 1.2.3 | 6层记忆系统 |
| openclaw-token-optimizer | 3.0.0 | Token 优化 |
| openclaw-smart-scheduler | 1.0.1 | 智能任务调度 |
| workflow-automator | 2.3.5 | 工作流自动化 |
| free-ride | 1.0.11 | 免费 AI 模型 |
| agent-browser | - | 浏览器自动化 |
| auto-updater-pro | 1.1.0 | 自动更新 |
| planning-with-files | 2.36.1 | 文件规划 |
| superpowers-systematic-debugging | 1.0.0 | 系统调试 |
| notebooklm-skill | 0.1.0 | NotebookLM 查询 |

---

## 技术方案

### 成本控制架构

```
┌─────────────────────────────────────┐
│         Cost Control Stack          │
├─────────────────────────────────────┤
│  Smart Model Router                 │
│  - 通信模式 → MiniMax (强制)        │
│  - 简单任务 → MiniMax (低成本)      │
│  - 复杂任务 → GPT-4 (高质量)         │
├─────────────────────────────────────┤
│  Budget Tracker                     │
│  - 日预算 $5 限制                   │
│  - 80% 警告阈值                    │
│  - 按模型/图表类型统计             │
├─────────────────────────────────────┤
│  Token Optimizer                    │
│  - LRU 缓存 (5分钟 TTL)            │
│  - 成本估算                        │
│  - Heartbeat 优化 (55min间隔)      │
└─────────────────────────────────────┘
```

### 记忆系统架构

```
┌─────────────────────────────────────┐
│         6-Layer Memory               │
├─────────────────────────────────────┤
│  HOT: SESSION-STATE.md              │
│  WARM: LanceDB Vectors              │
│  COLD: Git-Notes                    │
│  CURATED: MEMORY.md + memory/       │
│  CLOUD: SuperMemory (可选)          │
│  AUTO: Mem0 (自动提取)              │
└─────────────────────────────────────┘
```

---

## API 文档

### 成本控制 API

| Endpoint | Method | 描述 |
|----------|--------|------|
| `/api/cost/stats` | GET | 获取成本统计 |
| `/api/cost/budget` | GET | 获取预算状态 |
| `/api/cost/report` | GET | 生成成本报告 |
| `/api/cost/cache/clear` | POST | 清除缓存 |
| `/api/cost/reset` | POST | 重置日统计 |

### 记忆 API

| Endpoint | Method | 描述 |
|----------|--------|------|
| `/api/memory/preference` | POST | 记住偏好 |
| `/api/memory/decision` | POST | 记住决策 |
| `/api/memory/fact` | POST | 记住事实 |
| `/api/memory/lesson` | POST | 记录教训 |
| `/api/memory/recall` | GET | 搜索记忆 |
| `/api/memory/state` | GET | 获取当前状态 |
| `/api/learnings/pending` | GET | 待处理学习项 |
| `/api/learnings/correction` | POST | 记录纠正 |
| `/api/learnings/error` | POST | 记录错误 |
| `/api/learnings/feature` | POST | 记录功能请求 |

---

## 项目结构

```
flowgen/
├── client/                  # Vue 3 前端
│   └── src/components/      # 图表编辑器组件
├── server/                  # Express 后端
│   └── src/
│       ├── routes/          # API 路由
│       │   ├── diagram.ts   # 图表生成
│       │   ├── cost.ts       # 成本控制 (新增)
│       │   └── memory.ts     # 记忆系统 (新增)
│       ├── services/
│       │   ├── ai/           # AI 服务
│       │   ├── cost-control/ # 成本控制 (新增)
│       │   ├── memory/       # 记忆系统 (新增)
│       │   └── smart-scheduler/ # 智能调度 (新增)
│       └── prompts/         # 提示词模板
├── .learnings/              # 自学习记录
│   ├── LEARNINGS.md
│   ├── ERRORS.md
│   └── FEATURE_REQUESTS.md
├── task_plan.md             # 任务规划
├── findings.md             # 研究发现
└── progress.md             # 进度日志
```

---

## NotebookLM 集成说明

### 用途
当用户有 FlowGen 相关文档上传到 Google NotebookLM 时，可以使用此 skill 进行查询。

### 使用方式
1. 上传文档到 NotebookLM
2. 获取 notebook URL
3. 使用 notebooklm-skill 查询

### 示例
```bash
python scripts/run.py notebook_manager.py add \
  --url "https://notebooklm.google.com/notebook/..." \
  --name "FlowGen Docs" \
  --description "FlowGen 项目文档" \
  --topics "flowgen,diagram,mermaid,ai"

python scripts/run.py ask_question.py --question "如何配置 API Keys?"
```

---

*最后更新: 2026-05-09 11:30 GMT+8*
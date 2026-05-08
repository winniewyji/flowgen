# FlowGen - AI-Powered Diagram Generator

基于 AI 的智能图表生成工具，支持流程图、时序图、甘特图等，点击可编辑。

## 功能特性

- 🎨 AI 智能生成：输入提示词，自动生成各类图表
- 📊 支持多种图表：
  - 流程图 (Flowchart)
  - 时序图 (Sequence Diagram)
  - 甘特图 (Gantt Chart)
  - 类图 (Class Diagram)
  - 状态图 (State Diagram)
  - ER 图 (ER Diagram)
- ✏️ 可视化编辑：支持拖拽、添加、删除节点
- 🤖 多模型支持：ChatGPT、MiniMax 等配置
- 💾 代码即配置：所有模型通过代码配置，简单清晰

## 技术栈

- **前端**：Vue 3 + TypeScript + Mermaid.js + ElastiStack
- **后端**：Node.js + Express + 支持多 AI 模型
- **AI 模型**：支持 OpenAI、MiniMax 等

## 快速开始

### 后端

```bash
cd server
npm install
# 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的 API Key
npm run dev
```

### 前端

```bash
cd client
npm install
npm run dev
```

### 环境变量 (.env)

```env
# MiniMax API
MINIMAX_API_KEY=your_minimax_key
MINIMAX_BASE_URL=https://api.minimax.chat/v1

# OpenAI API (可选)
OPENAI_API_KEY=your_openai_key
OPENAI_BASE_URL=https://api.openai.com/v1

# 服务器端口
PORT=3001
```

## 项目结构

```
flowgen/
├── client/          # 前端 Vue 项目
│   ├── src/
│   │   ├── components/
│   │   │   ├── DiagramEditor.vue   # 图表编辑器
│   │   │   ├── ModelSelector.vue    # 模型选择器
│   │   │   └── PromptInput.vue      # 提示词输入
│   │   ├── App.vue
│   │   └── main.ts
│   └── package.json
├── server/          # 后端 Express 项目
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   └── diagram.ts
│   │   ├── services/
│   │   │   └── ai/
│   │   │       ├── index.ts        # AI 服务入口
│   │   │       ├── minimax.ts       # MiniMax 模型
│   │   │       ├── openai.ts        # OpenAI 模型
│   │   │       └── types.ts         # 模型类型定义
│   │   └── prompts/
│   │       └── diagram.ts           # 提示词模板
│   └── package.json
└── README.md
```

## API 接口

### 生成图表

```
POST /api/diagram/generate
Content-Type: application/json

{
  "prompt": "生成一个用户登录的流程图",
  "chartType": "flowchart",  // flowchart | sequence | gantt | class | state | er
  "model": "minimax"          // minimax | openai
}

Response:
{
  "success": true,
  "code": "flowchart TD\n    A[开始] --> B[输入用户名]\n    ..."
}
```

### 获取支持模型

```
GET /api/models

Response:
{
  "models": [
    { "id": "minimax", "name": "MiniMax", "enabled": true },
    { "id": "openai", "name": "ChatGPT", "enabled": true }
  ]
}
```

## License

MIT
# FlowGen 部署指南

## 环境要求

- Node.js >= 18
- npm >= 9
- 2GB+ RAM

---

## 方式一：Docker 部署（推荐）

### 1. 创建 docker-compose.yml

```yaml
version: '3.8'
services:
  flowgen:
    image: flowgen:latest
    container_name: flowgen
    ports:
      - "3001:3001"   # 后端 API
      - "5173:80"     # 前端 (Nginx)
    environment:
      - MINIMAX_API_KEY=${MINIMAX_API_KEY}
      - MINIMAX_BASE_URL=${MINIMAX_BASE_URL:-https://api.minimax.chat/v1}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENAI_BASE_URL=${OPENAI_BASE_URL:-https://api.openai.com/v1}
      - OPENAI_MODEL=${OPENAI_MODEL:-gpt-4o}
      - JIRA_BASE_URL=${JIRA_BASE_URL}
      - JIRA_EMAIL=${JIRA_EMAIL}
      - JIRA_API_TOKEN=${JIRA_API_TOKEN}
      - JIRA_DEFAULT_PROJECT=${JIRA_DEFAULT_PROJECT}
      - JIRA_DEFAULT_TYPE=${JIRA_DEFAULT_TYPE:-Story}
      - CONFLUENCE_BASE_URL=${CONFLUENCE_BASE_URL}
      - CONFLUENCE_EMAIL=${CONFLUENCE_EMAIL}
      - CONFLUENCE_API_TOKEN=${CONFLUENCE_API_TOKEN}
      - CONFLUENCE_DEFAULT_SPACE=${CONFLUENCE_DEFAULT_SPACE}
      - CONFLUENCE_DEFAULT_PARENT_PAGE_ID=${CONFLUENCE_DEFAULT_PARENT_PAGE_ID}
    restart: unless-stopped
```

### 2. 创建 .env 文件

```env
# AI 模型配置
MINIMAX_API_KEY=your_minimax_key
OPENAI_API_KEY=your_openai_key

# Jira 配置 (可选)
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your_jira_api_token
JIRA_DEFAULT_PROJECT=PROJECT
JIRA_DEFAULT_TYPE=Story

# Confluence 配置 (可选)
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
CONFLUENCE_EMAIL=your-email@company.com
CONFLUENCE_API_TOKEN=your_confluence_api_token
CONFLUENCE_DEFAULT_SPACE=DEV
```

### 3. 启动

```bash
docker-compose up -d
```

---

## 方式二：Windows 11 本地部署

### 1. 安装 Node.js

下载并安装：https://nodejs.org/ (LTS 版本)

验证：
```powershell
node --version
npm --version
```

### 2. 克隆项目

```powershell
git clone https://github.com/winniewyji/flowgen.git
cd flowgen
```

### 3. 配置

复制配置文件：
```powershell
copy server\.env.example server\.env
```

编辑 `server\.env`，填入你的 API keys

### 4. 安装依赖

```powershell
# 后端
cd server
npm install

# 前端
cd ..\client
npm install
```

### 5. 启动

**终端 1 - 后端：**
```powershell
cd server
npm run dev
```

**终端 2 - 前端：**
```powershell
cd client
npm run dev
```

### 6. 访问

- 前端：http://localhost:5173
- 后端：http://localhost:3001

---

## 方式三：Windows 11 + Docker Desktop

1. 安装 Docker Desktop：https://www.docker.com/products/docker-desktop

2. 克隆项目后，在项目根目录创建 `.env` 文件

3. 运行：
```powershell
docker-compose up -d
```

4. 访问：http://localhost:5173

---

## 方式四：PM2 进程管理（生产环境）

```bash
# 安装 PM2
npm install -g pm2

# 启动后端
pm2 start server/package.json --name flowgen-server -- start

# 保存进程列表
pm2 save

# 设置开机自启
pm2 startup
```

---

## 配置说明

### AI 模型配置 (.env)

```env
# MiniMax (默认)
MINIMAX_API_KEY=你的key

# OpenAI (可选)
OPENAI_API_KEY=你的key
OPENAI_MODEL=gpt-4o
```

### Jira 配置 (.env)

```env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your_api_token
JIRA_DEFAULT_PROJECT=YOUR_PROJECT_KEY
JIRA_DEFAULT_TYPE=Story  # Epic/Story/Task/Bug/Subtask
```

### Confluence 配置 (.env)

```env
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
CONFLUENCE_EMAIL=your-email@company.com
CONFLUENCE_API_TOKEN=your_api_token
CONFLUENCE_DEFAULT_SPACE=SPACE_KEY
CONFLUENCE_DEFAULT_PARENT_PAGE_ID=123456
```

---

## API 接口

| 功能 | 接口 | 方法 |
|------|------|------|
| 生成图表 | `/api/diagram/generate` | POST |
| 生成文档 | `/api/document/generate` | POST |
| 生成 Jira | `/api/jira/generate` | POST |
| 推送到 Jira | `/api/jira/push` | POST |
| 生成 Confluence | `/api/confluence/generate` | POST |
| 推送到 Confluence | `/api/confluence/push` | POST |

---

## 故障排除

### 端口被占用

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <pid> /F

# Linux/Mac
lsof -i :3001
kill -9 <pid>
```

### AI 返回错误

1. 检查 API Key 是否正确
2. 检查网络是否正常
3. 查看服务端日志
# FlowGen Dockerfile

FROM node:22-alpine AS builder

WORKDIR /app

# 复制并安装后端依赖
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# 复制并构建前端
COPY client/package*.json ./client/
RUN cd client && npm ci && npm run build

# 生产镜像
FROM node:22-alpine AS production

WORKDIR /app

# 安装依赖
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production && npm cache clean --force

# 复制构建产物
COPY --from=builder /app/client/dist ./client/dist

# 复制源代码（用于生产）
COPY server/src ./server/src
COPY server/.env.example ./server/.env

EXPOSE 3001

CMD ["sh", "-c", "cd server && node --import tsx/index.js src/index.ts"]
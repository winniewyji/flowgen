import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import diagramRouter from './routes/diagram.js';
import productivityRouter from './routes/productivity.js';
import uploadRouter from './routes/upload.js';
import costRouter from './routes/cost.js';
import memoryRouter from './routes/memory.js';
import { rateLimit } from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ============ 高并发优化中间件 ============

// Gzip 压缩
app.use(require('compression')());

// CORS 配置 - 支持多人同时访问
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 请求超时
app.use((req, res, next) => {
  req.setTimeout(120000); // 2 分钟超时
  res.setTimeout(120000);
  next();
});

// JSON body 解析（限制大小防止攻击）
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// API 速率限制 - 防止滥用，允许高并发
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 分钟窗口
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // 窗口内最多 100 个请求
  message: { success: false, error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  // 允许高并发：使用内存存储（生产环境建议用 Redis）
  store: new (require('express-rate-limit').MemoryStore)(),
});


// 应用速率限制到 API 路由
app.use('/api', apiLimiter);

// Routes
app.use('/api', diagramRouter);
app.use('/api', productivityRouter);
app.use('/api', uploadRouter);
app.use('/api', costRouter);

// 记忆与自学习 API (self-improving + elite-longterm-memory)
app.use('/api/memory', memoryRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server with connection handling
const server = app.listen(PORT, () => {
  console.log(`🚀 FlowGen Server 运行在 http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
  console.log(`📝 Document API: http://localhost:${PORT}/api/document`);
  console.log(`🔧 Jira API: http://localhost:${PORT}/api/jira`);
  console.log(`📄 Confluence API: http://localhost:${PORT}/api/confluence`);
  console.log(`📷 Upload API: http://localhost:${PORT}/api/upload`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
  console.log(`⚡ 并发支持: 多人同时访问已启用`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM 收到，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});
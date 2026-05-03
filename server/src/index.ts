import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import diagramRouter from './routes/diagram.js';
import productivityRouter from './routes/productivity.js';
import uploadRouter from './routes/upload.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api', diagramRouter);
app.use('/api', productivityRouter);
app.use('/api', uploadRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FlowGen Server 运行在 http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
  console.log(`📝 Document API: http://localhost:${PORT}/api/document`);
  console.log(`🔧 Jira API: http://localhost:${PORT}/api/jira`);
  console.log(`📄 Confluence API: http://localhost:${PORT}/api/confluence`);
  console.log(`📷 Upload API: http://localhost:${PORT}/api/upload`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
});
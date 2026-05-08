import express from 'express';
import cors from 'cors';
import { Logger } from './utils/logger';
import { destroyAllPools } from './db/pool';
import healthRouter from './routes/health';
import queryRouter from './routes/query';
import proceduresRouter from './routes/procedures';

const TAG = 'Server';
const PORT = parseInt(process.env.API_PORT || '3001', 10);

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, _res, next) => {
  Logger.debug(TAG, `${req.method} ${req.path}`);
  next();
});

app.use('/api', healthRouter);
app.use('/api', queryRouter);
app.use('/api', proceduresRouter);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not Found' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  Logger.error(TAG, '未捕获的服务器错误', { error: err.message, stack: err.stack });
  res.status(500).json({ success: false, error: '服务器内部错误' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  Logger.info(TAG, `AWSight API Server 已启动`, { port: PORT });
  Logger.info(TAG, `API 端点:`, { endpoints: ['GET  /api/health', 'POST /api/query', 'POST /api/procedures'] });
});

async function shutdown(signal: string) {
  Logger.info(TAG, `收到 ${signal} 信号，开始优雅关闭...`);
  server.close(() => {
    Logger.info(TAG, 'HTTP 服务器已停止');
  });
  await destroyAllPools();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;

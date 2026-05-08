import { Router, Request, Response } from 'express';
import { Logger } from '../utils/logger';

const TAG = 'HealthRoute';
const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  Logger.debug(TAG, '健康检查');
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
  });
});

export default router;

import { Router, Request, Response } from 'express';
import { fetchProcedures, DbConnectionConfig } from '../db/pool';
import { Logger } from '../utils/logger';

const TAG = 'ProceduresRoute';
const router = Router();

router.post('/procedures', async (req: Request, res: Response) => {
  try {
    const { connection } = req.body as { connection: DbConnectionConfig };

    if (!connection) {
      res.status(400).json({ success: false, error: '缺少 connection 参数' });
      return;
    }

    Logger.info(TAG, '获取存储过程', {
      type: connection.type,
      host: connection.host,
      db: connection.dbName,
    });

    const procedures = await fetchProcedures(connection);

    Logger.info(TAG, `存储过程获取完成，共 ${procedures.length} 个`);

    res.json({ success: true, procedures });
  } catch (err: any) {
    const message = err.message || '获取存储过程失败';
    Logger.error(TAG, '获取存储过程失败', { error: message, code: err.code });
    res.status(500).json({ success: false, error: message });
  }
});

export default router;

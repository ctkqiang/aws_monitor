import { Router, Request, Response } from 'express';
import { executeQuery, DbConnectionConfig } from '../db/pool';
import { Logger } from '../utils/logger';

const TAG = 'QueryRoute';
const router = Router();

const ALLOWED_SQL_PATTERNS = [
  /^SELECT\b/i,
  /^SHOW\b/i,
  /^DESCRIBE\b/i,
  /^DESC\b/i,
  /^EXPLAIN\b/i,
];

function validateSql(sql: string): string | null {
  const trimmed = sql.trim();
  if (!trimmed) return 'SQL 语句不能为空';
  if (trimmed.length > 10000) return 'SQL 语句过长（最大 10000 字符）';

  const allowed = ALLOWED_SQL_PATTERNS.some((p) => p.test(trimmed));
  if (!allowed) return '仅允许 SELECT、SHOW、DESCRIBE、EXPLAIN 语句';

  const dangerous = /\b(DROP|ALTER|TRUNCATE|RENAME|GRANT|REVOKE|CREATE|INSERT|UPDATE|DELETE)\b/i;
  if (dangerous.test(trimmed)) {
    return '不允许执行数据修改语句';
  }

  return null;
}

router.post('/query', async (req: Request, res: Response) => {
  try {
    const { connection, sql } = req.body as {
      connection: DbConnectionConfig;
      sql: string;
    };

    if (!connection || !sql) {
      res.status(400).json({ success: false, error: '缺少 connection 或 sql 参数' });
      return;
    }

    const validationError = validateSql(sql);
    if (validationError) {
      res.status(400).json({ success: false, error: validationError });
      return;
    }

    Logger.info(TAG, '执行查询', {
      type: connection.type,
      host: connection.host,
      db: connection.dbName,
      sql: sql.substring(0, 100),
    });

    const result = await executeQuery(connection, sql);

    Logger.info(TAG, '查询完成', {
      rowCount: result.rowCount,
      durationMs: result.durationMs,
    });

    res.json({
      success: true,
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      durationMs: result.durationMs,
    });
  } catch (err: any) {
    const message = err.message || '查询执行失败';
    Logger.error(TAG, '查询失败', { error: message, code: err.code });

    const statusCode = err.code === 'ECONNREFUSED' ? 502
      : err.code === 'ETIMEDOUT' ? 504
      : err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === '28P01' ? 401
      : 500;

    res.status(statusCode).json({ success: false, error: message, code: err.code });
  }
});

export default router;

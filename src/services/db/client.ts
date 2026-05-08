import { Buffer } from 'buffer';
import { Logger } from '@/utils/logger';
import { DbConnectionConfig, QueryResult, StoredProcedure, ProcedureResult, DbType } from './types';
import { runMysqlQuery, runMysqlProcedures } from './mysql-client';
import { runPostgresQuery, runPostgresProcedures } from './pg-client';

const TAG = 'DbClient';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

let activeConnectionCount = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  config: { maxRetries: number; retryDelayMs: number; timeoutMs: number }
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;

      if (attempt < config.maxRetries) {
        const delay = config.retryDelayMs * Math.pow(2, attempt);
        Logger.warn(TAG, `查询失败，${delay}ms 后重试 (${attempt + 1}/${config.maxRetries})`, {
          error: err.message,
        });
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('未知错误');
}

function getDbClient(cfg: DbConnectionConfig) {
  switch (cfg.type) {
    case 'mysql':
      return {
        query: (sql: string, timeoutMs: number) => runMysqlQuery(cfg, sql, timeoutMs),
        procedures: (timeoutMs: number) => runMysqlProcedures(cfg, timeoutMs),
      };
    case 'postgresql':
    case 'questdb':
      return {
        query: (sql: string, timeoutMs: number) => runPostgresQuery(cfg, sql, timeoutMs),
        procedures: (timeoutMs: number) => runPostgresProcedures(cfg, timeoutMs),
      };
    case 'sqlite':
      throw new Error('SQLite 远程连接暂不支持，请使用文件路径直接访问');
    default:
      throw new Error(`不支持的数据库类型: ${cfg.type}`);
  }
}

export async function executeQuery(
  cfg: DbConnectionConfig,
  sql: string,
  options?: { timeoutMs?: number; maxRetries?: number }
): Promise<QueryResult> {
  const timeoutMs = options?.timeoutMs ?? 30000;
  const maxRetries = options?.maxRetries ?? MAX_RETRIES;

  if (!cfg.host || !cfg.port) {
    return {
      success: false,
      columns: ['error'],
      rows: [{ error: '缺少数据库主机或端口配置' }],
      rowCount: 0,
      durationMs: 0,
      error: '缺少数据库主机或端口配置',
    };
  }

  if (!sql.trim()) {
    return {
      success: false,
      columns: ['error'],
      rows: [{ error: 'SQL 语句不能为空' }],
      rowCount: 0,
      durationMs: 0,
      error: 'SQL 语句不能为空',
    };
  }

  activeConnectionCount++;
  const start = Date.now();

  try {
    const client = getDbClient(cfg);

    return await withRetry(
      () => client.query(sql, timeoutMs),
      { maxRetries, retryDelayMs: RETRY_DELAY_MS, timeoutMs }
    );
  } catch (err: any) {
    Logger.logError(TAG, '查询执行失败（重试耗尽）', err);
    return {
      success: false,
      columns: ['error'],
      rows: [{ error: err.message || '查询执行失败' }],
      rowCount: 0,
      durationMs: Date.now() - start,
      error: err.message,
      errorCode: err.code,
    };
  } finally {
    activeConnectionCount--;
  }
}

export async function fetchProcedures(
  cfg: DbConnectionConfig,
  options?: { timeoutMs?: number }
): Promise<ProcedureResult> {
  const timeoutMs = options?.timeoutMs ?? 15000;

  if (cfg.type === 'sqlite') {
    return { success: true, procedures: [] };
  }

  if (!cfg.host || !cfg.port) {
    return { success: false, procedures: [], error: '缺少数据库主机或端口配置' };
  }

  activeConnectionCount++;

  try {
    const client = getDbClient(cfg);
    const procedures = await client.procedures(timeoutMs);
    return { success: true, procedures };
  } catch (err: any) {
    Logger.logError(TAG, '获取存储过程失败', err);
    return { success: false, procedures: [], error: err.message };
  } finally {
    activeConnectionCount--;
  }
}

export function getActiveConnectionCount(): number {
  return activeConnectionCount;
}

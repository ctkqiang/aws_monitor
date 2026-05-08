import mysql from 'mysql2/promise';
import pg from 'pg';
import { Logger } from '../utils/logger';

const TAG = 'DBPool';

export type DbType = 'mysql' | 'postgresql' | 'questdb';

export interface DbConnectionConfig {
  id: string;
  type: DbType;
  host: string;
  port: number;
  dbName: string;
  username: string;
  password: string;
}

interface PoolEntry {
  pool: mysql.Pool | pg.Pool;
  createdAt: number;
}

const pools = new Map<string, PoolEntry>();
const POOL_TTL = 30 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of pools) {
    if (now - entry.createdAt > POOL_TTL) {
      entry.pool.end().catch(() => {});
      pools.delete(key);
      Logger.info(TAG, `连接池已过期释放: ${key}`);
    }
  }
}, 5 * 60 * 1000);

function poolKey(cfg: DbConnectionConfig): string {
  return `${cfg.id}:${cfg.type}:${cfg.host}:${cfg.port}:${cfg.dbName}`;
}

function createMysqlPool(cfg: DbConnectionConfig): mysql.Pool {
  return mysql.createPool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.username,
    password: cfg.password,
    database: cfg.dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
  });
}

function createPgPool(cfg: DbConnectionConfig): pg.Pool {
  return new pg.Pool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.username,
    password: cfg.password,
    database: cfg.dbName,
    max: 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  });
}

export function getPool(cfg: DbConnectionConfig): mysql.Pool | pg.Pool {
  const key = poolKey(cfg);
  const existing = pools.get(key);
  if (existing) {
    existing.createdAt = Date.now();
    return existing.pool;
  }

  let pool: mysql.Pool | pg.Pool;
  if (cfg.type === 'mysql') {
    pool = createMysqlPool(cfg);
  } else if (cfg.type === 'postgresql' || cfg.type === 'questdb') {
    pool = createPgPool(cfg);
  } else {
    throw new Error(`不支持的数据库类型: ${cfg.type}`);
  }

  pools.set(key, { pool, createdAt: Date.now() });
  Logger.info(TAG, `连接池已创建: ${key}`);
  return pool;
}

export async function destroyAllPools(): Promise<void> {
  const entries = Array.from(pools.entries());
  pools.clear();
  await Promise.allSettled(entries.map(([, e]) => e.pool.end()));
  Logger.info(TAG, `所有连接池已释放 (${entries.length} 个)`);
}

export async function executeQuery(
  cfg: DbConnectionConfig,
  sql: string
): Promise<{ columns: string[]; rows: Record<string, unknown>[]; rowCount: number; durationMs: number }> {
  const pool = getPool(cfg);
  const start = Date.now();

  if (cfg.type === 'mysql') {
    const mysqlPool = pool as mysql.Pool;
    const [rows, fields] = await mysqlPool.query(sql);
    const durationMs = Date.now() - start;
    const columns = Array.isArray(fields) ? fields.map((f: any) => f.name) : [];
    const resultRows = Array.isArray(rows) ? (rows as any[]).map((r) => ({ ...r })) : [];
    return { columns, rows: resultRows as Record<string, unknown>[], rowCount: resultRows.length, durationMs };
  }

  const pgPool = pool as pg.Pool;
  const result = await pgPool.query(sql);
  const durationMs = Date.now() - start;
  return {
    columns: result.fields.map((f) => f.name),
    rows: result.rows,
    rowCount: result.rowCount ?? result.rows.length,
    durationMs,
  };
}

export async function fetchProcedures(
  cfg: DbConnectionConfig
): Promise<{ name: string; schema: string; language: string; params: string; definer: string; created: string }[]> {
  const pool = getPool(cfg);

  if (cfg.type === 'mysql') {
    const mysqlPool = pool as mysql.Pool;
    const [rows] = await mysqlPool.query(
      `SELECT ROUTINE_NAME AS name, ROUTINE_SCHEMA AS \`schema\`, 'SQL' AS language,
              COALESCE((SELECT GROUP_CONCAT(CONCAT(PARAMETER_MODE, ' ', PARAMETER_NAME, ' ', DTD_IDENTIFIER) SEPARATOR ', ')
                        FROM information_schema.PARAMETERS
                        WHERE SPECIFIC_SCHEMA = r.ROUTINE_SCHEMA AND SPECIFIC_NAME = r.ROUTINE_NAME), '') AS params,
              DEFINER AS definer, DATE_FORMAT(CREATED, '%Y-%m-%d') AS created
       FROM information_schema.ROUTINES r
       WHERE ROUTINE_SCHEMA = ?`,
      [cfg.dbName]
    );
    return (rows as any[]).map((r: any) => ({ ...r }));
  }

  const pgPool = pool as pg.Pool;
  const result = await pgPool.query(
    `SELECT p.proname AS name, n.nspname AS \`schema\`,
            l.lanname AS language,
            pg_get_function_arguments(p.oid) AS params,
            pg_get_userbyid(p.proowner) AS definer,
            TO_CHAR(now(), 'YYYY-MM-DD') AS created
     FROM pg_proc p
     JOIN pg_namespace n ON p.pronamespace = n.oid
     JOIN pg_language l ON p.prolang = l.oid
     WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
     ORDER BY n.nspname, p.proname`
  );
  return result.rows.map((r: any) => ({ ...r }));
}

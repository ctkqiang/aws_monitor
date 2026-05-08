import { openDatabaseAsync, deleteDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { Logger } from '@/utils/logger';
import { QueryResult } from './types';

const TAG = 'LocalSQLite';

const dbCache: Map<string, SQLiteDatabase> = new Map();

async function getDatabase(dbName: string): Promise<SQLiteDatabase> {
  const cached = dbCache.get(dbName);
  if (cached) return cached;
  const db = await openDatabaseAsync(dbName);
  dbCache.set(dbName, db);
  Logger.info(TAG, '数据库已打开', { dbName });
  return db;
}

function isSelectQuery(sql: string): boolean {
  const trimmed = sql.trim().toUpperCase();
  return (
    trimmed.startsWith('SELECT') ||
    trimmed.startsWith('PRAGMA') ||
    trimmed.startsWith('EXPLAIN') ||
    trimmed.startsWith('WITH') ||
    trimmed.startsWith('DESCRIBE')
  );
}

export async function executeLocalQuery(
  dbName: string,
  sql: string,
): Promise<QueryResult> {
  const start = Date.now();

  try {
    const db = await getDatabase(dbName);

    if (isSelectQuery(sql)) {
      const rows = await db.getAllAsync<Record<string, unknown>>(sql);
      const columns = rows.length > 0 ? Object.keys(rows[0] as object) : [];
      return {
        success: true,
        columns,
        rows,
        rowCount: rows.length,
        durationMs: Date.now() - start,
      };
    }

    const result = await db.runAsync(sql);
    return {
      success: true,
      columns: ['result'],
      rows: [{
        result: 'OK',
        changes: result.changes,
        lastInsertRowId: result.lastInsertRowId,
      }],
      rowCount: result.changes,
      durationMs: Date.now() - start,
    };
  } catch (err: any) {
    Logger.logError(TAG, 'SQLite 查询失败', err);
    return {
      success: false,
      columns: ['error'],
      rows: [{ error: err.message || '未知错误' }],
      rowCount: 0,
      durationMs: Date.now() - start,
      error: err.message,
    };
  }
}

export async function createLocalDatabase(
  dbName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await getDatabase(dbName);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function dropLocalDatabase(dbName: string): Promise<void> {
  const db = dbCache.get(dbName);
  if (db) {
    try { await db.closeAsync(); } catch {}
    dbCache.delete(dbName);
  }
  try {
    await deleteDatabaseAsync(dbName);
    Logger.info(TAG, '数据库已删除', { dbName });
  } catch (err: any) {
    Logger.logError(TAG, '删除数据库失败', err);
  }
}

export function closeAllDatabases(): void {
  for (const [name, db] of dbCache) {
    try { db.closeSync(); } catch {}
    Logger.info(TAG, '数据库已关闭', { dbName: name });
  }
  dbCache.clear();
}

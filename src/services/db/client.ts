import { Buffer } from 'buffer';
import { NativeModules } from 'react-native';
import { Logger } from '@/utils/logger';
import { DbConnectionConfig, QueryResult, StoredProcedure, ProcedureResult, DbType } from './types';
import { runMysqlQuery, runMysqlProcedures } from './mysql-client';
import { runPostgresQuery, runPostgresProcedures } from './pg-client';
import { executeLocalQuery } from './local-sqlite-executor';

const TAG = 'DbClient';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

const TCP_NOT_AVAILABLE_MSG =
  '\u8FDC\u7A0B\u6570\u636E\u5E93\u8FDE\u63A5\u4E0D\u53EF\u7528\u3002\n' +
  '\u539F\u751F TCP \u6A21\u5757\u672A\u52A0\u8F7D\uFF0C\u8BF7\u4F7F\u7528 expo-dev-client \u6784\u5EFA:\n' +
    'npx expo prebuild --clean && npx expo run:android';

export interface ConnectionDiagnostics {
  tcpAvailable: boolean;
  hasHost: boolean;
  hasPort: boolean;
  hasCredentials: boolean;
  dbType: DbType;
  issues: string[];
  recommendations: string[];
  ready: boolean;
}

export function diagnoseConnection(cfg: DbConnectionConfig): ConnectionDiagnostics {
  const issues: string[] = [];
  const recommendations: string[] = [];
  const tcpAvailable = isTcpAvailable();

  if (cfg.type === 'sqlite') {
    return {
      tcpAvailable: true,
      hasHost: true,
      hasPort: true,
      hasCredentials: true,
      dbType: 'sqlite',
      issues: [],
      recommendations: [],
      ready: true,
    };
  }

  if (!tcpAvailable) {
    issues.push('\u539F\u751F TCP \u6A21\u5757\u672A\u52A0\u8F7D');
    recommendations.push('npx expo prebuild --clean');
    recommendations.push('npx expo run:android  (or run:ios)');
    recommendations.push('\u4E0D\u8981\u4F7F\u7528 Expo Go\uFF0C\u5FC5\u987B\u7528 expo-dev-client');
  }

  if (!cfg.host || !cfg.host.trim()) {
    issues.push('\u7F3A\u5C11\u4E3B\u673A\u5730\u5740 (host)');
    recommendations.push('\u8BF7\u5728\u8FDE\u63A5\u8BBE\u7F6E\u4E2D\u586B\u5199\u6570\u636E\u5E93 IP \u6216\u57DF\u540D');
  }

  if (!cfg.port || parseInt(String(cfg.port), 10) === 0) {
    issues.push('\u7F3A\u5C11\u7AEF\u53E3\u53F7 (port)');
    recommendations.push('\u9ED8\u8BA4 MySQL: 3306, PostgreSQL: 5432');
  }

  if (!cfg.username || !cfg.username.trim()) {
    issues.push('\u7F3A\u5C11\u7528\u6237\u540D');
    recommendations.push('\u8BF7\u586B\u5199\u6570\u636E\u5E93\u7528\u6237\u540D');
  }

  if (!cfg.dbName || !cfg.dbName.trim()) {
    issues.push('\u7F3A\u5C11\u6570\u636E\u5E93\u540D');
    recommendations.push('\u8BF7\u586B\u5199\u8981\u8FDE\u63A5\u7684\u6570\u636E\u5E93\u540D\u79F0');
  }

  if (tcpAvailable && cfg.host && cfg.port) {
    recommendations.push('\u786E\u8BA4\u76EE\u6807\u670D\u52A1\u5668\u7AEF\u53E3\u53EF\u8FBE: nc -zv ' + cfg.host + ' ' + cfg.port);
    recommendations.push('\u68C0\u67E5\u9632\u706B\u5899/\u5B89\u5168\u7EC4\u662F\u5426\u653E\u884C\u8BE5\u7AEF\u53E3');
    recommendations.push('\u786E\u8BA4 MySQL \u7528\u6237\u5141\u8BB8\u8FDC\u7A0B\u8FDE\u63A5 (user@\'%\' \u6216 user@\u4F60\u7684IP)');
  }

  return {
    tcpAvailable,
    hasHost: !!(cfg.host && cfg.host.trim()),
    hasPort: !!(cfg.port && parseInt(String(cfg.port), 10) > 0),
    hasCredentials: !!(cfg.username && cfg.username.trim() && cfg.dbName && cfg.dbName.trim()),
    dbType: cfg.type,
    issues,
    recommendations,
    ready: issues.length === 0,
  };
}

function isTcpAvailable(): boolean {
  try {
    const native = NativeModules?.TcpSockets;
    if (!native || typeof native.connect !== 'function') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

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
      return {
        query: (sql: string, _timeoutMs: number) => executeLocalQuery(cfg.dbName, sql),
        procedures: async (_timeoutMs: number) => [],
      };
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

  const diag = diagnoseConnection(cfg);
  if (!diag.ready) {
    const lines = ['\u8FDE\u63A5\u8BCA\u65AD\u5931\u8D25:'];
    diag.issues.forEach((issue, i) => { lines.push(`  ${i + 1}. ${issue}`); });
    lines.push('');
    lines.push('\u5EFA\u8BAE\u64CD\u4F5C:');
    diag.recommendations.forEach((rec, i) => { lines.push(`  ${i + 1}. ${rec}`); });
    const message = lines.join('\n');
    return {
      success: false,
      columns: ['error'],
      rows: [{ error: message }],
      rowCount: 0,
      durationMs: 0,
      error: message,
    };
  }

  if (cfg.type !== 'sqlite' && (!cfg.host || !cfg.port)) {
    return {
      success: false,
      columns: ['error'],
      rows: [{ error: '\u7F3A\u5C11\u6570\u636E\u5E93\u4E3B\u673A\u6216\u7AEF\u53E3\u914D\u7F6E' }],
      rowCount: 0,
      durationMs: 0,
      error: '\u7F3A\u5C11\u6570\u636E\u5E93\u4E3B\u673A\u6216\u7AEF\u53E3\u914D\u7F6E',
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

  const diag = diagnoseConnection(cfg);
  if (!diag.ready) {
    const lines = ['\u8FDE\u63A5\u8BCA\u65AD\u5931\u8D25:'];
    diag.issues.forEach((issue, i) => { lines.push(`  ${i + 1}. ${issue}`); });
    return { success: false, procedures: [], error: lines.join('\n') };
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

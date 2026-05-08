import { Buffer } from 'buffer';
import { NativeModules } from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import { Logger } from '@/utils/logger';
import { QueryResult, DbConnectionConfig } from './types';
import { pgMd5Password, pgPasswordAuth } from './pg-auth';

const TAG = 'PgClient';

interface PgConnection {
  socket: TcpSocket.Socket;
  readBuffer: Buffer;
  backendPid: number;
  secretKey: number;
  parameterStatus: Record<string, string>;
}

const SSL_REQUEST_CODE = 80877103;

function buildInt32(value: number): Buffer {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(value, 0);
  return buf;
}

function readInt32(buf: Buffer, offset: number): number {
  return buf.readInt32BE(offset);
}

function buildStartupMessage(user: string, database: string): Buffer {
  const parts: Buffer[] = [];
  parts.push(buildInt32(3 << 16)); // protocol version 3.0

  parts.push(Buffer.from('user\0', 'utf8'));
  parts.push(Buffer.from(user + '\0', 'utf8'));

  if (database) {
    parts.push(Buffer.from('database\0', 'utf8'));
    parts.push(Buffer.from(database + '\0', 'utf8'));
  }

  parts.push(Buffer.from('\0', 'utf8')); // terminator

  const body = Buffer.concat(parts);
  const length = buildInt32(4 + body.length);
  return Buffer.concat([length, body]);
}

function buildQueryMessage(sql: string): Buffer {
  const body = Buffer.concat([
    Buffer.from('Q', 'utf8'),
    Buffer.from(sql + '\0', 'utf8'),
  ]);
  const length = buildInt32(4 + body.length - 1);
  return Buffer.concat([length, body.slice(1)]);
}

function buildTerminateMessage(): Buffer {
  const body = Buffer.concat([Buffer.from('X', 'utf8'), buildInt32(4)]);
  return body;
}

const TCP_NATIVE_UNAVAILABLE =
  '原生 TCP 模块不可用。请使用 expo-dev-client 构建运行:\n' +
  'npx expo prebuild --clean && npx expo run:android';

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

function connectTcp(host: string, port: number, timeoutMs: number): Promise<TcpSocket.Socket> {
  if (!isTcpAvailable()) {
    return Promise.reject(new Error(TCP_NATIVE_UNAVAILABLE));
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let socket: TcpSocket.Socket | null = null;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (socket) { try { socket.destroy(); } catch {} }
      reject(new Error(`TCP 连接超时 (${timeoutMs}ms)`));
    }, timeoutMs);

    try {
      socket = TcpSocket.createConnection({ host, port }, () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(socket!);
      });

      socket.on('error', (err: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error(`TCP 连接错误: ${err.message}`));
      });
    } catch (err: any) {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`TCP Socket 创建失败: ${err.message}`));
      }
    }
  });
}

function sendMessage(conn: PgConnection, message: Buffer): void {
  conn.socket.write(message.toString('base64'), 'base64');
}

function readBytes(conn: PgConnection, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (conn.readBuffer.length >= length) {
      const data = conn.readBuffer.slice(0, length);
      conn.readBuffer = conn.readBuffer.slice(length);
      resolve(data);
      return;
    }

    const onData = (raw: string | Buffer) => {
      const chunk = typeof raw === 'string' ? Buffer.from(raw, 'base64') : Buffer.from(raw);
      conn.readBuffer = Buffer.concat([conn.readBuffer, chunk]);

      if (conn.readBuffer.length >= length) {
        cleanup();
        const data = conn.readBuffer.slice(0, length);
        conn.readBuffer = conn.readBuffer.slice(length);
        resolve(data);
      }
    };

    const onError = (err: Error) => { cleanup(); reject(err); };
    const onClose = () => { cleanup(); reject(new Error('连接已关闭')); };

    function cleanup() {
      conn.socket.removeListener('data', onData);
      conn.socket.removeListener('error', onError);
      conn.socket.removeListener('close', onClose);
    }

    conn.socket.on('data', onData);
    conn.socket.once('error', onError);
    conn.socket.once('close', onClose);
  });
}

async function readMessage(conn: PgConnection): Promise<{ type: number; payload: Buffer }> {
  const typeByte = await readBytes(conn, 1);
  const type = typeByte[0];
  const lengthBuf = await readBytes(conn, 4);
  const length = readInt32(lengthBuf, 0) - 4;

  let payload: Buffer = Buffer.alloc(0);
  if (length > 0) {
    payload = (await readBytes(conn, length)) as Buffer;
  }

  return { type, payload };
}

async function performAuthentication(conn: PgConnection, cfg: DbConnectionConfig): Promise<void> {
  while (true) {
    const { type, payload } = await readMessage(conn);

    switch (type) {
      case 82: { // AuthenticationMD5Password 'R'
        const authType = readInt32(payload, 0);
        if (authType === 0) {
          Logger.info(TAG, '认证成功（无需密码）');
          return;
        }

        if (authType === 5) {
          const salt = payload.slice(4, 8);
          const authResponse = await pgMd5Password(cfg.password, cfg.username, salt);
          const body = Buffer.concat([Buffer.from('p', 'utf8'), authResponse]);
          const length = buildInt32(4 + body.length - 1);
          sendMessage(conn, Buffer.concat([length, body.slice(1)]));
        } else if (authType === 3) {
          const authResponse = await pgPasswordAuth(cfg.password);
          const body = Buffer.concat([Buffer.from('p', 'utf8'), authResponse]);
          const length = buildInt32(4 + body.length - 1);
          sendMessage(conn, Buffer.concat([length, body.slice(1)]));
        } else if (authType === 10) {
          throw new Error(
            'SCRAM-SHA-256 认证暂不支持。\n' +
            '请修改 pg_hba.conf: host all all 0.0.0.0/0 md5'
          );
        } else {
          throw new Error(`不支持的 PostgreSQL 认证类型: ${authType}`);
        }
        break;
      }

      case 83: // ParameterStatus 'S'
      case 78: { // NoticeResponse 'N'
        break; // ignore
      }

      case 75: // BackendKeyData 'K'
        conn.backendPid = readInt32(payload, 0);
        conn.secretKey = readInt32(payload, 4);
        break;

      case 90: { // ReadyForQuery 'Z'
        Logger.info(TAG, 'PostgreSQL 认证成功');
        return;
      }

      case 69: { // ErrorResponse 'E'
        let errorMsg = '';
        let pos = 0;
        while (pos < payload.length) {
          const fieldType = payload[pos];
          if (fieldType === 0) break;
          pos++;
          let end = pos;
          while (end < payload.length && payload[end] !== 0) end++;
          const value = payload.slice(pos, end).toString('utf8');
          if (fieldType === 77) errorMsg = value; // 'M' = message
          pos = end + 1;
        }
        throw new Error(`PostgreSQL 错误: ${errorMsg}`);
      }

      default:
        Logger.debug(TAG, `收到未知消息类型: ${String.fromCharCode(type)}`);
        break;
    }
  }
}

async function performStartup(conn: PgConnection, cfg: DbConnectionConfig): Promise<void> {
  const startupMsg = buildStartupMessage(cfg.username, cfg.dbName);
  sendMessage(conn, startupMsg);
  await performAuthentication(conn, cfg);
}

async function executeSimpleQuery(
  conn: PgConnection,
  sql: string
): Promise<Omit<QueryResult, 'durationMs'>> {
  const queryMsg = buildQueryMessage(sql);
  sendMessage(conn, queryMsg);

  let columns: string[] = [];
  const allRows: Record<string, unknown>[] = [];

  while (true) {
    const { type, payload } = await readMessage(conn);

    switch (type) {
      case 84: { // RowDescription 'T'
        const numFields = payload.readInt16BE(0);
        columns = [];
        let pos = 2;
        for (let i = 0; i < numFields; i++) {
          let end = pos;
          while (end < payload.length && payload[end] !== 0) end++;
          columns.push(payload.slice(pos, end).toString('utf8'));
          pos = end + 1;
          // Skip table OID, column attr, type OID, type size, type modifier, format code
          pos += 18;
        }
        break;
      }

      case 68: { // DataRow 'D'
        const numCols = payload.readInt16BE(0);
        const row: Record<string, unknown> = {};
        let pos = 2;
        for (let i = 0; i < numCols; i++) {
          const colLen = payload.readInt32BE(pos);
          pos += 4;
          if (colLen === -1) {
            row[columns[i] || `col_${i}`] = null;
          } else {
            row[columns[i] || `col_${i}`] = payload.slice(pos, pos + colLen).toString('utf8');
            pos += colLen;
          }
        }
        allRows.push(row);
        break;
      }

      case 67: // CommandComplete 'C'
        break;

      case 69: { // ErrorResponse 'E'
        let errorMsg = '';
        let pos = 0;
        while (pos < payload.length) {
          const fieldType = payload[pos];
          if (fieldType === 0) break;
          pos++;
          let end = pos;
          while (end < payload.length && payload[end] !== 0) end++;
          const value = payload.slice(pos, end).toString('utf8');
          if (fieldType === 77) errorMsg = value;
          pos = end + 1;
        }
        throw new Error(`PostgreSQL 错误: ${errorMsg}`);
      }

      case 90: // ReadyForQuery 'Z'
        return { success: true, columns, rows: allRows, rowCount: allRows.length };

      case 78: // NoticeResponse 'N'
        break;

      default:
        Logger.debug(TAG, `PG 响应类型: ${String.fromCharCode(type)}`);
        break;
    }
  }
}

async function establishConnection(
  cfg: DbConnectionConfig,
  timeoutMs: number
): Promise<PgConnection> {
  const socket = await connectTcp(cfg.host, cfg.port, timeoutMs);

  const conn: PgConnection = {
    socket,
    readBuffer: Buffer.alloc(0),
    backendPid: 0,
    secretKey: 0,
    parameterStatus: {},
  };

  await performStartup(conn, cfg);
  return conn;
}

export async function runPostgresQuery(
  cfg: DbConnectionConfig,
  sql: string,
  timeoutMs: number = 30000
): Promise<QueryResult> {
  let conn: PgConnection | null = null;
  const start = Date.now();

  try {
    conn = await establishConnection(cfg, 10000);
    const timeoutTimer = setTimeout(() => {
      conn?.socket.destroy();
    }, timeoutMs);

    try {
      const result = await executeSimpleQuery(conn, sql);
      return { ...result, durationMs: Date.now() - start };
    } finally {
      clearTimeout(timeoutTimer);
    }
  } catch (err: any) {
    Logger.logError(TAG, 'PostgreSQL 查询失败', err);
    return {
      success: false,
      columns: ['error'],
      rows: [{ error: err.message || '未知错误' }],
      rowCount: 0,
      durationMs: Date.now() - start,
      error: err.message,
      errorCode: err.code,
    };
  } finally {
    if (conn) {
      try { conn.socket?.destroy(); } catch {}
    }
  }
}

export async function runPostgresProcedures(
  cfg: DbConnectionConfig,
  timeoutMs: number = 15000
): Promise<{ name: string; schema: string; language: string; params: string; definer: string; created: string }[]> {
  let conn: PgConnection | null = null;

  try {
    conn = await establishConnection(cfg, 10000);

    const sql = `
      SELECT p.proname AS name, n.nspname AS schema,
             l.lanname AS language,
             COALESCE(pg_get_function_arguments(p.oid), '') AS params,
             pg_get_userbyid(p.proowner) AS definer,
             TO_CHAR(now(), 'YYYY-MM-DD') AS created
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      JOIN pg_language l ON p.prolang = l.oid
      WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY n.nspname, p.proname
    `;

    const timeoutTimer = setTimeout(() => {
      conn?.socket.destroy();
    }, timeoutMs);

    try {
      const { rows } = await executeSimpleQuery(conn, sql);
      return rows.map((row: any) => ({
        name: String(row.name ?? ''),
        schema: String(row.schema ?? ''),
        language: String(row.language ?? 'SQL'),
        params: String(row.params ?? ''),
        definer: String(row.definer ?? ''),
        created: String(row.created ?? ''),
      }));
    } finally {
      clearTimeout(timeoutTimer);
    }
  } catch (err: any) {
    Logger.logError(TAG, 'PostgreSQL 获取存储过程失败', err);
    return [];
  } finally {
    if (conn) {
      try { conn.socket.destroy(); } catch {}
    }
  }
}

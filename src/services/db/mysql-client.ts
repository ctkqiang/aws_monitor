import { Buffer } from 'buffer';
import { NativeModules } from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import { Logger } from '@/utils/logger';
import { QueryResult, DbConnectionConfig } from './types';
import { buildMysqlAuthResponse } from './mysql-auth';
import {
  buildPacket,
  readLengthEncodedInteger,
  readLengthEncodedString,
  readNullTerminatedString,
  readPacketHeader,
} from './buffer';

const TAG = 'MySQLClient';

const CLIENT_LONG_PASSWORD = 1;
const CLIENT_FOUND_ROWS = 2;
const CLIENT_LONG_FLAG = 4;
const CLIENT_CONNECT_WITH_DB = 8;
const CLIENT_PROTOCOL_41 = 512;
const CLIENT_TRANSACTIONS = 8192;
const CLIENT_SECURE_CONNECTION = 32768;
const CLIENT_PLUGIN_AUTH = 524288;
const CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA = 2097152;
const CLIENT_DEPRECATE_EOF = 16777216;

const CLIENT_CAPABILITIES =
  CLIENT_LONG_PASSWORD |
  CLIENT_FOUND_ROWS |
  CLIENT_LONG_FLAG |
  CLIENT_CONNECT_WITH_DB |
  CLIENT_PROTOCOL_41 |
  CLIENT_TRANSACTIONS |
  CLIENT_SECURE_CONNECTION |
  CLIENT_PLUGIN_AUTH |
  CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA |
  CLIENT_DEPRECATE_EOF;

const COM_QUERY = 0x03;

interface MySQLConnection {
  socket: TcpSocket.Socket;
  sequenceId: number;
  readBuffer: Buffer;
  deprecateEOF: boolean;
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

function sendPacket(conn: MySQLConnection, payload: Buffer): void {
  const packet = buildPacket(payload, conn.sequenceId);
  conn.sequenceId = (conn.sequenceId + 1) & 0xff;
  conn.socket.write(packet.toString('base64'), 'base64');
}

function readBytes(conn: MySQLConnection, length: number): Promise<Buffer> {
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

    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    const onClose = () => {
      cleanup();
      reject(new Error('连接已关闭'));
    };

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

async function readPacket(conn: MySQLConnection): Promise<Buffer> {
  const header = await readBytes(conn, 4);
  const { length, sequenceId } = readPacketHeader(header, 0);
  conn.sequenceId = (sequenceId + 1) & 0xff;
  return readBytes(conn, length);
}

async function readOKOrError(conn: MySQLConnection): Promise<{ ok: boolean; errorMessage?: string }> {
  const packet = await readPacket(conn);
  const firstByte = packet[0];

  if (firstByte === 0x00 || firstByte === 0xfe) {
    return { ok: true };
  }

  if (firstByte === 0xff) {
    const errorCode = packet.readUInt16LE(1);
    const sqlStateMarker = packet[3];
    let errorMessage: string;
    if (sqlStateMarker === 0x23) {
      errorMessage = packet.slice(9).toString('utf8');
    } else {
      errorMessage = packet.slice(3).toString('utf8');
    }
    throw new Error(`MySQL 错误 [${errorCode}]: ${errorMessage}`);
  }

  return { ok: true };
}

async function performHandshake(
  conn: MySQLConnection,
  cfg: DbConnectionConfig
): Promise<void> {
  const greeting = await readPacket(conn);
  let offset = 0;

  const protocolVersion = greeting[offset++];

  const { value: serverVersion, bytesRead: svBytes } = readNullTerminatedString(greeting, offset);
  offset += svBytes;

  const connectionId = greeting.readUInt32LE(offset);
  offset += 4;

  const authPluginDataPart1 = greeting.slice(offset, offset + 8);
  offset += 8;

  offset += 1; // filler

  const capabilityLower = greeting.readUInt16LE(offset);
  offset += 2;

  const characterSet = greeting[offset++];
  const statusFlags = greeting.readUInt16LE(offset);
  offset += 2;

  const capabilityUpper = greeting.readUInt16LE(offset);
  offset += 2;

  const serverCapabilities = (capabilityUpper << 16) | capabilityLower;
  const deprecateEOF = !!(serverCapabilities & CLIENT_DEPRECATE_EOF);
  conn.deprecateEOF = deprecateEOF;

  let authPluginDataLen = 0;
  if (serverCapabilities & CLIENT_PLUGIN_AUTH) {
    authPluginDataLen = greeting[offset++];
  } else {
    offset++;
  }

  offset += 10; // reserved

  let authPluginDataPart2: Buffer;
  if (serverCapabilities & CLIENT_SECURE_CONNECTION) {
    const part2Len = Math.max(13, authPluginDataLen - 8);
    let end = offset;
    while (end < greeting.length && greeting[end] !== 0) end++;
    authPluginDataPart2 = greeting.slice(offset, end);
    offset = end + 1;
  } else {
    authPluginDataPart2 = Buffer.alloc(0);
    offset++; // skip null
  }

  let authPluginName = 'mysql_native_password';
  if (serverCapabilities & CLIENT_PLUGIN_AUTH && offset < greeting.length) {
    const { value, bytesRead } = readNullTerminatedString(greeting, offset);
    authPluginName = value;
    offset += bytesRead;
  }

  const authPluginData = Buffer.concat([
    authPluginDataPart1,
    authPluginDataPart2,
  ]).slice(0, 20);

  Logger.info(TAG, '服务器握手完成', {
    version: serverVersion,
    authPlugin: authPluginName,
    connectionId,
  });

  const { authResponse } = await buildMysqlAuthResponse(
    authPluginName,
    cfg.password,
    authPluginData
  );

  const capabilities = CLIENT_CAPABILITIES;
  const handshakeResponse = Buffer.alloc(32);

  handshakeResponse.writeUInt32LE(capabilities, 0);
  handshakeResponse.writeUInt32LE(MAX_PACKET_SIZE, 4);
  handshakeResponse[8] = 33; // utf8mb4
  // bytes 9-31: reserved (zeros)

  const tailParts: Buffer[] = [];

  // username (null-terminated)
  tailParts.push(Buffer.from(cfg.username + '\0', 'utf8'));

  // auth response
  const authLen = authResponse.length;
  if (capabilities & CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA) {
    const lenBuf = Buffer.alloc(1);
    lenBuf[0] = authLen;
    tailParts.push(lenBuf);
  } else {
    const lenBuf = Buffer.alloc(1);
    lenBuf[0] = authLen;
    tailParts.push(lenBuf);
  }
  tailParts.push(authResponse);

  // database
  if (capabilities & CLIENT_CONNECT_WITH_DB) {
    tailParts.push(Buffer.from(cfg.dbName + '\0', 'utf8'));
  }

  // auth plugin name
  if (capabilities & CLIENT_PLUGIN_AUTH) {
    tailParts.push(Buffer.from(authPluginName + '\0', 'utf8'));
  }

  const tail = Buffer.concat(tailParts);
  const fullResponse = Buffer.concat([handshakeResponse, tail]);

  sendPacket(conn, fullResponse);

  await readOKOrError(conn);

  if (authPluginName === 'caching_sha2_password') {
    const fastAuthResult = await readPacket(conn);
    const firstByte = fastAuthResult[0];
    if (firstByte === 0x01) {
      // Server requests full auth (RSA), which we don't support yet
      throw new Error(
        'caching_sha2_password 需要 RSA 公钥加密。\n' +
        '请将 MySQL 认证方式切换为 mysql_native_password:\n' +
        "ALTER USER '" + cfg.username + "'@'%' IDENTIFIED WITH mysql_native_password BY 'your_password';\n" +
        'FLUSH PRIVILEGES;'
      );
    }
    if (firstByte === 0x00 || firstByte === 0xfe) {
      Logger.info(TAG, 'caching_sha2_password 快速认证成功');
    } else {
      throw new Error('认证失败：收到意外的响应');
    }
  }

  Logger.info(TAG, 'MySQL 认证成功', { host: cfg.host });
}

async function readColumnCount(conn: MySQLConnection): Promise<number> {
  const packet = await readPacket(conn);
  const { value } = readLengthEncodedInteger(packet, 0);
  return Number(value ?? 0);
}

async function readColumnDefinitions(conn: MySQLConnection, count: number): Promise<string[]> {
  const columns: string[] = [];
  for (let i = 0; i < count; i++) {
    const packet = await readPacket(conn);
    // Skip catalog, schema, table, org_table
    let offset = 0;
    const { bytesRead: catBytes } = readLengthEncodedString(packet, offset);
    offset += catBytes;
    const { bytesRead: schBytes } = readLengthEncodedString(packet, offset);
    offset += schBytes;
    const { bytesRead: tblBytes } = readLengthEncodedString(packet, offset);
    offset += tblBytes;
    const { bytesRead: orgTblBytes } = readLengthEncodedString(packet, offset);
    offset += orgTblBytes;
    // Column name
    const { value: colName, bytesRead: colBytes } = readLengthEncodedString(packet, offset);
    offset += colBytes;
    // Column length (length-encoded integer)
    const { bytesRead: colLenBytes } = readLengthEncodedInteger(packet, offset);
    offset += colLenBytes;
    // Column type, flags, decimals
    offset += 3;
    columns.push(colName || '?');
  }
  return columns;
}

async function readRow(packet: Buffer): Promise<Record<string, unknown>> {
  const row: Record<string, unknown> = {};
  let offset = 0;

  while (offset < packet.length) {
    if (packet[offset] === 0xfb) {
      // NULL value
      row[`_col_${Object.keys(row).length}`] = null;
      offset++;
      continue;
    }
    const { value, bytesRead } = readLengthEncodedString(packet, offset);
    const colIndex = Object.keys(row).length;
    row[`_col_${colIndex}`] = value ?? null;
    offset += bytesRead;
  }

  return row;
}

async function readResultSet(
  conn: MySQLConnection,
  columnCount: number
): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const columns = await readColumnDefinitions(conn, columnCount);

  if (!conn.deprecateEOF) {
    await readPacket(conn); // consume EOF
  }

  const rows: Record<string, unknown>[] = [];

  while (true) {
    const pkt = await readPacket(conn);

    // EOF or OK packet
    if (pkt.length < 9) {
      const fb = pkt[0];
      if (fb === 0xfe || fb === 0x00) break;
    }
    // OK packet with deprecateEOF
    if (conn.deprecateEOF && pkt[0] === 0xfe && pkt.length < 9) break;
    // Check for OK packet marker in deprecateEOF mode
    if (conn.deprecateEOF && pkt[0] === 0x00) break;

    const row = await readRow(pkt);

    // Map column indices to real column names
    const namedRow: Record<string, unknown> = {};
    for (let i = 0; i < columns.length; i++) {
      namedRow[columns[i]] = row[`_col_${i}`] ?? null;
    }
    rows.push(namedRow);
  }

  return { columns, rows };
}

const MAX_PACKET_SIZE = 16777215;

async function establishConnection(
  cfg: DbConnectionConfig,
  timeoutMs: number
): Promise<MySQLConnection> {
  const socket = await connectTcp(cfg.host, cfg.port, timeoutMs);

  const conn: MySQLConnection = {
    socket,
    sequenceId: 0,
    readBuffer: Buffer.alloc(0),
    deprecateEOF: false,
  };

  await performHandshake(conn, cfg);
  return conn;
}

async function executeSelectQuery(
  conn: MySQLConnection,
  sql: string,
  timeoutMs: number
): Promise<Omit<QueryResult, 'durationMs'>> {
  const timeoutTimer = setTimeout(() => {
    conn.socket?.destroy();
  }, timeoutMs);

  try {
    const queryPayload = Buffer.alloc(1 + Buffer.byteLength(sql, 'utf8'));
    queryPayload[0] = COM_QUERY;
    queryPayload.write(sql, 1, 'utf8');
    sendPacket(conn, queryPayload);

    const columnCount = await readColumnCount(conn);

    if (columnCount === 0) {
      await readOKOrError(conn);
      return {
        success: true,
        columns: ['result'],
        rows: [{ result: '查询执行成功（无结果集）' }],
        rowCount: 1,
      };
    }

    const { columns, rows } = await readResultSet(conn, columnCount);
    return {
      success: true,
      columns,
      rows,
      rowCount: rows.length,
    };
  } finally {
    clearTimeout(timeoutTimer);
  }
}

async function fetchMysqlProcedures(
  conn: MySQLConnection,
  dbName: string,
  timeoutMs: number
): Promise<{ name: string; schema: string; language: string; params: string; definer: string; created: string }[]> {
  const sql = `
    SELECT ROUTINE_NAME AS name, ROUTINE_SCHEMA AS \`schema\`, 'SQL' AS language,
           COALESCE((SELECT GROUP_CONCAT(CONCAT(PARAMETER_MODE, ' ', PARAMETER_NAME, ' ', DTD_IDENTIFIER) SEPARATOR ', ')
                     FROM information_schema.PARAMETERS
                     WHERE SPECIFIC_SCHEMA = r.ROUTINE_SCHEMA AND SPECIFIC_NAME = r.ROUTINE_NAME), '') AS params,
           DEFINER AS definer, DATE_FORMAT(CREATED, '%Y-%m-%d') AS created
    FROM information_schema.ROUTINES r
    WHERE ROUTINE_SCHEMA = '${dbName.replace(/'/g, "\\'")}'
  `;

  const result = await executeSelectQuery(conn, sql, timeoutMs);
  if (!result.success) return [];

  return result.rows.map((row: any) => ({
    name: String(row.name ?? ''),
    schema: String(row.schema ?? ''),
    language: String(row.language ?? 'SQL'),
    params: String(row.params ?? ''),
    definer: String(row.definer ?? ''),
    created: String(row.created ?? ''),
  }));
}

export async function runMysqlQuery(
  cfg: DbConnectionConfig,
  sql: string,
  timeoutMs: number = 30000
): Promise<QueryResult> {
  let conn: MySQLConnection | null = null;
  const start = Date.now();

  try {
    conn = await establishConnection(cfg, 10000);
    const result = await executeSelectQuery(conn, sql, timeoutMs);
    return { ...result, durationMs: Date.now() - start };
  } catch (err: any) {
    Logger.logError(TAG, 'MySQL 查询失败', err);
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

export async function runMysqlProcedures(
  cfg: DbConnectionConfig,
  timeoutMs: number = 15000
): Promise<{ name: string; schema: string; language: string; params: string; definer: string; created: string }[]> {
  let conn: MySQLConnection | null = null;

  try {
    conn = await establishConnection(cfg, 10000);
    return await fetchMysqlProcedures(conn, cfg.dbName, timeoutMs);
  } catch (err: any) {
    Logger.logError(TAG, 'MySQL 获取存储过程失败', err);
    return [];
  } finally {
    if (conn) {
      try { conn.socket.destroy(); } catch {}
    }
  }
}

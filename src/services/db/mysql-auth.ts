import { Buffer } from 'buffer';
import * as Crypto from 'expo-crypto';
import { Logger } from '@/utils/logger';

const TAG = 'MySQLAuth';

async function sha1(data: string | Buffer): Promise<Buffer> {
  const input = typeof data === 'string' ? data : data.toString('hex');
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA1,
    input,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return Buffer.from(hash, 'hex');
}

async function sha256(data: string | Buffer): Promise<Buffer> {
  const input = typeof data === 'string' ? data : data.toString('hex');
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return Buffer.from(hash, 'hex');
}

export async function mysqlNativePassword(password: string, salt: Buffer): Promise<Buffer> {
  if (!password) {
    Logger.debug(TAG, '空密码认证');
    return Buffer.alloc(0);
  }

  const stage1 = await sha1(password);
  const combined = Buffer.concat([salt, await sha1(stage1)]);
  const stage2 = await sha1(combined);

  const result = Buffer.alloc(20);
  for (let i = 0; i < 20; i++) {
    result[i] = stage1[i] ^ stage2[i];
  }

  Logger.debug(TAG, 'mysql_native_password 认证数据已生成');
  return result;
}

export async function cachingSha2PasswordFastAuth(password: string, salt: Buffer): Promise<Buffer> {
  if (!password) {
    return Buffer.alloc(0);
  }

  const stage1 = await sha256(password);
  const stage1Hash = await sha256(stage1);
  const combined = Buffer.concat([salt, stage1Hash]);
  const stage2 = await sha256(combined);

  const result = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    result[i] = stage1[i] ^ stage2[i];
  }

  Logger.debug(TAG, 'caching_sha2_password fast auth 数据已生成');
  return result;
}

export interface MySQLAuthResult {
  authResponse: Buffer;
  authPluginName: string;
}

export async function buildMysqlAuthResponse(
  authPluginName: string,
  password: string,
  authPluginData: Buffer
): Promise<MySQLAuthResult> {
  const plugin = authPluginName.toLowerCase().replace(/_/g, '_');

  if (plugin === 'mysql_native_password') {
    const authResp = await mysqlNativePassword(password, authPluginData);
    return { authResponse: authResp, authPluginName: 'mysql_native_password' };
  }

  if (plugin === 'caching_sha2_password') {
    const authResp = await cachingSha2PasswordFastAuth(password, authPluginData);
    return { authResponse: authResp, authPluginName: 'caching_sha2_password' };
  }

  throw new Error(
    `不支持的认证插件: ${authPluginName}。\n` +
    `MySQL 8.0+ 默认使用 caching_sha2_password，可通过以下命令切换到 mysql_native_password：\n` +
    `ALTER USER 'user'@'%' IDENTIFIED WITH mysql_native_password BY 'password';\n` +
    `FLUSH PRIVILEGES;`
  );
}

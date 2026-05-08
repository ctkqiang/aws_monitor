import { Buffer } from 'buffer';
import Crypto from 'expo-crypto';
import { Logger } from '@/utils/logger';

const TAG = 'PgAuth';

async function md5(data: string | Buffer): Promise<Buffer> {
  const input = typeof data === 'string' ? data : data.toString('hex');
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.MD5,
    input,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return Buffer.from(hash, 'hex');
}

export async function pgMd5Password(password: string, username: string, salt: Buffer): Promise<Buffer> {
  if (!password) {
    Logger.debug(TAG, '空密码认证');
    return Buffer.from(password + '\0', 'utf8');
  }

  const inner = await md5(Buffer.concat([Buffer.from(password, 'utf8'), Buffer.from(username, 'utf8')]));
  const salted = Buffer.concat([
    Buffer.from(inner.toString('hex'), 'utf8'),
    salt,
  ]);
  const outer = await md5(salted);

  Logger.debug(TAG, 'MD5 密码认证哈希已生成');
  return Buffer.from('md5' + outer.toString('hex') + '\0', 'utf8');
}

export async function pgScramSha256FastAuth(
  password: string,
  serverFirstMessage: string
): Promise<{ clientFirstMessage: string; clientFinalMessage: string }> {
  throw new Error(
    'SCRAM-SHA-256 认证暂不支持。\n' +
    '请将 PostgreSQL 认证方式切换为 md5:\n' +
    'pg_hba.conf: host all all 0.0.0.0/0 md5\n' +
    '然后 pg_ctl reload'
  );
}

export async function pgPasswordAuth(password: string): Promise<Buffer> {
  return Buffer.from(password + '\0', 'utf8');
}

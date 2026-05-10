import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { createAwsConfigForService } from '@/services/aws/client';
import { Logger } from '@/utils/logger';

const TAG = 'GetSecretValue';

export interface SecretKeyValue {
  key: string;
  value: string;
}

export interface SecretValueResult {
  secretString: string;
  keyValuePairs: SecretKeyValue[];
  versionId?: string;
  versionStages?: string[];
}

export class SecretValueError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'SecretValueError';
    this.code = code;
  }
}

function classifyError(error: any): SecretValueError {
  const code = error?.__type || error?.name || error?.Code || 'UnknownError';
  const message = error?.message || String(error);

  if (code === 'ResourceNotFoundException' || code === 'SecretsManagerException') {
    return new SecretValueError('秘密不存在或已被删除。', 'NOT_FOUND');
  }
  if (code === 'AccessDeniedException' || code === 'UnauthorizedException') {
    return new SecretValueError('没有权限读取该秘密。请检查 IAM 权限。', 'PERMISSION_DENIED');
  }
  if (code === 'KMSAccessDeniedException') {
    return new SecretValueError('KMS 密钥访问被拒绝。无法解密秘密。', 'KMS_DENIED');
  }
  if (code === 'KMSNotFoundException') {
    return new SecretValueError('用于加密的 KMS 密钥不存在。', 'KMS_NOT_FOUND');
  }
  if (code === 'InvalidRequestException' && message.includes('deleted')) {
    return new SecretValueError('该秘密已被标记为删除，无法读取。', 'SCHEDULED_DELETION');
  }
  if (code === 'TimeoutError' || message.includes('timeout') || message.includes('ETIMEDOUT')) {
    return new SecretValueError('请求超时，请检查网络连接后重试。', 'NETWORK_ERROR');
  }
  if (message.includes('Network') || message.includes('fetch failed') || message.includes('ENOTFOUND')) {
    return new SecretValueError('网络连接失败，请检查网络设置。', 'NETWORK_ERROR');
  }
  return new SecretValueError(`获取秘密值失败: ${message}`, code);
}

function parseKeyValuePairs(rawString: string): SecretKeyValue[] {
  try {
    const parsed = JSON.parse(rawString);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return Object.entries(parsed).map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
      }));
    }
  } catch {
    // Not JSON, treat as a single plaintext key
  }
  return [{ key: '(plaintext)', value: rawString }];
}

export async function getSecretValue(secretId: string): Promise<SecretValueResult> {
  const config = createAwsConfigForService();
  const client = new SecretsManagerClient(config);

  try {
    const response = await client.send(new GetSecretValueCommand({ SecretId: secretId }));

    let secretString: string;

    if (response.SecretString) {
      secretString = response.SecretString;
    } else if (response.SecretBinary) {
      secretString = Buffer.from(response.SecretBinary as Uint8Array).toString('utf-8');
    } else {
      throw new SecretValueError('秘密值为空。', 'EMPTY_VALUE');
    }

    const keyValuePairs = parseKeyValuePairs(secretString);

    Logger.info(TAG, `成功获取秘密值, ${keyValuePairs.length} 个键值对`, {
      versionId: response.VersionId,
      keyCount: keyValuePairs.length,
    });

    return {
      secretString,
      keyValuePairs,
      versionId: response.VersionId,
      versionStages: response.VersionStages,
    };
  } catch (error: any) {
    if (error instanceof SecretValueError) {
      Logger.warn(TAG, '获取秘密值失败', { code: error.code });
      throw error;
    }
    const classified = classifyError(error);
    Logger.warn(TAG, '获取秘密值失败', { code: classified.code });
    throw classified;
  }
}

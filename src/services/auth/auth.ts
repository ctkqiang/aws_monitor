import { CloudWatchLogsClient, DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { FetchHttpHandler } from '@smithy/fetch-http-handler';
import { useAuthStore } from '@/stores/authStore';
import { Logger } from '@/utils/logger';

const TAG = '认证';

export interface LoginParams {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

const VALID_REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'af-south-1', 'ap-east-1', 'ap-south-1', 'ap-south-2',
  'ap-southeast-1', 'ap-southeast-2', 'ap-southeast-3', 'ap-southeast-4',
  'ap-southeast-5', 'ap-southeast-7',
  'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
  'ca-central-1', 'ca-west-1', 'eu-central-1', 'eu-central-2',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-south-1', 'eu-south-2',
  'eu-north-1', 'il-central-1', 'me-central-1', 'me-south-1',
  'sa-east-1',
];

const CREDENTIAL_EXPIRY_MS = 12 * 60 * 60 * 1000;

export function validateLoginParams(params: LoginParams): string | null {
  const region = params.region?.trim();
  const keyId = params.accessKeyId?.trim();
  const secret = params.secretAccessKey?.trim();

  if (!region) return '请输入 AWS 区域。';
  if (!keyId) return '请输入访问密钥 ID。';
  if (!keyId.startsWith('AKIA')) return '访问密钥 ID 格式无效，必须以 AKIA 开头。';
  if (keyId.length < 20 || keyId.length > 24) return '访问密钥 ID 长度无效。';
  if (!secret) return '请输入秘密访问密钥。';
  if (secret.length < 16) return '秘密访问密钥太短，至少需要 16 个字符。';

  const normalizedRegion = region.toLowerCase().trim();
  if (!VALID_REGIONS.includes(normalizedRegion)) {
    return `区域 "${region}" 不是有效的 AWS 区域。`;
  }

  return null;
}

async function verifyCredentials(region: string, accessKeyId: string, secretAccessKey: string): Promise<void> {
  Logger.info(TAG, '正在验证凭证...', { region });

  const client = new CloudWatchLogsClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
    requestHandler: new FetchHttpHandler(),
  });

  await client.send(new DescribeLogGroupsCommand({ limit: 1 }));

  Logger.info(TAG, '凭证验证通过');
}

export async function signInWithAws(params: LoginParams): Promise<void> {
  const region = params.region?.trim() || 'us-east-1';
  const keyId = params.accessKeyId?.trim();
  const secret = params.secretAccessKey?.trim();

  Logger.info(TAG, '登录流程开始', {
    region,
    keyStart: keyId?.substring(0, 8) + '****',
    keyLength: keyId?.length,
    secretLength: secret?.length,
  });

  const validationError = validateLoginParams(params);
  if (validationError) {
    Logger.warn(TAG, '参数验证失败', { error: validationError });
    throw new Error(validationError);
  }

  try {
    await verifyCredentials(region, keyId, secret);
  } catch (e: any) {
    const code = e?.name || '未知错误';
    const message = e?.message || '';

    Logger.error(TAG, '凭证验证失败', { code, message });

    if (code === 'InvalidSignatureException' || code === 'SignatureDoesNotMatch') {
      throw new Error('秘密访问密钥不正确。请检查后重试。');
    }
    if (code === 'InvalidClientTokenId' || code === 'AccessDenied' || code === 'AccessDeniedException') {
      throw new Error('访问密钥 ID 无效或权限不足。');
    }
    if (code === 'UnrecognizedClientException') {
      throw new Error('无效的访问密钥 ID。请检查格式是否正确。');
    }
    if (message.includes('Endpoint') || message.includes('region') || message.includes('Could not resolve')) {
      throw new Error('无法连接到 AWS API。请检查区域设置和网络连接。');
    }
    if (code === 'NetworkingError' || code === 'TimeoutError' || message.includes('timeout')) {
      throw new Error('网络连接失败或请求超时，请检查网络后重试。');
    }
    if (code === 'ThrottlingException') {
      throw new Error('请求过于频繁，请稍等片刻后重试。');
    }
    if (code === 'ServiceUnavailable') {
      throw new Error('AWS 服务暂不可用，请稍后重试。');
    }

    throw new Error(`${code}: ${message}`);
  }

  const creds = {
    accessKeyId: keyId,
    secretAccessKey: secret,
  };

  useAuthStore.getState().setCredentials(creds);
  useAuthStore.getState().setRegion(region);
  Logger.info(TAG, '登录完成', {
    region,
    keyId: keyId.substring(0, 8) + '****',
  });
}

export function signOut() {
  const { credentials, region } = useAuthStore.getState();
  Logger.info(TAG, '正在退出登录', { region, hadCredentials: !!credentials });
  useAuthStore.getState().signOut();
}

export function checkCredentialExpiry(): boolean {
  const { credentials, isSignedIn } = useAuthStore.getState();
  if (!isSignedIn || !credentials) return false;

  if (credentials.expiresAt && Date.now() > credentials.expiresAt) {
    Logger.info(TAG, '凭证已过期，自动退出登录');
    signOut();
    return true;
  }

  return false;
}

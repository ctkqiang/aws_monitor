import { CloudWatchLogsClient, DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { FetchHttpHandler } from '@smithy/fetch-http-handler';
import { useAuthStore } from '@/stores/authStore';
import { Logger } from '@/utils/logger';

const TAG = 'Auth';

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

  if (!region) return 'Region is required.';
  if (!keyId) return 'Access Key ID is required.';
  if (!keyId.startsWith('AKIA')) return 'Invalid Access Key ID format. Must start with AKIA.';
  if (keyId.length < 20 || keyId.length > 24) return 'Access Key ID has invalid length.';
  if (!secret) return 'Secret Access Key is required.';
  if (secret.length < 16) return 'Secret Access Key too short. Must be at least 16 characters.';

  return null;
}

async function verifyCredentials(region: string, accessKeyId: string, secretAccessKey: string): Promise<void> {
  Logger.info(TAG, 'Verifying credentials...', { region });

  const client = new CloudWatchLogsClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
    requestHandler: new FetchHttpHandler(),
  });

  await client.send(new DescribeLogGroupsCommand({ limit: 1 }));

  Logger.info(TAG, 'Credentials verified OK');
}

export async function signInWithAws(params: LoginParams): Promise<void> {
  const region = params.region?.trim() || 'us-east-1';
  const keyId = params.accessKeyId?.trim();
  const secret = params.secretAccessKey?.trim();

  Logger.debug(TAG, 'RAW CREDENTIALS (debug only)', {
    region,
    accessKeyId: keyId,
    accessKeyId_length: keyId?.length,
    secretAccessKey: secret,
    secretAccessKey_length: secret?.length,
  });

  Logger.info(TAG, 'signInWithAws started', {
    region,
    keyStart: keyId?.substring(0, 8),
    keyLength: keyId?.length,
    secretLength: secret?.length,
  });

  const validationError = validateLoginParams(params);
  if (validationError) {
    Logger.warn(TAG, 'Validation failed', { error: validationError });
    throw new Error(validationError);
  }

  useAuthStore.getState().signOut();

  try {
    await verifyCredentials(region, keyId, secret);
  } catch (e: any) {
    const code = e?.name || 'UnknownError';
    const message = e?.message || '';
    Logger.error(TAG, 'Credential verification failed', { code, message });

    if (code === 'UnrecognizedClientException') {
      throw new Error('Invalid credentials. The Access Key ID or Secret Access Key is incorrect, or this key has been deleted/inactivated.');
    }
    if (code === 'AccessDeniedException' || code === 'AccessDenied') {
      throw new Error('Access denied. Your IAM user lacks logs:DescribeLogGroups permission.');
    }
    if (message.includes('InvalidClientTokenId')) {
      throw new Error('The Access Key ID does not exist.');
    }
    if (message.includes('SignatureDoesNotMatch') || message.includes('security token')) {
      throw new Error('The Secret Access Key is incorrect.');
    }
    throw new Error(`${code}: ${message}`);
  }

  const now = Date.now();

  useAuthStore.getState().setCredentials({
    accessKeyId: keyId,
    secretAccessKey: secret,
    expiresAt: now + CREDENTIAL_EXPIRY_MS,
  });

  useAuthStore.getState().setRegion(region);

  Logger.info(TAG, 'Login complete', {
    region,
    keyId: keyId.substring(0, 8) + '****',
  });
}

export function signOut() {
  const { credentials, region } = useAuthStore.getState();
  Logger.info(TAG, 'Signing out', { region, hadCredentials: !!credentials });
  useAuthStore.getState().signOut();
}

export function checkCredentialExpiry(): boolean {
  const { credentials, isSignedIn } = useAuthStore.getState();
  if (!isSignedIn || !credentials) return false;

  if (credentials.expiresAt && Date.now() > credentials.expiresAt) {
    Logger.info(TAG, 'Credentials expired, auto sign-out');
    signOut();
    return true;
  }

  return false;
}

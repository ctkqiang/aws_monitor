import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { ECSClient } from '@aws-sdk/client-ecs';
import { ECRClient } from '@aws-sdk/client-ecr';
import { FetchHttpHandler } from '@smithy/fetch-http-handler';
import { useAuthStore } from '@/stores/authStore';
import { checkCredentialExpiry } from '@/services/auth/auth';
import { Logger } from '@/utils/logger';

const TAG = 'AWSClient';

function createAwsConfig(region?: string) {
  const expired = checkCredentialExpiry();
  if (expired) {
    Logger.warn(TAG, 'Credentials expired on client creation');
    throw new Error('Session expired. Please sign in again.');
  }

  const { credentials } = useAuthStore.getState();
  if (!credentials) {
    Logger.error(TAG, 'No credentials available');
    throw new Error('Not authenticated. Please sign in first.');
  }

  const creds: Record<string, string> = {
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
  };

  if (credentials.sessionToken) {
    creds.sessionToken = credentials.sessionToken;
  }

  Logger.debug(TAG, 'Creating client', {
    region: region || useAuthStore.getState().region,
    accessKeyId: credentials.accessKeyId,
    accessKeyId_length: credentials.accessKeyId?.length,
    secretAccessKey: credentials.secretAccessKey,
    secretAccessKey_length: credentials.secretAccessKey?.length,
    hasSessionToken: !!credentials.sessionToken,
  });

  return {
    region: region || useAuthStore.getState().region,
    credentials: creds,
    requestHandler: new FetchHttpHandler(),
  };
}

export function createCloudWatchLogsClient(region?: string): CloudWatchLogsClient {
  return new CloudWatchLogsClient(createAwsConfig(region));
}

export function createECSClient(region?: string): ECSClient {
  return new ECSClient(createAwsConfig(region));
}

export function createECRClient(region?: string): ECRClient {
  return new ECRClient(createAwsConfig(region));
}

import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { ECSClient } from '@aws-sdk/client-ecs';
import { ECRClient } from '@aws-sdk/client-ecr';
import { useAuthStore } from '@/stores/authStore';

function createAwsConfig(region?: string) {
  const { credentials } = useAuthStore.getState();
  if (!credentials) {
    throw new Error('Not authenticated. Please sign in first.');
  }

  const creds: { accessKeyId: string; secretAccessKey: string; sessionToken?: string } = {
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
  };

  if (credentials.sessionToken) {
    creds.sessionToken = credentials.sessionToken;
  }

  return {
    region: region || useAuthStore.getState().region,
    credentials: creds,
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

import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { ECSClient } from '@aws-sdk/client-ecs';
import { ECRClient } from '@aws-sdk/client-ecr';
import { useAuthStore } from '@/stores/authStore';

function createAwsConfig(region?: string) {
  const { credentials } = useAuthStore.getState();
  if (!credentials) {
    throw new Error('Not authenticated. Please sign in first.');
  }
  return {
    region: region || useAuthStore.getState().region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
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

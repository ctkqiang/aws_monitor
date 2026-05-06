import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { ECSClient } from '@aws-sdk/client-ecs';
import { ECRClient } from '@aws-sdk/client-ecr';
import { RDSClient } from '@aws-sdk/client-rds';
import { ElastiCacheClient } from '@aws-sdk/client-elasticache';
import { ElasticLoadBalancingV2Client } from '@aws-sdk/client-elastic-load-balancing-v2';
import { EC2Client } from '@aws-sdk/client-ec2';
import { FSxClient } from '@aws-sdk/client-fsx';
import { CostExplorerClient } from '@aws-sdk/client-cost-explorer';
import { S3Client } from '@aws-sdk/client-s3';
import { FetchHttpHandler } from '@smithy/fetch-http-handler';
import { useAuthStore } from '@/stores/authStore';
import { checkCredentialExpiry } from '@/services/auth/auth';
import { Logger } from '@/utils/logger';

const TAG = 'AWS客户端';

export function createAwsConfigForService() {
  const expired = checkCredentialExpiry();
  if (expired) {
    Logger.warn(TAG, '凭证已过期，无法创建客户端');
    throw new Error('会话已过期。请重新登录。');
  }

  const { credentials } = useAuthStore.getState();
  if (!credentials) {
    Logger.error(TAG, '没有可用凭证');
    throw new Error('未登录。请先登录。');
  }

  const creds = {
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    ...(credentials.sessionToken ? { sessionToken: credentials.sessionToken } : {}),
  };

  Logger.debug(TAG, '正在创建客户端', {
    region: useAuthStore.getState().region,
    accessKeyId: (credentials.accessKeyId || '').substring(0, 8) + '****',
    hasSessionToken: !!credentials.sessionToken,
  });

  return {
    region: useAuthStore.getState().region,
    credentials: creds,
    requestHandler: new FetchHttpHandler(),
  };
}

function createAwsConfig(region?: string) {
  return createAwsConfigForService();
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

export function createRDSClient(region?: string): RDSClient {
  return new RDSClient(createAwsConfig(region));
}

export function createElastiCacheClient(region?: string): ElastiCacheClient {
  return new ElastiCacheClient(createAwsConfig(region));
}

export function createELBClient(region?: string): ElasticLoadBalancingV2Client {
  return new ElasticLoadBalancingV2Client(createAwsConfig(region));
}

export function createEC2Client(region?: string): EC2Client {
  return new EC2Client(createAwsConfig(region));
}

export function createFSxClient(region?: string): FSxClient {
  return new FSxClient(createAwsConfig(region));
}

export function createCostExplorerClient(region?: string): CostExplorerClient {
  return new CostExplorerClient(createAwsConfig(region));
}

export function createS3Client(region?: string): S3Client {
  return new S3Client(createAwsConfig(region));
}

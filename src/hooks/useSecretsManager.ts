import { useQuery } from '@tanstack/react-query';
import { SecretsManagerClient, ListSecretsCommand, GetSecretValueCommand, type SecretListEntry } from '@aws-sdk/client-secrets-manager';
import { createAwsConfigForService } from '@/services/aws/client';
import { Logger } from '@/utils/logger';

const TAG = 'SecretsManager';

export interface SecretEntry {
  Name: string;
  ARN: string;
  Description?: string;
  LastChangedDate?: Date;
  LastRotatedDate?: Date;
  RotationEnabled?: boolean;
  SecretString?: string;
}

async function fetchSecrets(): Promise<SecretEntry[]> {
  const config = createAwsConfigForService();
  const client = new SecretsManagerClient(config);
  try {
    const listRes = await client.send(new ListSecretsCommand({ MaxResults: 100 }));
    const secrets = (listRes.SecretList || []).map((s: SecretListEntry) => ({
      Name: s.Name || '',
      ARN: s.ARN || '',
      Description: s.Description,
      LastChangedDate: s.LastChangedDate,
      LastRotatedDate: s.LastRotatedDate,
      RotationEnabled: s.RotationEnabled,
    }));
    Logger.info(TAG, `获取到 ${secrets.length} 个 Secrets`);
    return secrets;
  } catch (e: any) {
    Logger.warn(TAG, '获取 Secrets 失败', { error: e.message });
    return [];
  }
}

export function useSecrets() {
  return useQuery<SecretEntry[]>({
    queryKey: ['secrets-manager'],
    queryFn: fetchSecrets,
    staleTime: 60000,
    retry: 1,
  });
}

export async function fetchSecretValue(secretName: string): Promise<string> {
  const config = createAwsConfigForService();
  const client = new SecretsManagerClient(config);
  try {
    const res = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
    return res.SecretString || '';
  } catch (e: any) {
    Logger.warn(TAG, `获取 Secret 值失败: ${secretName}`, { error: e.message });
    return '';
  }
}

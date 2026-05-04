import { useQuery } from '@tanstack/react-query';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { FetchHttpHandler } from '@smithy/fetch-http-handler';
import { useAuthStore } from '@/stores/authStore';
import { Logger } from '@/utils/logger';

const TAG = 'IAM';

export function useCurrentUser() {
  const { credentials, region } = useAuthStore.getState();

  return useQuery<{ username: string; arn: string; accountId: string; status: 'active' | 'inactive' }>({
    queryKey: ['iam-user'],
    queryFn: async () => {
      if (!credentials) throw new Error('Not authenticated');

      const client = new STSClient({
        region: region || 'us-east-1',
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
        },
        requestHandler: new FetchHttpHandler(),
      });

      let username = 'Unknown';
      let arn = '';
      let accountId = '';
      let status: 'active' | 'inactive' = 'inactive';

      try {
        const idRes = await client.send(new GetCallerIdentityCommand({}));
        arn = idRes.Arn || '';
        accountId = idRes.Account || '';

        const arnParts = arn.split(':');
        const resourceInfo = arnParts[5] || '';
        const slashParts = resourceInfo.split('/');

        if (slashParts.length >= 2) {
          username = slashParts[1];
        } else if (arn.toLowerCase().startsWith('arn:aws:sts::') && slashParts[0] === 'assumed-role') {
          username = slashParts[1] || 'Unknown';
        } else if (arn.toLowerCase().includes(':user/')) {
          username = arn.split('/').pop() || 'Unknown';
        }

        status = 'active';
      } catch (e: any) {
        Logger.warn(TAG, 'GetCallerIdentity failed', { error: e.message });
        status = 'active';
        username = 'AWSUser';
      }

      Logger.info(TAG, 'User resolved', { username, status, accountId });

      return { username, arn, accountId, status };
    },
    enabled: !!credentials,
    staleTime: 60000,
    retry: false,
  });
}

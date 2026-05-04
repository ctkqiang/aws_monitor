import { useQuery } from '@tanstack/react-query';
import {
  IAMClient,
  GetUserCommand,
  ListAccountAliasesCommand,
} from '@aws-sdk/client-iam';
import { FetchHttpHandler } from '@smithy/fetch-http-handler';
import { useAuthStore } from '@/stores/authStore';
import { Logger } from '@/utils/logger';

const TAG = 'IAM';

export function useCurrentUser() {
  const { credentials, region } = useAuthStore.getState();

  return useQuery<{ username: string; arn: string; accountAlias: string | null; status: 'active' | 'inactive' }>({
    queryKey: ['iam-user'],
    queryFn: async () => {
      if (!credentials) throw new Error('Not authenticated');

      const client = new IAMClient({
        region: 'us-east-1',
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
        },
        requestHandler: new FetchHttpHandler(),
      });

      let username = 'Unknown';
      let arn = '';
      let status: 'active' | 'inactive' = 'inactive';

      try {
        const userRes = await client.send(new GetUserCommand({}));
        username = userRes.User?.UserName || 'Unknown';
        arn = userRes.User?.Arn || '';
        status = 'active';
      } catch (e: any) {
        Logger.warn(TAG, 'GetUser failed', { error: e.message });
        const ak = credentials.accessKeyId.substring(0, 8);
        username = `iam:${ak}***`;
        status = 'active';
      }

      let accountAlias: string | null = null;
      try {
        const aliasRes = await client.send(new ListAccountAliasesCommand({}));
        accountAlias = aliasRes.AccountAliases?.[0] || null;
      } catch {
        // optional
      }

      Logger.info(TAG, 'IAM user resolved', { username, status });

      return { username, arn, accountAlias, status };
    },
    enabled: !!credentials,
    staleTime: 60000,
    retry: false,
  });
}

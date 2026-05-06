import { useQuery } from '@tanstack/react-query';
import { IAMClient, GetUserCommand } from '@aws-sdk/client-iam';
import { STSClient, GetCallerIdentityCommand as STSGetCallerIdentity } from '@aws-sdk/client-sts';
import { createAwsConfigForService } from '@/services/aws/client';
import { Logger } from '@/utils/logger';

const TAG = 'IAM';

interface IamUser {
  username: string;
  status: string;
  accountId: string;
  arn: string;
}

async function resolveUser(): Promise<IamUser> {
  const config = createAwsConfigForService();
  try {
    const sts = new STSClient(config);
    const stsRes = await sts.send(new STSGetCallerIdentity({}));
    const arn = stsRes.Arn || '';
    const accountId = stsRes.Account || '';

    let username = arn.split('/').pop() || arn.split(':').pop() || 'AWS User';
    let status = 'active';

    try {
      const iam = new IAMClient(config);
      const userRes = await iam.send(new GetUserCommand({}));
      username = userRes.User?.UserName || username;
      status = 'active';
    } catch (e: any) {
      if (e?.name === 'AccessDenied' || e?.name === 'AccessDeniedException') {
        Logger.warn(TAG, '获取 IAM 用户信息失败', { error: e.message });
      }
    }

    Logger.info(TAG, '用户信息已解析', { username, status, accountId });
    return { username, status, accountId, arn };
  } catch (e: any) {
    Logger.warn(TAG, '获取 STS 身份信息失败', { error: e.message });
    return { username: 'AWS User', status: 'unknown', accountId: '', arn: '' };
  }
}

export function useCurrentUser() {
  return useQuery<IamUser>({
    queryKey: ['iam-user'],
    queryFn: resolveUser,
    staleTime: 300000,
    retry: 1,
  });
}

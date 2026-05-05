import { useQuery } from '@tanstack/react-query';
import {
  EC2Client,
  DescribeSecurityGroupsCommand,
  SecurityGroup,
} from '@aws-sdk/client-ec2';
import { createEC2Client } from '@/services/aws/client';
import { Logger } from '@/utils/logger';

const TAG = 'EC2';

export function useSecurityGroups() {
  return useQuery<SecurityGroup[]>({
    queryKey: ['ec2-security-groups'],
    queryFn: async () => {
      try {
        const client = createEC2Client();
        const sgs: SecurityGroup[] = [];
        let nextToken: string | undefined;
        do {
          const res = await client.send(new DescribeSecurityGroupsCommand({ NextToken: nextToken, MaxResults: 100 }));
          if (res.SecurityGroups) sgs.push(...res.SecurityGroups);
          nextToken = res.NextToken;
        } while (nextToken);
        Logger.info(TAG, `Fetched ${sgs.length} Security Groups`);
        return sgs;
      } catch (e: any) {
        Logger.logError(TAG, 'DescribeSecurityGroups failed', e);
        throw e;
      }
    },
    staleTime: 30000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

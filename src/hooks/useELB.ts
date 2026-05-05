import { useQuery } from '@tanstack/react-query';
import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
  LoadBalancer,
} from '@aws-sdk/client-elastic-load-balancing-v2';
import { createELBClient } from '@/services/aws/client';
import { Logger } from '@/utils/logger';

const TAG = 'ELB';

export function useLoadBalancers() {
  return useQuery<LoadBalancer[]>({
    queryKey: ['elb-load-balancers'],
    queryFn: async () => {
      try {
        const client = createELBClient();
        const lbs: LoadBalancer[] = [];
        let marker: string | undefined;
        do {
          const res = await client.send(new DescribeLoadBalancersCommand({ Marker: marker, PageSize: 100 }));
          if (res.LoadBalancers) lbs.push(...res.LoadBalancers);
          marker = res.NextMarker;
        } while (marker);
        Logger.info(TAG, `Fetched ${lbs.length} Load Balancers`);
        return lbs;
      } catch (e: any) {
        Logger.logError(TAG, 'DescribeLoadBalancers failed', e);
        throw e;
      }
    },
    staleTime: 30000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

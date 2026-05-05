import { useQuery } from '@tanstack/react-query';
import {
  ElastiCacheClient,
  DescribeCacheClustersCommand,
  CacheCluster,
} from '@aws-sdk/client-elasticache';
import { createElastiCacheClient } from '@/services/aws/client';
import { Logger } from '@/utils/logger';

const TAG = 'ElastiCache';

export function useElastiCacheClusters() {
  return useQuery<CacheCluster[]>({
    queryKey: ['elasticache-clusters'],
    queryFn: async () => {
      try {
        const client = createElastiCacheClient();
        const clusters: CacheCluster[] = [];
        let marker: string | undefined;
        do {
          const res = await client.send(new DescribeCacheClustersCommand({ Marker: marker, MaxRecords: 100 }));
          if (res.CacheClusters) clusters.push(...res.CacheClusters);
          marker = res.Marker;
        } while (marker);
        Logger.info(TAG, `Fetched ${clusters.length} ElastiCache clusters`);
        return clusters;
      } catch (e: any) {
        Logger.logError(TAG, 'DescribeCacheClusters failed', e);
        throw e;
      }
    },
    staleTime: 30000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

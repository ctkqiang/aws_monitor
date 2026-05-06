import { useQuery } from '@tanstack/react-query';
import { RDSClient, DescribeDBInstancesCommand, DBInstance } from '@aws-sdk/client-rds';
import { createRDSClient } from '@/services/aws/client';
import { Logger } from '@/utils/logger';

const TAG = 'RDS';

export function useRDSInstances() {
  return useQuery<DBInstance[]>({
    queryKey: ['rds-instances'],
    queryFn: async () => {
      try {
        const client = createRDSClient();
        const instances: DBInstance[] = [];
        let marker: string | undefined;
        do {
          const res = await client.send(new DescribeDBInstancesCommand({ Marker: marker, MaxRecords: 100 }));
          if (res.DBInstances) instances.push(...res.DBInstances);
          marker = res.Marker;
        } while (marker);
        Logger.info(TAG, `获取到 ${instances.length} 个 RDS 实例`);
        return instances;
      } catch (e: any) {
        Logger.logError(TAG, '获取 RDS 实例列表失败', e);
        throw e;
      }
    },
    staleTime: 30000, retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

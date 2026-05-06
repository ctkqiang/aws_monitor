import { useQuery } from '@tanstack/react-query';
import { FSxClient, DescribeFileSystemsCommand, FileSystem } from '@aws-sdk/client-fsx';
import { createFSxClient } from '@/services/aws/client';
import { Logger } from '@/utils/logger';

const TAG = 'FSx';

export function useFSxFileSystems() {
  return useQuery<FileSystem[]>({
    queryKey: ['fsx-file-systems'],
    queryFn: async () => {
      try {
        const client = createFSxClient();
        const systems: FileSystem[] = [];
        let nextToken: string | undefined;
        do {
          const res = await client.send(new DescribeFileSystemsCommand({ NextToken: nextToken, MaxResults: 100 }));
          if (res.FileSystems) systems.push(...res.FileSystems);
          nextToken = res.NextToken;
        } while (nextToken);
        const ontap = systems.filter((fs) => fs.FileSystemType === 'ONTAP');
        Logger.info(TAG, `获取到 ${systems.length} 个 FSx 文件系统（${ontap.length} 个 ONTAP）`);
        return systems;
      } catch (e: any) {
        Logger.logError(TAG, '获取 FSx 文件系统列表失败', e);
        throw e;
      }
    },
    staleTime: 30000, retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

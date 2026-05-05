import { useQuery } from '@tanstack/react-query';
import {
  FSxClient,
  DescribeFileSystemsCommand,
  FileSystem,
} from '@aws-sdk/client-fsx';
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
        Logger.info(TAG, `Fetched ${systems.length} FSx file systems (${ontap.length} ONTAP)`);
        return systems;
      } catch (e: any) {
        Logger.logError(TAG, 'DescribeFileSystems failed', e);
        throw e;
      }
    },
    staleTime: 30000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

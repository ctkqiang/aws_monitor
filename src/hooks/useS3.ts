import { useQuery } from '@tanstack/react-query';
import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  Bucket,
  _Object,
} from '@aws-sdk/client-s3';
import { createS3Client } from '@/services/aws/client';
import { Logger } from '@/utils/logger';

const TAG = 'S3';

export function useBuckets() {
  return useQuery<Bucket[]>({
    queryKey: ['s3-buckets'],
    queryFn: async () => {
      try {
        const client = createS3Client();
        const res = await client.send(new ListBucketsCommand({}));
        const buckets = res.Buckets || [];
        Logger.info(TAG, `Fetched ${buckets.length} S3 buckets`);
        return buckets;
      } catch (e: any) {
        Logger.logError(TAG, 'ListBuckets failed', e);
        throw e;
      }
    },
    staleTime: 30000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

export function useObjects(bucketName: string | null) {
  return useQuery<_Object[]>({
    queryKey: ['s3-objects', bucketName],
    queryFn: async () => {
      if (!bucketName) return [];
      try {
        const client = createS3Client();
        const objects: _Object[] = [];
        let continuationToken: string | undefined;
        let pagesFetched = 0;
        do {
          const res = await client.send(new ListObjectsV2Command({
            Bucket: bucketName,
            ContinuationToken: continuationToken,
            MaxKeys: 200,
          }));
          if (res.Contents) objects.push(...res.Contents);
          continuationToken = res.NextContinuationToken;
          pagesFetched++;
          if (pagesFetched > 10) break;
        } while (continuationToken);
        Logger.info(TAG, `Fetched ${objects.length} objects from ${bucketName}`, { pages: pagesFetched });
        return objects;
      } catch (e: any) {
        Logger.logError(TAG, 'ListObjectsV2 failed', e);
        throw e;
      }
    },
    enabled: !!bucketName,
    staleTime: 30000,
    retry: 1,
  });
}

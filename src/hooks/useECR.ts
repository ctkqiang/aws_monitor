import { useQuery } from '@tanstack/react-query';
import {
  ECRClient,
  DescribeRepositoriesCommand,
  DescribeImagesCommand,
  Repository,
  ImageDetail,
} from '@aws-sdk/client-ecr';
import { createECRClient } from '@/services/aws/client';
import { Logger } from '@/utils/logger';

const TAG = 'ECR';

export function useRepositories() {
  return useQuery<Repository[]>({
    queryKey: ['ecr-repos'],
    queryFn: async () => {
      try {
        const client = createECRClient();
        const repos: Repository[] = [];
        let nextToken: string | undefined;
        do {
          const res = await client.send(new DescribeRepositoriesCommand({ nextToken, maxResults: 100 }));
          if (res.repositories) repos.push(...res.repositories);
          nextToken = res.nextToken;
        } while (nextToken);
        Logger.info(TAG, `Fetched ${repos.length} repositories`);
        return repos;
      } catch (e: any) {
        Logger.error(TAG, 'DescribeRepositories failed', { error: e.message, code: e.name });
        throw e;
      }
    },
    staleTime: 30000,
  });
}

export function useImages(repoName: string | null) {
  return useQuery<ImageDetail[]>({
    queryKey: ['ecr-images', repoName],
    queryFn: async () => {
      if (!repoName) return [];
      try {
        const client = createECRClient();
        const images: ImageDetail[] = [];
        let nextToken: string | undefined;
        do {
          const res = await client.send(new DescribeImagesCommand({
            repositoryName: repoName,
            nextToken,
            maxResults: 100,
          }));
          if (res.imageDetails) images.push(...res.imageDetails);
          nextToken = res.nextToken;
        } while (nextToken);
        Logger.info(TAG, `Fetched ${images.length} images for ${repoName}`);
        return images;
      } catch (e: any) {
        Logger.error(TAG, 'DescribeImages failed', { repoName, error: e.message, code: e.name });
        throw e;
      }
    },
    enabled: !!repoName,
    staleTime: 30000,
  });
}

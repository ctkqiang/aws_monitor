import { useQuery } from '@tanstack/react-query';
import {
  ECRClient,
  DescribeRepositoriesCommand,
  DescribeImagesCommand,
  Repository,
  ImageDetail,
} from '@aws-sdk/client-ecr';
import { createECRClient } from '@/services/aws/client';

export function useRepositories() {
  return useQuery<Repository[]>({
    queryKey: ['ecr-repos'],
    queryFn: async () => {
      const client = createECRClient();
      const repos: Repository[] = [];
      let nextToken: string | undefined;
      do {
        const res = await client.send(new DescribeRepositoriesCommand({ nextToken, maxResults: 100 }));
        if (res.repositories) repos.push(...res.repositories);
        nextToken = res.nextToken;
      } while (nextToken);
      return repos;
    },
    staleTime: 30000,
  });
}

export function useImages(repoName: string | null) {
  return useQuery<ImageDetail[]>({
    queryKey: ['ecr-images', repoName],
    queryFn: async () => {
      if (!repoName) return [];
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
      return images;
    },
    enabled: !!repoName,
    staleTime: 30000,
  });
}

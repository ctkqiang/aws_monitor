import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ECSClient,
  ListClustersCommand,
  ListServicesCommand,
  DescribeServicesCommand,
  UpdateServiceCommand,
  Cluster,
  Service,
} from '@aws-sdk/client-ecs';
import { createECSClient } from '@/services/aws/client';
import { Alert } from 'react-native';

export function useClusters() {
  return useQuery<string[]>({
    queryKey: ['ecs-clusters'],
    queryFn: async () => {
      const client = createECSClient();
      const arns: string[] = [];
      let nextToken: string | undefined;
      do {
        const res = await client.send(new ListClustersCommand({ nextToken }));
        if (res.clusterArns) arns.push(...res.clusterArns);
        nextToken = res.nextToken;
      } while (nextToken);
      return arns;
    },
    staleTime: 30000,
  });
}

export function useServices(clusterArn: string | null) {
  return useQuery<Service[]>({
    queryKey: ['ecs-services', clusterArn],
    queryFn: async () => {
      if (!clusterArn) return [];
      const client = createECSClient();
      const serviceArns: string[] = [];
      let nextToken: string | undefined;
      do {
        const res = await client.send(new ListServicesCommand({ cluster: clusterArn, nextToken }));
        if (res.serviceArns) serviceArns.push(...res.serviceArns);
        nextToken = res.nextToken;
      } while (nextToken);

      const services: Service[] = [];
      for (let i = 0; i < serviceArns.length; i += 10) {
        const batch = serviceArns.slice(i, i + 10);
        const desc = await client.send(new DescribeServicesCommand({ cluster: clusterArn, services: batch }));
        if (desc.services) services.push(...desc.services);
      }
      return services;
    },
    enabled: !!clusterArn,
    staleTime: 30000,
  });
}

export function useRestartService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clusterArn, serviceName }: { clusterArn: string; serviceName: string }) => {
      const client = createECSClient();
      await client.send(new UpdateServiceCommand({
        cluster: clusterArn,
        service: serviceName,
        forceNewDeployment: true,
      }));
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['ecs-services', vars.clusterArn] });
    },
    onError: (err: any) => {
      Alert.alert('Restart Failed', err?.message || 'Unknown error');
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ECSClient,
  ListClustersCommand,
  ListServicesCommand,
  DescribeServicesCommand,
  DescribeTaskDefinitionCommand,
  UpdateServiceCommand,
  Service,
  TaskDefinition,
  Deployment,
} from '@aws-sdk/client-ecs';
import { createECSClient } from '@/services/aws/client';
import { Logger } from '@/utils/logger';
import { Alert, Platform } from 'react-native';

const TAG = 'ECS';

export function useClusters() {
  return useQuery<string[]>({
    queryKey: ['ecs-clusters'],
    queryFn: async () => {
      try {
        const client = createECSClient();
        const arns: string[] = [];
        let nextToken: string | undefined;
        do {
          const res = await client.send(new ListClustersCommand({ nextToken }));
          if (res.clusterArns) arns.push(...res.clusterArns);
          nextToken = res.nextToken;
        } while (nextToken);
        Logger.info(TAG, `Fetched ${arns.length} clusters`);
        return arns;
      } catch (e: any) {
        Logger.error(TAG, 'ListClusters failed', { error: e.message, code: e.name });
        throw e;
      }
    },
    staleTime: 30000,
  });
}

export function useServices(clusterArn: string | null) {
  return useQuery<Service[]>({
    queryKey: ['ecs-services', clusterArn],
    queryFn: async () => {
      if (!clusterArn) return [];
      try {
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
        Logger.info(TAG, `Fetched ${services.length} services for ${clusterArn.split('/').pop()}`);
        return services;
      } catch (e: any) {
        Logger.error(TAG, 'ListServices/DescribeServices failed', { clusterArn, error: e.message, code: e.name });
        throw e;
      }
    },
    enabled: !!clusterArn,
    staleTime: 30000,
  });
}

export function useTaskDefinition(taskDefArn: string | null) {
  return useQuery<TaskDefinition>({
    queryKey: ['ecs-task-def', taskDefArn],
    queryFn: async () => {
      if (!taskDefArn) throw new Error('No task definition ARN');
      const client = createECSClient();
      const res = await client.send(new DescribeTaskDefinitionCommand({ taskDefinition: taskDefArn }));
      if (!res.taskDefinition) throw new Error('Task definition not found');
      return res.taskDefinition;
    },
    enabled: !!taskDefArn,
    staleTime: 60000,
  });
}

export interface RestartResult {
  serviceName: string;
  newDeploymentId: string;
  rolloutState: string;
}

export interface RestartProgress {
  status: 'idle' | 'validating' | 'deploying' | 'verifying' | 'done' | 'error';
  message: string;
  deploymentId?: string;
  rolloutState?: string;
}

export function validateServiceRestart(service: Service): string | null {
  if (service.status !== 'ACTIVE') {
    return 'Service is not ACTIVE. Only ACTIVE services can be restarted.';
  }
  if (!service.deploymentConfiguration) {
    return 'Service has no deployment configuration.';
  }
  const minHealthy = service.deploymentConfiguration.minimumHealthyPercent ?? 100;
  if (minHealthy < 50) {
    return `Warning: minimum healthy percent is ${minHealthy}%. Availability may be impacted.`;
  }
  return null;
}

export function mapRestartError(err: any): string {
  const code = err?.name || 'UnknownError';
  const message = err?.message || '';

  if (code === 'InvalidParameterException') {
    return 'Invalid parameter. Check the service name and cluster ARN.';
  }
  if (code === 'ServiceNotFoundException') {
    return 'Service not found. It may have been deleted.';
  }
  if (code === 'ClusterNotFoundException') {
    return 'Cluster not found. Verify your selection.';
  }
  if (code === 'AccessDeniedException' || code === 'AccessDenied') {
    return 'Access denied. Your IAM role lacks ecs:UpdateService permission.';
  }
  if (message.includes('ThrottlingException') || code === 'ThrottlingException') {
    return 'API rate limit exceeded. Please wait and try again.';
  }
  if (message.includes('too many') || code === 'LimitExceededException') {
    return 'Too many concurrent deployments. Wait for the current one to finish.';
  }
  return `${code}: ${message}`;
}

async function pollForNewDeployment(
  clusterArn: string,
  serviceName: string,
  previousDeploymentIds: string[],
  maxAttempts: number = 12,
): Promise<Deployment | null> {
  const client = createECSClient();
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 2000));

    const res = await client.send(
      new DescribeServicesCommand({ cluster: clusterArn, services: [serviceName] }),
    );

    const svc = res.services?.[0];
    if (!svc || !svc.deployments) continue;

    const newDeployment = svc.deployments.find(
      (d) => !previousDeploymentIds.includes(d.id || ''),
    );

    if (newDeployment) {
      Logger.info(TAG, `New deployment detected after ${attempt * 2}s`, {
        deploymentId: newDeployment.id,
        status: newDeployment.status,
        rolloutState: newDeployment.rolloutState,
      });
      return newDeployment;
    }
  }
  return null;
}

export function useRestartService() {
  const queryClient = useQueryClient();

  return useMutation<RestartResult, Error, { clusterArn: string; serviceName: string; service?: Service }>({
    mutationFn: async ({ clusterArn, serviceName, service }) => {
      Logger.info(TAG, 'Restart initiated', { cluster: clusterArn.split('/').pop(), service: serviceName });

      if (service) {
        const validationError = validateServiceRestart(service);
        if (validationError && !validationError.startsWith('Warning')) {
          Logger.warn(TAG, 'Restart validation failed', { error: validationError });
          throw new Error(validationError);
        }
        if (validationError) {
          Logger.warn(TAG, 'Restart warning', { warning: validationError });
        }
      }

      const previousIds = (service?.deployments || []).map((d: Deployment) => d.id || '');

      const client = createECSClient();
      await client.send(
        new UpdateServiceCommand({
          cluster: clusterArn,
          service: serviceName,
          forceNewDeployment: true,
        }),
      );

      Logger.info(TAG, 'UpdateServiceCommand sent, polling for new deployment...');

      const newDeployment = await pollForNewDeployment(
        clusterArn,
        serviceName,
        previousIds,
      );

      if (newDeployment) {
        Logger.info(TAG, 'Restart confirmed', {
          deploymentId: newDeployment.id,
          rolloutState: newDeployment.rolloutState,
        });
        return {
          serviceName,
          newDeploymentId: newDeployment.id || '',
          rolloutState: newDeployment.rolloutState || 'IN_PROGRESS',
        };
      }

      Logger.info(TAG, 'Restart sent (no new deployment detected within window)');
      return {
        serviceName,
        newDeploymentId: 'pending...',
        rolloutState: 'UNKNOWN',
      };
    },

    onMutate: () => {
      Logger.info(TAG, 'Restart mutation started (onMutate)');
    },

    onSuccess: (result, vars) => {
      Logger.info(TAG, 'Restart completed', {
        service: vars.serviceName,
        deploymentId: result.newDeploymentId,
        rolloutState: result.rolloutState,
      });
      queryClient.invalidateQueries({ queryKey: ['ecs-services', vars.clusterArn] });
    },

    onError: (err: any, vars) => {
      const userMessage = mapRestartError(err);
      Logger.logError(TAG, 'Restart failed', err);
      Alert.alert(
        'Restart Failed',
        userMessage,
        [{ text: 'OK', style: 'default' }],
      );
    },

    onSettled: () => {
      Logger.info(TAG, 'Restart mutation settled');
    },
  });
}

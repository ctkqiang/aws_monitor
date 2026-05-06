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
        Logger.info(TAG, `获取到 ${arns.length} 个 ECS 集群`);
        return arns;
      } catch (e: any) {
        Logger.error(TAG, '获取集群列表失败', { error: e.message, code: e.name });
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
        Logger.info(TAG, `集群 ${clusterArn.split('/').pop()} 获取到 ${services.length} 个服务`);
        return services;
      } catch (e: any) {
        Logger.error(TAG, '获取服务列表失败', { clusterArn, error: e.message, code: e.name });
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
      if (!taskDefArn) throw new Error('缺少任务定义 ARN');
      const client = createECSClient();
      const res = await client.send(new DescribeTaskDefinitionCommand({ taskDefinition: taskDefArn }));
      if (!res.taskDefinition) throw new Error('未找到任务定义');
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
    return '服务未处于活跃状态，仅活跃服务可重启。';
  }
  if (!service.deploymentConfiguration) {
    return '服务缺少部署配置。';
  }
  const minHealthy = service.deploymentConfiguration.minimumHealthyPercent ?? 100;
  if (minHealthy < 50) {
    return `警告：最小健康百分比为 ${minHealthy}%，可用性可能受影响。`;
  }
  return null;
}

export function mapRestartError(err: any): string {
  const code = err?.name || '未知错误';
  const message = err?.message || '';

  if (code === 'InvalidParameterException') {
    return '参数无效，请检查服务名称和集群 ARN。';
  }
  if (code === 'ServiceNotFoundException') {
    return '未找到服务，可能已被删除。';
  }
  if (code === 'ClusterNotFoundException') {
    return '未找到集群，请确认选择。';
  }
  if (code === 'AccessDeniedException' || code === 'AccessDenied') {
    return '访问被拒绝，您的 IAM 角色缺少 ecs:UpdateService 权限。';
  }
  if (message.includes('ThrottlingException') || code === 'ThrottlingException') {
    return 'API 请求频率超限，请稍等后重试。';
  }
  if (message.includes('too many') || code === 'LimitExceededException') {
    return '并发部署过多，请等待当前部署完成后重试。';
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
      Logger.info(TAG, `${attempt * 2}秒后检测到新部署`, {
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
      Logger.info(TAG, '重启已发起', { cluster: clusterArn.split('/').pop(), service: serviceName });

      if (service) {
        const validationError = validateServiceRestart(service);
        if (validationError && !validationError.startsWith('警告')) {
          Logger.warn(TAG, '重启验证失败', { error: validationError });
          throw new Error(validationError);
        }
        if (validationError) {
          Logger.warn(TAG, '重启警告', { warning: validationError });
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

      Logger.info(TAG, '已发送 UpdateServiceCommand，正在轮询新部署...');

      const newDeployment = await pollForNewDeployment(
        clusterArn,
        serviceName,
        previousIds,
      );

      if (newDeployment) {
        Logger.info(TAG, '重启已确认', {
          deploymentId: newDeployment.id,
          rolloutState: newDeployment.rolloutState,
        });
        return {
          serviceName,
          newDeploymentId: newDeployment.id || '',
          rolloutState: newDeployment.rolloutState || '进行中',
        };
      }

      Logger.info(TAG, '重启已发送（在检测窗口内未检测到新部署）');
      return {
        serviceName,
        newDeploymentId: '等待中...',
        rolloutState: '未知',
      };
    },

    onMutate: () => {
      Logger.info(TAG, '重启变更已启动');
    },

    onSuccess: (result, vars) => {
      Logger.info(TAG, '重启完成', {
        service: vars.serviceName,
        deploymentId: result.newDeploymentId,
        rolloutState: result.rolloutState,
      });
      queryClient.invalidateQueries({ queryKey: ['ecs-services', vars.clusterArn] });
    },

    onError: (err: any, vars) => {
      const userMessage = mapRestartError(err);
      Logger.logError(TAG, '重启失败', err);
      Alert.alert(
        '重启失败',
        userMessage,
        [{ text: '确定', style: 'default' }],
      );
    },

    onSettled: () => {
      Logger.info(TAG, '重启变更已结束');
    },
  });
}

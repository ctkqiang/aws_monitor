import { useQuery } from '@tanstack/react-query';
import { ECSClient, DescribeTaskDefinitionCommand, TaskDefinition } from '@aws-sdk/client-ecs';
import { createECSClient } from '@/services/aws/client';
import { Logger } from '@/utils/logger';

const TAG = 'ECS';

export function useTaskDefinition(taskDefArn: string | null) {
  return useQuery<TaskDefinition>({
    queryKey: ['ecs-task-def-detail', taskDefArn],
    queryFn: async () => {
      if (!taskDefArn) throw new Error('缺少任务定义 ARN');
      const client = createECSClient();
      const res = await client.send(new DescribeTaskDefinitionCommand({ taskDefinition: taskDefArn }));
      if (!res.taskDefinition) throw new Error('未找到任务定义');
      Logger.info(TAG, `获取到任务定义: ${res.taskDefinition?.family}`);
      return res.taskDefinition;
    },
    enabled: !!taskDefArn,
    staleTime: 60000,
  });
}

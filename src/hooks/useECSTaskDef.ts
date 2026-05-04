import { useQuery } from '@tanstack/react-query';
import {
  ECSClient,
  DescribeTaskDefinitionCommand,
} from '@aws-sdk/client-ecs';
import { createECSClient } from '@/services/aws/client';
import { Logger } from '@/utils/logger';

const TAG = 'ECSTaskDef';

export function useTaskDefinition(taskDefArn: string | null) {
  return useQuery({
    queryKey: ['task-def', taskDefArn],
    queryFn: async () => {
      if (!taskDefArn) return null;
      try {
        const client = createECSClient();
        const res = await client.send(new DescribeTaskDefinitionCommand({ taskDefinition: taskDefArn }));
        Logger.info(TAG, `Fetched task def: ${res.taskDefinition?.family}`);
        return res.taskDefinition;
      } catch (e: any) {
        Logger.error(TAG, 'DescribeTaskDefinition failed', { error: e.message, code: e.name });
        throw e;
      }
    },
    enabled: !!taskDefArn,
    staleTime: 60000,
  });
}

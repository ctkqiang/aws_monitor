import { useQuery } from '@tanstack/react-query';
import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand, DescribeLogStreamsCommand,
  GetLogEventsCommand, FilterLogEventsCommand,
  LogGroup, LogStream, OutputLogEvent,
} from '@aws-sdk/client-cloudwatch-logs';
import { createCloudWatchLogsClient } from '@/services/aws/client';
import { Logger } from '@/utils/logger';

const TAG = 'CloudWatch';

export function useLogGroups() {
  return useQuery<LogGroup[]>({
    queryKey: ['log-groups'],
    queryFn: async () => {
      try {
        const client = createCloudWatchLogsClient();
        const groups: LogGroup[] = [];
        let nextToken: string | undefined;
        do {
          const res = await client.send(new DescribeLogGroupsCommand({ nextToken, limit: 50 }));
          if (res.logGroups) groups.push(...res.logGroups);
          nextToken = res.nextToken;
        } while (nextToken);
        groups.sort((a, b) => (b.creationTime || 0) - (a.creationTime || 0));
        Logger.info(TAG, `获取到 ${groups.length} 个日志组`);
        return groups;
      } catch (e: any) {
        Logger.error(TAG, '获取日志组列表失败', { error: e.message, code: e.name });
        throw e;
      }
    },
    staleTime: 30000,
  });
}

export function useLogStreams(logGroupName: string | null) {
  return useQuery<LogStream[]>({
    queryKey: ['log-streams', logGroupName],
    queryFn: async () => {
      if (!logGroupName) return [];
      try {
        const client = createCloudWatchLogsClient();
        const streams: LogStream[] = [];
        let nextToken: string | undefined;
        do {
          const res = await client.send(new DescribeLogStreamsCommand({
            logGroupName, nextToken, limit: 50, orderBy: 'LastEventTime', descending: true,
          }));
          if (res.logStreams) streams.push(...res.logStreams);
          nextToken = res.nextToken;
        } while (nextToken);
        Logger.info(TAG, `日志组 ${logGroupName} 获取到 ${streams.length} 个日志流`);
        return streams;
      } catch (e: any) {
        Logger.error(TAG, '获取日志流列表失败', { logGroupName, error: e.message, code: e.name });
        throw e;
      }
    },
    enabled: !!logGroupName,
    staleTime: 30000,
  });
}

export function useLogEvents(
  logGroupName: string | null,
  logStreamName: string | null,
) {
  return useQuery<OutputLogEvent[]>({
    queryKey: ['log-events', logGroupName, logStreamName],
    queryFn: async () => {
      if (!logGroupName || !logStreamName) return [];
      try {
        const client = createCloudWatchLogsClient();
        const events: OutputLogEvent[] = [];
        let nextToken: string | undefined;
        let pageCount = 0;
        do {
          const res = await client.send(new GetLogEventsCommand({
            logGroupName, logStreamName, nextToken, limit: 100, startFromHead: false,
          }));
          if (res.events) events.push(...res.events);
          nextToken = res.nextForwardToken !== nextToken ? res.nextForwardToken : undefined;
          pageCount++;
          if (pageCount > 20) break;
        } while (nextToken);
        Logger.info(TAG, `日志流 ${logStreamName} 获取到 ${events.length} 个事件`, {
          pageCount,
        });
        events.reverse();
        return events;
      } catch (e: any) {
        Logger.error(TAG, '获取日志事件失败', { logGroupName, logStreamName, error: e.message, code: e.name });
        throw e;
      }
    },
    enabled: !!(logGroupName && logStreamName),
    staleTime: 15000,
  });
}

export function useFilterLogEvents(
  logGroupName: string | null,
  searchTerm: string,
) {
  return useQuery<OutputLogEvent[]>({
    queryKey: ['filter-log-events', logGroupName, searchTerm],
    queryFn: async () => {
      if (!logGroupName || !searchTerm) return [];
      try {
        const client = createCloudWatchLogsClient();
        const events: OutputLogEvent[] = [];
        let nextToken: string | undefined;
        do {
          const res = await client.send(new FilterLogEventsCommand({
            logGroupName, filterPattern: searchTerm, nextToken, limit: 50,
          }));
          if (res.events) events.push(...res.events);
          nextToken = res.nextToken;
        } while (nextToken);
        events.reverse();
        return events;
      } catch (e: any) {
        Logger.error(TAG, '过滤日志事件失败', { logGroupName, searchTerm, error: e.message, code: e.name });
        return [];
      }
    },
    enabled: !!(logGroupName && searchTerm),
    staleTime: 15000,
  });
}

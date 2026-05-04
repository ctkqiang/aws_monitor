import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
  GetLogEventsCommand,
  FilterLogEventsCommand,
  LogGroup,
  LogStream,
  OutputLogEvent,
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
        Logger.info(TAG, `Fetched ${groups.length} log groups`);
        return groups;
      } catch (e: any) {
        Logger.error(TAG, 'DescribeLogGroups failed', { error: e.message, code: e.name });
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
            logGroupName,
            orderBy: 'LastEventTime',
            descending: true,
            nextToken,
            limit: 50,
          }));
          if (res.logStreams) streams.push(...res.logStreams);
          nextToken = res.nextToken;
        } while (nextToken);
        Logger.info(TAG, `Fetched ${streams.length} streams for ${logGroupName}`);
        return streams;
      } catch (e: any) {
        Logger.error(TAG, 'DescribeLogStreams failed', { logGroupName, error: e.message, code: e.name });
        throw e;
      }
    },
    enabled: !!logGroupName,
    staleTime: 30000,
  });
}

export function useLogEvents(logGroupName: string | null, logStreamName: string | null) {
  return useQuery<OutputLogEvent[]>({
    queryKey: ['log-events', logGroupName, logStreamName],
    queryFn: async () => {
      if (!logGroupName || !logStreamName) return [];
      try {
        const client = createCloudWatchLogsClient();
        const events: OutputLogEvent[] = [];
        let nextToken: string | undefined;
        do {
          const res = await client.send(new GetLogEventsCommand({
            logGroupName,
            logStreamName,
            nextToken,
            limit: 100,
          }));
          if (res.events) events.push(...res.events);
          nextToken = res.nextBackwardToken;
        } while (nextToken);
        events.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        return events;
      } catch (e: any) {
        Logger.error(TAG, 'GetLogEvents failed', { logGroupName, logStreamName, error: e.message, code: e.name });
        throw e;
      }
    },
    enabled: !!logGroupName && !!logStreamName,
    staleTime: 15000,
  });
}

export function useFilterLogEvents(logGroupName: string | null, searchTerm: string) {
  return useQuery<OutputLogEvent[]>({
    queryKey: ['filter-events', logGroupName, searchTerm],
    queryFn: async () => {
      if (!logGroupName || !searchTerm) return [];
      try {
        const client = createCloudWatchLogsClient();
        const fiveMinAgo = Date.now() - 5 * 60 * 1000;
        const events: OutputLogEvent[] = [];
        let nextToken: string | undefined;
        do {
          const res = await client.send(new FilterLogEventsCommand({
            logGroupName,
            filterPattern: searchTerm,
            startTime: fiveMinAgo,
            nextToken,
            limit: 100,
          }));
          if (res.events) events.push(...res.events);
          nextToken = res.nextToken;
        } while (nextToken);
        return events;
      } catch (e: any) {
        Logger.error(TAG, 'FilterLogEvents failed', { logGroupName, searchTerm, error: e.message, code: e.name });
        throw e;
      }
    },
    enabled: !!logGroupName && !!searchTerm,
    staleTime: 15000,
  });
}

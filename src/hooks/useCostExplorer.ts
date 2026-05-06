import { useQuery } from '@tanstack/react-query';
import {
  CostExplorerClient, GetCostAndUsageCommand, ResultByTime, Group,
} from '@aws-sdk/client-cost-explorer';
import { createCostExplorerClient } from '@/services/aws/client';
import { Logger } from '@/utils/logger';

const TAG = '费用';

export type PeriodGranularity = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface CostDataPoint { date: string; amount: number; unit: string; }
export interface ServiceCost { service: string; amount: number; unit: string; percentage: number; }
export interface BillingOverview {
  currentPeriodTotal: number; previousPeriodTotal: number;
  unit: string; trend: 'up' | 'down' | 'flat'; trendPercent: number;
  dailyBreakdown: CostDataPoint[]; services: ServiceCost[]; monthlyEstimate: number;
}

const SERVICE_ALIASES: Record<string, string> = {
  'Amazon Relational Database Service': 'RDS',
  'Amazon ElastiCache': 'ElastiCache',
  'Amazon Elastic Compute Cloud': 'EC2',
  'Amazon Elastic Load Balancing': 'ELB',
  'Amazon Simple Storage Service': 'S3',
  'AWS Lambda': 'Lambda', 'Amazon CloudWatch': 'CloudWatch',
  'Amazon ECS': 'ECS', 'Amazon ECR': 'ECR', 'Amazon FSx': 'FSx',
  'AWS Cost Explorer': 'Cost Explorer',
  'Amazon Elastic Container Service': 'ECS',
  'Amazon Elastic Container Registry': 'ECR',
  'Amazon Virtual Private Cloud': 'VPC',
  'AWS Data Transfer': '数据传输',
  'Amazon Route 53': 'Route 53',
  'AWS Key Management Service': 'KMS',
  'Amazon DynamoDB': 'DynamoDB',
  'Amazon SNS': 'SNS', 'Amazon SQS': 'SQS',
  'Tax': '税费',
};

function formatMonthDay(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDateRange(granularity: PeriodGranularity): {
  startDate: string; endDate: string; previousStartDate: string; previousEndDate: string;
  ceGranularity: 'DAILY' | 'MONTHLY';
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const maxLookback = new Date(today.getTime() - 425 * 86400000);

  let start: Date; let end: Date; let prevStart: Date; let prevEnd: Date;
  let ceGranularity: 'DAILY' | 'MONTHLY';

  switch (granularity) {
    case 'DAILY':
      end = today; start = new Date(today.getTime() - 13 * 86400000);
      prevStart = new Date(start.getTime() - 14 * 86400000);
      prevEnd = new Date(start.getTime() - 86400000);
      ceGranularity = 'DAILY'; break;
    case 'WEEKLY':
      end = today; start = new Date(today.getTime() - 83 * 86400000);
      prevStart = new Date(start.getTime() - 84 * 86400000);
      prevEnd = new Date(start.getTime() - 86400000);
      ceGranularity = 'DAILY'; break;
    case 'MONTHLY':
      end = today; start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
      prevStart = new Date(start.getFullYear(), start.getMonth() - 6, 1);
      prevEnd = new Date(start.getFullYear(), start.getMonth(), 0);
      ceGranularity = 'MONTHLY'; break;
    case 'YEARLY':
    default:
      end = today; start = new Date(today.getFullYear(), today.getMonth() - 11, 1);
      prevStart = new Date(start.getFullYear(), start.getMonth() - 2, 1);
      prevEnd = new Date(start.getFullYear(), start.getMonth(), 0);
      ceGranularity = 'MONTHLY'; break;
  }

  if (prevStart < maxLookback) prevStart = maxLookback;
  if (start < maxLookback) start = maxLookback;

  return {
    startDate: formatMonthDay(start.getFullYear(), start.getMonth() + 1, start.getDate()),
    endDate: formatMonthDay(end.getFullYear(), end.getMonth() + 1, end.getDate()),
    previousStartDate: formatMonthDay(prevStart.getFullYear(), prevStart.getMonth() + 1, prevStart.getDate()),
    previousEndDate: formatMonthDay(prevEnd.getFullYear(), prevEnd.getMonth() + 1, prevEnd.getDate()),
    ceGranularity,
  };
}

async function fetchCost(client: CostExplorerClient, startDate: string, endDate: string, granularity: 'DAILY' | 'MONTHLY', groupByService: boolean) {
  const cmd = new GetCostAndUsageCommand({ TimePeriod: { Start: startDate, End: endDate }, Granularity: granularity, Metrics: ['UnblendedCost'], ...(groupByService ? { GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }] } : {}) });
  const res = await client.send(cmd);
  return { resultsByTime: res.ResultsByTime || [], groups: (res.GroupDefinitions ? res.ResultsByTime?.[0]?.Groups || [] : []) };
}

function extractDailyBreakdown(resultsByTime: ResultByTime[], granularity: PeriodGranularity): CostDataPoint[] {
  const points: CostDataPoint[] = [];
  for (const period of resultsByTime) {
    if (!period.TimePeriod?.Start) continue;
    const raw = period.Total?.UnblendedCost?.Amount;
    const amount = raw ? parseFloat(raw) : 0;
    const unit = period.Total?.UnblendedCost?.Unit || 'USD';
    const d = new Date(period.TimePeriod.Start + 'T00:00:00Z');
    const label = (granularity === 'DAILY' || granularity === 'WEEKLY') ? `${d.getMonth() + 1}/${d.getDate()}` : d.toLocaleDateString('zh-CN', { month: 'short', year: '2-digit' });
    points.push({ date: label, amount, unit });
  }
  return points;
}

function extractServiceBreakdown(resultsByTime: ResultByTime[]): ServiceCost[] {
  const serviceMap: Map<string, number> = new Map();
  for (const period of resultsByTime) {
    for (const group of period.Groups || []) {
      const raw = group.Metrics?.UnblendedCost?.Amount;
      const amount = raw ? parseFloat(raw) : 0;
      const key = group.Keys?.[0] || '其他';
      serviceMap.set(key, (serviceMap.get(key) || 0) + amount);
    }
  }
  let total = 0;
  for (const amt of serviceMap.values()) total += amt;
  const services: ServiceCost[] = [];
  for (const [service, amount] of serviceMap) {
    services.push({ service: SERVICE_ALIASES[service] || service, amount, unit: 'USD', percentage: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0 });
  }
  services.sort((a, b) => b.amount - a.amount);
  return services;
}

function computePeriodTotal(resultsByTime: ResultByTime[]): number {
  let total = 0;
  for (const period of resultsByTime) total += parseFloat(period.Total?.UnblendedCost?.Amount || '0');
  return Math.round(total * 100) / 100;
}

export function useBilling(granularity: PeriodGranularity = 'MONTHLY') {
  return useQuery<BillingOverview>({
    queryKey: ['billing', granularity],
    queryFn: async () => {
      try {
        const client = createCostExplorerClient();
        const { startDate, endDate, previousStartDate, previousEndDate, ceGranularity } = getDateRange(granularity);

        Logger.info(TAG, '正在获取账单数据', { granularity, startDate, endDate, ceGranularity });

        const [current, previous] = await Promise.all([
          fetchCost(client, startDate, endDate, ceGranularity, true),
          fetchCost(client, previousStartDate, previousEndDate, ceGranularity, false),
        ]);

        const dailyBreakdown = extractDailyBreakdown(current.resultsByTime, granularity);
        const services = extractServiceBreakdown(current.resultsByTime);
        const currentTotal = computePeriodTotal(current.resultsByTime);
        const previousTotal = computePeriodTotal(previous.resultsByTime);

        let trend: 'up' | 'down' | 'flat'; let trendPercent = 0;
        if (previousTotal > 0) {
          const diff = currentTotal - previousTotal;
          trendPercent = Math.round((diff / previousTotal) * 1000) / 10;
          if (diff > 0.5) trend = 'up'; else if (diff < -0.5) trend = 'down'; else trend = 'flat';
        } else trend = 'flat';

        Logger.info(TAG, '账单数据获取完成', { currentTotal, previousTotal, trend, trendPercent, servicesCount: services.length, dataPoints: dailyBreakdown.length });

        return {
          currentPeriodTotal: Math.round(currentTotal * 100) / 100,
          previousPeriodTotal: Math.round(previousTotal * 100) / 100,
          unit: 'USD', trend, trendPercent, dailyBreakdown, services,
          monthlyEstimate: granularity === 'MONTHLY' ? Math.round(currentTotal * 100) / 100 : Math.round((currentTotal / Math.max(dailyBreakdown.length, 1)) * 30 * 100) / 100,
        };
      } catch (e: any) {
        Logger.logError(TAG, '获取费用数据失败', e);
        if (e?.name === 'AccessDeniedException' || e?.message?.includes('not authorized')) {
          Logger.warn(TAG, '费用浏览器访问被拒绝 — 需要 IAM 权限 ce:GetCostAndUsage');
          return { currentPeriodTotal: 0, previousPeriodTotal: 0, unit: 'USD', trend: 'flat' as const, trendPercent: 0, dailyBreakdown: [], services: [], monthlyEstimate: 0 };
        }
        throw e;
      }
    },
    staleTime: 3600000, retry: 1, retryDelay: 5000,
  });
}

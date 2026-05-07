import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { useHealthStore, ServiceEndpoint, ServiceStatus, MIN_CHECK_INTERVAL } from '@/stores/healthStore';
import { Logger } from '@/utils/logger';

const TAG = '健康检查';
const BG_TASK_NAME = 'AWSIGHT_HEALTH_CHECK';

type HealthCheckFn = (endpoint: ServiceEndpoint) => Promise<{ status: ServiceStatus; responseMs: number; error?: string }>;

function tcpCheck(host: string, port: number, timeoutMs: number): Promise<{ ok: boolean; ms: number; error?: string }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      resolve({ ok: false, ms: Date.now() - start, error: '连接超时' });
    }, timeoutMs);

    fetch(`http://${host}:${port}/`, {
      method: 'HEAD',
      signal: controller.signal,
    })
      .then(() => {
        clearTimeout(timer);
        resolve({ ok: true, ms: Date.now() - start });
      })
      .catch((e) => {
        clearTimeout(timer);
        if (e.name === 'AbortError') {
          resolve({ ok: false, ms: timeoutMs, error: '连接超时' });
        } else {
          resolve({ ok: false, ms: Date.now() - start, error: e.message || '连接失败' });
        }
      });
  });
}

const serviceCheckers: Record<string, HealthCheckFn> = {
  RDS: async (ep) => {
    const port = ep.port || 3306;
    const res = await tcpCheck(ep.host, port, 10000);
    return { status: res.ok ? 'healthy' : 'unhealthy', responseMs: res.ms, error: res.error };
  },
  PolarDB: async (ep) => {
    const port = ep.port || 3306;
    const res = await tcpCheck(ep.host, port, 10000);
    return { status: res.ok ? 'healthy' : 'unhealthy', responseMs: res.ms, error: res.error };
  },
  Valkey: async (ep) => {
    const port = ep.port || 6379;
    const res = await tcpCheck(ep.host, port, 5000);
    return { status: res.ok ? 'healthy' : 'unhealthy', responseMs: res.ms, error: res.error };
  },
  Redis: async (ep) => {
    const port = ep.port || 6379;
    const res = await tcpCheck(ep.host, port, 5000);
    return { status: res.ok ? 'healthy' : 'unhealthy', responseMs: res.ms, error: res.error };
  },
  MongoDB: async (ep) => {
    const port = ep.port || 27017;
    const res = await tcpCheck(ep.host, port, 10000);
    return { status: res.ok ? 'healthy' : 'unhealthy', responseMs: res.ms, error: res.error };
  },
  TimescaleDB: async (ep) => {
    const port = ep.port || 5432;
    const res = await tcpCheck(ep.host, port, 10000);
    return { status: res.ok ? 'healthy' : 'unhealthy', responseMs: res.ms, error: res.error };
  },
  DynamoDB: async (ep) => {
    const port = ep.port || 443;
    try {
      const res = await fetch(`https://${ep.host}:${port}/`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(15000),
      });
      return { status: res.ok ? 'healthy' : 'unhealthy', responseMs: 0, error: res.ok ? undefined : `HTTP ${res.status}` };
    } catch (e: any) {
      return { status: 'unhealthy', responseMs: 0, error: e.message || '连接失败' };
    }
  },
  Elasticsearch: async (ep) => {
    const port = ep.port || 9200;
    const res = await tcpCheck(ep.host, port, 8000);
    return { status: res.ok ? 'healthy' : 'unhealthy', responseMs: res.ms, error: res.error };
  },
};

async function checkService(svc: ServiceEndpoint, config: { retryCount: number; timeoutMs: number }): Promise<void> {
  const store = useHealthStore.getState();
  const checker = serviceCheckers[svc.type];
  if (!checker) {
    Logger.warn(TAG, `不支持的服务类型: ${svc.type}`);
    return;
  }

  let lastResult: { status: ServiceStatus; responseMs: number; error?: string } | null = null;

  for (let attempt = 0; attempt <= config.retryCount; attempt++) {
    try {
      lastResult = await checker(svc);
      if (lastResult.status === 'healthy') break;
    } catch (e: any) {
      lastResult = { status: 'unhealthy', responseMs: 0, error: e.message || '未知错误' };
    }
  }

  if (!lastResult) return;

  const prevStatus = svc.status;
  store.updateServiceStatus(svc.id, lastResult.status, lastResult.responseMs, lastResult.error);

  Logger.info(TAG, `健康检查完成: ${svc.type}`, {
    name: svc.name, status: lastResult.status, ms: lastResult.responseMs, prevStatus,
  });

  if (lastResult.status !== 'healthy' && prevStatus === 'healthy') {
    Logger.warn(TAG, `服务状态变更: ${svc.type} → ${lastResult.status}`, { error: lastResult.error });
  }

  if (lastResult.status === 'healthy' && prevStatus !== 'healthy' && prevStatus !== 'unknown') {
    Logger.info(TAG, `服务已恢复: ${svc.type}`);
  }
}

export async function runAllHealthChecks() {
  Logger.info(TAG, '开始全量健康检查');
  const store = useHealthStore.getState();
  const { services, config } = store;
  const enabled = services.filter((s) => s.enabled);
  const promises = enabled.map((svc) => {
    const cfg = config[svc.type];
    return checkService(svc, { retryCount: cfg.retryCount, timeoutMs: cfg.timeoutMs });
  });
  await Promise.allSettled(promises);
  Logger.info(TAG, `全量健康检查完成，共检查 ${enabled.length} 个服务`);
}

async function backgroundTask() {
  try {
    await runAllHealthChecks();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (e) {
    Logger.error(TAG, '后台健康检查失败', { error: String(e) });
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
}

TaskManager.defineTask(BG_TASK_NAME, backgroundTask);

export async function registerBackgroundHealthCheck(): Promise<void> {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      Logger.warn(TAG, '后台任务被拒绝');
      return;
    }
    const registered = await TaskManager.isTaskRegisteredAsync(BG_TASK_NAME);
    if (registered) {
      await BackgroundFetch.unregisterTaskAsync(BG_TASK_NAME);
    }
    await BackgroundFetch.registerTaskAsync(BG_TASK_NAME, {
      minimumInterval: 600,
      stopOnTerminate: false,
      startOnBoot: true,
    });
    Logger.info(TAG, '后台健康检查已注册', { interval: '600s' });
  } catch (e) {
    Logger.error(TAG, '后台任务注册失败', { error: String(e) });
  }
}

export async function unregisterBackgroundHealthCheck(): Promise<void> {
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(BG_TASK_NAME);
    if (registered) {
      await BackgroundFetch.unregisterTaskAsync(BG_TASK_NAME);
      Logger.info(TAG, '后台健康检查已注销');
    }
  } catch (e) {
    Logger.error(TAG, '后台任务注销失败', { error: String(e) });
  }
}

export { serviceCheckers };
export type { HealthCheckFn };

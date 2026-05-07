import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/utils/logger';

const TAG = '健康监控';

export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | 'stopped';

export type ServiceType =
  | 'RDS'
  | 'PolarDB'
  | 'Valkey'
  | 'Redis'
  | 'MongoDB'
  | 'TimescaleDB'
  | 'DynamoDB'
  | 'Elasticsearch';

export interface ServiceEndpoint {
  id: string;
  type: ServiceType;
  name: string;
  host: string;
  port: number;
  status: ServiceStatus;
  lastCheckAt: number | null;
  lastResponseMs: number | null;
  lastError: string | null;
  consecutiveFailures: number;
  enabled: boolean;
  createdAt: number;
}

export interface HealthCheckConfig {
  intervalMs: number;
  timeoutMs: number;
  retryCount: number;
  enabled: boolean;
}

export interface HealthState {
  services: ServiceEndpoint[];
  config: Record<ServiceType, HealthCheckConfig>;
  addService: (s: Omit<ServiceEndpoint, 'id' | 'status' | 'lastCheckAt' | 'lastResponseMs' | 'lastError' | 'consecutiveFailures' | 'createdAt'>) => void;
  removeService: (id: string) => void;
  updateServiceStatus: (id: string, status: ServiceStatus, responseMs?: number, error?: string) => void;
  updateServiceConfig: (type: ServiceType, config: Partial<HealthCheckConfig>) => void;
  toggleService: (id: string) => void;
}

const DEFAULT_CONFIG: Record<ServiceType, HealthCheckConfig> = {
  RDS: { intervalMs: 30000, timeoutMs: 10000, retryCount: 2, enabled: true },
  PolarDB: { intervalMs: 30000, timeoutMs: 10000, retryCount: 2, enabled: true },
  Valkey: { intervalMs: 15000, timeoutMs: 5000, retryCount: 2, enabled: true },
  Redis: { intervalMs: 15000, timeoutMs: 5000, retryCount: 2, enabled: true },
  MongoDB: { intervalMs: 30000, timeoutMs: 10000, retryCount: 2, enabled: true },
  TimescaleDB: { intervalMs: 30000, timeoutMs: 10000, retryCount: 2, enabled: true },
  DynamoDB: { intervalMs: 60000, timeoutMs: 15000, retryCount: 1, enabled: true },
  Elasticsearch: { intervalMs: 20000, timeoutMs: 8000, retryCount: 2, enabled: true },
};

const MIN_INTERVAL_MS = 10000;

export const MIN_CHECK_INTERVAL = MIN_INTERVAL_MS;

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export const useHealthStore = create<HealthState>()(
  persist(
    (set, get) => ({
      services: [],
      config: { ...DEFAULT_CONFIG },

      addService: (s) => {
        const svc: ServiceEndpoint = {
          ...s,
          id: genId(),
          status: 'unknown',
          lastCheckAt: null,
          lastResponseMs: null,
          lastError: null,
          consecutiveFailures: 0,
          enabled: true,
          createdAt: Date.now(),
        };
        Logger.info(TAG, '监控服务已添加', { type: s.type, name: s.name, host: s.host });
        set({ services: [...get().services, svc] });
      },

      removeService: (id) => {
        Logger.info(TAG, '监控服务已移除', { id });
        set({ services: get().services.filter((x) => x.id !== id) });
      },

      updateServiceStatus: (id, status, responseMs, error) => {
        set({
          services: get().services.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status,
                  lastCheckAt: Date.now(),
                  lastResponseMs: responseMs ?? x.lastResponseMs,
                  lastError: error ?? null,
                  consecutiveFailures: status === 'healthy' ? 0 : x.consecutiveFailures + 1,
                }
              : x
          ),
        });
      },

      updateServiceConfig: (type, cfg) => {
        const current = get().config[type];
        const merged = { ...current, ...cfg };
        if (merged.intervalMs < MIN_INTERVAL_MS) {
          merged.intervalMs = MIN_INTERVAL_MS;
        }
        set({ config: { ...get().config, [type]: merged } });
      },

      toggleService: (id) => {
        set({
          services: get().services.map((x) =>
            x.id === id ? { ...x, enabled: !x.enabled } : x
          ),
        });
      },
    }),
    {
      name: 'awsight-health',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        services: state.services,
        config: state.config,
      }),
    }
  )
);

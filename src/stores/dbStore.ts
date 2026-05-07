import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/utils/logger';

const TAG = 'DBStore';

export type DbType = 'mysql' | 'postgresql' | 'questdb' | 'sqlite';

export interface DbConnection {
  id: string;
  type: DbType;
  host: string;
  port: string;
  dbName: string;
  username: string;
  password: string;
  remark: string;
  createdAt: number;
}

export interface QueryHistoryEntry {
  id: string;
  query: string;
  connectionId: string;
  connectionName: string;
  executedAt: number;
  duration?: number;
}

export interface DbState {
  connections: DbConnection[];
  queryHistory: QueryHistoryEntry[];
  addConnection: (c: Omit<DbConnection, 'id' | 'createdAt'>) => void;
  updateConnection: (id: string, c: Omit<DbConnection, 'id' | 'createdAt'>) => void;
  removeConnection: (id: string) => void;
  addQueryHistory: (entry: Omit<QueryHistoryEntry, 'id'>) => void;
  clearHistory: () => void;
  removeHistoryEntry: (id: string) => void;
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

const MAX_HISTORY = 100;

export const useDbStore = create<DbState>()(
  persist(
    (set, get) => ({
      connections: [],
      queryHistory: [],

      addConnection: (c) => {
        const conn: DbConnection = { ...c, id: genId(), createdAt: Date.now() };
        Logger.info(TAG, '数据库连接已添加', { type: c.type, host: c.host });
        set({ connections: [...get().connections, conn] });
      },

      updateConnection: (id, c) => {
        Logger.info(TAG, '数据库连接已更新', { id });
        set({
          connections: get().connections.map((x) =>
            x.id === id ? { ...c, id, createdAt: x.createdAt } : x
          ),
        });
      },

      removeConnection: (id) => {
        Logger.info(TAG, '数据库连接已删除', { id });
        set({ connections: get().connections.filter((x) => x.id !== id) });
      },

      addQueryHistory: (entry) => {
        const item: QueryHistoryEntry = { ...entry, id: genId() };
        const history = [item, ...get().queryHistory].slice(0, MAX_HISTORY);
        set({ queryHistory: history });
      },

      clearHistory: () => {
        set({ queryHistory: [] });
      },

      removeHistoryEntry: (id) => {
        set({ queryHistory: get().queryHistory.filter((x) => x.id !== id) });
      },
    }),
    {
      name: 'awsight-db',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        connections: state.connections,
        queryHistory: state.queryHistory,
      }),
    }
  )
);

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
  isFavorite: boolean;
}

export interface SavedQuery {
  id: string;
  name: string;
  query: string;
  connectionId: string;
  connectionName: string;
  createdAt: number;
  updatedAt: number;
}

export interface QueryTab {
  id: string;
  name: string;
  query: string;
  isPinned: boolean;
}

export interface DbState {
  connections: DbConnection[];
  queryHistory: QueryHistoryEntry[];
  savedQueries: SavedQuery[];
  queryTabs: QueryTab[];
  activeTabId: string | null;

  addConnection: (c: Omit<DbConnection, 'id' | 'createdAt'>) => void;
  updateConnection: (id: string, c: Omit<DbConnection, 'id' | 'createdAt'>) => void;
  removeConnection: (id: string) => void;

  addQueryHistory: (entry: Omit<QueryHistoryEntry, 'id' | 'isFavorite'>) => void;
  toggleFavoriteHistory: (id: string) => void;
  clearHistory: () => void;
  removeHistoryEntry: (id: string) => void;

  addSavedQuery: (q: Omit<SavedQuery, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSavedQuery: (id: string, q: Partial<Omit<SavedQuery, 'id' | 'createdAt'>>) => void;
  removeSavedQuery: (id: string) => void;

  addQueryTab: (name?: string) => string;
  removeQueryTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabQuery: (id: string, query: string) => void;
  renameTab: (id: string, name: string) => void;
  toggleTabPin: (id: string) => void;
  getActiveTab: () => QueryTab | undefined;
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

const MAX_HISTORY = 200;

const DEFAULT_TABS: QueryTab[] = [{ id: 'tab-1', name: 'Query 1', query: '', isPinned: false }];

export const useDbStore = create<DbState>()(
  persist(
    (set, get) => ({
      connections: [],
      queryHistory: [],
      savedQueries: [],
      queryTabs: DEFAULT_TABS,
      activeTabId: 'tab-1',

      addConnection: (c) => {
        const conn: DbConnection = { ...c, id: genId(), createdAt: Date.now() };
        Logger.info(TAG, 'Connection added', { type: c.type, host: c.host });
        set({ connections: [...get().connections, conn] });
      },

      updateConnection: (id, c) => {
        Logger.info(TAG, 'Connection updated', { id });
        set({
          connections: get().connections.map((x) =>
            x.id === id ? { ...c, id, createdAt: x.createdAt } : x
          ),
        });
      },

      removeConnection: (id) => {
        Logger.info(TAG, 'Connection removed', { id });
        set({ connections: get().connections.filter((x) => x.id !== id) });
      },

      addQueryHistory: (entry) => {
        const existing = get().queryHistory.find(
          (h) => h.query === entry.query && h.connectionId === entry.connectionId
        );
        if (existing) {
          set({
            queryHistory: [
              { ...existing, executedAt: Date.now(), duration: entry.duration },
              ...get().queryHistory.filter((h) => h.id !== existing.id),
            ],
          });
          return;
        }
        const item: QueryHistoryEntry = {
          ...entry,
          id: genId(),
          isFavorite: false,
        };
        const history = [item, ...get().queryHistory].slice(0, MAX_HISTORY);
        set({ queryHistory: history });
      },

      toggleFavoriteHistory: (id) => {
        set({
          queryHistory: get().queryHistory.map((h) =>
            h.id === id ? { ...h, isFavorite: !h.isFavorite } : h
          ),
        });
      },

      clearHistory: () => {
        set({ queryHistory: [] });
      },

      removeHistoryEntry: (id) => {
        set({ queryHistory: get().queryHistory.filter((x) => x.id !== id) });
      },

      addSavedQuery: (q) => {
        const item: SavedQuery = {
          ...q,
          id: genId(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        Logger.info(TAG, 'Query saved', { name: q.name });
        set({ savedQueries: [item, ...get().savedQueries] });
      },

      updateSavedQuery: (id, q) => {
        set({
          savedQueries: get().savedQueries.map((x) =>
            x.id === id ? { ...x, ...q, updatedAt: Date.now() } : x
          ),
        });
      },

      removeSavedQuery: (id) => {
        set({ savedQueries: get().savedQueries.filter((x) => x.id !== id) });
      },

      addQueryTab: (name) => {
        const id = genId();
        const tabs = get().queryTabs;
        const newTab: QueryTab = {
          id,
          name: name || `Query ${tabs.length + 1}`,
          query: '',
          isPinned: false,
        };
        set({ queryTabs: [...tabs, newTab], activeTabId: id });
        return id;
      },

      removeQueryTab: (id) => {
        const tabs = get().queryTabs;
        if (tabs.length <= 1) return;
        const filtered = tabs.filter((t) => t.id !== id);
        const activeId = get().activeTabId === id ? filtered[0].id : get().activeTabId;
        set({ queryTabs: filtered, activeTabId: activeId });
      },

      setActiveTab: (id) => {
        set({ activeTabId: id });
      },

      updateTabQuery: (id, query) => {
        set({
          queryTabs: get().queryTabs.map((t) =>
            t.id === id ? { ...t, query } : t
          ),
        });
      },

      renameTab: (id, name) => {
        set({
          queryTabs: get().queryTabs.map((t) =>
            t.id === id ? { ...t, name } : t
          ),
        });
      },

      toggleTabPin: (id) => {
        set({
          queryTabs: get().queryTabs.map((t) =>
            t.id === id ? { ...t, isPinned: !t.isPinned } : t
          ),
        });
      },

      getActiveTab: () => {
        const state = get();
        return state.queryTabs.find((t) => t.id === state.activeTabId);
      },
    }),
    {
      name: 'awsight-db',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        connections: state.connections,
        queryHistory: state.queryHistory.map((h) => ({
          ...h,
          query: h.query.length > 5000 ? h.query.slice(0, 5000) : h.query,
        })),
        savedQueries: state.savedQueries,
        queryTabs: state.queryTabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
);

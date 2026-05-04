import { create } from 'zustand';

export interface UIState {
  selectedLogGroup: string | null;
  selectedLogStream: string | null;
  selectedCluster: string | null;
  searchQuery: string;
  setSelectedLogGroup: (name: string | null) => void;
  setSelectedLogStream: (name: string | null) => void;
  setSelectedCluster: (arn: string | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  selectedLogGroup: null,
  selectedLogStream: null,
  selectedCluster: null,
  searchQuery: '',
  setSelectedLogGroup: (name) => set({ selectedLogGroup: name, selectedLogStream: null }),
  setSelectedLogStream: (name) => set({ selectedLogStream: name }),
  setSelectedCluster: (arn) => set({ selectedCluster: arn }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));

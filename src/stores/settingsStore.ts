import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SupportedLanguage = 'en' | 'zh';

export interface SettingsState {
  language: SupportedLanguage;
  regionOverride: string | null;
  setLanguage: (lang: SupportedLanguage) => void;
  setRegionOverride: (region: string | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'en',
      regionOverride: null,
      setLanguage: (language) => set({ language }),
      setRegionOverride: (regionOverride) => set({ regionOverride }),
    }),
    {
      name: 'awsight-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

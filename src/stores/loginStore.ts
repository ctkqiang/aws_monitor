import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LoginParams {
  region: string;
  accountId: string;
  iamUsername: string;
  accessKeyId: string;
}

export interface LoginStore {
  savedParams: LoginParams | null;
  hasSavedCredentials: boolean;
  saveLogin: (params: LoginParams) => void;
  resetLogin: () => void;
}

export const useLoginStore = create<LoginStore>()(
  persist(
    (set) => ({
      savedParams: null,
      hasSavedCredentials: false,
      saveLogin: (params) => set({ savedParams: params, hasSavedCredentials: true }),
      resetLogin: () => set({ savedParams: null, hasSavedCredentials: false }),
    }),
    {
      name: 'awsight-login',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        savedParams: state.savedParams,
        hasSavedCredentials: state.hasSavedCredentials,
      }),
    }
  )
);

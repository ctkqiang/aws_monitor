import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  expiration?: Date;
  expiresAt?: number;
}

export interface AuthState {
  isSignedIn: boolean;
  credentials: AwsCredentials | null;
  region: string;
  setCredentials: (creds: AwsCredentials) => void;
  setRegion: (region: string) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isSignedIn: false,
      credentials: null,
      region: 'us-east-1',
      setCredentials: (creds) => set({ credentials: creds, isSignedIn: true }),
      setRegion: (region) => set({ region }),
      signOut: () => set({ credentials: null, isSignedIn: false }),
    }),
    {
      name: 'awsight-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        credentials: state.credentials,
        isSignedIn: state.isSignedIn,
        region: state.region,
      }),
    }
  )
);

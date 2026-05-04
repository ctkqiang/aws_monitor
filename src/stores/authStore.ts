import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration?: Date;
}

export interface AuthState {
  isSignedIn: boolean;
  credentials: AwsCredentials | null;
  identityId: string | null;
  region: string;
  setCredentials: (creds: AwsCredentials, identityId: string) => void;
  setRegion: (region: string) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isSignedIn: false,
      credentials: null,
      identityId: null,
      region: 'us-east-1',
      setCredentials: (creds, identityId) => set({ credentials: creds, identityId, isSignedIn: true }),
      setRegion: (region) => set({ region }),
      signOut: () => set({ credentials: null, identityId: null, isSignedIn: false }),
    }),
    {
      name: 'awsight-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        credentials: state.credentials,
        identityId: state.identityId,
        isSignedIn: state.isSignedIn,
        region: state.region,
      }),
    }
  )
);

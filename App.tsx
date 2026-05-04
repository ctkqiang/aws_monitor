import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import './src/i18n';

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import LoginScreen from '@/screens/LoginScreen';
import MainTabs from '@/screens/MainTabs';

const queryClient = new QueryClient();

export default function App() {
  const isSignedIn = useAuthStore((s) => s.isSignedIn);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      {isSignedIn ? <MainTabs /> : <LoginScreen />}
    </QueryClientProvider>
  );
}

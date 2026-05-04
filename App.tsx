import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import './src/i18n';

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import LoginScreen from '@/screens/LoginScreen';
import MainTabs from '@/screens/MainTabs';

const queryClient = new QueryClient();

function AppContent() {
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const theme = useTheme();

  return (
    <>
      <StatusBar style={theme.statusBar} />
      {isSignedIn ? <MainTabs /> : <LoginScreen />}
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

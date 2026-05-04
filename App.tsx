import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import './src/i18n';

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LoginScreen from '@/screens/LoginScreen';
import MainTabs from '@/screens/MainTabs';

const queryClient = new QueryClient();

function AppContent() {
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <StatusBar style={theme.statusBar} />
      <View style={styles.body}>
        {isSignedIn ? <MainTabs /> : <LoginScreen />}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
});

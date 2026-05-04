import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import './src/i18n';

import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { ThemeProvider, useTheme, useResolvedThemeMode } from '@/theme/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LoginScreen from '@/screens/LoginScreen';
import MainTabs from '@/screens/MainTabs';

const queryClient = new QueryClient();

function AppContent() {
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const theme = useTheme();
  const resolvedMode = useResolvedThemeMode();
  const insets = useSafeAreaInsets();
  const bgAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(bgAnim, {
      toValue: resolvedMode === 'dark' ? 0 : 1,
      duration: 360,
      useNativeDriver: false,
    }).start();
  }, [resolvedMode]);

  const animatedBg = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#0f0f1a', '#f2f2f7'],
  });

  return (
    <Animated.View style={[styles.root, { backgroundColor: animatedBg, paddingTop: insets.top }]}>
      <StatusBar style={theme.statusBar} />
      <View style={styles.body}>
        {isSignedIn ? <MainTabs /> : <LoginScreen />}
      </View>
    </Animated.View>
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

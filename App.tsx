import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import './src/i18n';

import React, { useRef, useEffect } from 'react';
import {
  View, Animated, StyleSheet, Platform, StatusBar as RNStatusBar,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
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

  useEffect(() => {
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor(theme.bg, true);
      RNStatusBar.setBarStyle(theme.statusBar === 'light' ? 'light-content' : 'dark-content', true);
    }
  }, [theme.statusBar, theme.bg]);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.statusBarBg, { backgroundColor: animatedBg, height: insets.top }]} />
      <Animated.View style={[styles.body, { backgroundColor: animatedBg }]}>
        {isSignedIn ? <MainTabs /> : <LoginScreen />}
      </Animated.View>
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
  statusBarBg: { width: '100%' },
  body: { flex: 1 },
});

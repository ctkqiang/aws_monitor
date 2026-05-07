import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useColorScheme, ColorSchemeName, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'awsight-theme-mode';

export interface ThemeColors {
  bg: string;
  bgSubtle: string;
  bgCard: string;
  bgCardHover: string;
  bgInput: string;
  bgGlass: string;
  border: string;
  borderLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textLabel: string;
  accent: string;
  accentGlow: string;
  accentLight: string;
  accentText: string;
  btnSecondary: string;
  btnSecondaryText: string;
  placeholder: string;
  tabInactive: string;
  tabBarBg: string;
  tabBarBorder: string;
  danger: string;
  dangerLight: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  info: string;
  infoLight: string;
  statusBar: 'light' | 'dark';
  gradientStart: string;
  gradientEnd: string;
  cliBg: string;
  cliText: string;
  cliAccent: string;
  overlay: string;
}

const darkTheme: ThemeColors = {
  bg: '#0a0a14',
  bgSubtle: '#0f0f1a',
  bgCard: '#141428',
  bgCardHover: '#1a1a30',
  bgInput: '#0d0d1a',
  bgGlass: 'rgba(20,20,40,0.85)',
  border: '#1e1e36',
  borderLight: '#282844',
  text: '#eaeaef',
  textSecondary: '#9d9db8',
  textMuted: '#5e5e78',
  textLabel: '#8080a0',
  accent: '#FF9900',
  accentGlow: 'rgba(255,153,0,0.20)',
  accentLight: 'rgba(255,153,0,0.10)',
  accentText: '#0d0d0d',
  btnSecondary: '#1e1e3a',
  btnSecondaryText: '#d0d0e8',
  placeholder: '#4a4a64',
  tabInactive: '#5a5a78',
  tabBarBg: '#0e0e1e',
  tabBarBorder: '#1e1e36',
  danger: '#ff4757',
  dangerLight: 'rgba(255,71,87,0.12)',
  success: '#2ed573',
  successLight: 'rgba(46,213,115,0.12)',
  warning: '#ffa502',
  warningLight: 'rgba(255,165,2,0.12)',
  info: '#70a1ff',
  infoLight: 'rgba(112,161,255,0.12)',
  statusBar: 'light',
  gradientStart: '#0a0a14',
  gradientEnd: '#141428',
  cliBg: '#080810',
  cliText: '#2ed573',
  cliAccent: '#70a1ff',
  overlay: 'rgba(0,0,0,0.55)',
};

const lightTheme: ThemeColors = {
  bg: '#f5f5fa',
  bgSubtle: '#ebebf2',
  bgCard: '#ffffff',
  bgCardHover: '#f8f8fc',
  bgInput: '#ffffff',
  bgGlass: 'rgba(255,255,255,0.90)',
  border: '#e0e0ec',
  borderLight: '#f0f0f6',
  text: '#1a1a2e',
  textSecondary: '#555570',
  textMuted: '#8888a0',
  textLabel: '#6e6e88',
  accent: '#e68600',
  accentGlow: 'rgba(230,134,0,0.15)',
  accentLight: 'rgba(230,134,0,0.08)',
  accentText: '#ffffff',
  btnSecondary: '#eaeaef',
  btnSecondaryText: '#1a1a2e',
  placeholder: '#b0b0c0',
  tabInactive: '#8888a0',
  tabBarBg: '#ffffff',
  tabBarBorder: '#e0e0ee',
  danger: '#e74c3c',
  dangerLight: 'rgba(231,76,60,0.10)',
  success: '#27ae60',
  successLight: 'rgba(39,174,96,0.10)',
  warning: '#e67e22',
  warningLight: 'rgba(230,126,34,0.10)',
  info: '#3b7ddd',
  infoLight: 'rgba(59,125,221,0.10)',
  statusBar: 'dark',
  gradientStart: '#f5f5fa',
  gradientEnd: '#ebebf2',
  cliBg: '#1a1a2e',
  cliText: '#2ed573',
  cliAccent: '#3b7ddd',
  overlay: 'rgba(0,0,0,0.35)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const RADIUS = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
} as const;

export const TYPOGRAPHY = {
  h1: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -1, lineHeight: 41 },
  h2: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5, lineHeight: 34 },
  h3: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3, lineHeight: 28 },
  title: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 21 },
  bodyBold: { fontSize: 15, fontWeight: '600' as const, lineHeight: 21 },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 17 },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.8, lineHeight: 14, textTransform: 'uppercase' as const },
  mono: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 17 },
  monoSm: { fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 14 },
  button: { fontSize: 16, fontWeight: '700' as const, letterSpacing: 0.5, lineHeight: 22 },
  tab: { fontSize: 11, fontWeight: '600' as const, lineHeight: 14 },
} as const;

export interface Shadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export const SHADOWS: Record<string, Shadow> = {
  xs: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
  xl: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.16, shadowRadius: 24, elevation: 10 },
  glow: { shadowColor: '#FF9900', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8 },
};

export const ANIMATION = {
  fast: { duration: 200 },
  normal: { duration: 300 },
  slow: { duration: 400 },
  spring: {
    gentle: { tension: 120, friction: 14, useNativeDriver: true as const },
    snappy: { tension: 200, friction: 20, useNativeDriver: true as const },
    bouncy: { tension: 100, friction: 10, useNativeDriver: true as const },
  },
  staggeredDelay: (index: number, baseDelay: number = 50) => Math.min(index * baseDelay, 500),
} as const;

const ThemeContext = createContext<{
  colors: ThemeColors;
  mode: 'light' | 'dark';
}>({ colors: darkTheme, mode: 'dark' });

export type ThemeMode = 'system' | 'light' | 'dark';

let listeners: Array<() => void> = [];
let currentMode: ThemeMode = 'system';

function notifyListeners() {
  listeners.forEach((cb) => cb());
}

export function setThemeMode(mode: ThemeMode) {
  currentMode = mode;
  AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  notifyListeners();
}

export function getThemeMode(): ThemeMode {
  return currentMode;
}

export function useThemeMode(): ThemeMode {
  const [, setTick] = useState(0);
  useEffect(() => {
    const cb = () => setTick((t) => t + 1);
    listeners.push(cb);
    return () => {
      listeners = listeners.filter((l) => l !== cb);
    };
  }, []);
  return currentMode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme: ColorSchemeName = useColorScheme();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        currentMode = stored;
        setTick((t) => t + 1);
      }
    });
    const cb = () => setTick((t) => t + 1);
    listeners.push(cb);
    return () => { listeners = listeners.filter((l) => l !== cb); };
  }, []);

  const mode: 'light' | 'dark' = useMemo(() => {
    if (currentMode === 'light') return 'light';
    if (currentMode === 'dark') return 'dark';
    return systemScheme === 'light' ? 'light' : 'dark';
  }, [systemScheme, tick]);

  const colors = useMemo(() => (mode === 'light' ? lightTheme : darkTheme), [mode]);

  return (
    <ThemeContext.Provider value={{ colors, mode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext).colors;
}

export function useResolvedThemeMode() {
  return useContext(ThemeContext).mode;
}

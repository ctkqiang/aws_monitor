import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useColorScheme, ColorSchemeName, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'awsight-theme-mode';

// ── Color Token System ──────────────────────────────────────────

export interface ThemeColors {
  bg: string;
  bgCard: string;
  bgInput: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textLabel: string;
  accent: string;
  accentLight: string;
  accentText: string;
  btnSecondary: string;
  btnSecondaryText: string;
  placeholder: string;
  tabInactive: string;
  tabBarBg: string;
  tabBarBorder: string;
  danger: string;
  success: string;
  statusBar: 'light' | 'dark';
}

const darkTheme: ThemeColors = {
  bg: '#0f0f1a',
  bgCard: '#1a1a2e',
  bgInput: '#12121f',
  border: '#2a2a3e',
  text: '#f0f0f5',
  textSecondary: '#a0a0b8',
  textMuted: '#6b6b80',
  textLabel: '#8e8ea8',
  accent: '#FF9900',
  accentLight: 'rgba(255,153,0,0.12)',
  accentText: '#121212',
  btnSecondary: '#2a2a3e',
  btnSecondaryText: '#e0e0f0',
  placeholder: '#5a5a72',
  tabInactive: '#6a6a80',
  tabBarBg: '#151528',
  tabBarBorder: '#2a2a3e',
  danger: '#e74c3c',
  success: '#27ae60',
  statusBar: 'light',
};

const lightTheme: ThemeColors = {
  bg: '#f2f2f7',
  bgCard: '#ffffff',
  bgInput: '#ffffff',
  border: '#dddfe2',
  text: '#1c1c2e',
  textSecondary: '#5a5a6e',
  textMuted: '#8e8ea0',
  textLabel: '#6e6e82',
  accent: '#e68600',
  accentLight: 'rgba(230,134,0,0.10)',
  accentText: '#ffffff',
  btnSecondary: '#e8e8f0',
  btnSecondaryText: '#1c1c2e',
  placeholder: '#aaaab8',
  tabInactive: '#8e8ea0',
  tabBarBg: '#ffffff',
  tabBarBorder: '#dddde5',
  danger: '#c0392b',
  success: '#27ae60',
  statusBar: 'dark',
};

// ── Spacing Scale (4-point grid) ─────────────────────────────────

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

// ── Border Radius Scale ──────────────────────────────────────────

export const RADIUS = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 18,
  full: 9999,
} as const;

// ── Typography Scale ─────────────────────────────────────────────

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

// ── Shadow Presets (iOS) / Elevation (Android) ───────────────────

export interface Shadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export const SHADOWS: Record<string, Shadow> = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
};

// ── Animation Presets ────────────────────────────────────────────

export const ANIMATION = {
  fast: { duration: 200 },
  normal: { duration: 300 },
  slow: { duration: 400 },
  spring: {
    gentle: { tension: 120, friction: 14, useNativeDriver: true },
    snappy: { tension: 200, friction: 20, useNativeDriver: true },
    bouncy: { tension: 100, friction: 10, useNativeDriver: true },
  },
  staggeredDelay: (index: number, baseDelay: number = 50) => index * baseDelay,
} as const;

// ── Context ──────────────────────────────────────────────────────

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

export function useTheme(): ThemeColors {
  const { colors } = useContext(ThemeContext);
  return colors;
}

export function useResolvedThemeMode(): 'light' | 'dark' {
  const { mode } = useContext(ThemeContext);
  return mode;
}

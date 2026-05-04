import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useColorScheme, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'awsight-theme-mode';

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
  accentText: string;
  btnSecondary: string;
  btnSecondaryText: string;
  placeholder: string;
  tabInactive: string;
  tabBarBg: string;
  tabBarBorder: string;
  danger: string;
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
  accentText: '#121212',
  btnSecondary: '#2a2a3e',
  btnSecondaryText: '#e0e0f0',
  placeholder: '#5a5a72',
  tabInactive: '#6a6a80',
  tabBarBg: '#151528',
  tabBarBorder: '#2a2a3e',
  danger: '#e74c3c',
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
  accentText: '#ffffff',
  btnSecondary: '#e8e8f0',
  btnSecondaryText: '#1c1c2e',
  placeholder: '#aaaab8',
  tabInactive: '#8e8ea0',
  tabBarBg: '#ffffff',
  tabBarBorder: '#dddde5',
  danger: '#c0392b',
  statusBar: 'dark',
};

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
  const [, setTick] = useState(0);

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
  }, [systemScheme]);

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

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme, ColorSchemeName } from 'react-native';

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
  bgInput: '#0f0f1a',
  border: '#2a2a3e',
  text: '#ffffff',
  textSecondary: '#a0a0b0',
  textMuted: '#666680',
  textLabel: '#8888aa',
  accent: '#FF9900',
  accentText: '#1a1a2e',
  btnSecondary: '#2a2a3e',
  btnSecondaryText: '#ffffff',
  placeholder: '#555566',
  tabInactive: '#666680',
  tabBarBg: '#1a1a2e',
  tabBarBorder: '#2a2a3e',
  danger: '#e74c3c',
  statusBar: 'light',
};

const lightTheme: ThemeColors = {
  bg: '#f5f5f7',
  bgCard: '#ffffff',
  bgInput: '#ffffff',
  border: '#e0e0e5',
  text: '#1a1a2e',
  textSecondary: '#555566',
  textMuted: '#8888aa',
  textLabel: '#666680',
  accent: '#FF9900',
  accentText: '#ffffff',
  btnSecondary: '#e8e8ec',
  btnSecondaryText: '#1a1a2e',
  placeholder: '#aaaab5',
  tabInactive: '#8888aa',
  tabBarBg: '#ffffff',
  tabBarBorder: '#e0e0e5',
  danger: '#e74c3c',
  statusBar: 'dark',
};

const ThemeContext = createContext<ThemeColors>(darkTheme);

type ThemeMode = 'system' | 'light' | 'dark';

let manualOverride: ThemeMode = 'system';

export function setThemeMode(mode: ThemeMode) {
  manualOverride = mode;
}

export function getThemeMode(): ThemeMode {
  return manualOverride;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme: ColorSchemeName = useColorScheme();

  const mode: 'light' | 'dark' = useMemo(() => {
    if (manualOverride === 'light') return 'light';
    if (manualOverride === 'dark') return 'dark';
    return systemScheme === 'light' ? 'light' : 'dark';
  }, [systemScheme]);

  const colors = mode === 'light' ? lightTheme : darkTheme;

  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeColors {
  return useContext(ThemeContext);
}

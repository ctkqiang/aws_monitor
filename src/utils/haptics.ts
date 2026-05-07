import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let supported = true;

Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
  supported = false;
});

export const Haptic = {
  light: () => {
    if (!supported) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },

  medium: () => {
    if (!supported) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },

  heavy: () => {
    if (!supported) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },

  selection: () => {
    if (!supported) return;
    Haptics.selectionAsync().catch(() => {});
  },

  success: () => {
    if (!supported) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },

  warning: () => {
    if (!supported) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },

  error: () => {
    if (!supported) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },

  wrap: (fn: (...args: any[]) => any, type: 'light' | 'medium' | 'heavy' | 'selection' = 'medium') => {
    return (...args: any[]) => {
      Haptic[type]();
      return fn(...args);
    };
  },
} as const;

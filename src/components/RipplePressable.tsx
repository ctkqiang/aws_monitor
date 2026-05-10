import React, { useRef } from 'react';
import {
  Pressable, Animated,
  PressableProps, ViewStyle, StyleProp,
} from 'react-native';
import { SPACING } from '@/theme/ThemeContext';
import { Haptic } from '@/utils/haptics';

interface Props extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  rippleColor?: string;
  scale?: number;
  haptic?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
}

export default function RipplePressable({
  children,
  style,
  rippleColor = 'rgba(255,255,255,0.12)',
  scale: pressScale = 0.97,
  haptic = 'light',
  onPress,
  ...props
}: Props) {
  const animScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(animScale, {
      toValue: pressScale,
      useNativeDriver: true,
      tension: 300,
      friction: 25,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(animScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 15,
    }).start();
  };

  const handlePress = (e: any) => {
    if (haptic !== 'none') {
      Haptic[haptic]();
    }
    onPress?.(e);
  };

  return (
    <Pressable
      {...props}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      android_ripple={{ color: rippleColor, borderless: false, radius: SPACING.xxl * 4 }}
      style={style}
      accessible
      accessibilityRole="button"
    >
      <Animated.View style={{ transform: [{ scale: animScale }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

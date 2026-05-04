import React, { useRef } from 'react';
import {
  Pressable, Animated, View, StyleSheet,
  PressableProps, ViewStyle, StyleProp,
} from 'react-native';

interface Props extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  rippleColor?: string;
}

export default function RipplePressable({ children, style, rippleColor = 'rgba(255,255,255,0.15)', ...props }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, friction: 8 }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 100 }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        {...props}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        android_ripple={{ color: rippleColor, borderless: false }}
        style={({ pressed }) => [
          pressed && { opacity: 0.9 },
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

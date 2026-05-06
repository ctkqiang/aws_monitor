import React, { useRef, useEffect, useCallback } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
  View,
  ViewStyle,
} from 'react-native';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const SpringPresets = {
  gentle: {
    useNativeDriver: true as const,
    tension: 120,
    friction: 14,
  },
  snappy: {
    useNativeDriver: true as const,
    tension: 200,
    friction: 20,
  },
  bouncy: {
    useNativeDriver: true as const,
    tension: 100,
    friction: 10,
  },
  stiff: {
    useNativeDriver: true as const,
    tension: 300,
    friction: 25,
  },
};

export const TimingPresets = {
  fast: {
    useNativeDriver: true as const,
    duration: 200,
    easing: Easing.out(Easing.cubic),
  },
  normal: {
    useNativeDriver: true as const,
    duration: 300,
    easing: Easing.out(Easing.cubic),
  },
  slow: {
    useNativeDriver: true as const,
    duration: 450,
    easing: Easing.out(Easing.cubic),
  },
  easeOutBack: {
    useNativeDriver: true as const,
    duration: 400,
    easing: Easing.out(Easing.back(1.5)),
  },
};

export function staggeredDelay(index: number, baseDelay: number = 50): number {
  return Math.min(index * baseDelay, 600);
}

export function animateLayout() {
  LayoutAnimation.configureNext(
    LayoutAnimation.create(
      300,
      LayoutAnimation.Types.easeInEaseOut,
      LayoutAnimation.Properties.opacity,
    ),
  );
}

export function animateLayoutSpring() {
  LayoutAnimation.configureNext({
    duration: 350,
    create: { type: 'spring', property: 'scaleXY', springDamping: 0.8 },
    update: { type: 'spring', springDamping: 0.8 },
    delete: { type: 'linear', property: 'opacity' },
  });
}

export function useFadeIn(delay: number = 0) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        ...TimingPresets.normal,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        ...SpringPresets.gentle,
      }),
    ]).start();
  }, []);

  return {
    opacity,
    transform: [{ translateY }],
  };
}

export function useScaleIn(delay: number = 0) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, ...SpringPresets.bouncy }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return { scale, opacity };
}

export function useSlideIn(fromX: number = -30) {
  const translateX = useRef(new Animated.Value(fromX)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, ...SpringPresets.gentle }),
      Animated.timing(opacity, { toValue: 1, ...TimingPresets.fast }),
    ]).start();
  }, []);

  return {
    opacity,
    transform: [{ translateX }],
  };
}

export function usePulseOnChange<T>(value: T) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.05, ...TimingPresets.fast }),
      Animated.timing(pulse, { toValue: 1, ...TimingPresets.fast }),
    ]).start();
  }, [value]);

  return { transform: [{ scale: pulse }] };
}

export function usePressAnimation() {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.97, ...SpringPresets.stiff }).start();
  }, []);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, ...SpringPresets.stiff }).start();
  }, []);

  return { scale, onPressIn, onPressOut };
}

interface AnimatedMountProps {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}

export function FadeSlideIn({ children, delay = 0, style }: AnimatedMountProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, ...TimingPresets.normal }),
        Animated.spring(slideAnim, { toValue: 0, ...SpringPresets.gentle }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function ScaleInView({ children, delay = 0, style }: AnimatedMountProps) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, ...SpringPresets.bouncy }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function SlideInView({
  children,
  delay = 0,
  fromX = -30,
  style,
}: AnimatedMountProps & { fromX?: number }) {
  const translateX = useRef(new Animated.Value(fromX)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, ...SpringPresets.gentle }),
        Animated.timing(opacity, { toValue: 1, ...TimingPresets.fast }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, fromX]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateX }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function useCountUp(
  target: number,
  duration: number = 600,
  startFrom: number = 0,
) {
  const anim = useRef(new Animated.Value(startFrom)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: target,
      duration,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [target, duration]);

  return anim;
}

export function useShimmer() {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });
}

export function SkeletonBlock({ width, height, style }: { width?: number; height: number; style?: ViewStyle }) {
  const opacity = useShimmer();

  return (
    <Animated.View
      style={[
        {
          width: width ?? '100%' as any,
          height,
          borderRadius: 8,
          backgroundColor: '#ccc',
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  const opacity = useShimmer();

  return (
    <Animated.View
      style={[
        {
          borderRadius: 14,
          borderWidth: 1,
          borderColor: 'rgba(128,128,160,0.1)',
          padding: 16,
          marginBottom: 8,
          overflow: 'hidden',
          opacity,
          backgroundColor: 'rgba(128,128,160,0.06)',
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Animated.View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(128,128,160,0.15)', marginRight: 10, opacity }} />
        <Animated.View style={{ height: 14, borderRadius: 6, backgroundColor: 'rgba(128,128,160,0.15)', flex: 1, opacity }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Animated.View style={{ height: 10, borderRadius: 5, backgroundColor: 'rgba(128,128,160,0.10)', flex: 0.4, opacity }} />
        <Animated.View style={{ height: 10, borderRadius: 5, backgroundColor: 'rgba(128,128,160,0.10)', flex: 0.3, opacity }} />
      </View>
    </Animated.View>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={{ padding: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

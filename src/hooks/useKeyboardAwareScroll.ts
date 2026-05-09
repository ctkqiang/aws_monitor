import { useRef, useEffect, useState, useCallback } from 'react';
import { Keyboard, Platform, KeyboardEvent, ScrollView } from 'react-native';

interface UseKeyboardAwareScrollOptions {
  enabled?: boolean;
  extraBottomPadding?: number;
  onKeyboardShow?: () => void;
  onKeyboardHide?: () => void;
}

export interface KeyboardAwareScrollResult {
  scrollRef: React.RefObject<ScrollView | null>;
  keyboardHeight: number;
  isKeyboardVisible: boolean;
  scrollToInput: (y: number) => void;
  scrollViewProps: {
    ref: React.RefObject<ScrollView | null>;
    keyboardShouldPersistTaps: 'handled';
    keyboardDismissMode: 'interactive';
    onScroll: (e: { nativeEvent: { contentOffset: { y: number } } }) => void;
    scrollEventThrottle: number;
  };
}

export function useKeyboardAwareScroll(
  options: UseKeyboardAwareScrollOptions = {}
): KeyboardAwareScrollResult {
  const {
    enabled = true,
    extraBottomPadding = 0,
    onKeyboardShow,
    onKeyboardHide,
  } = options;

  const scrollRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isKeyboardVisible = keyboardHeight > 0;
  const scrollY = useRef(0);

  const onScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      scrollY.current = e.nativeEvent.contentOffset.y;
    },
    []
  );

  const scrollToInput = useCallback(
    (inputY: number) => {
      if (keyboardHeight <= 0) return;
      const targetY = inputY - keyboardHeight * 0.3 + extraBottomPadding;
      scrollRef.current?.scrollTo({ y: Math.max(0, targetY), animated: true });
    },
    [keyboardHeight, extraBottomPadding]
  );

  useEffect(() => {
    if (!enabled) return;

    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      const h = e.endCoordinates.height;
      setKeyboardHeight(h);
      onKeyboardShow?.();

      const delay = Platform.OS === 'ios' ? 60 : 160;
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: scrollY.current + h * 0.35,
          animated: true,
        });
      }, delay);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      const currentHeight = keyboardHeight;
      setKeyboardHeight(0);
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: Math.max(0, scrollY.current - currentHeight * 0.35),
          animated: false,
        });
      }, Platform.OS === 'ios' ? 0 : 50);
      onKeyboardHide?.();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [enabled, onKeyboardShow, onKeyboardHide]);

  return {
    scrollRef,
    keyboardHeight,
    isKeyboardVisible,
    scrollToInput,
    scrollViewProps: {
      ref: scrollRef,
      keyboardShouldPersistTaps: 'handled' as const,
      keyboardDismissMode: 'interactive' as const,
      onScroll,
      scrollEventThrottle: 16,
    },
  };
}

import React, { forwardRef, useRef, useEffect, useState } from 'react';
import {
  ScrollView, ScrollViewProps, Platform, View, StyleSheet, Keyboard, KeyboardEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  avoidKeyboard?: boolean;
  extraKeyboardOffset?: number;
}

function KeyboardAwareScrollView(
  {
    avoidKeyboard = true,
    extraKeyboardOffset = 0,
    style,
    contentContainerStyle,
    children,
    keyboardShouldPersistTaps = 'handled',
    keyboardDismissMode = 'interactive',
    showsVerticalScrollIndicator = false,
    onScroll,
    scrollEventThrottle = 16,
    ...scrollProps
  }: KeyboardAwareScrollViewProps,
  _forwardedRef: React.ForwardedRef<ScrollView>
) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollY = useRef(0);

  const handleOnScroll = (e: Parameters<NonNullable<ScrollViewProps['onScroll']>>[0]) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
    onScroll?.(e);
  };

  useEffect(() => {
    if (!avoidKeyboard) return;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      const h = e.endCoordinates.height;
      setKeyboardHeight(h);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [avoidKeyboard]);

  const adjustedContentContainerStyle = [
    { flexGrow: 1 },
    contentContainerStyle,
    avoidKeyboard && keyboardHeight > 0 && {
      paddingBottom: keyboardHeight + insets.bottom + extraKeyboardOffset,
    },
  ];

  return (
    <View style={styles.flex}>
      <ScrollView
        ref={scrollRef}
        style={[{ flex: 1 }, style]}
        contentContainerStyle={adjustedContentContainerStyle}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        onScroll={handleOnScroll}
        scrollEventThrottle={scrollEventThrottle}
        {...scrollProps}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const KeyboardAwareScrollViewForwarded = forwardRef(KeyboardAwareScrollView);
export default KeyboardAwareScrollViewForwarded;

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

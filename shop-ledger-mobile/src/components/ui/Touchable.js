import React, { useRef } from 'react';
import { Animated, Pressable } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Drop-in for react-native's TouchableOpacity: same props, springy press feedback.
export function TouchableOpacity({ style, activeOpacity, onPressIn, onPressOut, disabled, children, ...rest }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v) => Animated.spring(scale, { toValue: v, speed: 45, bounciness: 5, useNativeDriver: true }).start();

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      style={[style, { transform: [{ scale }] }]}
      onPressIn={(e) => { to(0.965); onPressIn && onPressIn(e); }}
      onPressOut={(e) => { to(1); onPressOut && onPressOut(e); }}
    >
      {children}
    </AnimatedPressable>
  );
}

export default TouchableOpacity;

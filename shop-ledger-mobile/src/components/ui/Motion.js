import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text } from 'react-native';
import { motion } from '../../theme/colors';

// Fade + rise on mount. Use `index` to stagger lists: <FadeInView index={i}>.
export function FadeInView({ children, delay = 0, index = 0, distance = 14, duration = motion.base, style, ...rest }) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(v, {
      toValue: 1,
      duration,
      delay: delay + Math.min(index, 12) * motion.stagger,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [v, delay, index, duration]);

  return (
    <Animated.View
      {...rest}
      style={[
        style,
        {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// Drop-in replacement for TouchableOpacity with a springy press.
export function PressableScale({ children, onPress, style, scaleTo = 0.96, disabled, ...rest }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (value) =>
    Animated.spring(s, { toValue: value, speed: 40, bounciness: 6, useNativeDriver: true }).start();

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}
    >
      <Animated.View style={[style, { transform: [{ scale: s }], opacity: disabled ? 0.55 : 1 }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// Counts up to `value`. `format` receives the current number.
export function AnimatedNumber({ value = 0, duration = 700, format = (n) => String(Math.round(n)), style }) {
  const [display, setDisplay] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const start = from.current;
    const v = new Animated.Value(0);
    const id = v.addListener(({ value: p }) => setDisplay(start + (target - start) * p));
    Animated.timing(v, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      from.current = target;
    });
    return () => v.removeListener(id);
  }, [value, duration]);

  return <Text style={style}>{format(display)}</Text>;
}

// Gentle looping pulse — for loaders / empty states.
export function Pulse({ children, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// Tab-bar icon that pops when its tab becomes focused.
export function TabIcon({ focused, children }) {
  const s = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(s, { toValue: focused ? 1 : 0, speed: 18, bounciness: 10, useNativeDriver: true }).start();
  }, [focused, s]);
  return (
    <Animated.View
      style={{
        transform: [
          { scale: s.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) },
          { translateY: s.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

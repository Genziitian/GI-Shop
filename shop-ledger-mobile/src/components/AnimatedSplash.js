import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, Easing, StyleSheet } from 'react-native';

const GREEN = '#0f7a43';
const GREEN_DARK = '#0b5e33';
const ACCENT = '#f2a516';

// Full-screen animated splash. Fades itself out when `visible` becomes false.
export default function AnimatedSplash({ visible = true }) {
  const logo = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;
  const tagline = useRef(new Animated.Value(0)).current;
  const dots = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logo, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.stagger(120, [
        Animated.timing(title, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(tagline, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();

    const ringLoop = Animated.loop(
      Animated.timing(ring, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true })
    );
    const dotsLoop = Animated.loop(
      Animated.timing(dots, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
    );
    ringLoop.start();
    dotsLoop.start();
    return () => {
      ringLoop.stop();
      dotsLoop.stop();
    };
  }, [logo, ring, title, tagline, dots]);

  useEffect(() => {
    if (!visible) {
      Animated.timing(exit, { toValue: 0, duration: 380, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [visible, exit]);

  const rise = (v) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  });

  const ringStyle = (offset) => {
    const p = Animated.modulo(Animated.add(ring, offset), 1);
    return {
      opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
      transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
    };
  };

  const dot = (i) => {
    const p = Animated.modulo(Animated.add(dots, i * 0.2), 1);
    return {
      opacity: p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1, 0.3] }),
      transform: [{ scale: p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 1.3, 0.8] }) }],
    };
  };

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { opacity: exit, transform: [{ scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1] }) }] },
      ]}
    >
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />

      <View style={styles.center}>
        <View style={styles.logoWrap}>
          <Animated.View style={[styles.ring, ringStyle(0)]} />
          <Animated.View style={[styles.ring, ringStyle(0.5)]} />
          <Animated.View
            style={[
              styles.logoBox,
              {
                opacity: logo,
                transform: [
                  { scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                  { rotate: logo.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '0deg'] }) },
                ],
              },
            ]}
          >
            <Image source={require('../../assets/icon.png')} style={styles.logoImg} />
          </Animated.View>
        </View>

        <Animated.Text style={[styles.title, rise(title)]}>
          GI <Text style={styles.titleAccent}>SHOP</Text>
        </Animated.Text>
        <Animated.Text style={[styles.tagline, rise(tagline)]}>Apni Dukaan, Apna Hisab</Animated.Text>
      </View>

      <View style={styles.dotsRow}>
        {[0, 1, 2].map((i) => (
          <Animated.View key={i} style={[styles.dot, dot(i)]} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    elevation: 100,
  },
  blobTop: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: GREEN_DARK,
    opacity: 0.55,
  },
  blobBottom: {
    position: 'absolute',
    bottom: -140,
    left: -110,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: '#1f9d5a',
    opacity: 0.45,
  },
  center: { alignItems: 'center' },
  logoWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  logoBox: {
    width: 104,
    height: 104,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  logoImg: { width: 88, height: 88, borderRadius: 22, resizeMode: 'contain' },
  title: { fontSize: 36, fontWeight: '900', color: '#ffffff', letterSpacing: 1 },
  titleAccent: { color: ACCENT },
  tagline: { marginTop: 8, fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.4 },
  dotsRow: { position: 'absolute', bottom: 64, flexDirection: 'row', gap: 10 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#ffffff' },
});

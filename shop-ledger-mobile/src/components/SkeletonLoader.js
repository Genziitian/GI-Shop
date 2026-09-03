import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';

export function SkeletonPulse({ style }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.pulseBlock, { opacity }, style]} />;
}

export function ShopCardSkeleton({ count = 3 }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.rowBetween}>
            <SkeletonPulse style={{ width: '50%', height: 18, borderRadius: 4 }} />
            <SkeletonPulse style={{ width: 60, height: 20, borderRadius: 10 }} />
          </View>
          <SkeletonPulse style={{ width: '80%', height: 14, borderRadius: 4, marginTop: 8 }} />
          <SkeletonPulse style={{ width: '60%', height: 14, borderRadius: 4, marginTop: 6 }} />
          <View style={[styles.rowBetween, { marginTop: 12 }]}>
            <SkeletonPulse style={{ flex: 1, height: 36, borderRadius: 8, marginRight: 6 }} />
            <SkeletonPulse style={{ flex: 1, height: 36, borderRadius: 8, marginLeft: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function ProductGridSkeleton({ count = 6 }) {
  return (
    <View style={styles.gridContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.gridItem}>
          <SkeletonPulse style={{ width: '70%', height: 16, borderRadius: 4, marginBottom: 8 }} />
          <SkeletonPulse style={{ width: '50%', height: 20, borderRadius: 10 }} />
        </View>
      ))}
    </View>
  );
}

export function CustomerItemSkeleton({ count = 4 }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.card, styles.rowBetween]}>
          <View style={{ flex: 1 }}>
            <SkeletonPulse style={{ width: '45%', height: 16, borderRadius: 4 }} />
            <SkeletonPulse style={{ width: '30%', height: 12, borderRadius: 4, marginTop: 6 }} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <SkeletonPulse style={{ width: 60, height: 12, borderRadius: 4 }} />
            <SkeletonPulse style={{ width: 80, height: 20, borderRadius: 4, marginTop: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function OrderCardSkeleton({ count = 3 }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.rowBetween}>
            <SkeletonPulse style={{ width: '40%', height: 18, borderRadius: 4 }} />
            <SkeletonPulse style={{ width: 70, height: 22, borderRadius: 11 }} />
          </View>
          <SkeletonPulse style={{ width: '70%', height: 14, borderRadius: 4, marginTop: 8 }} />
          <SkeletonPulse style={{ width: '50%', height: 14, borderRadius: 4, marginTop: 6 }} />
          <SkeletonPulse style={{ width: 110, height: 32, borderRadius: 6, marginTop: 12 }} />
        </View>
      ))}
    </View>
  );
}

export default function SkeletonLoader({ type = 'shopCard', count = 3 }) {
  if (type === 'shopCard') return <ShopCardSkeleton count={count} />;
  if (type === 'productGrid') return <ProductGridSkeleton count={count} />;
  if (type === 'customerItem') return <CustomerItemSkeleton count={count} />;
  if (type === 'orderCard') return <OrderCardSkeleton count={count} />;
  return <ShopCardSkeleton count={count} />;
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pulseBlock: {
    backgroundColor: '#cbd5e1',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
});

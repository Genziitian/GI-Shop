import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Animated, Easing, StyleSheet } from 'react-native';
import { TouchableOpacity } from './ui/Touchable';
import { Check, ArrowRight } from 'lucide-react-native';
import { colors } from '../theme/colors';

const CONFETTI = [
  { c: '#f2a516', x: -90, y: -70, r: 6 },
  { c: '#4285F4', x: 80, y: -80, r: 5 },
  { c: '#EA4335', x: -70, y: 10, r: 5 },
  { c: '#34A853', x: 95, y: 0, r: 6 },
  { c: '#FBBC05', x: -40, y: -105, r: 4 },
  { c: '#1f9d5a', x: 40, y: -105, r: 4 },
];

export default function OrderSuccessModal({ visible, amount, shopName, onViewOrders, onClose }) {
  const sheet = useRef(new Animated.Value(0)).current;
  const check = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    sheet.setValue(0);
    check.setValue(0);
    burst.setValue(0);
    Animated.sequence([
      Animated.spring(sheet, { toValue: 1, friction: 8, tension: 70, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(check, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }),
        Animated.timing(burst, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, [visible, sheet, check, burst]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: sheet,
              transform: [
                { translateY: sheet.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
                { scale: sheet.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
              ],
            },
          ]}
        >
          <View style={styles.badgeWrap}>
            {CONFETTI.map((d, i) => (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  width: d.r * 2,
                  height: d.r * 2,
                  borderRadius: d.r,
                  backgroundColor: d.c,
                  opacity: burst.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
                  transform: [
                    { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, d.x] }) },
                    { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, d.y] }) },
                  ],
                }}
              />
            ))}
            <Animated.View style={[styles.badge, { transform: [{ scale: check }] }]}>
              <Check size={42} color="#ffffff" strokeWidth={3.5} />
            </Animated.View>
          </View>

          <Text style={styles.title}>Order Placed!</Text>
          <Text style={styles.amount}>₹{Number(amount || 0).toFixed(2)}</Text>
          <Text style={styles.desc}>
            Sent to <Text style={styles.bold}>{shopName}</Text>. Track live status under All Orders.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={onViewOrders} activeOpacity={0.85}>
            <Text style={styles.primaryText}>View Orders</Text>
            <ArrowRight size={18} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.secondaryText}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(16,24,40,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 16,
  },
  badgeWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#1f9d5a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: '#dff3e6',
  },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, letterSpacing: -0.3 },
  amount: { fontSize: 34, fontWeight: '900', color: '#1f9d5a', marginTop: 6 },
  desc: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  bold: { fontWeight: '800', color: colors.text },
  primaryBtn: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    height: 54,
    borderRadius: 16,
    backgroundColor: '#1f9d5a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    shadowColor: '#1f9d5a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  secondaryBtn: { paddingVertical: 14 },
  secondaryText: { color: colors.textMuted, fontSize: 15, fontWeight: '700' },
});

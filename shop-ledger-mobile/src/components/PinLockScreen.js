import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Vibration,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, Delete, Store, User, ShieldCheck, LogOut } from 'lucide-react-native';
import { colors, shadowStyle, shadowLarge } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function PinLockScreen() {
  const { user, unlock, logout } = useAuth();
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePressDigit = (digit) => {
    if (loading) return;
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setErrorMsg('');
      if (newPin.length === 4) {
        verifyEnteredPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (loading) return;
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setErrorMsg('');
    }
  };

  const verifyEnteredPin = async (enteredPin) => {
    setLoading(true);
    try {
      await unlock(enteredPin);
    } catch (e) {
      if (Platform.OS !== 'web') {
        Vibration.vibrate(200);
      }
      setErrorMsg(e.message || 'Incorrect 4-digit PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.lockIconBox}>
          <Lock size={32} color={colors.primary} />
        </View>

        <Text style={styles.title}>GI SHOP Locked</Text>
        <Text style={styles.subtitle}>
          Enter your 4-digit PIN to access {user?.shop?.shopName || user?.name || 'your store'}
        </Text>

        <View style={styles.userBadge}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {user?.role === 'Shopkeeper' ? (
              <Store size={14} color={colors.primary} />
            ) : (
              <User size={14} color={colors.success} />
            )}
            <Text style={styles.userBadgeText}>
              {user?.name} ({user?.shortId})
            </Text>
          </View>
        </View>
      </View>

      {/* 4-PIN Indicators */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3].map((index) => {
          const filled = pin.length > index;
          return (
            <View
              key={index}
              style={[
                styles.dot,
                filled && styles.dotFilled,
                errorMsg && styles.dotError,
              ]}
            />
          );
        })}
      </View>

      {/* Error / Loading Message */}
      <View style={styles.statusBox}>
        {loading ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : (
          <Text style={styles.hintText}>Enter your 4-digit security PIN to unlock</Text>
        )}
      </View>

      {/* Numeric Keypad */}
      <View style={styles.keypad}>
        <View style={styles.keypadRow}>
          {[1, 2, 3].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.keyBtn}
              onPress={() => handlePressDigit(num.toString())}
              activeOpacity={0.7}
            >
              <Text style={styles.keyText}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.keypadRow}>
          {[4, 5, 6].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.keyBtn}
              onPress={() => handlePressDigit(num.toString())}
              activeOpacity={0.7}
            >
              <Text style={styles.keyText}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.keypadRow}>
          {[7, 8, 9].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.keyBtn}
              onPress={() => handlePressDigit(num.toString())}
              activeOpacity={0.7}
            >
              <Text style={styles.keyText}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.keypadRow}>
          <TouchableOpacity
            style={[styles.keyBtn, styles.keyBtnSpecial]}
            onPress={logout}
            activeOpacity={0.7}
          >
            <LogOut size={20} color={colors.danger} />
            <Text style={styles.logoutKeyText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.keyBtn}
            onPress={() => handlePressDigit('0')}
            activeOpacity={0.7}
          >
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.keyBtn, styles.keyBtnSpecial]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Delete size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer Support Info */}
      <View style={styles.footer}>
        <ShieldCheck size={14} color={colors.textMuted} />
        <Text style={styles.footerText}>
          Forgot PIN? Ask Super Manager to reset your security PIN.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  lockIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...shadowStyle,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  userBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginVertical: 14,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.borderDark,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dotError: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  statusBox: {
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  hintText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  keypad: {
    gap: 12,
    maxWidth: 320,
    width: '100%',
    alignSelf: 'center',
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  keyBtn: {
    flex: 1,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowStyle,
  },
  keyBtnSpecial: {
    backgroundColor: colors.surface,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  logoutKeyText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.danger,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  footerText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

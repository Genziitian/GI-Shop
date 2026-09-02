import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function Header({ title, subtitle, rightElement, showLock = true, rightComponent }) {
  const { user, lock } = useAuth();

  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.appLogoIcon}
        />
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title || 'GI SHOP'}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle || user?.shop?.shopName || 'Smart Billing & Khata'}
          </Text>
        </View>
      </View>

      <View style={styles.rightContainer}>
        {rightComponent || rightElement}

        {showLock && (
          <TouchableOpacity
            style={styles.lockBtn}
            onPress={lock}
            activeOpacity={0.7}
          >
            <Lock size={14} color={colors.primaryDark} />
            <Text style={styles.lockBtnText}>Lock</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  appLogoIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#15803d',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 4,
  },
  lockBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
});

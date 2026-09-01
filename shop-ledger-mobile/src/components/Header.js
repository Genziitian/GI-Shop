import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Lock, Store, User, Settings } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import ProfileSettingsModal from './ProfileSettingsModal';

export default function Header({ title, subtitle, rightElement, showLock = true, rightComponent }) {
  const { user, lock } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.trim().charAt(0).toUpperCase();
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.leftContainer}
        onPress={() => setShowProfileModal(true)}
        activeOpacity={0.8}
      >
        <View style={styles.iconBadge}>
          {user?.role === 'Shopkeeper' ? (
            <Store size={20} color={colors.primary} />
          ) : (
            <User size={20} color={colors.success} />
          )}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title || user?.shop?.shopName || user?.name || 'GI SHOP'}
          </Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </TouchableOpacity>

      <View style={styles.rightContainer}>
        {rightComponent || rightElement}

        {/* Top Right Profile & Settings Button */}
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => setShowProfileModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{getInitials(user?.name)}</Text>
          </View>
          <Settings size={14} color={colors.primaryDark} />
        </TouchableOpacity>

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

      <ProfileSettingsModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
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
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
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
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  profileAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
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

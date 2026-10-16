import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { TouchableOpacity } from './ui/Touchable';
import { Lock } from 'lucide-react-native';
import { colors, roleAccent, radius } from '../theme/colors';
import { FadeInView } from './ui/Motion';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';

export default function Header({ title, subtitle, rightElement, showLock = false, rightComponent }) {
  const { user, isShopkeeper } = useAuth();
  const { t } = useTranslation();

  const shortId = isShopkeeper 
    ? (user?.shop?.shortId || user?.shortId || (user?.shop?.id ? `shp${user.shop.id}` : ''))
    : (user?.shortId || (user?.id ? `cust${user.id}` : ''));

  const idLabel = isShopkeeper ? t('Shop ID') : t('ID');
  const accent = isShopkeeper ? roleAccent.Shopkeeper : roleAccent.Customer;

  return (
    <FadeInView distance={-8} duration={320} style={styles.header}>
      <View style={styles.leftContainer}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.appLogoIcon}
        />
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {t(title || 'GI SHOP')}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle ? t(subtitle) : (user?.shop?.shopName || t('Smart Billing & Khata'))}
          </Text>
        </View>
      </View>

      <View style={styles.rightContainer}>
        {shortId ? (
          <View style={[styles.idBadge, { backgroundColor: accent.tint, borderColor: accent.main + '33' }]}>
            <Text style={[styles.idBadgeText, { color: accent.main }]}>
              {idLabel}: {shortId}
            </Text>
          </View>
        ) : null}

        {rightComponent || rightElement}
      </View>
    </FadeInView>
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
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
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
    borderRadius: 11,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e8e1d0',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primaryDark,
    letterSpacing: -0.3,
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
  idBadge: {
    backgroundColor: '#e9f6ee',
    borderWidth: 1,
    borderColor: '#bfe3cb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  idBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f7a43',
  },
  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#bfe3cb',
    gap: 4,
  },
  lockBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
});

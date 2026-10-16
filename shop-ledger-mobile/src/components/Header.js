import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Modal, Share, Pressable } from 'react-native';
import { TouchableOpacity } from './ui/Touchable';
import { Lock, X, Share2 } from 'lucide-react-native';
import { colors, roleAccent, radius } from '../theme/colors';
import { FadeInView } from './ui/Motion';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';

export default function Header({ title, subtitle, rightElement, showLock = false, rightComponent }) {
  const { user, isShopkeeper } = useAuth();
  const { t } = useTranslation();
  const [showId, setShowId] = useState(false);

  const shortId = String(isShopkeeper
    ? (user?.shop?.shortId || user?.shortId || (user?.shop?.id ? `shp${user.shop.id}` : ''))
    : (user?.shortId || (user?.id ? `cust${user.id}` : ''))).toUpperCase();

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
          <TouchableOpacity
            style={[styles.idBadge, { backgroundColor: accent.tint, borderColor: accent.main + '33' }]}
            onPress={() => setShowId(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.idBadgeText, { color: accent.main }]}>
              {idLabel}: {shortId}
            </Text>
          </TouchableOpacity>
        ) : null}

        {rightComponent || rightElement}
      </View>
      <Modal visible={showId} transparent animationType="fade" onRequestClose={() => setShowId(false)}>
        <Pressable style={styles.idOverlay} onPress={() => setShowId(false)}>
          <Pressable style={styles.idCard} onPress={() => {}}>
            <TouchableOpacity style={styles.idClose} onPress={() => setShowId(false)} activeOpacity={0.7}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <Text style={styles.idCardLabel}>
              {isShopkeeper ? t('Your Shop ID') : t('Your Customer ID')}
            </Text>
            <View style={[styles.idBig, { backgroundColor: accent.tint, borderColor: accent.main + '33' }]}>
              <Text style={[styles.idBigText, { color: accent.main }]} adjustsFontSizeToFit numberOfLines={1}>
                {shortId}
              </Text>
            </View>
            <Text style={styles.idHint}>
              {isShopkeeper
                ? t('Share this ID with customers so they can find and link your shop.')
                : t('Share this ID with a shopkeeper so they can add you as a customer.')}
            </Text>
            <TouchableOpacity
              style={[styles.idShareBtn, { backgroundColor: accent.main }]}
              onPress={() => Share.share({ message: `My GI SHOP ID: ${shortId}` }).catch(() => {})}
              activeOpacity={0.85}
            >
              <Share2 size={18} color="#ffffff" />
              <Text style={styles.idShareText}>{t('Share ID')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
    borderColor: '#e4e7ec',
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
  idOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16,24,40,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  idCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
  idClose: { position: 'absolute', top: 14, right: 14, padding: 8, borderRadius: 20, backgroundColor: '#f2f4f7' },
  idCardLabel: { fontSize: 13, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 },
  idBig: { alignSelf: 'stretch', borderWidth: 1.5, borderRadius: 20, paddingVertical: 24, paddingHorizontal: 12, marginTop: 16, alignItems: 'center' },
  idBigText: { fontSize: 44, fontWeight: '900', letterSpacing: 4 },
  idHint: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 14, lineHeight: 19 },
  idShareBtn: { flexDirection: 'row', alignSelf: 'stretch', height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  idShareText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
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

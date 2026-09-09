import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Link2, ShieldCheck, AlertCircle, Lock, User, Mail, Hash, Phone } from 'lucide-react-native';
import { colors, shadowLarge } from '../theme/colors';
import { linkCustomerAccount } from '../api/client';
import { showErrorAlert } from '../utils/errorHandler';
import { useTranslation } from '../context/LanguageContext';

export default function LinkCustomerModal({ visible, customer, onClose, onLinkSuccess }) {
  const { t } = useTranslation();
  const [customerId, setCustomerId] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setCustomerId('');
      setEmail(customer?.email || customer?.customerEmail || '');
      setErrorMessage('');
      setSubmitting(false);
    }
  }, [visible, customer]);

  if (!customer) return null;

  const displayName = customer.name || t('Customer');
  const displayPhone = customer.phone || customer.customerPhone || '';

  const handleLink = async () => {
    setErrorMessage('');
    const cleanId = customerId.trim();
    const cleanEmail = email.trim();

    if (!cleanId) {
      setErrorMessage(t('Customer ID (Short ID) is required.'));
      return;
    }
    if (!cleanEmail) {
      setErrorMessage(t('Customer Email is required.'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await linkCustomerAccount({
        phone: displayPhone,
        customerId: cleanId,
        email: cleanEmail,
      });

      Alert.alert(
        t('Account Linked Successfully'),
        `${displayName} ${t('is now securely linked to GI SHOP Account')} #${res.customer?.customerShortId || cleanId}.\n\n${t('Their past khata balance, sales, and item receipts are now permanently linked and visible in their GI SHOP app.')}`,
        [{ text: t('OK') }]
      );

      if (onLinkSuccess) {
        onLinkSuccess(res.customer);
      }
      onClose();
    } catch (err) {
      console.error('Link customer error:', err);
      const msg = err.message || t('Customer ID and Email do not match any registered GI SHOP account.');
      setErrorMessage(msg);
      showErrorAlert(msg, t('Verification Failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalContent}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <View style={styles.iconCircle}>
                    <Link2 size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.title}>{t('Link to GI SHOP App')}</Text>
                    <Text style={styles.subtitle}>{t('Verify customer identity via ID & Email')}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Customer Banner */}
              <View style={styles.customerBanner}>
                <View style={styles.customerInfoLeft}>
                  <Text style={styles.customerBannerName} numberOfLines={1}>{displayName}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Phone size={12} color={colors.textSecondary} />
                    <Text style={styles.customerBannerPhone}>{displayPhone}</Text>
                  </View>
                </View>
                <View style={styles.unlinkedBadge}>
                  <Text style={styles.unlinkedBadgeText}>{t('Unlinked Walk-in')}</Text>
                </View>
              </View>

              {/* Security Policy Notice */}
              <View style={styles.securityNotice}>
                <ShieldCheck size={16} color="#0284c7" style={{ marginTop: 2 }} />
                <Text style={styles.securityNoticeText}>
                  {t('For privacy and fraud prevention, enter the customer\'s GI SHOP ID and Email. Both must match their active account. Once verified and linked, this account cannot be re-edited.')}
                </Text>
              </View>

              {/* Error Message */}
              {errorMessage ? (
                <View style={styles.errorBox}>
                  <AlertCircle size={15} color="#b91c1c" style={{ marginTop: 1 }} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Input Form */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('GI SHOP Customer ID (Short ID)')}</Text>
                <View style={styles.inputWrap}>
                  <Hash size={16} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. usr8k29"
                    placeholderTextColor={colors.textMuted}
                    value={customerId}
                    onChangeText={(val) => {
                      setCustomerId(val);
                      setErrorMessage('');
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('Registered Customer Email')}</Text>
                <View style={styles.inputWrap}>
                  <Mail size={16} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. ramesh@example.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      setErrorMessage('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Notice that once linked, cannot be edited */}
              <View style={styles.lockNoticeRow}>
                <Lock size={12} color={colors.textMuted} />
                <Text style={styles.lockNoticeText}>{t('Permanent link: Cannot be changed once linked.')}</Text>
              </View>

              {/* Buttons */}
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>{t('Cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                  onPress={handleLink}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Link2 size={16} color="#ffffff" />
                      <Text style={styles.submitBtnText}>{t('Verify & Link')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 20,
    ...shadowLarge,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  customerBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  customerInfoLeft: {
    flex: 1,
    marginRight: 8,
  },
  customerBannerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  customerBannerPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  unlinkedBadge: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unlinkedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#c2410c',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  securityNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#0369a1',
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: colors.text,
  },
  lockNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  lockNoticeText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  submitBtn: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...shadowLarge,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});

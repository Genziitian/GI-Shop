import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import { TouchableOpacity } from './ui/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  X,
  User,
  MapPin,
  Phone,
  Lock,
  ShieldCheck,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Settings,
  HelpCircle,
  MessageSquare,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile, changePin, getSupportSettings } from '../api/client';
import CitySelector from './CitySelector';

export default function ProfileSettingsModal({ visible, onClose, initialTab = 'profile' }) {
  const { user, refreshUser, logout, lock } = useAuth();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [copiedId, setCopiedId] = useState(false);

  // Dynamic SuperAdmin Support Settings State
  const [supportData, setSupportData] = useState({
    supportPhone: '',
    supportWhatsapp: '',
    supportEmail: '',
    supportHours: '09:00 AM - 09:00 PM'
  });

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      getSupportSettings()
        .then(res => {
          if (res) {
            setSupportData({
              supportPhone: res.supportPhone || '',
              supportWhatsapp: res.supportWhatsapp || '',
              supportEmail: res.supportEmail || '',
              supportHours: res.supportHours || '09:00 AM - 09:00 PM'
            });
          }
        })
        .catch(() => {});
    }
  }, [visible]);

  // Profile Form
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    city: user?.city || 'Delhi',
    address: user?.address || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState('');

  // PIN Form
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinNotice, setPinNotice] = useState('');
  const [pinError, setPinError] = useState('');

  // Settings State
  const [orderNotifications, setOrderNotifications] = useState(true);
  const [smsReceipts, setSmsReceipts] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        city: user.city || 'Delhi',
        address: user.address || '',
      });
    }
  }, [user]);

  const handleCopyShortId = () => {
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const handleSaveProfile = async () => {
    const cleanPhone = (form.phone || '').replace(/\D/g, '').slice(-10);
    if (!form.name.trim()) {
      Alert.alert('Error', 'Full name is required.');
      return;
    }
    if (cleanPhone.length !== 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setProfileSaving(true);
    setProfileNotice('');
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        phone: cleanPhone,
        city: user?.role === 'Shopkeeper' ? (user?.city || form.city) : form.city,
      };
      const res = await updateUserProfile(payload);
      if (typeof refreshUser === 'function') {
        await refreshUser(res?.user || payload);
      }
      setProfileNotice('Profile details updated successfully!');
      setTimeout(() => setProfileNotice(''), 3500);
    } catch (e) {
      Alert.alert('Save Failed', e.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePin = async () => {
    setPinError('');
    setPinNotice('');
    if (!currentPin || currentPin.length !== 4) {
      setPinError('Please enter your current 4-digit PIN.');
      return;
    }
    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError('New PIN must be exactly 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('New PIN and Confirm PIN do not match.');
      return;
    }

    setPinSaving(true);
    try {
      await changePin(currentPin, newPin);
      setPinNotice('Security PIN changed successfully! 🔒');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setTimeout(() => setPinNotice(''), 3500);
    } catch (e) {
      setPinError(e.message || 'Failed to change PIN. Verify current PIN.');
    } finally {
      setPinSaving(false);
    }
  };

  const handleOpenWhatsAppSupport = () => {
    const target = (supportData.supportWhatsapp || supportData.supportPhone || '').replace(/[^0-9]/g, '');
    if (!target) {
      if (supportData.supportEmail) {
        Linking.openURL(`mailto:${supportData.supportEmail}`);
      } else {
        Alert.alert('Support Contact', 'Support contact details have not been configured by the Platform Administrator yet.');
      }
      return;
    }
    const text = encodeURIComponent(`Hello GI SHOP Support, I need assistance with my account (${user?.shortId || user?.email || user?.phone}).`);
    Linking.openURL(`https://wa.me/${target}?text=${text}`).catch(() => {
      Alert.alert('Support', `Please email support at ${supportData.supportEmail || 'support@gishop.com'}`);
    });
  };

  const handleCallSupport = () => {
    const target = (supportData.supportPhone || '').trim();
    if (!target) {
      if (supportData.supportEmail) {
        Linking.openURL(`mailto:${supportData.supportEmail}`);
      } else {
        Alert.alert('Support Contact', 'Support contact helpline has not been configured by the Platform Administrator yet.');
      }
      return;
    }
    Linking.openURL(`tel:${target}`).catch(() => {
      Alert.alert('Support', `Please dial ${target}`);
    });
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of your GI SHOP account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          onClose();
          logout();
        },
      },
    ]);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const isShopkeeper = user?.role === 'Shopkeeper';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.backBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 36 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: '#f7f8fa' }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Identity */}
            <View style={styles.identity}>
              <View style={styles.heroAvatar}>
                <Text style={styles.heroAvatarText}>{getInitials(user?.name)}</Text>
              </View>
              <Text style={styles.heroName} numberOfLines={1}>{user?.name || 'Customer'}</Text>
              {user?.email ? <Text style={styles.heroEmail}>{user.email}</Text> : null}
              <View style={styles.identityChips}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{user?.role || 'Customer'}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.shortIdBox, copiedId && styles.shortIdBoxCopied]}
                  onPress={handleCopyShortId}
                  activeOpacity={0.7}
                >
                  <Text style={styles.shortIdText}>ID: {String(user?.shortId || 'N/A').toUpperCase()}</Text>
                  {copiedId ? <Check size={12} color="#0f7a43" /> : <Copy size={12} color={colors.primary} />}
                </TouchableOpacity>
              </View>
            </View>

            {profileNotice ? (
              <View style={styles.successBanner}>
                <CheckCircle size={15} color="#0f7a43" />
                <Text style={styles.successBannerText}>{profileNotice}</Text>
              </View>
            ) : null}

            {/* Form */}
            <View style={styles.sectionCard}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(t) => setForm({ ...form, name: t })}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Mobile Number</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={[styles.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeftWidth: 0 }]}
                    value={form.phone}
                    onChangeText={(t) => {
                      const digits = t.replace(/\D/g, '').slice(0, 10);
                      setForm({ ...form, phone: digits });
                    }}
                    placeholder="10-digit mobile number"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              </View>

              {isShopkeeper ? (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Shop City</Text>
                  <View style={styles.lockedField}>
                    <MapPin size={16} color="#667085" />
                    <Text style={styles.lockedFieldText}>{form.city || user?.city || 'Delhi'}</Text>
                    <Lock size={14} color="#98a2b3" />
                  </View>
                  <Text style={styles.helperText}>
                    City is locked to protect orders and billing records. Contact support to request a transfer.
                  </Text>
                </View>
              ) : (
                <CitySelector
                  selectedCity={form.city}
                  onSelectCity={(selected) => setForm({ ...form, city: selected })}
                  label="City / Location"
                />
              )}

              <View style={[styles.fieldGroup, { marginBottom: 0 }]}>
                <Text style={styles.fieldLabel}>{isShopkeeper ? 'Address' : 'Delivery Address'}</Text>
                <TextInput
                  style={[styles.input, { height: 84, textAlignVertical: 'top', paddingTop: 12 }]}
                  value={form.address}
                  onChangeText={(t) => setForm({ ...form, address: t })}
                  placeholder="Street, flat/house number, landmark"
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
              </View>
            </View>
          </ScrollView>

          {/* Sticky save */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveBtn, profileSaving && { opacity: 0.7 }]}
              disabled={profileSaving}
              onPress={handleSaveProfile}
              activeOpacity={0.85}
            >
              {profileSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.badgeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  identity: { alignItems: 'center', paddingVertical: 8, marginBottom: 14 },
  heroAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroAvatarText: { fontSize: 28, fontWeight: '800', color: colors.primary },
  heroName: { fontSize: 20, fontWeight: '800', color: colors.text },
  heroEmail: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  identityChips: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  roleBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  shortIdBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  shortIdBoxCopied: { borderColor: '#86efac', backgroundColor: '#ecfdf3' },
  shortIdText: { fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 0.4 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfdf3',
    borderWidth: 1,
    borderColor: '#abefc6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  successBannerText: { fontSize: 13, fontWeight: '600', color: '#067647', flex: 1 },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#344054', marginBottom: 6 },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d0d5dd',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
  },
  phonePrefix: {
    backgroundColor: '#f2f4f7',
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
  },
  phonePrefixText: { fontSize: 14, fontWeight: '700', color: '#475467' },
  lockedField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#f2f4f7',
    borderWidth: 1,
    borderColor: '#e4e7ec',
    paddingHorizontal: 14,
  },
  lockedFieldText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#475467' },
  helperText: { fontSize: 12, color: colors.textMuted, marginTop: 6, lineHeight: 17 },
  footer: {
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveBtn: {
    height: 50,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
});

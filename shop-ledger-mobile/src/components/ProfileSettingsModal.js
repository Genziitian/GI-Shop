import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
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
    if (!form.name.trim() || !form.phone.trim()) {
      Alert.alert('Error', 'Name and Phone number are required.');
      return;
    }
    setProfileSaving(true);
    setProfileNotice('');
    try {
      const payload = {
        ...form,
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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.headerIconBadge}>
              <User size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Personal & Delivery Details</Text>
              <Text style={styles.headerSubtitle}>Update your name, phone, city & address</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {/* User Hero Identity Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>{getInitials(user?.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.heroName}>{user?.name || 'Customer'}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{user?.role || 'Customer'}</Text>
                </View>
              </View>
              <Text style={styles.heroPhone}>{user?.phone || 'No phone'}</Text>
              <Text style={styles.heroEmail}>{user?.email || 'No email'}</Text>
            </View>

            {/* Short ID Card with copy button */}
            <TouchableOpacity
              style={[styles.shortIdBox, copiedId && styles.shortIdBoxCopied]}
              onPress={handleCopyShortId}
              activeOpacity={0.7}
            >
              <Text style={styles.shortIdLabel}>SHORT ID</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.shortIdText}>{user?.shortId || 'N/A'}</Text>
                {copiedId ? <Check size={12} color="#15803d" /> : <Copy size={12} color={colors.primary} />}
              </View>
              <Text style={styles.copyHintText}>{copiedId ? 'Copied!' : 'Tap'}</Text>
            </TouchableOpacity>
          </View>

          {/* PROFILE DETAILS FORM */}
          <View>
            {profileNotice ? (
              <View style={styles.successBanner}>
                <CheckCircle size={15} color="#15803d" />
                <Text style={styles.successBannerText}>{profileNotice}</Text>
              </View>
            ) : null}

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Personal & Delivery Details</Text>

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
                <Text style={styles.fieldLabel}>Mobile Phone</Text>
                <TextInput
                  style={styles.input}
                  value={form.phone}
                  onChangeText={(t) => setForm({ ...form, phone: t })}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                />
              </View>

              {user?.role === 'Shopkeeper' ? (
                <View style={styles.fieldGroup}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={styles.fieldLabel}>Shop City / Region</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Lock size={12} color="#94a3b8" />
                      <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600' }}>Locked (SuperAdmin only)</Text>
                    </View>
                  </View>
                  <View style={[styles.input, { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569' }}>
                      📍 {form.city || user?.city || 'Delhi'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    Store location is locked to protect orders & billing records. Contact SuperAdmin (7323809242) to request a city transfer.
                  </Text>
                </View>
              ) : (
                <CitySelector
                  selectedCity={form.city}
                  onSelectCity={(selected) => setForm({ ...form, city: selected })}
                  label="City / Location"
                />
              )}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Delivery Address</Text>
                <TextInput
                  style={[styles.input, { height: 65, textAlignVertical: 'top' }]}
                  value={form.address}
                  onChangeText={(t) => setForm({ ...form, address: t })}
                  placeholder="Street, flat/house number, landmark"
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, profileSaving && { opacity: 0.7 }]}
                disabled={profileSaving}
                onPress={handleSaveProfile}
              >
                {profileSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Profile Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderColor: colors.border,
    borderWidth: 1,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  heroAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#bfdbfe',
  },
  heroAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  heroName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  roleBadge: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  heroPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  heroEmail: {
    fontSize: 11,
    color: colors.textMuted,
  },
  shortIdBox: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  shortIdBoxCopied: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  shortIdLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.textMuted,
  },
  shortIdText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  copyHintText: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 1,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderColor: colors.border,
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 12,
  },
  fieldGroup: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.text,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  pinBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  pinBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  lockNowBtn: {
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  lockNowBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  toggleSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  langChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#f8fafc',
  },
  langChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  langChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  langChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  supportOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  supportIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportOptionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  supportOptionSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  aboutLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  aboutValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  bottomActions: {
    marginTop: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
  },
  logoutBtnText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '700',
  },
  successBanner: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  successBannerText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  errorBannerText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
  },
});

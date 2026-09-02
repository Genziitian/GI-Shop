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
import { updateUserProfile, changePin } from '../api/client';

export default function ProfileSettingsModal({ visible, onClose }) {
  const { user, refreshUser, logout, lock } = useAuth();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'security', 'settings', 'support'
  const [copiedId, setCopiedId] = useState(false);

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
      await updateUserProfile(form);
      await refreshUser();
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
    const text = encodeURIComponent(`Hello GI SHOP Support, I need assistance with my account (${user?.shortId || user?.email || user?.phone}).`);
    Linking.openURL(`https://wa.me/917323809242?text=${text}`).catch(() => {
      Alert.alert('Support', 'Please contact support at Pay.laxmikant@gmail.com');
    });
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+917323809242').catch(() => {
      Alert.alert('Support', 'Please contact support at Pay.laxmikant@gmail.com');
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
              <Settings size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Profile & Settings</Text>
              <Text style={styles.headerSubtitle}>Manage account, security & preferences</Text>
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

        {/* Top Navigation Segment Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'profile' && styles.tabItemActive]}
            onPress={() => setActiveTab('profile')}
          >
            <User size={14} color={activeTab === 'profile' ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'security' && styles.tabItemActive]}
            onPress={() => setActiveTab('security')}
          >
            <ShieldCheck size={14} color={activeTab === 'security' ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'security' && styles.tabTextActive]}>Security</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'settings' && styles.tabItemActive]}
            onPress={() => setActiveTab('settings')}
          >
            <Settings size={14} color={activeTab === 'settings' ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'support' && styles.tabItemActive]}
            onPress={() => setActiveTab('support')}
          >
            <HelpCircle size={14} color={activeTab === 'support' ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'support' && styles.tabTextActive]}>Help</Text>
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

          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
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

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>City / Location</Text>
                  <TextInput
                    style={styles.input}
                    value={form.city}
                    onChangeText={(t) => setForm({ ...form, city: t })}
                    placeholder="e.g. Delhi, Mumbai, etc."
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

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
          )}

          {/* TAB 2: SECURITY & PIN */}
          {activeTab === 'security' && (
            <View>
              {pinNotice ? (
                <View style={styles.successBanner}>
                  <CheckCircle size={15} color="#15803d" />
                  <Text style={styles.successBannerText}>{pinNotice}</Text>
                </View>
              ) : null}

              {pinError ? (
                <View style={styles.errorBanner}>
                  <AlertTriangle size={15} color="#b91c1c" />
                  <Text style={styles.errorBannerText}>{pinError}</Text>
                </View>
              ) : null}

              <View style={styles.sectionCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <ShieldCheck size={18} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Change 4-Digit Security PIN</Text>
                </View>
                <Text style={styles.sectionSub}>Your PIN protects your store ledger and prevents unauthorized orders.</Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Current 4-Digit PIN</Text>
                  <TextInput
                    style={styles.input}
                    value={currentPin}
                    onChangeText={setCurrentPin}
                    placeholder="••••"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>New PIN</Text>
                    <TextInput
                      style={styles.input}
                      value={newPin}
                      onChangeText={setNewPin}
                      placeholder="••••"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      maxLength={4}
                      secureTextEntry
                    />
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Confirm PIN</Text>
                    <TextInput
                      style={styles.input}
                      value={confirmPin}
                      onChangeText={setConfirmPin}
                      placeholder="••••"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      maxLength={4}
                      secureTextEntry
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.pinBtn, pinSaving && { opacity: 0.7 }]}
                  disabled={pinSaving}
                  onPress={handleChangePin}
                >
                  {pinSaving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.pinBtnText}>Update PIN</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Quick Lock Action Card */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Instant Security</Text>
                <TouchableOpacity
                  style={styles.lockNowBtn}
                  onPress={() => {
                    onClose();
                    lock();
                  }}
                >
                  <Lock size={16} color="#fff" />
                  <Text style={styles.lockNowBtnText}>Lock Application Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* TAB 3: APP SETTINGS */}
          {activeTab === 'settings' && (
            <View>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Preferences & Notifications</Text>

                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>Order Status Alerts</Text>
                    <Text style={styles.toggleSub}>Get notifications when shopkeeper packs your order</Text>
                  </View>
                  <Switch
                    value={orderNotifications}
                    onValueChange={setOrderNotifications}
                    trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                    thumbColor={orderNotifications ? colors.primary : '#f1f5f9'}
                  />
                </View>

                <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>Digital Bills & Ledger SMS</Text>
                    <Text style={styles.toggleSub}>Receive automated digital bill receipts</Text>
                  </View>
                  <Switch
                    value={smsReceipts}
                    onValueChange={setSmsReceipts}
                    trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                    thumbColor={smsReceipts ? colors.primary : '#f1f5f9'}
                  />
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Language Preference</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  <TouchableOpacity
                    style={[styles.langChip, selectedLanguage === 'en' && styles.langChipActive]}
                    onPress={() => setSelectedLanguage('en')}
                  >
                    <Text style={[styles.langChipText, selectedLanguage === 'en' && styles.langChipTextActive]}>English</Text>
                    {selectedLanguage === 'en' && <Check size={14} color="#fff" />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.langChip, selectedLanguage === 'hi' && styles.langChipActive]}
                    onPress={() => setSelectedLanguage('hi')}
                  >
                    <Text style={[styles.langChipText, selectedLanguage === 'hi' && styles.langChipTextActive]}>हिन्दी (Hindi)</Text>
                    {selectedLanguage === 'hi' && <Check size={14} color="#fff" />}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* TAB 4: HELP & SUPPORT */}
          {activeTab === 'support' && (
            <View>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Customer Support</Text>
                <Text style={styles.sectionSub}>Reach our customer support team for any billing or order inquiries.</Text>

                <TouchableOpacity style={styles.supportOptionBtn} onPress={handleOpenWhatsAppSupport}>
                  <View style={[styles.supportIconCircle, { backgroundColor: '#dcfce7' }]}>
                    <MessageSquare size={18} color="#15803d" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.supportOptionTitle}>Chat on WhatsApp</Text>
                    <Text style={styles.supportOptionSub}>Fast response • Instant resolution</Text>
                  </View>
                  <ChevronRight size={16} color={colors.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.supportOptionBtn} onPress={handleCallSupport}>
                  <View style={[styles.supportIconCircle, { backgroundColor: '#e0f2fe' }]}>
                    <Phone size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.supportOptionTitle}>Call Support Helpline</Text>
                    <Text style={styles.supportOptionSub}>+91 73238 09242 • 9:00 AM - 9:00 PM</Text>
                  </View>
                  <ChevronRight size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>About Application</Text>
                <View style={styles.aboutRow}>
                  <Text style={styles.aboutLabel}>Version</Text>
                  <Text style={styles.aboutValue}>1.0.0 (Build 2026.09)</Text>
                </View>
                <View style={styles.aboutRow}>
                  <Text style={styles.aboutLabel}>Data Encryption</Text>
                  <Text style={styles.aboutValue}>AES-256 Synchronized</Text>
                </View>
                <View style={[styles.aboutRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.aboutLabel}>Server Connectivity</Text>
                  <Text style={[styles.aboutValue, { color: '#16a34a', fontWeight: '700' }]}>🟢 Live Online</Text>
                </View>
              </View>
            </View>
          )}

          {/* Bottom Account Actions */}
          <View style={styles.bottomActions}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
              <LogOut size={16} color="#b91c1c" />
              <Text style={styles.logoutBtnText}>Log Out Account</Text>
            </TouchableOpacity>
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

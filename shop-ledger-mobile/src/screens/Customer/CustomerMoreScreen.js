import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  ShieldCheck,
  Key,
  Lock,
  LogOut,
  ChevronRight,
  Phone,
  MapPin,
  FileSpreadsheet,
  Download,
  Fingerprint,
  Settings,
  Shield,
  Clock,
  BookOpen,
  FileText,
  Trash2,
  X,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import ProfileSettingsModal from '../../components/ProfileSettingsModal';
import { Modal } from 'react-native';

export default function CustomerMoreScreen({ navigation }) {
  const { user, logout, lock } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState('profile');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleConfirmLogout = () => {
    Alert.alert(
      'Logout Confirmation',
      'Are you sure you want to log out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const handleConfirmAccountDeletion = () => {
    Alert.alert(
      '⚠️ Account Deletion Request',
      'Are you sure you want to request permanent account deletion? This action will erase your profile, delivery addresses, and personal history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Deletion',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Deletion Request Received',
              'Your account deletion request has been submitted to system administration. You will be logged out now.',
              [
                {
                  text: 'OK',
                  onPress: () => logout(),
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <Header
        title="GI SHOP"
        subtitle="Account & Settings"
        showLock={true}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Customer Identity Card */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => {
            setProfileModalTab('profile');
            setShowProfileModal(true);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{user?.name || 'Customer'}</Text>
              <View style={styles.editBadge}>
                <Text style={styles.editBadgeText}>Edit Profile</Text>
              </View>
            </View>
            <Text style={styles.profileSub}>
              ID: <Text style={styles.highlightText}>{user?.shortId || 'N/A'}</Text>
            </Text>
          </View>

          <ChevronRight size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* SECTION 1: ACCOUNT & SECURITY SETTINGS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account & Security</Text>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() => {
              setProfileModalTab('security');
              setShowProfileModal(true);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#f0fdf4' }]}>
              <Key size={18} color="#16a34a" />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuText}>Security PIN & Password</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* SECTION 2: LEGAL, PRIVACY & ACCOUNT */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Legal & Account Control</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => Linking.openURL('https://gi-shop.genziitian.in/privacy')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#f0fdf4' }]}>
              <Shield size={18} color="#16a34a" />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuText}>Privacy Policy</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => Linking.openURL('https://gi-shop.genziitian.in/terms')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#eff6ff' }]}>
              <FileText size={18} color="#0284c7" />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuText}>Terms & Conditions</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() => Linking.openURL('https://gi-shop.genziitian.in/delete')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#fef2f2' }]}>
              <Trash2 size={18} color="#dc2626" />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={[styles.menuText, { color: '#dc2626' }]}>Account Deletion Request</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* SECTION 3: SYSTEM ACTIONS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Session & Security</Text>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={handleConfirmLogout}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#fef2f2' }]}>
              <LogOut size={18} color="#b91c1c" />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={[styles.menuText, { color: '#b91c1c' }]}>Switch Account / Log Out</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* App Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>GI SHOP Customer Ledger v1.0.1</Text>
          <Text style={styles.copyrightText}>Smart Billing, Khata & Grocery Discovery</Text>
        </View>
      </ScrollView>

      {/* Profile & Settings Modal */}
      {showProfileModal && (
        <ProfileSettingsModal
          visible={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          initialTab={profileModalTab}
        />
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <LegalModal
          title="Privacy Policy"
          visible={showPrivacyModal}
          onClose={() => setShowPrivacyModal(false)}
          content={`GI SHOP PRIVACY POLICY\n\n1. Information Collection: We collect your name, phone number, city, and delivery address to facilitate local store orders and digital ledger management.\n\n2. Data Security: All stored user credentials and PINs are protected using industry-standard AES-256 encryption.\n\n3. Third-Party Sharing: We do not sell or share your personal data with third-party advertisers.\n\n4. Your Rights: You have the right to inspect, update, or request full deletion of your account and order history at any time from this screen.`}
        />
      )}

      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <LegalModal
          title="Terms & Conditions"
          visible={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          content={`GI SHOP TERMS & CONDITIONS\n\n1. Acceptable Use: GI SHOP is designed for managing store ledgers, grocery discovery, and customer orders with participating local shops.\n\n2. Payment Responsibilities: All credit/khata settlements are directly between customer and shopkeeper. GI SHOP provides digital recording tools.\n\n3. Account Security: You are responsible for safeguarding your 4-digit security PIN and account password.\n\n4. Modifications: GI SHOP reserves the right to update features and terms to enhance service reliability.`}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  editBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  editBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  profileSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  citySub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  highlightText: {
    color: colors.primary,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextBox: {
    flex: 1,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  menuSubtext: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  copyrightText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
});

function LegalModal({ title, visible, onClose, content }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={legalStyles.header}>
          <Text style={legalStyles.headerTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={legalStyles.closeBtn}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ padding: 20 }}>
          <Text style={legalStyles.bodyText}>{content}</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const legalStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  bodyText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 40,
  },
});

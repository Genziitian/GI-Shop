import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
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
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import ProfileSettingsModal from '../../components/ProfileSettingsModal';

export default function CustomerMoreScreen({ navigation }) {
  const { user, logout, lock } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);

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
          onPress={() => setShowProfileModal(true)}
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
              ID: <Text style={styles.highlightText}>{user?.shortId || 'N/A'}</Text> • {user?.phone}
            </Text>
            {user?.city && (
              <Text style={styles.citySub}>
                📍 {user?.city} {user?.address ? `• ${user.address}` : ''}
              </Text>
            )}
          </View>

          <ChevronRight size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* SECTION 1: ACCOUNT & SECURITY SETTINGS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account & Security</Text>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() => setShowProfileModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#f0fdf4' }]}>
              <Key size={18} color="#16a34a" />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuText}>Security PIN & Password</Text>
              <Text style={styles.menuSubtext}>4-Digit Lock PIN, Account Password & Biometrics</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* SECTION 2: QUICK NAVIGATION */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Shortcuts</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('CustomerKhata')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#f0f9ff' }]}>
              <BookOpen size={18} color="#0284c7" />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuText}>My Khata & Store Credits</Text>
              <Text style={styles.menuSubtext}>View dues & statements with local shops</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('CustomerOrders')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#fdf4ff' }]}>
              <Clock size={18} color="#c026d3" />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuText}>All Orders & Digital Receipts</Text>
              <Text style={styles.menuSubtext}>Track order status and download receipts</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* SECTION 3: SYSTEM ACTIONS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Session & Security</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={lock}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#fee2e2' }]}>
              <Lock size={18} color="#dc2626" />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={[styles.menuText, { color: '#dc2626' }]}>Lock Account Screen</Text>
              <Text style={styles.menuSubtext}>Require 4-digit PIN to unlock screen</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

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
              <Text style={styles.menuSubtext}>Safely exit your current customer session</Text>
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

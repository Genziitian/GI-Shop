import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Store, User, ArrowRight, Settings, Lock, Mail, Phone, MapPin } from 'lucide-react-native';
import { colors, shadowStyle, shadowLarge } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import ServerSettingsModal from '../components/ServerSettingsModal';

export default function AuthScreen() {
  const { login, register, serverUrl } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('Shopkeeper'); // 'Shopkeeper' or 'Customer'
  const [loading, setLoading] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [address, setAddress] = useState('');
  const [pin, setPin] = useState('1234');

  const handleQuickLogin = async (demoEmail, demoPassword) => {
    setLoading(true);
    try {
      await login(demoEmail, demoPassword);
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Could not connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(email.trim(), password);
      } else {
        if (!name.trim()) {
          setLoading(false);
          return Alert.alert('Required', 'Please enter your full name.');
        }
        if (!phone.trim()) {
          setLoading(false);
          return Alert.alert('Required', 'Please enter your phone number.');
        }
        if (password !== confirmPassword) {
          setLoading(false);
          return Alert.alert('Error', 'Passwords do not match.');
        }
        if (!pin.trim() || pin.trim().length !== 4 || !/^\d{4}$/.test(pin.trim())) {
          setLoading(false);
          return Alert.alert('Security PIN Required', 'Please enter a 4-digit numeric PIN (e.g. 1234).');
        }
        if (role === 'Shopkeeper' && (!shopName.trim() || !shopAddress.trim())) {
          setLoading(false);
          return Alert.alert('Required', 'Please enter your shop name and address.');
        }

        await register({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          pin: pin.trim(),
          role,
          shopName: shopName.trim(),
          shopAddress: shopAddress.trim(),
          address: address.trim(),
        });

        Alert.alert(
          'Registration Successful',
          'Your account has been created! Please log in with your credentials.',
          [
            {
              text: 'OK',
              onPress: () => {
                setIsLogin(true);
                setPassword('');
                setConfirmPassword('');
              },
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Operation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Server Config */}
          <View style={styles.topBar}>
            <View style={styles.serverStatusTag}>
              <View style={styles.statusDot} />
              <Text style={styles.serverHostText} numberOfLines={1}>
                {serverUrl}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => setShowServerModal(true)}
              activeOpacity={0.7}
            >
              <Settings size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Card Container */}
          <View style={styles.card}>
            {/* Brand Logo & Name */}
            <View style={styles.brandContainer}>
              <View style={styles.logoIconBox}>
                <Store size={30} color={colors.primary} />
              </View>
              <Text style={styles.brandTitle}>GI SHOP</Text>
              <Text style={styles.brandSubtitle}>Smart Billing, Khata, Orders & Grocery Discovery</Text>
            </View>

            {/* 1-Click Quick Demo Login */}
            {isLogin && (
              <View style={styles.demoSection}>
                <Text style={styles.demoSectionHeader}>⚡ 1-Click Quick Demo Login</Text>
                <View style={styles.demoGrid}>
                  <TouchableOpacity
                    style={styles.demoCard}
                    onPress={() => handleQuickLogin('shop@test.com', 'password123')}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <View style={styles.demoCardHeader}>
                      <Store size={16} color={colors.primary} />
                      <Text style={styles.demoRoleShop}>Shopkeeper</Text>
                    </View>
                    <Text style={styles.demoEmail}>shop@test.com</Text>
                    <Text style={styles.demoPass}>password123</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.demoCard}
                    onPress={() => handleQuickLogin('customer@test.com', 'password123')}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <View style={styles.demoCardHeader}>
                      <User size={16} color={colors.success} />
                      <Text style={styles.demoRoleCust}>Customer</Text>
                    </View>
                    <Text style={styles.demoEmail}>customer@test.com</Text>
                    <Text style={styles.demoPass}>password123</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Mode Title */}
            <Text style={styles.formTitle}>
              {isLogin ? 'Sign In with Email' : 'Create an Account'}
            </Text>

            {/* Role Switcher for Registration */}
            {!isLogin && (
              <View style={styles.roleSwitcher}>
                <TouchableOpacity
                  style={[styles.roleBtn, role === 'Shopkeeper' && styles.roleBtnActive]}
                  onPress={() => setRole('Shopkeeper')}
                  activeOpacity={0.7}
                >
                  <Store
                    size={16}
                    color={role === 'Shopkeeper' ? colors.primaryDark : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.roleBtnText,
                      role === 'Shopkeeper' && styles.roleBtnTextActive,
                    ]}
                  >
                    Shopkeeper
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleBtn, role === 'Customer' && styles.roleBtnActive]}
                  onPress={() => setRole('Customer')}
                  activeOpacity={0.7}
                >
                  <User
                    size={16}
                    color={role === 'Customer' ? colors.primaryDark : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.roleBtnText,
                      role === 'Customer' && styles.roleBtnTextActive,
                    ]}
                  >
                    Customer
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Form Inputs */}
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ramesh Gupta"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>10-Digit Mobile Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 9876543210"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {!isLogin && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>4-Digit Security PIN</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 1234"
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    value={pin}
                    onChangeText={setPin}
                  />
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                    🔒 Used to unlock the app and protect your ledger.
                  </Text>
                </View>
              </>
            )}

            {!isLogin && role === 'Shopkeeper' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Shop Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Gupta Kirana & General Store"
                    value={shopName}
                    onChangeText={setShopName}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Shop Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Shop #4, Main Market"
                    value={shopAddress}
                    onChangeText={setShopAddress}
                  />
                </View>
              </>
            )}

            {!isLogin && role === 'Customer' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Home Address (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Flat 402, Green Valley"
                  value={address}
                  onChangeText={setAddress}
                />
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </Text>
                  <ArrowRight size={18} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>

            {/* Toggle Mode */}
            <View style={styles.footerToggle}>
              <Text style={styles.footerToggleText}>
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsLogin(!isLogin);
                }}
              >
                <Text style={styles.footerToggleLink}>
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ServerSettingsModal
        visible={showServerModal}
        onClose={() => setShowServerModal(false)}
      />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  serverStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: '80%',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  serverHostText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  settingsBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadowStyle,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  brandSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  demoSection: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoSectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  demoGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  demoCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  demoRoleShop: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  demoRoleCust: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  demoEmail: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  demoPass: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 14,
  },
  roleSwitcher: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: 6,
  },
  roleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  roleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  roleBtnTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.text,
  },
  submitBtn: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  footerToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  footerToggleText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  footerToggleLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});

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
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Store, User, ArrowRight, Lock, Mail, Phone, MapPin, Eye, EyeOff } from 'lucide-react-native';
import { colors, shadowStyle, shadowLarge } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import CitySelector from '../components/CitySelector';

const GoogleIcon = () => (
  <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: 16, fontWeight: '700' }}>G</Text>
  </View>
);

export default function AuthScreen() {
  const { login, register } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [loginStep, setLoginStep] = useState('IDENTIFIER'); // 'IDENTIFIER' | 'PASSWORD'
  const [role, setRole] = useState('Shopkeeper');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [city, setCity] = useState('Delhi');
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [address, setAddress] = useState('');
  const [pin, setPin] = useState('1234');

  const handleLogin = async () => {
    if (loginStep === 'IDENTIFIER') {
      if (!email.trim()) {
        Alert.alert('Required', 'Please enter your Email ID or Short ID.');
        return;
      }
      setLoginStep('PASSWORD');
      return;
    }

    // PASSWORD step
    if (!password.trim()) {
      Alert.alert('Required', 'Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      Alert.alert('Error', err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter both email and password.');
      return;
    }
    if (!name.trim()) {
      return Alert.alert('Required', 'Please enter your full name.');
    }
    if (!phone.trim()) {
      return Alert.alert('Required', 'Please enter your phone number.');
    }
    if (password !== confirmPassword) {
      return Alert.alert('Error', 'Passwords do not match.');
    }
    if (!pin.trim() || pin.trim().length !== 4 || !/^\d{4}$/.test(pin.trim())) {
      return Alert.alert('Security PIN Required', 'Please enter a 4-digit numeric PIN (e.g. 1234).');
    }
    if (role === 'Shopkeeper' && (!shopName.trim() || !shopAddress.trim())) {
      return Alert.alert('Required', 'Please enter your shop name and address.');
    }

    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        pin: pin.trim(),
        role,
        city,
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
              setLoginStep('IDENTIFIER');
              setPassword('');
              setConfirmPassword('');
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    Alert.alert('Coming Soon', 'Google Sign-In will be available in a future update.');
  };

  // ======= LOGIN VIEW (matching web screenshot) =======
  if (isLogin) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.loginScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* App Icon */}
            <View style={[styles.logoContainer, { marginTop: 20 }]}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logoImage}
              />
            </View>

            {/* Welcome Back! */}
            <View style={styles.welcomeHeader}>
              <Text style={styles.welcomeTitle}>
                Welcome <Text style={styles.welcomeTitleGreen}>Back!</Text>
              </Text>
              <Text style={styles.welcomeSubtitle}>Login to continue to GI SHOP</Text>
            </View>

            {/* Continue with Google */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleSignIn}
              activeOpacity={0.7}
            >
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            {loginStep === 'IDENTIFIER' ? (
              <>
                {/* Divider: or continue with */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Email ID or Short ID */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email ID or Short ID</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email or Short ID"
                      placeholderTextColor="#94a3b8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                    <View style={styles.inputIcon}>
                      <User size={18} color="#94a3b8" />
                    </View>
                  </View>
                </View>

                {/* Next Button */}
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>Next</Text>
                      <ArrowRight size={18} color="#ffffff" />
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Account pill */}
                <View style={styles.accountPill}>
                  <View style={styles.accountPillLeft}>
                    <User size={16} color="#16a34a" />
                    <Text style={styles.accountPillText}>{email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setLoginStep('IDENTIFIER'); }}>
                    <Text style={styles.accountPillChange}>Change</Text>
                  </TouchableOpacity>
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={styles.inputIcon}
                      onPress={() => setShowPassword(!showPassword)}
                      activeOpacity={0.7}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color="#94a3b8" />
                      ) : (
                        <Eye size={18} color="#94a3b8" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Login Button */}
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>Login</Text>
                      <ArrowRight size={18} color="#ffffff" />
                    </>
                  )}
                </TouchableOpacity>

                {/* Back to email */}
                <TouchableOpacity
                  style={styles.backToEmailBtn}
                  onPress={() => { setLoginStep('IDENTIFIER'); setPassword(''); }}
                >
                  <Text style={styles.backToEmailText}>← Back to email</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Don't have an account? Sign Up */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => { setIsLogin(false); setLoginStep('IDENTIFIER'); }}>
                <Text style={styles.toggleLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            {/* Spacer to push footer down */}
            <View style={{ flex: 1, minHeight: 40 }} />

            {/* Footer: Privacy Policy, Terms, Contact */}
            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => Linking.openURL('https://gi-shop.web.app/privacy')}>
                <Text style={styles.footerLinkText}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}>•</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://gi-shop.web.app/terms')}>
                <Text style={styles.footerLinkText}>Terms & Conditions</Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}>•</Text>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:Pay.laxmikant@gmail.com?subject=GI%20SHOP%20Query')}>
                <Text style={[styles.footerLinkText, { fontWeight: '600' }]}>Contact Us</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.footerCopyright}>
              © 2026 GI SHOP • Apni Dukaan, Apna Hisab. All Rights Reserved.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ======= REGISTRATION VIEW =======
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card Container */}
          <View style={[styles.card, { marginTop: 16 }]}>
            {/* Brand Logo & Name */}
            <View style={styles.brandContainer}>
              <View style={styles.logoIconBox}>
                <Store size={30} color="#16a34a" />
              </View>
              <Text style={styles.brandTitle}>GI SHOP</Text>
              <Text style={styles.brandSubtitle}>Smart Billing, Khata, Orders & Grocery Discovery</Text>
            </View>

            {/* Mode Title */}
            <Text style={styles.formTitle}>Create an Account</Text>

            {/* Role Switcher */}
            <View style={styles.roleSwitcher}>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'Shopkeeper' && styles.roleBtnActive]}
                onPress={() => setRole('Shopkeeper')}
                activeOpacity={0.7}
              >
                <Store
                  size={16}
                  color={role === 'Shopkeeper' ? '#1d4ed8' : colors.textMuted}
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
                  color={role === 'Customer' ? '#1d4ed8' : colors.textMuted}
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

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>10-Digit Mobile Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 9812345678"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  style={styles.inputIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#94a3b8" />
                  ) : (
                    <Eye size={18} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                  style={styles.inputIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} color="#94a3b8" />
                  ) : (
                    <Eye size={18} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Security PIN */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>4-Digit Security PIN</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 1234"
                placeholderTextColor="#94a3b8"
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

            {/* City Selector */}
            <CitySelector
              selectedCity={city}
              onSelectCity={setCity}
              label="Select City / Region"
            />

            {/* Shopkeeper fields */}
            {role === 'Shopkeeper' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Shop Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Central Supermarket"
                    placeholderTextColor="#94a3b8"
                    value={shopName}
                    onChangeText={setShopName}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Shop Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Shop #4, Main Market"
                    placeholderTextColor="#94a3b8"
                    value={shopAddress}
                    onChangeText={setShopAddress}
                  />
                </View>
              </>
            )}

            {/* Customer fields */}
            {role === 'Customer' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Home Address (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Flat 402, Green Valley"
                  placeholderTextColor="#94a3b8"
                  value={address}
                  onChangeText={setAddress}
                />
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Create Account</Text>
                  <ArrowRight size={18} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>

            {/* Toggle to Login */}
            <View style={styles.footerToggle}>
              <Text style={styles.footerToggleText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => { setIsLogin(true); setLoginStep('IDENTIFIER'); }}>
                <Text style={styles.footerToggleLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer: Privacy Policy, Terms, Contact */}
          <View style={[styles.footerLinks, { marginTop: 24 }]}>
            <TouchableOpacity onPress={() => Linking.openURL('https://gi-shop.web.app/privacy')}>
              <Text style={styles.footerLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>•</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://gi-shop.web.app/terms')}>
              <Text style={styles.footerLinkText}>Terms & Conditions</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>•</Text>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:Pay.laxmikant@gmail.com?subject=GI%20SHOP%20Query')}>
              <Text style={[styles.footerLinkText, { fontWeight: '600' }]}>Contact Us</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.footerCopyright, { marginBottom: 20 }]}>
            © 2026 GI SHOP • Apni Dukaan, Apna Hisab. All Rights Reserved.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  // ---- Login View Styles (matching web screenshot) ----
  loginScrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 8,
  },
  topBarLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
    resizeMode: 'contain',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  welcomeTitleGreen: {
    color: '#16a34a',
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#64748b',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    marginBottom: 20,
    gap: 12,
  },
  googleIconContainer: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4285F4',
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    marginTop: 12,
  },
  accountPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  accountPillChange: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16a34a',
  },
  backToEmailBtn: {
    alignItems: 'center',
    marginTop: 12,
  },
  backToEmailText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  toggleText: {
    fontSize: 14,
    color: '#64748b',
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16a34a',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  footerLinkText: {
    fontSize: 12.5,
    color: '#94a3b8',
    textDecorationLine: 'underline',
  },
  footerDot: {
    fontSize: 12,
    color: '#94a3b8',
  },
  footerCopyright: {
    textAlign: 'center',
    fontSize: 11.5,
    color: '#cbd5e1',
    marginTop: 4,
  },
  // ---- Registration View Styles ----
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    backgroundColor: '#dcfce7',
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
    color: '#1d4ed8',
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingRight: 42,
    fontSize: 15,
    color: '#0f172a',
  },
  inputIcon: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  submitBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 12,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
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
    color: '#16a34a',
  },
});

import React, { useEffect, useRef, useState } from 'react';
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
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Store, User, ArrowRight, Lock, Mail, Phone, MapPin, Eye, EyeOff, Sparkles, CheckCircle, X } from 'lucide-react-native';
import { colors, shadowStyle, shadowLarge } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import CitySelector from '../components/CitySelector';
import { showErrorAlert, validatePhone } from '../utils/errorHandler';

let GoogleSignin = null;
let statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
};

const getGoogleSigninModule = () => {
  if (GoogleSignin) return { GoogleSignin, statusCodes };
  try {
    const mod = require('@react-native-google-signin/google-signin');
    if (mod && mod.GoogleSignin) {
      GoogleSignin = mod.GoogleSignin;
      statusCodes = mod.statusCodes || statusCodes;
      GoogleSignin.configure({
        webClientId: '548472173128-5eq1e76kbtuc0fe0srki8kdkl6p26vho.apps.googleusercontent.com',
        offlineAccess: false,
      });
      return { GoogleSignin, statusCodes };
    }
  } catch (e) {
    console.warn('[GoogleSignin] Native module not registered in current environment (e.g. Expo Go):', e.message);
  }
  return null;
};

const GoogleIcon = () => (
  <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: 18, fontWeight: '800', color: '#4285F4' }}>G</Text>
  </View>
);

export default function AuthScreen() {
  const { login, loginWithGoogle } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [loginStep, setLoginStep] = useState('IDENTIFIER'); // 'IDENTIFIER' | 'PASSWORD'
  const [role, setRole] = useState(null); // 'Customer' | 'Shopkeeper'
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields for Existing User Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Onboarding State for New Google Users
  const [onboardingUser, setOnboardingUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingPhone, setOnboardingPhone] = useState('');
  const [onboardingCity, setOnboardingCity] = useState('Delhi');
  const [onboardingAddress, setOnboardingAddress] = useState('');
  const [onboardingShopName, setOnboardingShopName] = useState('');
  const [onboardingShopAddress, setOnboardingShopAddress] = useState('');
  const [onboardingPin, setOnboardingPin] = useState('1234');

  const screenAnim = useRef(new Animated.Value(0)).current;
  const roleModalAnim = useRef(new Animated.Value(0)).current;
  const formModalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    screenAnim.setValue(0);
    Animated.timing(screenAnim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isLogin, screenAnim]);

  useEffect(() => {
    if (showRoleModal) {
      roleModalAnim.setValue(0);
      Animated.spring(roleModalAnim, {
        toValue: 1,
        friction: 8,
        tension: 70,
        useNativeDriver: true,
      }).start();
    }
  }, [roleModalAnim, showRoleModal]);

  useEffect(() => {
    if (showOnboardingModal) {
      formModalAnim.setValue(0);
      Animated.spring(formModalAnim, {
        toValue: 1,
        friction: 8,
        tension: 70,
        useNativeDriver: true,
      }).start();
    }
  }, [formModalAnim, showOnboardingModal]);

  const handleLogin = async () => {
    if (loginStep === 'IDENTIFIER') {
      if (!email.trim()) {
        showErrorAlert('Please enter your Email ID or Short ID.', 'Email / Short ID Required');
        return;
      }
      setLoginStep('PASSWORD');
      return;
    }

    // PASSWORD step
    if (!password.trim()) {
      showErrorAlert('Please enter your account password to log in.', 'Password Required');
      return;
    }

    setLoading(true);
    setLoadingMessage('Checking your account...');
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      showErrorAlert(err, 'Login Error');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setLoadingMessage('Opening Google...');
      const gModule = getGoogleSigninModule();
      if (!gModule || !gModule.GoogleSignin) {
        showErrorAlert(
          'Native Google Sign-In is enabled in the standalone APK / Google Play release. In development/Expo Go, please sign in using your Email & Password.',
          'Google Sign-In Unavailable'
        );
        return;
      }

      const { GoogleSignin: gSignin, statusCodes: codes } = gModule;
      await gSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await gSignin.signOut().catch(() => {});
      setLoadingMessage('Choose your Google account...');
      const signInResult = await gSignin.signIn();
      const idToken = signInResult.data?.idToken || signInResult.idToken;

      if (!idToken) {
        throw new Error('Google Sign-In did not return a valid authentication ID token.');
      }

      setLoadingMessage('Verifying with GI SHOP...');
      const res = await loginWithGoogle({
        idToken,
        role: role || 'Customer',
        onboardComplete: false,
      });

      if (res && res.isNewUser) {
        setOnboardingUser({
          idToken,
          googleUser: res.googleUser,
          role: null,
        });
        setRole(null);
        setOnboardingName(res.googleUser?.name || '');
        setShowRoleModal(true);
      }
    } catch (error) {
      const gModule = getGoogleSigninModule();
      const codes = gModule?.statusCodes || statusCodes;
      if (error.code === codes.SIGN_IN_CANCELLED) {
        // User cancelled the sign-in flow - no action needed
      } else if (error.code === codes.IN_PROGRESS) {
        showErrorAlert('Google Sign-In is already in progress. Please wait.', 'Notice');
      } else if (error.code === codes.PLAY_SERVICES_NOT_AVAILABLE) {
        showErrorAlert('Google Play Services is not available or outdated on this device. Please update Google Play Services in the Play Store.', 'Google Play Services');
      } else {
        showErrorAlert(error, 'Google Sign-In Failed');
      }
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleChooseRole = (selectedRole) => {
    setRole(selectedRole);
    setOnboardingUser((prev) => prev ? { ...prev, role: selectedRole } : prev);
    setShowRoleModal(false);
    setShowOnboardingModal(true);
  };

  const handleCompleteOnboarding = async () => {
    const selectedRole = role || onboardingUser?.role;
    const phone = onboardingPhone.trim();
    if (!selectedRole) {
      setShowOnboardingModal(false);
      setShowRoleModal(true);
      return;
    }
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) {
      return showErrorAlert(phoneCheck.error, 'Invalid Mobile Number');
    }
    if (selectedRole === 'Shopkeeper') {
      if (!onboardingShopName.trim()) {
        return showErrorAlert('Please enter your shop or business name.', 'Shop Name Required');
      }
      if (!onboardingShopAddress.trim()) {
        return showErrorAlert('Please enter your shop physical address or location.', 'Shop Address Required');
      }
    }

    setLoading(true);
    setLoadingMessage('Setting up your account...');
    try {
      await loginWithGoogle({
        idToken: onboardingUser.idToken,
        role: selectedRole,
        name: (onboardingName || onboardingUser.googleUser?.name || '').trim(),
        phone: phoneCheck.phone,
        city: selectedRole === 'Shopkeeper' ? (onboardingCity || 'Delhi') : 'Delhi',
        address: onboardingAddress.trim(),
        shopName: onboardingShopName.trim(),
        shopAddress: onboardingShopAddress.trim(),
        pin: '1234',
        onboardComplete: true,
      });
      setShowOnboardingModal(false);
    } catch (err) {
      showErrorAlert(err, 'Account Setup Error');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const screenAnimatedStyle = {
    opacity: screenAnim,
    transform: [
      {
        translateY: screenAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };

  const roleModalAnimatedStyle = {
    opacity: roleModalAnim,
    transform: [
      {
        translateY: roleModalAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [40, 0],
        }),
      },
      {
        scale: roleModalAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.97, 1],
        }),
      },
    ],
  };

  const formModalAnimatedStyle = {
    opacity: formModalAnim,
    transform: [
      {
        translateY: formModalAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [48, 0],
        }),
      },
    ],
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {isLogin ? (
          <Animated.ScrollView
            contentContainerStyle={styles.loginScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={screenAnimatedStyle}
          >
            <View style={[styles.logoContainer, { marginTop: 20 }]}>
              <Image source={require('../../assets/icon.png')} style={styles.logoImage} />
            </View>
            <View style={styles.welcomeHeader}>
              <Text style={styles.welcomeTitle}>Welcome <Text style={styles.welcomeTitleGreen}>Back!</Text></Text>
              <Text style={styles.welcomeSubtitle}>Login to continue to GI SHOP</Text>
            </View>
            <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignIn} activeOpacity={0.7} disabled={loading}>
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            {loginStep === 'IDENTIFIER' ? (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} /><Text style={styles.dividerText}>or continue with</Text><View style={styles.dividerLine} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email ID or Short ID</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput style={styles.input} placeholder="Enter your email or Short ID" placeholderTextColor="#94a3b8" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                  </View>
                </View>
                <TouchableOpacity style={styles.submitBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
                  <Text style={styles.submitBtnText}>Next</Text>
                  <ArrowRight size={18} color="#ffffff" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.accountPill}>
                  <View style={styles.accountPillLeft}>
                    <User size={16} color="#64748b" /><Text style={styles.accountPillText}>{email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setLoginStep('IDENTIFIER'); setPassword(''); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.accountPillChange}>Change</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput style={styles.input} placeholder="Enter your password" placeholderTextColor="#94a3b8" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} autoFocus />
                    <TouchableOpacity style={styles.inputIcon} onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                      {showPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity style={styles.submitBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
                  <Text style={styles.submitBtnText}>Login</Text>
                  <ArrowRight size={18} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.backToEmailBtn} onPress={() => { setLoginStep('IDENTIFIER'); setPassword(''); }}>
                  <Text style={styles.backToEmailText}>← Back to email</Text>
                </TouchableOpacity>
              </>
            )}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => { setIsLogin(false); setLoginStep('IDENTIFIER'); }}>
                <Text style={styles.toggleLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, minHeight: 40 }} />
            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => Linking.openURL('https://gi-shop.web.app/privacy')}><Text style={styles.footerLinkText}>Privacy Policy</Text></TouchableOpacity>
              <Text style={styles.footerDot}>•</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://gi-shop.web.app/terms')}><Text style={styles.footerLinkText}>Terms & Conditions</Text></TouchableOpacity>
              <Text style={styles.footerDot}>•</Text>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:Pay.laxmikant@gmail.com?subject=GI%20SHOP%20Query')}><Text style={[styles.footerLinkText, { fontWeight: '600' }]}>Contact Us</Text></TouchableOpacity>
            </View>
            <Text style={styles.footerCopyright}>© 2026 GI SHOP • Apni Dukaan, Apna Hisab. All Rights Reserved.</Text>
          </Animated.ScrollView>
        ) : (
          <Animated.ScrollView contentContainerStyle={styles.loginScrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={screenAnimatedStyle}>
            <View style={[styles.logoContainer, { marginTop: 20 }]}>
              <Image source={require('../../assets/icon.png')} style={styles.logoImage} />
            </View>
            <View style={styles.welcomeHeader}>
              <Text style={styles.welcomeTitle}>Create <Text style={styles.welcomeTitleGreen}>Account</Text></Text>
              <Text style={styles.welcomeSubtitle}>Sign up & verify securely with Google</Text>
            </View>
            <TouchableOpacity style={[styles.googleBtn, { borderColor: '#16a34a', borderWidth: 2, height: 56 }]} onPress={handleGoogleSignIn} activeOpacity={0.7} disabled={loading}>
              <View style={styles.googleIconContainer}><Text style={styles.googleG}>G</Text></View>
              <Text style={[styles.googleBtnText, { fontSize: 16, fontWeight: '800' }]}>{loading ? 'Verifying with Google...' : 'Sign Up with Google'}</Text>
            </TouchableOpacity>
            <View style={styles.googleInfoBox}>
              <View style={styles.infoRow}><CheckCircle size={16} color="#16a34a" /><Text style={styles.infoText}>Instant 1-tap Google identity verification</Text></View>
              <View style={styles.infoRow}><CheckCircle size={16} color="#16a34a" /><Text style={styles.infoText}>New users choose Customer or Shopkeeper after Google</Text></View>
              <View style={styles.infoRow}><CheckCircle size={16} color="#16a34a" /><Text style={styles.infoText}>Only the needed setup details are asked next</Text></View>
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => { setIsLogin(true); setLoginStep('IDENTIFIER'); }}>
                <Text style={styles.toggleLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, minHeight: 40 }} />
            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => Linking.openURL('https://gi-shop.web.app/privacy')}><Text style={styles.footerLinkText}>Privacy Policy</Text></TouchableOpacity>
              <Text style={styles.footerDot}>•</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://gi-shop.web.app/terms')}><Text style={styles.footerLinkText}>Terms & Conditions</Text></TouchableOpacity>
              <Text style={styles.footerDot}>•</Text>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:Pay.laxmikant@gmail.com?subject=GI%20SHOP%20Query')}><Text style={[styles.footerLinkText, { fontWeight: '600' }]}>Contact Us</Text></TouchableOpacity>
            </View>
            <Text style={styles.footerCopyright}>© 2026 GI SHOP • Apni Dukaan, Apna Hisab. All Rights Reserved.</Text>
          </Animated.ScrollView>
        )}
      </KeyboardAvoidingView>

      <Modal visible={showRoleModal} animationType="fade" transparent={true} onRequestClose={() => setShowRoleModal(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.roleModalContent, roleModalAnimatedStyle]}>
            <View style={styles.modalHandle} />
            <Text style={styles.roleQuestionTitle}>Are you a customer or shopkeeper?</Text>
            <Text style={styles.roleQuestionSubtitle}>{onboardingUser?.googleUser?.email || 'Your Google account is verified'}</Text>
            <View style={styles.roleChoiceGrid}>
              <TouchableOpacity style={styles.roleChoiceCard} onPress={() => handleChooseRole('Customer')} activeOpacity={0.82}>
                <View style={styles.roleChoiceIcon}>
                  <User size={24} color="#16a34a" />
                </View>
                <Text style={styles.roleChoiceTitle}>Customer</Text>
                <Text style={styles.roleChoiceText}>I buy from local shops</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.roleChoiceCard} onPress={() => handleChooseRole('Shopkeeper')} activeOpacity={0.82}>
                <View style={styles.roleChoiceIcon}>
                  <Store size={24} color="#16a34a" />
                </View>
                <Text style={styles.roleChoiceTitle}>Shopkeeper</Text>
                <Text style={styles.roleChoiceText}>I manage my shop</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.modalTextButton} onPress={() => setShowRoleModal(false)}>
              <Text style={styles.modalTextButtonText}>Maybe later</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={showOnboardingModal} animationType="fade" transparent={true} onRequestClose={() => setShowOnboardingModal(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, formModalAnimatedStyle]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{role === 'Shopkeeper' ? 'Configure Your Store' : 'Complete Your Profile'}</Text>
                <Text style={styles.modalSubtitle}>{onboardingUser?.googleUser?.email || 'Verified Google Account'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowOnboardingModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><X size={22} color="#64748b" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <TouchableOpacity style={styles.selectedRolePill} onPress={() => { setShowOnboardingModal(false); setShowRoleModal(true); }} activeOpacity={0.75}>
                {role === 'Shopkeeper' ? <Store size={15} color="#16a34a" /> : <User size={15} color="#16a34a" />}
                <Text style={styles.selectedRoleText}>{role || 'Choose role'}</Text>
                <Text style={styles.selectedRoleChange}>Change</Text>
              </TouchableOpacity>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput style={styles.input} placeholder="e.g. Ramesh Kumar" placeholderTextColor="#94a3b8" value={onboardingName} onChangeText={setOnboardingName} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>10-Digit Mobile Phone *</Text>
                <TextInput style={styles.input} placeholder="e.g. 9812345678" placeholderTextColor="#94a3b8" keyboardType="phone-pad" maxLength={10} value={onboardingPhone} onChangeText={setOnboardingPhone} />
              </View>
              {role === 'Shopkeeper' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Shop Name *</Text>
                    <TextInput style={styles.input} placeholder="e.g. Krishna Super Market" placeholderTextColor="#94a3b8" value={onboardingShopName} onChangeText={setOnboardingShopName} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Shop Address *</Text>
                    <TextInput style={styles.input} placeholder="e.g. Shop #12, Main Market" placeholderTextColor="#94a3b8" value={onboardingShopAddress} onChangeText={setOnboardingShopAddress} />
                  </View>
                  <View style={{ marginBottom: 14 }}>
                    <CitySelector
                      selectedCity={onboardingCity}
                      onSelectCity={setOnboardingCity}
                      label="Choose Shop City *"
                    />
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      Store city is locked after registration. Only SuperAdmin can modify it.
                    </Text>
                  </View>
                </>
              )}
              {role === 'Customer' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Delivery / Home Address (Optional)</Text>
                  <TextInput style={styles.input} placeholder="e.g. Flat 301, Sunrise Tower" placeholderTextColor="#94a3b8" value={onboardingAddress} onChangeText={setOnboardingAddress} />
                </View>
              )}
              <TouchableOpacity style={[styles.submitBtn, { marginTop: 16 }]} onPress={handleCompleteOnboarding} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.submitBtnText}>Complete Setup & Enter App</Text>}
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={loading} transparent={true} animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#16a34a" />
            <Text style={styles.loadingTitle}>{loadingMessage || 'Please wait...'}</Text>
            <Text style={styles.loadingSubtitle}>This usually takes a few seconds.</Text>
          </View>
        </View>
      </Modal>
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
  googleInfoBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
    marginBottom: 16,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginBottom: 18,
  },
  roleModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
  },
  roleQuestionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },
  roleQuestionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  roleChoiceGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  roleChoiceCard: {
    flex: 1,
    minHeight: 136,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  roleChoiceIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  roleChoiceTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  roleChoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  modalTextButton: {
    alignItems: 'center',
    paddingTop: 18,
  },
  modalTextButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748b',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  selectedRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
    marginBottom: 16,
    gap: 8,
  },
  selectedRoleText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    color: '#166534',
  },
  selectedRoleChange: {
    fontSize: 12,
    fontWeight: '900',
    color: '#16a34a',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadowLarge,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 14,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
});

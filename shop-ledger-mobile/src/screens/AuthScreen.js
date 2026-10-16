import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { TouchableOpacity } from '../components/ui/Touchable';
import { StatusBar } from 'expo-status-bar';
import { FadeInView } from '../components/ui/Motion';
import GoogleLogo from '../components/GoogleLogo';
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

const GOOGLE_COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];

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

  const [focusedField, setFocusedField] = useState(null);
  const floatAnim = useRef(new Animated.Value(0)).current;
  const googleBarAnim = useRef(new Animated.Value(0)).current;
  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const screenAnim = useRef(new Animated.Value(0)).current;
  const roleModalAnim = useRef(new Animated.Value(0)).current;
  const formModalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatAnim]);

  useEffect(() => {
    googleBarAnim.setValue(0);
    Animated.timing(googleBarAnim, { toValue: 1, duration: 900, delay: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [isLogin, googleBarAnim]);

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

  const renderHero = (title, accent, subtitle) => (
    <View style={styles.hero}>
      <View style={styles.heroBlobA} />
      <View style={styles.heroBlobB} />
      <View style={styles.heroBlobC} />
      <Animated.View style={[styles.logoContainer, { transform: [{ translateY: floatY }] }]}>
        <Image source={require('../../assets/icon.png')} style={styles.logoImage} />
      </Animated.View>
      <FadeInView delay={120}>
        <Text style={styles.welcomeTitle}>{title} <Text style={styles.welcomeTitleAccent}>{accent}</Text></Text>
      </FadeInView>
      <FadeInView delay={220}>
        <Text style={styles.welcomeSubtitle}>{subtitle}</Text>
      </FadeInView>
    </View>
  );

  const renderGoogleButton = (label) => (
    <FadeInView delay={300}>
      <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignIn} activeOpacity={0.8} disabled={loading}>
        <GoogleLogo size={22} />
        <Text style={styles.googleBtnText}>{label}</Text>
        <View style={styles.googleBar}>
          {GOOGLE_COLORS.map((c, i) => (
            <Animated.View
              key={c}
              style={{
                flex: 1,
                backgroundColor: c,
                transform: [{ scaleX: googleBarAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }],
              }}
            />
          ))}
        </View>
      </TouchableOpacity>
    </FadeInView>
  );

  const renderFooter = () => (
    <>
      <View style={{ flex: 1, minHeight: 28 }} />
      <View style={styles.footerLinks}>
        <TouchableOpacity onPress={() => Linking.openURL('https://gi-shop.web.app/privacy')}><Text style={styles.footerLinkText}>Privacy Policy</Text></TouchableOpacity>
        <Text style={styles.footerDot}>•</Text>
        <TouchableOpacity onPress={() => Linking.openURL('https://gi-shop.web.app/terms')}><Text style={styles.footerLinkText}>Terms & Conditions</Text></TouchableOpacity>
        <Text style={styles.footerDot}>•</Text>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:Pay.laxmikant@gmail.com?subject=GI%20SHOP%20Query')}><Text style={[styles.footerLinkText, { fontWeight: '600' }]}>Contact Us</Text></TouchableOpacity>
      </View>
      <Text style={styles.footerCopyright}>© 2026 GI SHOP • Apni Dukaan, Apna Hisab. All Rights Reserved.</Text>
    </>
  );

  const inputBorder = (key) => (focusedField === key ? styles.inputFocused : null);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {isLogin ? (
          <ScrollView
            contentContainerStyle={styles.loginScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {renderHero('Welcome', 'Back!', 'Login to continue to GI SHOP')}
            <View style={styles.sheet}>
              {renderGoogleButton('Continue with Google')}

              {loginStep === 'IDENTIFIER' ? (
                <>
                  <FadeInView delay={380}>
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} /><Text style={styles.dividerText}>or continue with</Text><View style={styles.dividerLine} />
                    </View>
                  </FadeInView>
                  <FadeInView delay={450}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Email ID or Short ID</Text>
                      <View style={styles.inputWrapper}>
                        <View style={styles.inputLeadIcon}><Mail size={18} color={focusedField === 'email' ? '#1f9d5a' : '#98a2b3'} /></View>
                        <TextInput
                          style={[styles.input, styles.inputWithLead, inputBorder('email')]}
                          placeholder="Enter your email or Short ID"
                          placeholderTextColor="#98a2b3"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          value={email}
                          onChangeText={setEmail}
                          onFocus={() => setFocusedField('email')}
                          onBlur={() => setFocusedField(null)}
                          onSubmitEditing={handleLogin}
                          returnKeyType="next"
                        />
                      </View>
                    </View>
                  </FadeInView>
                  <FadeInView delay={520}>
                    <TouchableOpacity style={styles.submitBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
                      <Text style={styles.submitBtnText}>Next</Text>
                      <ArrowRight size={18} color="#ffffff" />
                    </TouchableOpacity>
                  </FadeInView>
                </>
              ) : (
                <FadeInView key="pw" distance={20}>
                  <View style={styles.accountPill}>
                    <View style={styles.accountPillLeft}>
                      <User size={16} color="#667085" /><Text style={styles.accountPillText}>{email}</Text>
                    </View>
                    <TouchableOpacity onPress={() => { setLoginStep('IDENTIFIER'); setPassword(''); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Text style={styles.accountPillChange}>Change</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.inputWrapper}>
                      <View style={styles.inputLeadIcon}><Lock size={18} color={focusedField === 'password' ? '#1f9d5a' : '#98a2b3'} /></View>
                      <TextInput
                        style={[styles.input, styles.inputWithLead, inputBorder('password')]}
                        placeholder="Enter your password"
                        placeholderTextColor="#98a2b3"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        onSubmitEditing={handleLogin}
                        autoFocus
                      />
                      <TouchableOpacity style={styles.inputIcon} onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                        {showPassword ? <EyeOff size={18} color="#98a2b3" /> : <Eye size={18} color="#98a2b3" />}
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
                </FadeInView>
              )}

              <FadeInView delay={600}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleText}>Don't have an account? </Text>
                  <TouchableOpacity onPress={() => { setIsLogin(false); setLoginStep('IDENTIFIER'); }}>
                    <Text style={styles.toggleLink}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </FadeInView>
              {renderFooter()}
            </View>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.loginScrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
            {renderHero('Create', 'Account', 'Sign up & verify securely with Google')}
            <View style={styles.sheet}>
              {renderGoogleButton(loading ? 'Verifying with Google...' : 'Sign Up with Google')}
              <FadeInView delay={400}>
                <View style={styles.googleInfoBox}>
                  <View style={styles.infoRow}><CheckCircle size={16} color="#1f9d5a" /><Text style={styles.infoText}>Instant 1-tap Google identity verification</Text></View>
                  <View style={styles.infoRow}><CheckCircle size={16} color="#1f9d5a" /><Text style={styles.infoText}>New users choose Customer or Shopkeeper after Google</Text></View>
                  <View style={styles.infoRow}><CheckCircle size={16} color="#1f9d5a" /><Text style={styles.infoText}>Only the needed setup details are asked next</Text></View>
                </View>
              </FadeInView>
              <FadeInView delay={500}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleText}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => { setIsLogin(true); setLoginStep('IDENTIFIER'); }}>
                    <Text style={styles.toggleLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </FadeInView>
              {renderFooter()}
            </View>
          </ScrollView>
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
                  <User size={24} color="#1f9d5a" />
                </View>
                <Text style={styles.roleChoiceTitle}>Customer</Text>
                <Text style={styles.roleChoiceText}>I buy from local shops</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.roleChoiceCard} onPress={() => handleChooseRole('Shopkeeper')} activeOpacity={0.82}>
                <View style={styles.roleChoiceIcon}>
                  <Store size={24} color="#1f9d5a" />
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
              <TouchableOpacity onPress={() => setShowOnboardingModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><X size={22} color="#667085" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <TouchableOpacity style={styles.selectedRolePill} onPress={() => { setShowOnboardingModal(false); setShowRoleModal(true); }} activeOpacity={0.75}>
                {role === 'Shopkeeper' ? <Store size={15} color="#1f9d5a" /> : <User size={15} color="#1f9d5a" />}
                <Text style={styles.selectedRoleText}>{role || 'Choose role'}</Text>
                <Text style={styles.selectedRoleChange}>Change</Text>
              </TouchableOpacity>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput style={styles.input} placeholder="e.g. Ramesh Kumar" placeholderTextColor="#98a2b3" value={onboardingName} onChangeText={setOnboardingName} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>10-Digit Mobile Phone *</Text>
                <TextInput style={styles.input} placeholder="e.g. 9812345678" placeholderTextColor="#98a2b3" keyboardType="phone-pad" maxLength={10} value={onboardingPhone} onChangeText={setOnboardingPhone} />
              </View>
              {role === 'Shopkeeper' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Shop Name *</Text>
                    <TextInput style={styles.input} placeholder="e.g. Krishna Super Market" placeholderTextColor="#98a2b3" value={onboardingShopName} onChangeText={setOnboardingShopName} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Shop Address *</Text>
                    <TextInput style={styles.input} placeholder="e.g. Shop #12, Main Market" placeholderTextColor="#98a2b3" value={onboardingShopAddress} onChangeText={setOnboardingShopAddress} />
                  </View>
                  <View style={{ marginBottom: 14 }}>
                    <CitySelector
                      selectedCity={onboardingCity}
                      onSelectCity={setOnboardingCity}
                      label="Choose Shop City *"
                    />
                    <Text style={{ fontSize: 11, color: '#667085', marginTop: 4 }}>
                      Store city is locked after registration. Only SuperAdmin can modify it.
                    </Text>
                  </View>
                </>
              )}
              {role === 'Customer' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Delivery / Home Address (Optional)</Text>
                  <TextInput style={styles.input} placeholder="e.g. Flat 301, Sunrise Tower" placeholderTextColor="#98a2b3" value={onboardingAddress} onChangeText={setOnboardingAddress} />
                </View>
              )}
              <TouchableOpacity style={[styles.submitBtn, { marginTop: 16 }]} onPress={handleCompleteOnboarding} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.submitBtnText}>Complete Setup & Enter App</Text>}
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={loading} transparent={true} animationType="fade" onRequestClose={() => {}}>
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#1f9d5a" />
            <Text style={styles.loadingTitle}>{loadingMessage || 'Please wait...'}</Text>
            <Text style={styles.loadingSubtitle}>This usually takes a few seconds.</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  // ---- Login View Styles ----
  loginScrollContent: {
    flexGrow: 1,
    backgroundColor: '#0f7a43',
  },
  hero: {
    backgroundColor: '#0f7a43',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 72 : 56,
    paddingBottom: 64,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  heroBlobA: { position: 'absolute', top: -70, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: '#0b5e33', opacity: 0.6 },
  heroBlobB: { position: 'absolute', bottom: -40, left: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: '#1f9d5a', opacity: 0.55 },
  heroBlobC: { position: 'absolute', top: 70, left: 28, width: 18, height: 18, borderRadius: 9, backgroundColor: '#f2a516', opacity: 0.9 },
  sheet: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  logoImage: {
    width: 84,
    height: 84,
    borderRadius: 22,
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  welcomeTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  welcomeTitleAccent: {
    color: '#f2a516',
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e4e7ec',
    backgroundColor: '#ffffff',
    gap: 12,
    overflow: 'hidden',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  googleBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    flexDirection: 'row',
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1d2939',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e4e7ec',
  },
  dividerText: {
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#98a2b3',
    fontWeight: '500',
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f7f8fa',
    borderWidth: 1,
    borderColor: '#e4e7ec',
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
    color: '#1d2939',
  },
  accountPillChange: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f9d5a',
  },
  backToEmailBtn: {
    alignItems: 'center',
    marginTop: 12,
  },
  backToEmailText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667085',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  toggleText: {
    fontSize: 14,
    color: '#667085',
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1f9d5a',
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
    color: '#98a2b3',
    textDecorationLine: 'underline',
  },
  footerDot: {
    fontSize: 12,
    color: '#98a2b3',
  },
  footerCopyright: {
    textAlign: 'center',
    fontSize: 11.5,
    color: '#d0d5dd',
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
    backgroundColor: '#f7f8fa',
    borderWidth: 1,
    borderColor: '#e4e7ec',
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
    backgroundColor: '#dff3e6',
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
    color: '#0b5e33',
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#344054',
    marginBottom: 6,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e7ec',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingRight: 42,
    fontSize: 15,
    color: '#101828',
  },
  inputIcon: {
    position: 'absolute',
    right: 14,
    top: 15,
  },
  inputLeadIcon: {
    position: 'absolute',
    left: 14,
    top: 15,
    zIndex: 1,
  },
  inputWithLead: {
    paddingLeft: 44,
  },
  inputFocused: {
    borderColor: '#1f9d5a',
    borderWidth: 1.5,
    backgroundColor: '#f6fcf8',
  },
  submitBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 12,
    backgroundColor: '#1f9d5a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
    shadowColor: '#1f9d5a',
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
    color: '#1f9d5a',
  },
  googleInfoBox: {
    backgroundColor: '#eef8f1',
    borderWidth: 1,
    borderColor: '#c4e8d1',
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
    color: '#0b5e33',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 24, 40, 0.65)',
    justifyContent: 'flex-end',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d0d5dd',
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
    color: '#101828',
    textAlign: 'center',
    marginBottom: 6,
  },
  roleQuestionSubtitle: {
    fontSize: 13,
    color: '#667085',
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
    borderColor: '#c4e8d1',
    backgroundColor: '#eef8f1',
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
    borderColor: '#dff3e6',
  },
  roleChoiceTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#101828',
    marginBottom: 4,
  },
  roleChoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667085',
    textAlign: 'center',
  },
  modalTextButton: {
    alignItems: 'center',
    paddingTop: 18,
  },
  modalTextButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#667085',
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
    borderBottomColor: '#eff1f4',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#101828',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#667085',
    marginTop: 2,
    fontWeight: '500',
  },
  selectedRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef8f1',
    borderWidth: 1,
    borderColor: '#c4e8d1',
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
    color: '#0b5e33',
  },
  selectedRoleChange: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1f9d5a',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 24, 40, 0.45)',
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
    borderColor: '#e4e7ec',
    ...shadowLarge,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#101828',
    marginTop: 14,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 13,
    color: '#667085',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
});

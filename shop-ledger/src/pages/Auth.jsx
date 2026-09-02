import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, googleLogin, getCities, parseTimings, formatTimings } from '../lib/api';
import { signInWithGoogle } from '../lib/firebase';
import { isPasskeySupported, loginWithPasskey } from '../lib/passkey';
import { 
  Store, User, ArrowRight, ArrowLeft, Lock, Shield, Eye, EyeOff, 
  Globe, Sparkles, AlertCircle, Receipt, BookOpen, Users, RefreshCw, FileText, BarChart3, Mail, X, KeyRound, Fingerprint, Clock
} from 'lucide-react';
import logoImg from '../assets/logo.png';
import authBg from '../assets/auth-bg.jpg';

// Bilingual Translations Dictionary
const translations = {
  en: {
    brandTagline: 'Apni Dukaan, Apna Hisab.',
    headline1: 'Har Dukaan.',
    headline2: 'Har Grahak.',
    headline3: 'Ek Saaf Hisab.',
    subheadline: 'Billing, Digital Khata, Customers aur Dues — sab kuch ek jagah.',
    fastBilling: 'Fast Billing',
    digitalKhata: 'Digital Khata',
    customerMgmt: 'Customer Management',
    duesSettlements: 'Dues & Settlements',
    receipts: 'Receipts',
    reports: 'Reports & Analytics',
    trustTitle: 'Aapka Data, Aapka Vishwas',
    trustSubtitle: 'Secure • Reliable • Private',
    copyright: '© 2026 GI SHOP • All Rights Reserved.',
    welcome: 'Welcome',
    backWord: 'Back!',
    create: 'Create',
    accountWord: 'Account',
    loginSubtitle: 'Login to continue to GI SHOP',
    signupSubtitle: 'Please continue with Google to create your account',
    continueGoogle: 'Continue with Google',
    connectingGoogle: 'Connecting to Google...',
    orContinueWith: 'or continue with',
    emailOrShortId: 'Email ID or Short ID',
    emailPlaceholder: 'Enter your email or Short ID',
    next: 'Next',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot Password?',
    login: 'Login',
    loggingIn: 'Logging in...',
    backToEmail: 'Back to email',
    change: 'Change',
    dontHaveAccount: "Don't have an account?",
    alreadyHaveAccount: "Already have an account?",
    signUp: 'Sign Up',
    logIn: 'Log In',
    privacyPolicy: 'Privacy Policy',
    terms: 'Terms & Conditions',
    contactUs: 'Contact Us',
    footerCopyright: '© 2026 GI SHOP • Apni Dukaan, Apna Hisab. All Rights Reserved.',
    welcomeUser: (name) => `👋 Welcome, ${name || 'Friend'}!`,
    chooseRole: 'Choose Your Role',
    howToUse: 'How do you want to use GI SHOP today?',
    iAmCustomer: 'I am a Customer',
    shopperBadge: 'Shopper',
    customerDesc: 'Discover local grocery shops in your city, compare product prices, place pickup orders, and track your Khata credit ledger.',
    iAmShopkeeper: 'I am a Shopkeeper',
    ownerBadge: 'Store Owner',
    shopkeeperDesc: 'Manage your grocery store, fast barcode POS billing, inventory stock catalog, customer Khata ledger, and accept incoming customer orders.',
    cancelAndBack: 'Cancel and back to login'
  },
  hi: {
    brandTagline: 'अपनी दुकान, अपना हिसाब।',
    headline1: 'हर दुकान।',
    headline2: 'हर ग्राहक।',
    headline3: 'एक साफ़ हिसाब।',
    subheadline: 'बिलिंग, डिजिटल खाता, ग्राहक और उधारी — सब कुछ एक जगह।',
    fastBilling: 'तेज़ बिलिंग',
    digitalKhata: 'डिजिटल खाता',
    customerMgmt: 'ग्राहक प्रबंधन',
    duesSettlements: 'उधारी व सेटलमेंट',
    receipts: 'पक्की रसीदें',
    reports: 'दुकान रिपोर्ट व आंकड़े',
    trustTitle: 'आपका डेटा, आपका विश्वास',
    trustSubtitle: 'सुरक्षित • विश्वसनीय • निजी',
    copyright: '© 2026 जीआई शॉप • सर्वाधिकार सुरक्षित।',
    welcome: 'वापसी पर स्वागत',
    backWord: 'है!',
    create: 'नया खाता',
    accountWord: 'बनाएं',
    loginSubtitle: 'जीआई शॉप में आगे बढ़ने के लिए लॉगिन करें',
    signupSubtitle: 'नया खाता बनाने के लिए कृपया गूगल से आगे बढ़ें',
    continueGoogle: 'गूगल के साथ आगे बढ़ें',
    connectingGoogle: 'गूगल से जुड़ रहे हैं...',
    orContinueWith: 'या इसके माध्यम से लॉगिन करें',
    emailOrShortId: 'ईमेल आईडी या यूज़र आईडी',
    emailPlaceholder: 'अपना ईमेल या यूज़र आईडी दर्ज करें',
    next: 'आगे बढ़ें',
    password: 'पासवर्ड',
    passwordPlaceholder: 'अपना पासवर्ड दर्ज करें',
    rememberMe: 'मुझे याद रखें',
    forgotPassword: 'पासवर्ड भूल गए?',
    login: 'लॉगिन करें',
    loggingIn: 'लॉगिन हो रहा है...',
    backToEmail: 'ईमेल पर वापस जाएं',
    change: 'बदलें',
    dontHaveAccount: 'खाता नहीं है?',
    alreadyHaveAccount: 'पहले से खाता है?',
    signUp: 'साइन अप करें',
    logIn: 'लॉगिन करें',
    privacyPolicy: 'प्राइवेसी पॉलिसी',
    terms: 'नियम व शर्तें',
    contactUs: 'संपर्क करें (Contact Us)',
    footerCopyright: '© 2026 जीआई शॉप • अपनी दुकान, अपना हिसाब। सर्वाधिकार सुरक्षित।',
    welcomeUser: (name) => `👋 नमस्ते, ${name || 'मित्र'}!`,
    chooseRole: 'अपनी भूमिका चुनें',
    howToUse: 'आज आप जीआई शॉप का उपयोग कैसे करना चाहते हैं?',
    iAmCustomer: 'मैं एक ग्राहक हूँ',
    shopperBadge: 'खरीदार',
    customerDesc: 'अपने शहर की किराना दुकानें खोजें, कीमतों की तुलना करें, आर्डर दें और अपना उधारी खाता ट्रैक करें।',
    iAmShopkeeper: 'मैं एक दुकानदार हूँ',
    ownerBadge: 'दुकान मालिक',
    shopkeeperDesc: 'अपनी किराना दुकान, तेज़ बारकोड बिलिंग, स्टॉक इन्वेंटरी और ग्राहकों का खाता व्यवस्थित करें।',
    cancelAndBack: 'रद्द करें और लॉगिन पर जाएं'
  }
};

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loginStep, setLoginStep] = useState('IDENTIFIER'); // 'IDENTIFIER' | 'PASSWORD'
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showContact, setShowContact] = useState(false);
  const [language, setLanguage] = useState('en'); // 'en' | 'hi'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [cities, setCities] = useState(['Delhi', 'Mumbai', 'Bengaluru', 'Jaipur', 'Lucknow', 'Pune']);

  // Active translation dictionary
  const t = translations[language] || translations.en;

  // Credentials Form (Login Only)
  const [loginForm, setLoginForm] = useState({
    identifier: '',
    password: ''
  });

  // Onboarding State for New Google Users
  const [onboarding, setOnboarding] = useState(null);

  const [onboardingForm, setOnboardingForm] = useState({
    name: '',
    phone: '',
    city: 'Delhi',
    address: '',
    shopName: '',
    shopAddress: '',
    timings: '08:00 AM - 10:00 PM',
    pin: '',
    password: '',
    confirmPassword: ''
  });

  const [timeOpen, setTimeOpen] = useState('08:00');
  const [timeClose, setTimeClose] = useState('22:00');

  useEffect(() => {
    const savedIdentifier = localStorage.getItem('gi_remembered_identifier');
    if (savedIdentifier) {
      setLoginForm(prev => ({ ...prev, identifier: savedIdentifier }));
      setRememberMe(true);
    }

    // Check Passkey Biometrics Support
    isPasskeySupported().then(setPasskeyAvailable).catch(() => {});

    // Load available cities
    getCities().then(setCities).catch(() => {});

    // Initialize Google One Tap Prompt only if a valid Google Web OAuth Client ID is configured
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    if (googleClientId && googleClientId.includes('.apps.googleusercontent.com')) {
      const initGoogleOneTap = () => {
        if (typeof window !== 'undefined' && window.google?.accounts?.id) {
          try {
            window.google.accounts.id.initialize({
              client_id: googleClientId,
              callback: async (response) => {
                if (response && response.credential) {
                  setError('');
                  setGoogleLoading(true);
                  try {
                    const res = await googleLogin({ idToken: response.credential, onboardComplete: false });
                    if (res.isNewUser) {
                      setOnboarding({
                        idToken: response.credential,
                        googleUser: res.googleUser,
                        step: 'ROLE_SELECT',
                        role: 'Customer'
                      });
                      setOnboardingForm(prev => ({ ...prev, name: res.googleUser.name || '' }));
                    } else {
                      localStorage.setItem('token', res.token);
                      localStorage.setItem('userRole', res.user.role);
                      localStorage.setItem('userData', JSON.stringify(res.user));
                      if (res.shop) localStorage.setItem('shopData', JSON.stringify(res.shop));

                      if (res.user.role === 'SuperManager') navigate('/admin');
                      else if (res.user.role === 'Shopkeeper') navigate('/shop');
                      else navigate('/customer');
                    }
                  } catch (err) {
                    console.error('[Google One Tap Error]', err);
                  } finally {
                    setGoogleLoading(false);
                  }
                }
              },
              auto_select: false,
              cancel_on_tap_outside: true
            });
            window.google.accounts.id.prompt();
          } catch (e) {
            console.log('[Google One Tap Info]', e);
          }
        }
      };

      const timer = setTimeout(initGoogleOneTap, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // 1. Conditional Passkey Autofill Listener (when focusing Email on Identifier step)
  useEffect(() => {
    if (!isLogin || loginStep !== 'IDENTIFIER') return;

    const abortController = new AbortController();
    if (typeof window !== 'undefined' && window.PublicKeyCredential && PublicKeyCredential.isConditionalMediationAvailable) {
      PublicKeyCredential.isConditionalMediationAvailable().then((available) => {
        if (available && !abortController.signal.aborted) {
          loginWithPasskey(true, abortController.signal)
            .then((res) => {
              if (res && res.token) {
                localStorage.setItem('token', res.token);
                localStorage.setItem('userRole', res.user.role);
                localStorage.setItem('userData', JSON.stringify(res.user));
                if (res.shop) localStorage.setItem('shopData', JSON.stringify(res.shop));

                if (res.user.role === 'SuperManager') navigate('/admin');
                else if (res.user.role === 'Shopkeeper') navigate('/shop');
                else navigate('/customer');
              }
            })
            .catch(() => {});
        }
      }).catch(() => {});
    }

    return () => {
      abortController.abort();
    };
  }, [isLogin, loginStep]);

  // 2. Auto-Prompt Native Biometric / Passkey when entering Password step
  useEffect(() => {
    if (!isLogin || loginStep !== 'PASSWORD') return;

    let active = true;
    const abortController = new AbortController();

    const timer = setTimeout(() => {
      if (!active) return;
      loginWithPasskey(false, abortController.signal)
        .then((res) => {
          if (active && res && res.token) {
            localStorage.setItem('token', res.token);
            localStorage.setItem('userRole', res.user.role);
            localStorage.setItem('userData', JSON.stringify(res.user));
            if (res.shop) localStorage.setItem('shopData', JSON.stringify(res.shop));

            if (res.user.role === 'SuperManager') navigate('/admin');
            else if (res.user.role === 'Shopkeeper') navigate('/shop');
            else navigate('/customer');
          }
        })
        .catch((err) => {
          console.log('[Native Passkey Auto-Prompt skipped/cancelled]', err?.message);
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
      abortController.abort();
    };
  }, [isLogin, loginStep]);

  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  };

  const handleOnboardingChange = (e) => {
    let { name, value } = e.target;
    if (name === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    if (name === 'pin') {
      value = value.replace(/\D/g, '').slice(0, 4);
    }
    setOnboardingForm({ ...onboardingForm, [name]: value });
  };

  // WebAuthn Passkey Login Handler
  const handlePasskeyLogin = async () => {
    setError('');
    setPasskeyLoading(true);
    try {
      const res = await loginWithPasskey();
      localStorage.setItem('token', res.token);
      localStorage.setItem('userRole', res.user.role);
      localStorage.setItem('userData', JSON.stringify(res.user));
      if (res.shop) localStorage.setItem('shopData', JSON.stringify(res.shop));

      if (res.user.role === 'SuperManager') navigate('/admin');
      else if (res.user.role === 'Shopkeeper') navigate('/shop');
      else navigate('/customer');
    } catch (err) {
      console.error('[Passkey Login Error]', err);
      setError(err.message || 'Passkey authentication was not completed.');
    } finally {
      setPasskeyLoading(false);
    }
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const { idToken } = await signInWithGoogle();
      const res = await googleLogin({ idToken, onboardComplete: false });

      if (res.isNewUser) {
        setOnboarding({
          idToken,
          googleUser: res.googleUser,
          step: 'ROLE_SELECT',
          role: 'Customer'
        });
        setOnboardingForm(prev => ({
          ...prev,
          name: res.googleUser.name || ''
        }));
      } else {
        localStorage.setItem('token', res.token);
        localStorage.setItem('userRole', res.user.role);
        localStorage.setItem('userData', JSON.stringify(res.user));
        if (res.shop) localStorage.setItem('shopData', JSON.stringify(res.shop));

        if (res.user.role === 'SuperManager') navigate('/admin');
        else if (res.user.role === 'Shopkeeper') navigate('/shop');
        else navigate('/customer');
      }
    } catch (err) {
      console.error('[Google Sign-In Error]', err);
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Submit Credentials Login
  const handleCredentialsLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login({ email: loginForm.identifier, password: loginForm.password });
      
      // Save or Clear Remembered Identifier based on checkbox
      if (rememberMe && loginForm.identifier) {
        localStorage.setItem('gi_remembered_identifier', loginForm.identifier.trim());
      } else {
        localStorage.removeItem('gi_remembered_identifier');
      }

      localStorage.setItem('token', res.token);
      localStorage.setItem('userRole', res.user.role);
      localStorage.setItem('userData', JSON.stringify(res.user));
      if (res.shop) localStorage.setItem('shopData', JSON.stringify(res.shop));

      if (res.user.role === 'SuperManager') navigate('/admin');
      else if (res.user.role === 'Shopkeeper') navigate('/shop');
      else navigate('/customer');
    } catch (err) {
      setError(err.message || (language === 'hi' ? 'गलत विवरण। उपयोगकर्ता नहीं मिला।' : 'Invalid credentials. User not found.'));
    } finally {
      setLoading(false);
    }
  };

  // Submit Onboarding for New Google User
  const handleCompleteOnboarding = async (e) => {
    e.preventDefault();
    setError('');

    if (!onboardingForm.phone || onboardingForm.phone.trim().length !== 10) {
      return setError(language === 'hi' ? 'कृपया ठीक 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit mobile phone number.');
    }

    if (onboarding.role === 'Shopkeeper') {
      if (!onboardingForm.shopName || !onboardingForm.shopName.trim()) {
        return setError(language === 'hi' ? 'कृपया अपनी दुकान का नाम दर्ज करें।' : 'Please enter your Shop Name.');
      }
      if (!onboardingForm.shopAddress || !onboardingForm.shopAddress.trim()) {
        return setError(language === 'hi' ? 'कृपया अपनी दुकान का पता दर्ज करें।' : 'Please enter your Shop Address.');
      }
    }

    if (onboardingForm.pin && onboardingForm.pin.trim().length !== 4) {
      return setError(language === 'hi' ? 'सुरक्षा पिन ठीक 4 अंकों का होना चाहिए।' : 'If setting a security PIN, it must be exactly 4 digits.');
    }

    if (onboardingForm.password) {
      if (onboardingForm.password.length < 4) {
        return setError(language === 'hi' ? 'पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।' : 'Password should be at least 4 characters long.');
      }
      if (onboardingForm.password !== onboardingForm.confirmPassword) {
        return setError(language === 'hi' ? 'पासवर्ड मेल नहीं खाते हैं।' : 'Passwords do not match.');
      }
    }

    setLoading(true);
    try {
      const res = await googleLogin({
        idToken: onboarding.idToken,
        onboardComplete: true,
        role: onboarding.role,
        name: onboardingForm.name,
        phone: onboardingForm.phone,
        city: 'Delhi',
        address: onboardingForm.address,
        shopName: onboardingForm.shopName,
        shopAddress: onboardingForm.shopAddress,
        timings: onboardingForm.timings,
        pin: onboardingForm.pin || '1234',
        password: onboardingForm.password || null
      });

      localStorage.setItem('token', res.token);
      localStorage.setItem('userRole', res.user.role);
      localStorage.setItem('userData', JSON.stringify(res.user));
      if (res.shop) localStorage.setItem('shopData', JSON.stringify(res.shop));

      if (res.user.role === 'SuperManager') navigate('/admin');
      else if (res.user.role === 'Shopkeeper') navigate('/shop');
      else navigate('/customer');
    } catch (err) {
      console.error('[Onboarding Error]', err);
      setError(err.message || (language === 'hi' ? 'प्रोफ़ाइल सेटअप पूरा करने में विफल' : 'Failed to complete profile setup'));
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // FULL PAGE ONBOARDING VIEW (When a new Google user is completing profile)
  // =========================================================================
  if (onboarding) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Full-Page Top Header */}
        <header style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img 
              src={logoImg} 
              alt="GI SHOP" 
              style={{ width: '38px', height: '38px', borderRadius: '10px', objectFit: 'contain', border: '1px solid #e2e8f0' }} 
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', lineHeight: '1' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#16a34a' }}>GI</span>
                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a' }}>SHOP</span>
              </div>
            </div>
          </div>

          {/* Language Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '0.35rem 0.75rem',
            fontSize: '0.82rem',
            color: '#334155',
            fontWeight: '600'
          }}>
            <Globe size={14} color="#64748b" />
            <select 
              value={language} 
              onChange={e => setLanguage(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', fontWeight: '600', color: '#334155' }}
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
          </div>
        </header>

        {/* Centered Spacious Form Container */}
        <main style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.5rem 1.5rem'
        }}>
          <div className="onboarding-card">
            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                borderRadius: '12px',
                padding: '0.85rem 1.15rem',
                marginBottom: '1.5rem',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <div>{error}</div>
              </div>
            )}

            {/* STEP 1: ROLE SELECTION */}
            {onboarding.step === 'ROLE_SELECT' && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                  <span style={{ display: 'inline-block', background: '#dcfce7', color: '#16a34a', padding: '0.35rem 0.95rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '800', marginBottom: '0.75rem' }}>
                    {t.welcomeUser(onboarding.googleUser.name)}
                  </span>
                  <h2 style={{ fontSize: '2.2rem', fontWeight: '900', color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
                    {t.chooseRole}
                  </h2>
                  <p style={{ fontSize: '0.98rem', color: '#64748b', margin: 0 }}>
                    {t.howToUse}
                  </p>
                </div>

                <div className="role-select-grid">
                  {/* Role Option 1: Customer */}
                  <div
                    onClick={() => setOnboarding({ ...onboarding, role: 'Customer', step: 'DETAILS_FORM' })}
                    style={{
                      border: '2px solid #e2e8f0',
                      borderRadius: '18px',
                      padding: '1.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ width: '54px', height: '54px', borderRadius: '14px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={28} />
                        </div>
                        <span style={{ fontSize: '0.74rem', background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: '800' }}>{t.shopperBadge}</span>
                      </div>
                      <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>{t.iAmCustomer}</h4>
                      <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', lineHeight: '1.45' }}>
                        {t.customerDesc}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#16a34a', fontWeight: '800', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                      Select Customer <ArrowRight size={18} />
                    </div>
                  </div>

                  {/* Role Option 2: Shopkeeper */}
                  <div
                    onClick={() => setOnboarding({ ...onboarding, role: 'Shopkeeper', step: 'DETAILS_FORM' })}
                    style={{
                      border: '2px solid #e2e8f0',
                      borderRadius: '18px',
                      padding: '1.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ width: '54px', height: '54px', borderRadius: '14px', background: '#ede9fe', color: '#6d28d9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Store size={28} />
                        </div>
                        <span style={{ fontSize: '0.74rem', background: '#ede9fe', color: '#6d28d9', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: '800' }}>{t.ownerBadge}</span>
                      </div>
                      <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>{t.iAmShopkeeper}</h4>
                      <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', lineHeight: '1.45' }}>
                        {t.shopkeeperDesc}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#16a34a', fontWeight: '800', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                      Select Shopkeeper <ArrowRight size={18} />
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <button 
                    type="button" 
                    onClick={() => { setOnboarding(null); setError(''); }}
                    style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline', fontWeight: '600' }}
                  >
                    {t.cancelAndBack}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: PROFILE DETAILS FORM (Wide 2-Column Full Page View) */}
            {onboarding.step === 'DETAILS_FORM' && (
              <div>
                {/* Header Navigation */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1.5px solid #f1f5f9' }}>
                  <button 
                    type="button" 
                    onClick={() => setOnboarding({ ...onboarding, step: 'ROLE_SELECT' })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#64748b', fontSize: '0.92rem', fontWeight: '700', padding: 0 }}
                  >
                    <ArrowLeft size={18} /> {language === 'hi' ? 'भूमिका बदलें' : 'Switch Role'}
                  </button>
                  <span style={{ 
                    fontSize: '0.84rem', 
                    fontWeight: '800', 
                    padding: '0.35rem 0.95rem', 
                    borderRadius: '8px',
                    background: onboarding.role === 'Shopkeeper' ? '#ede9fe' : '#dcfce7',
                    color: onboarding.role === 'Shopkeeper' ? '#6d28d9' : '#16a34a'
                  }}>
                    {onboarding.role === 'Shopkeeper' ? (language === 'hi' ? '🏪 दुकानदार सेटअप' : '🏪 Shopkeeper Setup') : (language === 'hi' ? '🛒 ग्राहक सेटअप' : '🛒 Customer Setup')}
                  </span>
                </div>

                <div style={{ marginBottom: '1.75rem' }}>
                  <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.75rem', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.02em' }}>
                    {onboarding.role === 'Shopkeeper' ? (language === 'hi' ? 'दुकान की जानकारी भरें' : 'Configure Your Store') : (language === 'hi' ? 'अपनी प्रोफ़ाइल पूरी करें' : 'Complete Your Profile')}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.92rem', color: '#64748b' }}>
                    {language === 'hi' ? 'खाता सक्रिय करने के लिए कुछ आवश्यक विवरण भरें।' : `A few details are needed to activate your ${onboarding.role.toLowerCase()} account.`}
                  </p>
                </div>

                <form onSubmit={handleCompleteOnboarding}>
                  <div className="onboarding-grid-2col">
                    {/* LEFT COLUMN: IDENTITY & STORE INFORMATION */}
                    <div>
                      {/* Google Account (Read Only) */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                          {language === 'hi' ? 'गूगल खाता' : 'Google Account'} <Lock size={13} color="#94a3b8" />
                        </label>
                        <input 
                          type="text" 
                          className="input" 
                          value={onboarding.googleUser.email} 
                          disabled 
                          style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed', borderColor: '#e2e8f0', fontWeight: '600' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>🔒 {language === 'hi' ? 'आपके सत्यापित गूगल ईमेल से लिंक है।' : 'Synced with your verified Google email.'}</span>
                      </div>

                      {/* Full Name & Phone in 2-col on desktop */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                        <div>
                          <label style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '700', display: 'block', marginBottom: '0.4rem' }}>
                            {language === 'hi' ? 'पूरा नाम *' : 'Full Name *'}
                          </label>
                          <input 
                            name="name" 
                            className="input" 
                            placeholder="e.g. Ramesh Kumar" 
                            value={onboardingForm.name} 
                            onChange={handleOnboardingChange} 
                            required 
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '700', display: 'block', marginBottom: '0.4rem' }}>
                            {language === 'hi' ? 'मोबाइल नंबर *' : 'Mobile Phone *'}
                          </label>
                          <input 
                            name="phone" 
                            type="tel"
                            inputMode="numeric"
                            maxLength="10"
                            className="input" 
                            placeholder="10-digit mobile" 
                            value={onboardingForm.phone} 
                            onChange={handleOnboardingChange} 
                            required 
                          />
                        </div>
                      </div>

                      {/* SHOPKEEPER STORE INFORMATION */}
                      {onboarding.role === 'Shopkeeper' && (
                        <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem' }}>
                          <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#16a34a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Store size={18} /> {language === 'hi' ? 'दुकान का विवरण' : 'Store Information'}
                          </div>

                          <div style={{ marginBottom: '0.85rem' }}>
                            <label style={{ fontSize: '0.84rem', color: '#0f172a', fontWeight: '700', display: 'block', marginBottom: '0.4rem' }}>
                              {language === 'hi' ? 'दुकान का नाम *' : 'Shop Name *'}
                            </label>
                            <input 
                              name="shopName" 
                              className="input" 
                              placeholder="e.g. Krishna Super Market" 
                              value={onboardingForm.shopName} 
                              onChange={handleOnboardingChange} 
                              required 
                              style={{ background: '#ffffff' }}
                            />
                          </div>

                          <div style={{ marginBottom: '0.85rem' }}>
                            <label style={{ fontSize: '0.84rem', color: '#0f172a', fontWeight: '700', display: 'block', marginBottom: '0.4rem' }}>
                              {language === 'hi' ? 'दुकान का पता *' : 'Shop Address *'}
                            </label>
                            <input 
                              name="shopAddress" 
                              className="input" 
                              placeholder="e.g. Shop #12, Main Market" 
                              value={onboardingForm.shopAddress} 
                              onChange={handleOnboardingChange} 
                              required 
                              style={{ background: '#ffffff' }}
                            />
                          </div>

                          <div style={{ marginBottom: '0.85rem' }}>
                            <label style={{ fontSize: '0.84rem', color: '#0f172a', fontWeight: '700', display: 'block', marginBottom: '0.4rem' }}>
                              {language === 'hi' ? 'दुकान का शहर *' : 'Shop City *'}
                            </label>
                            <select 
                              name="city" 
                              className="select" 
                              value={onboardingForm.city || 'Delhi'} 
                              onChange={handleOnboardingChange} 
                              required 
                              style={{ background: '#ffffff', width: '100%', marginBottom: 0 }}
                            >
                              {cities.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: '0.84rem', color: '#0f172a', fontWeight: '700', display: 'block', marginBottom: '0.4rem' }}>
                              {language === 'hi' ? 'दुकान खुलने व बंद होने का समय *' : 'Shop Operating Hours *'}
                            </label>
                            
                            {/* 2 Time Pickers (Opens At & Closes At) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.5rem' }}>
                              <div>
                                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '2px' }}>
                                  {language === 'hi' ? 'खुलने का समय (Open)' : 'Opens At'}
                                </span>
                                <input 
                                  type="time" 
                                  className="input" 
                                  value={timeOpen} 
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTimeOpen(val);
                                    setOnboardingForm(prev => ({ ...prev, timings: formatTimings(val, timeClose) }));
                                  }} 
                                  required 
                                  style={{ background: '#ffffff', margin: 0 }}
                                />
                              </div>

                              <div>
                                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '2px' }}>
                                  {language === 'hi' ? 'बंद होने का समय (Close)' : 'Closes At'}
                                </span>
                                <input 
                                  type="time" 
                                  className="input" 
                                  value={timeClose} 
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTimeClose(val);
                                    setOnboardingForm(prev => ({ ...prev, timings: formatTimings(timeOpen, val) }));
                                  }} 
                                  required 
                                  style={{ background: '#ffffff', margin: 0 }}
                                />
                              </div>
                            </div>

                            {/* Quick Presets */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.4rem' }}>
                              {[
                                { label: '8 AM - 10 PM', open: '08:00', close: '22:00' },
                                { label: '9 AM - 9 PM', open: '09:00', close: '21:00' },
                                { label: '7 AM - 11 PM', open: '07:00', close: '23:00' },
                                { label: '6 AM - 10 PM', open: '06:00', close: '22:00' }
                              ].map(p => (
                                <button
                                  key={p.label}
                                  type="button"
                                  onClick={() => {
                                    setTimeOpen(p.open);
                                    setTimeClose(p.close);
                                    setOnboardingForm(prev => ({ ...prev, timings: formatTimings(p.open, p.close) }));
                                  }}
                                  style={{
                                    fontSize: '0.72rem',
                                    fontWeight: '600',
                                    padding: '0.2rem 0.45rem',
                                    borderRadius: '6px',
                                    border: (timeOpen === p.open && timeClose === p.close) ? '1px solid #16a34a' : '1px solid #cbd5e1',
                                    background: (timeOpen === p.open && timeClose === p.close) ? '#dcfce7' : '#ffffff',
                                    color: (timeOpen === p.open && timeClose === p.close) ? '#15803d' : '#475569',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>

                            <div style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Clock size={13} /> {onboardingForm.timings || formatTimings(timeOpen, timeClose)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* CUSTOMER ADDRESS */}
                      {onboarding.role === 'Customer' && (
                        <div>
                          <label style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '700', display: 'block', marginBottom: '0.4rem' }}>
                            {language === 'hi' ? 'डिलीवरी / घर का पता (वैकल्पिक)' : 'Delivery / Home Address (Optional)'}
                          </label>
                          <input 
                            name="address" 
                            className="input" 
                            placeholder="e.g. Flat 301, Sunrise Tower" 
                            value={onboardingForm.address} 
                            onChange={handleOnboardingChange} 
                          />
                        </div>
                      )}
                    </div>

                    {/* RIGHT COLUMN: SECURITY, PASSWORD & SUBMIT BUTTON */}
                    <div>
                      {/* OPTIONAL SECURITY PIN */}
                      <div style={{ background: '#fdfbf7', border: '1.5px solid #fed7aa', borderRadius: '16px', padding: '1.15rem', marginBottom: '1.25rem' }}>
                        <label style={{ fontSize: '0.85rem', color: '#9a3412', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                          <Shield size={16} /> {language === 'hi' ? '4-अंकों का सुरक्षा पिन (वैकल्पिक)' : '4-Digit Security PIN (Optional)'}
                        </label>
                        <input 
                          name="pin" 
                          type="password" 
                          maxLength="4" 
                          className="input" 
                          placeholder="e.g. 1234 (default: 1234)" 
                          value={onboardingForm.pin} 
                          onChange={handleOnboardingChange} 
                          style={{ background: '#ffffff' }}
                        />
                        <span style={{ fontSize: '0.74rem', color: '#9a3412', marginTop: '4px', display: 'block' }}>
                          {language === 'hi' ? 'ऐप लॉक व सुरक्षा के लिए उपयोग किया जाता है।' : 'Used for quick app lock & cashier mode security. You can set it later in settings.'}
                        </span>
                      </div>

                      {/* OPTIONAL PASSWORD CREATION */}
                      <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '1.15rem', marginBottom: '1.5rem' }}>
                        <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                          <Lock size={16} /> {language === 'hi' ? 'पासवर्ड बनाएं (वैकल्पिक)' : 'Create a Password (Optional)'}
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                          <input 
                            name="password" 
                            type="password" 
                            className="input" 
                            placeholder={language === 'hi' ? 'पासवर्ड बनाएं' : 'Create password'} 
                            value={onboardingForm.password} 
                            onChange={handleOnboardingChange} 
                            style={{ background: '#ffffff' }}
                          />
                          <input 
                            name="confirmPassword" 
                            type="password" 
                            className="input" 
                            placeholder={language === 'hi' ? 'पासवर्ड कन्फर्म' : 'Confirm password'} 
                            value={onboardingForm.confirmPassword} 
                            onChange={handleOnboardingChange} 
                            style={{ background: '#ffffff' }}
                          />
                        </div>
                        <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                          {language === 'hi' ? 'यदि आप भविष्य में सीधे ईमेल/पासवर्ड से लॉगिन करना चाहते हैं।' : "Allows direct email/password login anytime."}
                        </span>
                      </div>

                      {/* Submit Button */}
                      <button 
                        type="submit" 
                        className="btn" 
                        style={{
                          width: '100%',
                          padding: '1.1rem',
                          fontSize: '1.08rem',
                          fontWeight: '900',
                          background: '#16a34a',
                          borderRadius: '14px',
                          boxShadow: '0 6px 20px rgba(22, 163, 74, 0.35)',
                          cursor: 'pointer'
                        }}
                        disabled={loading}
                      >
                        {loading ? (language === 'hi' ? 'खाता तैयार किया जा रहा है...' : 'Setting up account...') : (language === 'hi' ? 'सेटअप पूरा करें और डैशबोर्ड खोलें 🚀' : 'Complete Setup & Enter Dashboard 🚀')}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // DEFAULT SPLIT-SCREEN AUTH VIEW (Login / Sign Up)
  // =========================================================================
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#f4fbf7',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      
      {/* ------------------------------------------------------------- */}
      {/* LEFT SIDE: BRAND ARTWORK & CRISP VECTOR UI (Desktop & Tablet) */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        flex: '1.25',
        position: 'relative',
        backgroundImage: `url(${authBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'right center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3rem 3.5rem',
        overflow: 'hidden'
      }} className="auth-left-banner">
        
        {/* Soft Left Backdrop: High text contrast on left, revealing counter & shop on right */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.88) 42%, rgba(255,255,255,0.45) 70%, rgba(255,255,255,0.08) 100%)',
          pointerEvents: 'none',
          zIndex: 1
        }}></div>

        {/* Top: Official Logo & Brand Header */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.85rem' }}>
            <img 
              src={logoImg} 
              alt="GI SHOP Logo" 
              style={{ 
                width: '50px', 
                height: '50px', 
                borderRadius: '14px', 
                objectFit: 'contain',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.15)',
                border: '1px solid #e2e8f0'
              }} 
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', lineHeight: '1' }}>
                <span style={{ fontSize: '1.85rem', fontWeight: '900', color: '#16a34a', letterSpacing: '-0.02em' }}>GI</span>
                <span style={{ fontSize: '1.85rem', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.02em' }}>SHOP</span>
              </div>
              <div style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: '600', marginTop: '3px' }}>
                {t.brandTagline}
              </div>
              <div style={{ width: '42px', height: '3px', background: '#16a34a', borderRadius: '2px', marginTop: '4px' }}></div>
            </div>
          </div>
        </div>

        {/* Middle: Crisp Headline, Subheading & 6 Vector Cards */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '500px', margin: '1.5rem 0' }}>
          <h1 style={{ 
            fontSize: '2.75rem', 
            fontWeight: '900', 
            color: '#0f172a', 
            lineHeight: '1.12', 
            margin: '0 0 0.85rem 0',
            letterSpacing: '-0.03em'
          }}>
            {t.headline1}<br />
            {t.headline2}<br />
            <span style={{ color: '#16a34a' }}>{t.headline3}</span>
          </h1>

          <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: '1.45', margin: '0 0 2rem 0', fontWeight: '500' }}>
            {t.subheadline}
          </p>

          {/* 6 Feature Badges Grid (Crisp Vector Icons & Glass Cards) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.85rem',
            marginBottom: '2rem'
          }}>
            {[
              { icon: <Receipt size={22} color="#16a34a" />, label: t.fastBilling },
              { icon: <BookOpen size={22} color="#16a34a" />, label: t.digitalKhata },
              { icon: <Users size={22} color="#16a34a" />, label: t.customerMgmt },
              { icon: <RefreshCw size={22} color="#16a34a" />, label: t.duesSettlements },
              { icon: <FileText size={22} color="#16a34a" />, label: t.receipts },
              { icon: <BarChart3 size={22} color="#16a34a" />, label: t.reports }
            ].map((f, i) => (
              <div key={i} style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '1rem 0.75rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                border: '1.5px solid #f1f5f9'
              }}>
                <div style={{ marginBottom: '0.45rem' }}>{f.icon}</div>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#1e293b', lineHeight: '1.25' }}>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Trust Guarantee Badge */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '0.9rem 1.35rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 6px 18px rgba(0,0,0,0.05)',
            border: '1.5px solid #e2e8f0'
          }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Shield size={22} />
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#0f172a' }}>{t.trustTitle}</div>
              <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: '700', marginTop: '1px' }}>
                {t.trustSubtitle}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Badge */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          display: 'inline-block',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          padding: '0.45rem 1rem',
          borderRadius: '20px',
          fontSize: '0.78rem',
          fontWeight: '700',
          color: '#475569',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0',
          alignSelf: 'flex-start'
        }}>
          {t.copyright}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RIGHT SIDE: INTERACTIVE AUTH CARD PANEL                       */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2.5rem',
        background: '#ffffff',
        position: 'relative',
        boxShadow: '-10px 0 40px rgba(0,0,0,0.04)'
      }} className="auth-right-panel">
        
        {/* Language Selector Dropdown (Top Right) */}
        <div style={{ position: 'absolute', top: '1.75rem', right: '2rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '0.35rem 0.75rem',
            fontSize: '0.82rem',
            color: '#334155',
            fontWeight: '600'
          }}>
            <Globe size={14} color="#64748b" />
            <select 
              value={language} 
              onChange={e => setLanguage(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', fontWeight: '600', color: '#334155' }}
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: '440px' }}>
          
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {/* Header Title */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: '900', color: '#0f172a', margin: '0 0 0.4rem 0', letterSpacing: '-0.02em' }}>
              {isLogin ? (
                <>{t.welcome} <span style={{ color: '#16a34a' }}>{t.backWord}</span></>
              ) : (
                <>{t.create} <span style={{ color: '#16a34a' }}>{t.accountWord}</span></>
              )}
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#64748b', margin: 0 }}>
              {isLogin ? t.loginSubtitle : t.signupSubtitle}
            </p>
          </div>

          {/* Continue with Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '0.85rem 1.25rem',
              background: '#ffffff',
              color: '#1e293b',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              fontSize: '0.95rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
              marginBottom: passkeyAvailable && isLogin ? '0.75rem' : '1.25rem',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            {googleLoading ? t.connectingGoogle : t.continueGoogle}
          </button>

          {isLogin ? (
            /* --- 2-STEP LOGIN FORM --- */
            <div>
              {loginStep === 'IDENTIFIER' ? (
                /* STEP 1: EMAIL OR SHORT ID */
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!loginForm.identifier || !loginForm.identifier.trim()) {
                    return setError(language === 'hi' ? 'कृपया अपना ईमेल या यूज़र आईडी दर्ज करें' : 'Please enter your Email or User Short ID');
                  }
                  setError('');
                  setLoginStep('PASSWORD');
                }}>
                  {/* Divider: or continue with */}
                  <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '500' }}>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                    <span style={{ padding: '0 0.85rem' }}>{t.orContinueWith}</span>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                  </div>

                  {/* Email ID or Short ID Input */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ fontSize: '0.82rem', color: '#334155', fontWeight: '700', display: 'block', marginBottom: '0.35rem' }}>
                      {t.emailOrShortId}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        name="identifier" 
                        autoComplete="username webauthn"
                        className="input" 
                        placeholder={t.emailPlaceholder} 
                        value={loginForm.identifier} 
                        onChange={handleLoginChange} 
                        required 
                        autoFocus
                        style={{ paddingRight: '2.5rem', borderRadius: '10px' }}
                      />
                      <div style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                        <User size={18} />
                      </div>
                    </div>
                  </div>

                  {/* Green Next / Continue Button */}
                  <button 
                    type="submit" 
                    className="btn" 
                    style={{
                      width: '100%',
                      padding: '0.9rem',
                      fontSize: '1.05rem',
                      fontWeight: '800',
                      background: '#16a34a',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {t.next} <ArrowRight size={18} />
                  </button>
                </form>
              ) : (
                /* STEP 2: PASSWORD + REMEMBER ME + FORGOT PASSWORD */
                <form onSubmit={handleCredentialsLogin}>
                  {/* Active Account Pill */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.65rem 0.9rem',
                    marginBottom: '1.25rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: '700', color: '#1e293b' }}>
                      <User size={16} color="#16a34a" /> {loginForm.identifier}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { setLoginStep('IDENTIFIER'); setError(''); }}
                      style={{ background: 'none', border: 'none', color: '#16a34a', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                    >
                      {t.change}
                    </button>
                  </div>

                  {/* Password Input */}
                  <div style={{ marginBottom: '1.1rem' }}>
                    <label style={{ fontSize: '0.82rem', color: '#334155', fontWeight: '700', display: 'block', marginBottom: '0.35rem' }}>
                      {t.password}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        name="password" 
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password webauthn"
                        className="input" 
                        placeholder={t.passwordPlaceholder} 
                        value={loginForm.password} 
                        onChange={handleLoginChange} 
                        required 
                        autoFocus
                        style={{ paddingRight: '4.5rem', borderRadius: '10px' }}
                      />
                      <div style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
                        <Lock size={16} />
                        <button 
                              type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '0.82rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: '#475569', fontWeight: '600' }}>
                      <input 
                        type="checkbox" 
                        checked={rememberMe} 
                        onChange={e => setRememberMe(e.target.checked)}
                        style={{ accentColor: '#16a34a', width: '15px', height: '15px' }}
                      />
                      {t.rememberMe}
                    </label>
                    <span 
                      style={{ color: '#16a34a', cursor: 'pointer', fontWeight: '600', textDecoration: 'none' }}
                      onClick={() => alert(language === 'hi' ? 'कृपया अपने खाते तक पहुंचने या पासवर्ड रीसेट करने के लिए गूगल से लॉगिन करें।' : 'Please log in with Google to access or reset your account.')}
                    >
                      {t.forgotPassword}
                    </span>
                  </div>

                  {/* Green Login Button */}
                  <button 
                    type="submit" 
                    className="btn" 
                    style={{
                      width: '100%',
                      padding: '0.9rem',
                      fontSize: '1.05rem',
                      fontWeight: '800',
                      background: '#16a34a',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                      transition: 'all 0.15s ease'
                    }}
                    disabled={loading}
                  >
                    {loading ? t.loggingIn : t.login} <ArrowRight size={18} />
                  </button>

                  {/* Back button */}
                  <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => { setLoginStep('IDENTIFIER'); setError(''); }}
                      style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600' }}
                    >
                      <ArrowLeft size={14} /> {t.backToEmail}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* --- SIGN UP ONBOARDING PROMPT --- */
            <div style={{ textAlign: 'center' }}>
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'left',
                marginBottom: '1.5rem',
                fontSize: '0.86rem',
                color: '#166534'
              }}>
                <div style={{ fontWeight: '800', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={16} /> {language === 'hi' ? '1-क्लिक तेज़ रजिस्ट्रेशन' : '1-Click Fast Registration'}
                </div>
                <div>{language === 'hi' ? 'ऊपर "गूगल के साथ आगे बढ़ें" पर क्लिक करें। अगली स्क्रीन में आप ग्राहक या दुकानदार चुन सकेंगे!' : 'Click "Continue with Google" above. You will be able to choose whether you are a Customer or a Shopkeeper and configure your profile in the next screen!'}</div>
              </div>
            </div>
          )}

          {/* Toggle Login / Signup */}
          <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.92rem', color: '#64748b' }}>
            {isLogin ? t.dontHaveAccount : t.alreadyHaveAccount}{' '}
            <span
              style={{ color: '#16a34a', cursor: 'pointer', fontWeight: '800' }}
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
            >
              {isLogin ? t.signUp : t.logIn}
            </span>
          </p>

          {/* Privacy Policy, Terms & Contact Links */}
          <div style={{ 
            textAlign: 'center', 
            marginTop: '1.75rem', 
            paddingTop: '1rem', 
            borderTop: '1px solid #f1f5f9', 
            fontSize: '0.78rem', 
            color: '#94a3b8',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.65rem'
          }}>
            <span 
              style={{ color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => navigate('/privacy')}
            >
              {t.privacyPolicy}
            </span>
            <span>•</span>
            <span 
              style={{ color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => navigate('/terms')}
            >
              {t.terms}
            </span>
            <span>•</span>
            <span 
              style={{ color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline', fontWeight: '600' }}
              onClick={() => setShowContact(true)}
            >
              {t.contactUs}
            </span>
          </div>

          {/* Copyright Text */}
          <div style={{ textAlign: 'center', marginTop: '0.65rem', fontSize: '0.75rem', color: '#cbd5e1' }}>
            {t.footerCopyright}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CONTACT & SUPPORT POPUP MODAL                                 */}
      {/* ------------------------------------------------------------- */}
      {showContact && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '1.25rem'
          }} 
          onClick={() => setShowContact(false)}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '2rem 1.75rem',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              textAlign: 'center',
              position: 'relative'
            }} 
            onClick={e => e.stopPropagation()}
          >
            {/* Close Icon Button */}
            <button
              type="button"
              onClick={() => setShowContact(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={16} />
            </button>

            {/* Email Icon */}
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: '#dcfce7',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto'
            }}>
              <Mail size={26} />
            </div>

            <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
              {language === 'hi' ? 'सहायता व संपर्क' : 'Contact & Support'}
            </h3>
            
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem', color: '#64748b', lineHeight: '1.45' }}>
              {language === 'hi' ? 'उपयोग या किसी भी प्रश्न के लिए हमें ईमेल करें:' : 'For any queries regarding usage or anything:'}
            </p>

            {/* Clickable Mailto Card */}
            <a 
              href="mailto:Pay.laxmikant@gmail.com?subject=GI%20SHOP%20Query"
              style={{
                display: 'block',
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: '12px',
                padding: '0.9rem 1rem',
                fontWeight: '800',
                fontSize: '1rem',
                color: '#16a34a',
                textDecoration: 'none',
                marginBottom: '1.25rem',
                wordBreak: 'break-all'
              }}
            >
              Pay.laxmikant@gmail.com
            </a>

            <button
              type="button"
              onClick={() => setShowContact(false)}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '10px',
                background: '#16a34a',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '0.95rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
              }}
            >
              {language === 'hi' ? 'बंद करें' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

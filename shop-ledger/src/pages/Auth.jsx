import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, googleLogin, getCities } from '../lib/api';
import { signInWithGoogle } from '../lib/firebase';
import { Store, User, ArrowRight, ArrowLeft, Lock, Shield, CheckCircle, Smartphone, MapPin, Clock, Sparkles } from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [cities, setCities] = useState(['Delhi', 'Mumbai', 'Bengaluru', 'Jaipur', 'Lucknow', 'Pune']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Credentials Form (Login Only)
  const [loginForm, setLoginForm] = useState({
    identifier: '',
    password: ''
  });

  // Onboarding State for New Google Users
  // onboarding: null | { idToken, googleUser: { email, name, uid }, step: 'ROLE_SELECT' | 'DETAILS_FORM', role: 'Customer' | 'Shopkeeper' }
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

  useEffect(() => {
    getCities().then(setCities).catch(() => {});
  }, []);

  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  };

  const handleOnboardingChange = (e) => {
    setOnboardingForm({ ...onboardingForm, [e.target.name]: e.target.value });
  };

  // Google Sign-In Handler (For both Sign-In and Sign-Up)
  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const { idToken } = await signInWithGoogle();
      const res = await googleLogin({ idToken, onboardComplete: false });

      if (res.isNewUser) {
        // New User -> Open Role Selection & Profile Setup Onboarding
        setOnboarding({
          idToken,
          googleUser: res.googleUser,
          step: 'ROLE_SELECT',
          role: 'Customer'
        });
        setOnboardingForm(prev => ({
          ...prev,
          name: res.googleUser.name || '',
          city: cities[0] || 'Delhi'
        }));
      } else {
        // Existing User -> Login directly to dashboard!
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

  // Submit Credentials Login (Email/Phone/ShortID + Password)
  const handleCredentialsLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login({ email: loginForm.identifier, password: loginForm.password });
      localStorage.setItem('token', res.token);
      localStorage.setItem('userRole', res.user.role);
      localStorage.setItem('userData', JSON.stringify(res.user));
      if (res.shop) localStorage.setItem('shopData', JSON.stringify(res.shop));

      if (res.user.role === 'SuperManager') navigate('/admin');
      else if (res.user.role === 'Shopkeeper') navigate('/shop');
      else navigate('/customer');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Onboarding for New Google User
  const handleCompleteOnboarding = async (e) => {
    e.preventDefault();
    setError('');

    // Phone validation
    if (!onboardingForm.phone || onboardingForm.phone.trim().length < 10) {
      return setError('Please enter a valid 10-digit mobile phone number.');
    }

    // Shopkeeper specific validation
    if (onboarding.role === 'Shopkeeper') {
      if (!onboardingForm.shopName || !onboardingForm.shopName.trim()) {
        return setError('Please enter your Shop Name.');
      }
      if (!onboardingForm.shopAddress || !onboardingForm.shopAddress.trim()) {
        return setError('Please enter your Shop Address.');
      }
    }

    // Optional PIN validation
    if (onboardingForm.pin && onboardingForm.pin.trim().length !== 4) {
      return setError('If setting a security PIN, it must be exactly 4 digits.');
    }

    // Optional Password validation
    if (onboardingForm.password) {
      if (onboardingForm.password.length < 4) {
        return setError('Password should be at least 4 characters long.');
      }
      if (onboardingForm.password !== onboardingForm.confirmPassword) {
        return setError('Passwords do not match.');
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
        city: onboardingForm.city,
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
      setError(err.message || 'Failed to complete profile setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: onboarding ? '580px' : '480px', marginTop: '1.75rem', marginBottom: '2.5rem' }}>
      <div className="panel" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.06)', borderRadius: '16px', padding: '2rem' }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <img 
              src={logoImg} 
              alt="GI SHOP Logo" 
              style={{ 
                width: '72px', 
                height: '72px', 
                borderRadius: '16px', 
                objectFit: 'contain',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }} 
            />
          </div>
          <h2 className="title" style={{ margin: '0 0 0.25rem 0', fontSize: '1.4rem' }}>GI SHOP</h2>
          <p className="subtitle" style={{ margin: 0, fontSize: '0.85rem' }}>Smart Billing, Khata, Orders &amp; City Grocery Discovery</p>
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', marginBottom: '1.25rem', textAlign: 'center', background: '#fee2e2', padding: '0.7rem', borderRadius: '8px', fontSize: '0.88rem', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* VIEW 1: NEW GOOGLE USER ONBOARDING (ROLE SELECTION & DETAILS FORM)   */}
        {/* ------------------------------------------------------------------- */}
        {onboarding ? (
          <div>
            {/* STEP 1: ROLE SELECTION */}
            {onboarding.step === 'ROLE_SELECT' && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <span style={{ display: 'inline-block', background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    👋 Welcome, {onboarding.googleUser.name || 'Friend'}!
                  </span>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem', fontWeight: '700' }}>Choose Your Role</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>How do you want to use GI SHOP today?</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  {/* Option 1: Customer */}
                  <div
                    onClick={() => setOnboarding({ ...onboarding, role: 'Customer', step: 'DETAILS_FORM' })}
                    style={{
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = '#f0fdf4'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
                  >
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '1.05rem', fontWeight: '700', color: 'var(--text)' }}>I am a Customer</h4>
                        <span style={{ fontSize: '0.7rem', background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: '600' }}>Shopper</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        Discover local grocery shops in your city, compare product prices, place instant pickup orders, and track your Khata credit ledger.
                      </p>
                    </div>
                    <ArrowRight size={18} color="var(--primary)" style={{ alignSelf: 'center' }} />
                  </div>

                  {/* Option 2: Shopkeeper */}
                  <div
                    onClick={() => setOnboarding({ ...onboarding, role: 'Shopkeeper', step: 'DETAILS_FORM' })}
                    style={{
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#4338ca'; e.currentTarget.style.background = '#f5f3ff'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
                  >
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#ede9fe', color: '#6d28d9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Store size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '1.05rem', fontWeight: '700', color: 'var(--text)' }}>I am a Shopkeeper</h4>
                        <span style={{ fontSize: '0.7rem', background: '#ede9fe', color: '#6d28d9', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: '600' }}>Store Owner</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        Manage your grocery store, fast barcode POS billing, inventory stock catalog, customer Khata ledger, and accept incoming customer orders.
                      </p>
                    </div>
                    <ArrowRight size={18} color="#6d28d9" style={{ alignSelf: 'center' }} />
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    onClick={() => { setOnboarding(null); setError(''); }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: DETAILS ONBOARDING FORM */}
            {onboarding.step === 'DETAILS_FORM' && (
              <form onSubmit={handleCompleteOnboarding}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                  <button 
                    type="button" 
                    onClick={() => setOnboarding({ ...onboarding, step: 'ROLE_SELECT' })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.85rem', padding: 0 }}
                  >
                    <ArrowLeft size={16} /> Switch Role
                  </button>
                  <span style={{ 
                    fontSize: '0.78rem', 
                    fontWeight: '700', 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '6px',
                    background: onboarding.role === 'Shopkeeper' ? '#ede9fe' : '#dcfce7',
                    color: onboarding.role === 'Shopkeeper' ? '#6d28d9' : '#15803d'
                  }}>
                    {onboarding.role === 'Shopkeeper' ? '🏪 Shopkeeper Setup' : '🛒 Customer Setup'}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem', fontWeight: '700' }}>
                  {onboarding.role === 'Shopkeeper' ? 'Setup Your Store Profile' : 'Complete Your Profile'}
                </h3>
                <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  A few details are needed to configure your {onboarding.role.toLowerCase()} dashboard.
                </p>

                {/* Google Email (Read Only) */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    Google Account <Lock size={12} />
                  </label>
                  <input 
                    type="text" 
                    className="input" 
                    value={onboarding.googleUser.email} 
                    disabled 
                    style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed', borderColor: '#e2e8f0' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>🔒 Linked with your Google sign-in.</span>
                </div>

                {/* Full Name */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: '600' }}>Full Name *</label>
                  <input 
                    name="name" 
                    className="input" 
                    placeholder="e.g. Ramesh Kumar" 
                    value={onboardingForm.name} 
                    onChange={handleOnboardingChange} 
                    required 
                  />
                </div>

                {/* Mobile Phone (Required) */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: '600' }}>Mobile Phone Number *</label>
                  <input 
                    name="phone" 
                    type="tel"
                    className="input" 
                    placeholder="10-digit mobile number" 
                    value={onboardingForm.phone} 
                    onChange={handleOnboardingChange} 
                    required 
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Used by shops to connect your bills &amp; Khata orders.</span>
                </div>

                {/* City (Required) */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: '600' }}>City *</label>
                  <select name="city" className="select" value={onboardingForm.city} onChange={handleOnboardingChange} required>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* SHOPKEEPER SPECIFIC FIELDS */}
                {onboarding.role === 'Shopkeeper' && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#4338ca', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Store size={16} /> Store Information
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: '600' }}>Shop Name *</label>
                      <input 
                        name="shopName" 
                        className="input" 
                        placeholder="e.g. Krishna Super Market" 
                        value={onboardingForm.shopName} 
                        onChange={handleOnboardingChange} 
                        required 
                      />
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: '600' }}>Shop Address *</label>
                      <input 
                        name="shopAddress" 
                        className="input" 
                        placeholder="e.g. Shop #12, Main Market" 
                        value={onboardingForm.shopAddress} 
                        onChange={handleOnboardingChange} 
                        required 
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: '600' }}>Shop Timings</label>
                      <input 
                        name="timings" 
                        className="input" 
                        placeholder="e.g. 08:00 AM - 10:00 PM" 
                        value={onboardingForm.timings} 
                        onChange={handleOnboardingChange} 
                      />
                    </div>
                  </div>
                )}

                {/* CUSTOMER SPECIFIC FIELDS */}
                {onboarding.role === 'Customer' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: '600' }}>Delivery / Home Address (Optional)</label>
                    <input 
                      name="address" 
                      className="input" 
                      placeholder="e.g. Flat 301, Sunrise Tower" 
                      value={onboardingForm.address} 
                      onChange={handleOnboardingChange} 
                    />
                  </div>
                )}

                {/* OPTIONAL SECURITY PIN */}
                <div style={{ background: '#fdfbf7', border: '1px solid #fed7aa', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', color: '#9a3412', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Shield size={14} /> 4-Digit Security PIN (Optional)
                  </label>
                  <input 
                    name="pin" 
                    type="password" 
                    maxLength="4" 
                    className="input" 
                    placeholder="e.g. 1234 (default: 1234)" 
                    value={onboardingForm.pin} 
                    onChange={handleOnboardingChange} 
                    style={{ marginTop: '0.35rem' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#9a3412' }}>
                    Used for app unlock &amp; cashier mode security. You can also set or change it later in settings.
                  </span>
                </div>

                {/* OPTIONAL PASSWORD CREATION */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Lock size={14} /> Create a Password (Optional)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.35rem' }}>
                    <input 
                      name="password" 
                      type="password" 
                      className="input" 
                      placeholder="Create password" 
                      value={onboardingForm.password} 
                      onChange={handleOnboardingChange} 
                    />
                    <input 
                      name="confirmPassword" 
                      type="password" 
                      className="input" 
                      placeholder="Confirm password" 
                      value={onboardingForm.confirmPassword} 
                      onChange={handleOnboardingChange} 
                    />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Set a password if you'd like to log in with email/password directly later. You can also set it anytime in settings.
                  </span>
                </div>

                <button 
                  type="submit" 
                  className="btn" 
                  style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', fontWeight: '700', background: onboarding.role === 'Shopkeeper' ? '#4338ca' : 'var(--primary)' }}
                  disabled={loading}
                >
                  {loading ? 'Setting up account...' : 'Complete Setup & Enter Dashboard 🚀'}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* ------------------------------------------------------------------- */
          /* VIEW 2: STANDARD SIGN IN & SIGN UP SCREENS                          */
          /* ------------------------------------------------------------------- */
          <div>
            {isLogin ? (
              /* --- SIGN IN SCREEN --- */
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1rem', textAlign: 'center' }}>
                  Sign In to Your Account
                </h3>

                {/* Google Sign-In Button */}
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
                    padding: '0.75rem 1rem',
                    background: '#ffffff',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    marginBottom: '1.25rem',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
                </button>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0 1.25rem 0', color: '#9ca3af', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
                  <span style={{ padding: '0 0.75rem', fontWeight: 500 }}>or with credentials</span>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
                </div>

                <form onSubmit={handleCredentialsLogin}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                      Email Address or User Short ID
                    </label>
                    <input 
                      name="identifier" 
                      className="input" 
                      placeholder="Enter your email or User Short ID (e.g. CUST-1042)" 
                      value={loginForm.identifier} 
                      onChange={handleLoginChange} 
                      required 
                    />
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Password</label>
                    <input 
                      name="password" 
                      type="password" 
                      className="input" 
                      placeholder="••••••••" 
                      value={loginForm.password} 
                      onChange={handleLoginChange} 
                      required 
                    />
                  </div>

                  <button type="submit" className="btn" style={{ width: '100%', padding: '0.85rem' }} disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'} <ArrowRight size={16} />
                  </button>
                </form>
              </div>
            ) : (
              /* --- SIGN UP SCREEN (GOOGLE-FIRST ONBOARDING) --- */
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                  Create an Account
                </h3>
                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  Please continue with Google to create your GI SHOP account.
                </p>

                {/* Big Clean Google Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.85rem',
                    padding: '0.9rem 1.25rem',
                    background: '#ffffff',
                    color: '#1f2937',
                    border: '1.5px solid #d1d5db',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                    marginBottom: '1.25rem',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
                </button>

                {/* Friendly Explainer Card */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.82rem', color: '#475569', marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: '700', color: '#15803d', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Sparkles size={14} /> Fast &amp; Secure 1-Click Signup
                  </div>
                  <div>In the next step, you can pick whether you are a <strong>Customer</strong> or a <strong>Shopkeeper</strong> and configure your profile.</div>
                </div>
              </div>
            )}

            {/* Privacy & Terms Consent Disclaimer */}
            <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', margin: '1rem 0 0 0', lineHeight: '1.4' }}>
              By continuing, you agree to our{' '}
              <span
                style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', fontWeight: '500' }}
                onClick={() => navigate('/privacy')}
              >
                Privacy Policy
              </span>{' '}
              and{' '}
              <span
                style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', fontWeight: '500' }}
                onClick={() => navigate('/terms')}
              >
                Terms &amp; Conditions
              </span>.
            </p>

            {/* Toggle between Login and Signup */}
            <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span
                style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </span>
            </p>
          </div>
        )}

        {/* Footer Links */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '1.5rem', 
          paddingTop: '1rem', 
          borderTop: '1px solid var(--border)', 
          fontSize: '0.78rem', 
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.65rem'
        }}>
          <span 
            style={{ color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => navigate('/privacy')}
          >
            Privacy Policy
          </span>
          <span>•</span>
          <span 
            style={{ color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => navigate('/terms')}
          >
            Terms &amp; Conditions
          </span>
          <span>•</span>
          <span 
            style={{ color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => navigate('/delete')}
          >
            Account Deletion
          </span>
        </div>
      </div>
    </div>
  );
}

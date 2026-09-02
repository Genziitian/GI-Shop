import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, googleLogin, getCities } from '../lib/api';
import { signInWithGoogle } from '../lib/firebase';
import { 
  Store, User, ArrowRight, ArrowLeft, Lock, Shield, Eye, EyeOff, 
  Globe, FileText, BookOpen, Users, RefreshCw, Receipt, BarChart3, 
  Check, Sparkles, AlertCircle 
} from 'lucide-react';
import logoImg from '../assets/logo.png';
import authBg from '../assets/auth-bg.jpg';

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [language, setLanguage] = useState('en'); // 'en' | 'hi'
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

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const { idToken } = await signInWithGoogle();
      const res = await googleLogin({ idToken, onboardComplete: false });

      if (res.isNewUser) {
        // New User -> Open Role Selection & Profile Setup
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

  // Submit Credentials Login
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
      setError(err.message || 'Invalid credentials. User not found.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Onboarding for New Google User
  const handleCompleteOnboarding = async (e) => {
    e.preventDefault();
    setError('');

    if (!onboardingForm.phone || onboardingForm.phone.trim().length < 10) {
      return setError('Please enter a valid 10-digit mobile phone number.');
    }

    if (onboarding.role === 'Shopkeeper') {
      if (!onboardingForm.shopName || !onboardingForm.shopName.trim()) {
        return setError('Please enter your Shop Name.');
      }
      if (!onboardingForm.shopAddress || !onboardingForm.shopAddress.trim()) {
        return setError('Please enter your Shop Address.');
      }
    }

    if (onboardingForm.pin && onboardingForm.pin.trim().length !== 4) {
      return setError('If setting a security PIN, it must be exactly 4 digits.');
    }

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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#f4fbf7',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      
      {/* ------------------------------------------------------------- */}
      {/* LEFT SIDE: BRAND HERO & ARTWORK BANNER (Desktop & Tablet)      */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        flex: '1.15',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3rem',
        backgroundImage: `url(${authBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        overflow: 'hidden'
      }} className="auth-left-banner">
        
        {/* Soft subtle tint overlay for ultra-crisp text legibility */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.7) 45%, rgba(255,255,255,0.1) 100%)',
          pointerEvents: 'none',
          zIndex: 1
        }}></div>

        {/* Brand Header */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <img 
              src={logoImg} 
              alt="GI SHOP" 
              style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }} 
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '1.65rem', fontWeight: '900', color: '#16a34a', letterSpacing: '-0.02em' }}>GI</span>
                <span style={{ fontSize: '1.65rem', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.02em' }}>SHOP</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500', marginTop: '-2px' }}>
                Apni Dukaan, Apna Hisab.
              </div>
            </div>
          </div>
        </div>

        {/* Main Hero Copy & 6 Feature Badges */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '480px', margin: '2rem 0' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0f172a', lineHeight: '1.15', margin: '0 0 0.85rem 0' }}>
            Har Dukaan.<br />
            Har Grahak.<br />
            <span style={{ color: '#16a34a' }}>Ek Saaf Hisab.</span>
          </h1>

          <p style={{ fontSize: '1rem', color: '#475569', lineHeight: '1.5', margin: '0 0 2rem 0', fontWeight: '500' }}>
            Billing, Digital Khata, Customers aur Dues — sab kuch ek jagah.
          </p>

          {/* 6 Feature Badges Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.85rem',
            marginBottom: '2rem'
          }}>
            {[
              { icon: <Receipt size={22} color="#16a34a" />, label: 'Fast Billing' },
              { icon: <BookOpen size={22} color="#16a34a" />, label: 'Digital Khata' },
              { icon: <Users size={22} color="#16a34a" />, label: 'Customer Management' },
              { icon: <RefreshCw size={22} color="#16a34a" />, label: 'Dues & Settlements' },
              { icon: <FileText size={22} color="#16a34a" />, label: 'Receipts' },
              { icon: <BarChart3 size={22} color="#16a34a" />, label: 'Reports & Analytics' }
            ].map((f, i) => (
              <div key={i} style={{
                background: 'rgba(255, 255, 255, 0.88)',
                backdropFilter: 'blur(10px)',
                borderRadius: '14px',
                padding: '0.9rem 0.65rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                border: '1px solid rgba(255,255,255,0.9)'
              }}>
                <div style={{ marginBottom: '0.4rem' }}>{f.icon}</div>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1e293b', lineHeight: '1.2' }}>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Trust Guarantee Badge */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '0.85rem 1.25rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.85rem',
            boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Shield size={20} />
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#0f172a' }}>Aapka Data, Aapka Vishwas</div>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600', marginTop: '1px' }}>
                Secure • Reliable • Private
              </div>
            </div>
          </div>
        </div>

        {/* Footer info placeholder */}
        <div style={{ position: 'relative', zIndex: 2, fontSize: '0.78rem', color: '#64748b' }}>
          © {new Date().getFullYear()} GI SHOP. All Rights Reserved.
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RIGHT SIDE: INTERACTIVE AUTH & ONBOARDING CARD PANEL         */}
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

          {/* ----------------------------------------------------------- */}
          {/* FLOW A: NEW GOOGLE USER ONBOARDING MODAL/SCREEN             */}
          {/* ----------------------------------------------------------- */}
          {onboarding ? (
            <div>
              {/* STEP 1: ROLE SELECTION */}
              {onboarding.step === 'ROLE_SELECT' && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                    <span style={{ display: 'inline-block', background: '#dcfce7', color: '#16a34a', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700', marginBottom: '0.6rem' }}>
                      👋 Welcome, {onboarding.googleUser.name || 'Friend'}!
                    </span>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0f172a', margin: '0 0 0.35rem 0' }}>
                      Choose Your Role
                    </h2>
                    <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
                      How do you want to use GI SHOP today?
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    
                    {/* Role Option 1: Customer */}
                    <div
                      onClick={() => setOnboarding({ ...onboarding, role: 'Customer', step: 'DETAILS_FORM' })}
                      style={{
                        border: '2px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '1.25rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.background = '#f0fdf4'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; }}
                    >
                      <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={24} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>I am a Customer</h4>
                          <span style={{ fontSize: '0.7rem', background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: '700' }}>Shopper</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: '1.4' }}>
                          Discover local grocery shops in your city, compare product prices, place pickup orders, and track your Khata credit ledger.
                        </p>
                      </div>
                      <ArrowRight size={18} color="#16a34a" style={{ alignSelf: 'center' }} />
                    </div>

                    {/* Role Option 2: Shopkeeper */}
                    <div
                      onClick={() => setOnboarding({ ...onboarding, role: 'Shopkeeper', step: 'DETAILS_FORM' })}
                      style={{
                        border: '2px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '1.25rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.background = '#f0fdf4'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; }}
                    >
                      <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#ede9fe', color: '#6d28d9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Store size={24} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>I am a Shopkeeper</h4>
                          <span style={{ fontSize: '0.7rem', background: '#ede9fe', color: '#6d28d9', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: '700' }}>Store Owner</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: '1.4' }}>
                          Manage your grocery store, fast barcode POS billing, inventory stock catalog, customer Khata ledger, and accept incoming customer orders.
                        </p>
                      </div>
                      <ArrowRight size={18} color="#16a34a" style={{ alignSelf: 'center' }} />
                    </div>

                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <button 
                      type="button" 
                      onClick={() => { setOnboarding(null); setError(''); }}
                      style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Cancel and back to login
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: PROFILE DETAILS FORM */}
              {onboarding.step === 'DETAILS_FORM' && (
                <form onSubmit={handleCompleteOnboarding}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                    <button 
                      type="button" 
                      onClick={() => setOnboarding({ ...onboarding, step: 'ROLE_SELECT' })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.85rem', fontWeight: '600', padding: 0 }}
                    >
                      <ArrowLeft size={16} /> Switch Role
                    </button>
                    <span style={{ 
                      fontSize: '0.78rem', 
                      fontWeight: '800', 
                      padding: '0.25rem 0.65rem', 
                      borderRadius: '6px',
                      background: onboarding.role === 'Shopkeeper' ? '#ede9fe' : '#dcfce7',
                      color: onboarding.role === 'Shopkeeper' ? '#6d28d9' : '#16a34a'
                    }}>
                      {onboarding.role === 'Shopkeeper' ? '🏪 Shopkeeper Setup' : '🛒 Customer Setup'}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
                    {onboarding.role === 'Shopkeeper' ? 'Configure Your Store' : 'Complete Your Profile'}
                  </h3>
                  <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#64748b' }}>
                    A few details are needed to activate your {onboarding.role.toLowerCase()} account.
                  </p>

                  {/* Google Account (Read Only) */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      Google Account <Lock size={12} color="#94a3b8" />
                    </label>
                    <input 
                      type="text" 
                      className="input" 
                      value={onboarding.googleUser.email} 
                      disabled 
                      style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed', borderColor: '#e2e8f0', fontWeight: '500' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>🔒 Synced with your verified Google email.</span>
                  </div>

                  {/* Full Name */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: '700', display: 'block', marginBottom: '0.35rem' }}>Full Name *</label>
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
                    <label style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: '700', display: 'block', marginBottom: '0.35rem' }}>Mobile Phone Number *</label>
                    <input 
                      name="phone" 
                      type="tel"
                      className="input" 
                      placeholder="10-digit mobile phone" 
                      value={onboardingForm.phone} 
                      onChange={handleOnboardingChange} 
                      required 
                    />
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Used for Khata orders and bill notifications.</span>
                  </div>

                  {/* City (Required) */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: '700', display: 'block', marginBottom: '0.35rem' }}>City *</label>
                    <select name="city" className="select" value={onboardingForm.city} onChange={handleOnboardingChange} required>
                      {cities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* SHOPKEEPER SPECIFIC FIELDS */}
                  {onboarding.role === 'Shopkeeper' && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
                      <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#16a34a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Store size={16} /> Store Information
                      </div>

                      <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: '700', display: 'block', marginBottom: '0.35rem' }}>Shop Name *</label>
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
                        <label style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: '700', display: 'block', marginBottom: '0.35rem' }}>Shop Address *</label>
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
                        <label style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: '700', display: 'block', marginBottom: '0.35rem' }}>Shop Timings</label>
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
                      <label style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: '700', display: 'block', marginBottom: '0.35rem' }}>Delivery / Home Address (Optional)</label>
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
                  <div style={{ background: '#fdfbf7', border: '1px solid #fed7aa', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', color: '#9a3412', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
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
                    />
                    <span style={{ fontSize: '0.72rem', color: '#9a3412' }}>
                      Used for quick app lock &amp; cashier mode security. Optional — you can set or change it later in settings.
                    </span>
                  </div>

                  {/* OPTIONAL PASSWORD CREATION */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1.5rem' }}>
                    <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      <Lock size={14} /> Create a Password (Optional)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
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
                      Set a password if you'd like to log in with email/password directly later. Optional — you can set it anytime in settings.
                    </span>
                  </div>

                  <button 
                    type="submit" 
                    className="btn" 
                    style={{
                      width: '100%',
                      padding: '0.95rem',
                      fontSize: '1rem',
                      fontWeight: '800',
                      background: '#16a34a',
                      borderRadius: '10px',
                      boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)'
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Setting up account...' : 'Complete Setup & Enter Dashboard 🚀'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* ----------------------------------------------------------- */
            /* FLOW B: DEFAULT SIGN IN / SIGN UP HERO FORM CARD            */
            /* ----------------------------------------------------------- */
            <div>
              {/* Header Title */}
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: '900', color: '#0f172a', margin: '0 0 0.4rem 0', letterSpacing: '-0.02em' }}>
                  {isLogin ? (
                    <>Welcome <span style={{ color: '#16a34a' }}>Back!</span></>
                  ) : (
                    <>Create <span style={{ color: '#16a34a' }}>Account</span></>
                  )}
                </h2>
                <p style={{ fontSize: '0.92rem', color: '#64748b', margin: 0 }}>
                  {isLogin ? 'Login to continue to GI SHOP' : 'Please continue with Google to create your account'}
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
                  marginBottom: '1.25rem',
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
                {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
              </button>

              {isLogin ? (
                /* --- LOGIN FORM --- */
                <div>
                  {/* Divider: or continue with */}
                  <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '500' }}>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                    <span style={{ padding: '0 0.85rem' }}>or continue with</span>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                  </div>

                  <form onSubmit={handleCredentialsLogin}>
                    {/* Email ID or User ID */}
                    <div style={{ marginBottom: '1.1rem' }}>
                      <label style={{ fontSize: '0.82rem', color: '#334155', fontWeight: '700', display: 'block', marginBottom: '0.35rem' }}>
                        Email ID or Short ID
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          name="identifier" 
                          className="input" 
                          placeholder="Enter your email or Short ID" 
                          value={loginForm.identifier} 
                          onChange={handleLoginChange} 
                          required 
                          style={{ paddingRight: '2.5rem', borderRadius: '10px' }}
                        />
                        <div style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                          <User size={18} />
                        </div>
                      </div>
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: '1.1rem' }}>
                      <label style={{ fontSize: '0.82rem', color: '#334155', fontWeight: '700', display: 'block', marginBottom: '0.35rem' }}>
                        Password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          name="password" 
                          type={showPassword ? 'text' : 'password'}
                          className="input" 
                          placeholder="Enter your password" 
                          value={loginForm.password} 
                          onChange={handleLoginChange} 
                          required 
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
                        Remember me
                      </label>
                      <span 
                        style={{ color: '#16a34a', cursor: 'pointer', fontWeight: '600', textDecoration: 'none' }}
                        onClick={() => alert('Please log in with Google to access or reset your account.')}
                      >
                        Forgot Password?
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
                      {loading ? 'Logging in...' : 'Login'} <ArrowRight size={18} />
                    </button>
                  </form>
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
                      <Sparkles size={16} /> 1-Click Fast Registration
                    </div>
                    <div>Click <strong>"Continue with Google"</strong> above. You'll be able to choose whether you are a <strong>Customer</strong> or a <strong>Shopkeeper</strong> and configure your profile in the next screen!</div>
                  </div>
                </div>
              )}

              {/* Toggle Login / Signup */}
              <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.92rem', color: '#64748b' }}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <span
                  style={{ color: '#16a34a', cursor: 'pointer', fontWeight: '800' }}
                  onClick={() => { setIsLogin(!isLogin); setError(''); }}
                >
                  {isLogin ? 'Sign Up' : 'Log In'}
                </span>
              </p>

              {/* Privacy Policy & Terms Links */}
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
                  Privacy Policy
                </span>
                <span>•</span>
                <span 
                  style={{ color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => navigate('/terms')}
                >
                  Terms &amp; Conditions
                </span>
                <span>•</span>
                <span 
                  style={{ color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => navigate('/delete')}
                >
                  Account Deletion
                </span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

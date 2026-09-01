import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register, getCities } from '../lib/api';
import { Store, User, Shield, ArrowRight, MapPin, Clock } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('Customer');
  const [cities, setCities] = useState(['Delhi', 'Mumbai', 'Bengaluru', 'Jaipur', 'Lucknow', 'Pune']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    city: 'Delhi',
    address: '',
    shopName: '',
    shopAddress: '',
    timings: '08:00 AM - 10:00 PM'
  });

  useEffect(() => {
    getCities().then(setCities).catch(() => {});
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleQuickLogin = async (demoEmail, demoPassword) => {
    setError('');
    setLoading(true);
    try {
      const res = await login({ email: demoEmail, password: demoPassword });
      localStorage.setItem('token', res.token);
      localStorage.setItem('userRole', res.user.role);
      localStorage.setItem('userData', JSON.stringify(res.user));
      if (res.shop) localStorage.setItem('shopData', JSON.stringify(res.shop));

      if (res.user.role === 'SuperManager') navigate('/admin');
      else if (res.user.role === 'Shopkeeper') navigate('/shop');
      else navigate('/customer');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const res = await login({ email: formData.email, password: formData.password });
        localStorage.setItem('token', res.token);
        localStorage.setItem('userRole', res.user.role);
        localStorage.setItem('userData', JSON.stringify(res.user));
        if (res.shop) localStorage.setItem('shopData', JSON.stringify(res.shop));

        if (res.user.role === 'SuperManager') navigate('/admin');
        else if (res.user.role === 'Shopkeeper') navigate('/shop');
        else navigate('/customer');
      } else {
        if (formData.password !== formData.confirmPassword) {
          setLoading(false);
          return setError('Passwords do not match');
        }
        const res = await register({ ...formData, role });
        setIsLogin(true);
        alert(`${res.message || 'Account created successfully!'} Your Short ID is ${res.userShortId}. Please login now.`);
      }
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '520px', marginTop: '2rem', marginBottom: '2.5rem' }}>
      <div className="panel" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', color: 'var(--primary)', marginBottom: '0.75rem' }}>
            <Store size={26} />
          </div>
          <h2 className="title" style={{ margin: '0 0 0.25rem 0' }}>GI SHOP</h2>
          <p className="subtitle" style={{ margin: 0 }}>Smart Billing, Khata, Orders & City Grocery Discovery</p>
        </div>

        {/* Quick Demo Logins */}
        {isLogin && (
          <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              ⚡ 1-Click Demo Logins
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '0.5rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', background: '#fff' }}
                onClick={() => handleQuickLogin('shop@test.com', 'password123')}
                disabled={loading}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '600', color: 'var(--primary)' }}>
                  <Store size={14} /> Shop
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: shp49</div>
              </button>

              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '0.5rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', background: '#fff' }}
                onClick={() => handleQuickLogin('customer@test.com', 'password123')}
                disabled={loading}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '600', color: 'var(--success)' }}>
                  <User size={14} /> Customer
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: ayu32</div>
              </button>

              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '0.5rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', background: '#fff' }}
                onClick={() => handleQuickLogin('admin@test.com', 'password123')}
                disabled={loading}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '600', color: '#7c3aed' }}>
                  <Shield size={14} /> Admin
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: adm01</div>
              </button>
            </div>
          </div>
        )}

        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
          {isLogin ? 'Sign In' : 'Create an Account'}
        </h3>

        {error && (
          <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center', background: '#fee2e2', padding: '0.6rem', borderRadius: '6px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}
        
        {!isLogin && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <button
              type="button"
              className={`btn ${role === 'Customer' ? '' : 'btn-outline'}`}
              style={{ flex: 1, padding: '0.6rem' }}
              onClick={() => setRole('Customer')}
            >
              <User size={16} /> Customer
            </button>
            <button
              type="button"
              className={`btn ${role === 'Shopkeeper' ? '' : 'btn-outline'}`}
              style={{ flex: 1, padding: '0.6rem' }}
              onClick={() => setRole('Shopkeeper')}
            >
              <Store size={16} /> Shopkeeper
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                {role === 'Shopkeeper' ? 'Owner Full Name' : 'Customer Full Name'}
              </label>
              <input name="name" className="input" placeholder="e.g. Ramesh Kumar" value={formData.name} onChange={handleChange} required />
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>
              {isLogin ? 'Email, Phone Number or Short ID' : 'Email Address'}
            </label>
            <input 
              name="email" 
              className="input" 
              placeholder={isLogin ? "e.g. shop@test.com, 9876543210, or ayu32" : "name@example.com"} 
              value={formData.email} 
              onChange={handleChange} 
              required 
            />
          </div>

          {!isLogin && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>Mobile Phone Number</label>
              <input name="phone" className="input" placeholder="10-digit mobile number" value={formData.phone} onChange={handleChange} required />
            </div>
          )}

          {!isLogin && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>City</label>
              <select name="city" className="select" value={formData.city} onChange={handleChange} required>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>Password</label>
            <input name="password" type="password" className="input" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
          </div>

          {!isLogin && (
            <>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>Confirm Password</label>
                <input name="confirmPassword" type="password" className="input" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>4-Digit Security PIN</label>
                <input 
                  name="pin" 
                  type="password" 
                  maxLength="4" 
                  className="input" 
                  placeholder="e.g. 1234" 
                  value={formData.pin || '1234'} 
                  onChange={handleChange} 
                  required 
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>🔒 Used for app unlock & transaction security.</span>
              </div>
            </>
          )}
          
          {!isLogin && role === 'Shopkeeper' && (
            <>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>Shop Name</label>
                <input name="shopName" className="input" placeholder="e.g. Krishna Super Market" value={formData.shopName} onChange={handleChange} required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>Shop Address</label>
                <input name="shopAddress" className="input" placeholder="e.g. Shop #12, Market Complex" value={formData.shopAddress} onChange={handleChange} required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>Shop Timings</label>
                <input name="timings" className="input" placeholder="e.g. 08:00 AM - 10:00 PM" value={formData.timings} onChange={handleChange} required />
              </div>
            </>
          )}

          {!isLogin && role === 'Customer' && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>Delivery / Home Address</label>
              <input name="address" className="input" placeholder="e.g. Flat 301, Sunrise Tower" value={formData.address} onChange={handleChange} />
            </div>
          )}

          <button type="submit" className="btn" style={{ width: '100%', marginTop: '0.5rem', padding: '0.85rem' }} disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Register Account')} <ArrowRight size={16} />
          </button>
        </form>

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
    </div>
  );
}

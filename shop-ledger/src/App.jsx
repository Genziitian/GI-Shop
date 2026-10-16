import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Auth from './pages/Auth';
import Shopkeeper from './pages/Shopkeeper';
import Customer from './pages/Customer';
import SuperManager from './pages/SuperManager';
import DeleteAccount from './pages/DeleteAccount';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import { requestNotificationPermissionAndToken, listenForForegroundMessages } from './lib/firebase';
import { registerNotificationToken } from './lib/api';
import { LanguageProvider } from './lib/i18n';
import { Bell, X } from 'lucide-react';

const getStoredUserRole = () => {
  let role = localStorage.getItem('userRole');
  if (!role && localStorage.getItem('userData')) {
    try {
      const u = JSON.parse(localStorage.getItem('userData'));
      if (u?.role) role = u.role;
    } catch (e) {}
  }
  return role;
};

// Tags <html> with the current role so CSS can apply that role's accent.
const RoleTheme = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const role = getStoredUserRole();
    let theme = '';
    if (pathname.startsWith('/admin')) theme = 'admin';
    else if (pathname.startsWith('/customer') || role === 'Customer') theme = 'customer';
    else if (pathname.startsWith('/shop') || role === 'Shopkeeper') theme = 'shopkeeper';
    if (theme) document.documentElement.dataset.role = theme;
    else delete document.documentElement.dataset.role;
  }, [pathname]);
  return null;
};

const RootRedirect = () => {
  const token = localStorage.getItem('token');
  const userRole = getStoredUserRole();

  if (token && userRole) {
    const lastPath = localStorage.getItem('gi_last_path');
    if (lastPath === '/shop' && (userRole === 'Shopkeeper' || userRole === 'Customer')) {
      return <Navigate to="/shop" replace />;
    }
    if (lastPath === '/admin' && userRole === 'SuperManager') {
      return <Navigate to="/admin" replace />;
    }
    if (lastPath === '/customer' && userRole === 'Customer') {
      return <Navigate to="/customer" replace />;
    }

    if (userRole === 'SuperManager') return <Navigate to="/admin" replace />;
    if (userRole === 'Shopkeeper') return <Navigate to="/shop" replace />;
    if (userRole === 'Customer') return <Navigate to="/customer" replace />;
  }

  return <Auth />;
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = getStoredUserRole();
  if (!token) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(userRole)) return <Navigate to="/" replace />;

  if (typeof window !== 'undefined' && window.location.pathname) {
    const path = window.location.pathname;
    if (['/shop', '/customer', '/admin'].includes(path)) {
      localStorage.setItem('gi_last_path', path);
    }
  }

  return children;
};

function App() {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Register Push Notifications
      requestNotificationPermissionAndToken().then((fcmToken) => {
        if (fcmToken) {
          registerNotificationToken(fcmToken, 'web').catch((err) => {
            console.warn('[FCM] Token sync error:', err);
          });
        }
      });
    }

    // Attach foreground push listener
    listenForForegroundMessages((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'Notification';
      const body = payload.notification?.body || payload.data?.body || 'New update available';
      setNotification({ title, body, time: new Date() });

      // Auto dismiss after 7 seconds
      setTimeout(() => {
        setNotification(null);
      }, 7000);
    });
  }, []);

  return (
    <LanguageProvider>
      <BrowserRouter>
      <RoleTheme />
      {/* Floating Push Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 9999,
          background: '#1d2939',
          color: '#ffffff',
          padding: '0.85rem 1.15rem',
          borderRadius: '10px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          maxWidth: '380px',
          animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{
            background: '#1f9d5a',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Bell size={18} color="#ffffff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: '600', fontSize: '0.92rem', marginBottom: '0.15rem' }}>{notification.title}</div>
            <div style={{ fontSize: '0.82rem', color: '#d0d5dd', lineHeight: '1.3' }}>{notification.body}</div>
          </div>
          <button 
            onClick={() => setNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#98a2b3',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<RootRedirect />} />
        <Route 
          path="/shop" 
          element={
            <ProtectedRoute allowedRoles={['Shopkeeper', 'Customer']}>
              <Shopkeeper />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/customer" 
          element={
            <ProtectedRoute allowedRoles={['Customer']}>
              <Customer />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['SuperManager']}>
              <SuperManager />
            </ProtectedRoute>
          } 
        />
        <Route path="/superadmin" element={<Navigate to="/admin" replace />} />
        <Route path="/super-manager" element={<Navigate to="/admin" replace />} />
        <Route path="/delete" element={<DeleteAccount />} />
        <Route path="/delete-account" element={<DeleteAccount />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/terms-and-conditions" element={<TermsConditions />} />
        <Route path="/terms-of-service" element={<TermsConditions />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  </LanguageProvider>
  );
}

export default App;

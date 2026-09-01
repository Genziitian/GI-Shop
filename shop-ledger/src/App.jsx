import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Shopkeeper from './pages/Shopkeeper';
import Customer from './pages/Customer';
import SuperManager from './pages/SuperManager';
import { requestNotificationPermissionAndToken, listenForForegroundMessages } from './lib/firebase';
import { registerNotificationToken } from './lib/api';
import { Bell, X } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  if (!token) return <Navigate to="/" />;
  if (allowedRoles && !allowedRoles.includes(userRole)) return <Navigate to="/" />;
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
    <BrowserRouter>
      {/* Floating Push Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 9999,
          background: '#1e293b',
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
            background: '#3b82f6',
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
            <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.3' }}>{notification.body}</div>
          </div>
          <button 
            onClick={() => setNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
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
        <Route path="/" element={<Auth />} />
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
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

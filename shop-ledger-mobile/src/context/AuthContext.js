import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { AppState } from 'react-native';
import {
  getToken,
  getUser,
  login as apiLogin,
  register as apiRegister,
  googleLogin as apiGoogleLogin,
  clearSession,
  initBaseUrl,
  getBaseUrl,
  setCustomBaseUrl,
  resetBaseUrl,
  verifyPin as apiVerifyPin,
  changePin as apiChangePin,
} from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [serverUrl, setServerUrl] = useState('');

  const backgroundedTimeRef = useRef(null);

  const checkAuth = async () => {
    try {
      const url = await initBaseUrl();
      setServerUrl(url);

      const savedToken = await getToken();
      const savedUser = await getUser();

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(savedUser);
      }
    } catch (e) {
      console.error('Error restoring auth state:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // 1-Minute Background Auto-Lock Listener
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        backgroundedTimeRef.current = Date.now();
      } else if (nextAppState === 'active') {
        if (backgroundedTimeRef.current && user && token) {
          const elapsed = Date.now() - backgroundedTimeRef.current;
          // Auto-lock feature disabled from UI per user request
          // if (elapsed >= 60000) {
          //   setIsLocked(true);
          // }
        }
        backgroundedTimeRef.current = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [user, token]);

  const loginUser = async (email, password) => {
    const res = await apiLogin({ email, password });
    setToken(res.token);
    const userData = { ...res.user, shop: res.shop };
    setUser(userData);
    setIsLocked(false);
    return userData;
  };

  const registerUser = async (formData) => {
    return await apiRegister(formData);
  };

  const logoutUser = async () => {
    await clearSession();
    setToken(null);
    setUser(null);
    setIsLocked(false);
  };

  const lockApp = () => {
    setIsLocked(true);
  };

  const unlockApp = async (enteredPin) => {
    const res = await apiVerifyPin(enteredPin);
    if (res.valid) {
      setIsLocked(false);
      return true;
    }
    throw new Error('Incorrect 4-digit PIN');
  };

  const changeUserPin = async (currentPin, newPin) => {
    return await apiChangePin(currentPin, newPin);
  };

  const updateServerUrl = async (url) => {
    await setCustomBaseUrl(url);
    setServerUrl(getBaseUrl());
  };

  const resetServerUrl = async () => {
    await resetBaseUrl();
    setServerUrl(getBaseUrl());
  };

  const loginWithGoogle = async (googleAuthData) => {
    const res = await apiGoogleLogin(googleAuthData);
    if (res.token) {
      setToken(res.token);
      const userData = { ...res.user, shop: res.shop };
      setUser(userData);
      setIsLocked(false);
    }
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isLocked,
        lock: lockApp,
        unlock: unlockApp,
        changePin: changeUserPin,
        serverUrl,
        updateServerUrl,
        resetServerUrl,
        login: loginUser,
        register: registerUser,
        loginWithGoogle,
        logout: logoutUser,
        isShopkeeper: user?.role === 'Shopkeeper',
        isCustomer: user?.role === 'Customer',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

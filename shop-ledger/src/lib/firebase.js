import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

export const firebaseConfig = {
  apiKey: "AIzaSyCKTZ6KBVkumoiOPbBRoz1EmoIEmGsCtgk",
  authDomain: "my-apps-6756a.firebaseapp.com",
  projectId: "my-apps-6756a",
  storageBucket: "my-apps-6756a.firebasestorage.app",
  messagingSenderId: "548472173128",
  appId: "1:548472173128:web:8f5344b574c079f3849e7d",
  measurementId: "G-WJB90QN8MJ"
};

export const VAPID_KEY = "BPwyd6lHHJTIJ9pIfRWjs_4QIDybqMT8pahYnCEqHL83cvOw9uyK3BicNocD8pf1d_n7Fmnla5ZIe-9mju9uIVM";

// Initialize Firebase App
export const firebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Google Sign-In helper
export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const idToken = await user.getIdToken();
  return {
    user,
    idToken,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL
  };
};

export const logoutFirebase = () => signOut(auth);

// Push Notification token requester
export const requestNotificationPermissionAndToken = async () => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('[Firebase Messaging] Not supported in this browser environment');
      return null;
    }

    if (!('Notification' in window)) {
      console.warn('[Firebase Messaging] Desktop notifications are not available in this browser');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Firebase Messaging] Notification permission was not granted:', permission);
      return null;
    }

    const messaging = getMessaging(firebaseApp);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });

    return token;
  } catch (err) {
    console.error('[Firebase Messaging] Error acquiring notification token:', err);
    return null;
  }
};

// Foreground message listener
export const listenForForegroundMessages = (onMessageCallback) => {
  isSupported().then((supported) => {
    if (!supported) return;
    try {
      const messaging = getMessaging(firebaseApp);
      onMessage(messaging, (payload) => {
        console.log('[FCM] Foreground message received:', payload);
        if (onMessageCallback) onMessageCallback(payload);
      });
    } catch (e) {
      console.warn('[FCM] Error attaching onMessage listener:', e);
    }
  });
};

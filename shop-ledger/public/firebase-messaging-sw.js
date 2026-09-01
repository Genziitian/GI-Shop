// Firebase Messaging Service Worker for background push notifications
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCKTZ6KBVkumoiOPbBRoz1EmoIEmGsCtgk",
  authDomain: "my-apps-6756a.firebaseapp.com",
  projectId: "my-apps-6756a",
  storageBucket: "my-apps-6756a.firebasestorage.app",
  messagingSenderId: "548472173128",
  appId: "1:548472173128:web:8f5344b574c079f3849e7d",
  measurementId: "G-WJB90QN8MJ"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'GI SHOP';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new update in GI SHOP',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

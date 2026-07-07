// Firebase Cloud Messaging service worker for background push notifications
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDummy-Replaced-At-Runtime",
  authDomain: "adamkom-crm.firebaseapp.com",
  projectId: "adamkom-crm",
  storageBucket: "adamkom-crm.firebasestorage.app",
  messagingSenderId: "317720872928",
  appId: "1:317720872928:web:499026281ff0225d4c8d85",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "Adamkom";
  const options = {
    body: payload.notification?.body || payload.data?.message || "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: {
      url: payload.data?.link || "/",
    },
    tag: payload.data?.notification_id || undefined,
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

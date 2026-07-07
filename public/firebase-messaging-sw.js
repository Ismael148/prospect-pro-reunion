/* Firebase Cloud Messaging service worker. Config is provided via query params
   so we don't need a build step to inject the public web API key. */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

const params = new URL(self.location.href).searchParams;
firebase.initializeApp({
  apiKey: params.get("k") || "",
  authDomain: "adamkom-crm.firebaseapp.com",
  projectId: params.get("p") || "adamkom-crm",
  storageBucket: "adamkom-crm.firebasestorage.app",
  messagingSenderId: params.get("s") || "317720872928",
  appId: params.get("a") || "1:317720872928:web:499026281ff0225d4c8d85",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "Adamkom";
  const options = {
    body: payload.notification?.body || payload.data?.message || "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { url: payload.data?.link || "/" },
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

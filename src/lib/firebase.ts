import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBvJ8jZ_H8_Firebase_Web_Public_Key",
  authDomain: "adamkom-crm.firebaseapp.com",
  projectId: "adamkom-crm",
  storageBucket: "adamkom-crm.firebasestorage.app",
  messagingSenderId: "317720872928",
  appId: "1:317720872928:web:499026281ff0225d4c8d85",
  measurementId: "G-KSW2DBKF7E",
};

export const VAPID_KEY =
  "BD6qlygT2cPKLU__F_n3FwszOUieyjaqsR2XSXtoNgD4LGXxv65xZOSys7Wm3T1lA6KIBSDbZ26RjltD93YcwYk";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

let _messaging: Messaging | null = null;

export async function getFcmMessaging(): Promise<Messaging | null> {
  if (_messaging) return _messaging;
  if (!(await isSupported())) return null;
  _messaging = getMessaging(app);
  return _messaging;
}

export async function requestFcmToken(): Promise<string | null> {
  const messaging = await getFcmMessaging();
  if (!messaging) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  return token || null;
}

export async function onForegroundMessage(cb: (payload: any) => void) {
  const messaging = await getFcmMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, cb);
}

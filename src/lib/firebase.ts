import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from "firebase/messaging";

export const VAPID_KEY =
  "BD6qlygT2cPKLU__F_n3FwszOUieyjaqsR2XSXtoNgD4LGXxv65xZOSys7Wm3T1lA6KIBSDbZ26RjltD93YcwYk";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

let _app: FirebaseApp | null = null;
let _messaging: Messaging | null = null;
let _configPromise: Promise<any> | null = null;

async function loadConfig() {
  if (!_configPromise) {
    _configPromise = fetch(`${SUPABASE_URL}/functions/v1/firebase-config`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    }).then((r) => r.json());
  }
  return _configPromise;
}

async function initApp() {
  if (_app) return _app;
  if (getApps().length) {
    _app = getApps()[0];
    return _app;
  }
  const config = await loadConfig();
  _app = initializeApp(config);
  return _app;
}

export async function getFcmMessaging(): Promise<Messaging | null> {
  if (_messaging) return _messaging;
  if (!(await isSupported())) return null;
  const app = await initApp();
  _messaging = getMessaging(app);
  return _messaging;
}

export async function requestFcmToken(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  const messaging = await getFcmMessaging();
  if (!messaging) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  // Pass config to the service worker via query string so it can init without a build step
  const config = await loadConfig();
  const swUrl = `/firebase-messaging-sw.js?k=${encodeURIComponent(config.apiKey)}&s=${config.messagingSenderId}&a=${encodeURIComponent(config.appId)}&p=${config.projectId}`;
  const registration = await navigator.serviceWorker.register(swUrl);

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

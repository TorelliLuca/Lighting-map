import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../context/UserContext';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const PUSH_OPT_IN_KEY = 'pushNotificationsOptIn';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Edg/')) return 'Edge';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  return 'Unknown';
}

function getSafeUserId() {
  try {
    const userData = localStorage.getItem('userData');
    if (!userData) return null;
    const parsed = JSON.parse(userData);
    return parsed?.id || null;
  } catch {
    return null;
  }
}

function checkPushSupport() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function readOptIn() {
  try {
    return localStorage.getItem(PUSH_OPT_IN_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeOptIn(value) {
  try {
    if (value) localStorage.setItem(PUSH_OPT_IN_KEY, 'true');
    else localStorage.removeItem(PUSH_OPT_IN_KEY);
  } catch {
    // ignore
  }
}

async function getSwRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return navigator.serviceWorker.ready;
}

async function buildSubscriptionPayload(subscription, userId) {
  const p256dhKey = subscription.getKey('p256dh');
  const authKey = subscription.getKey('auth');
  if (!p256dhKey || !authKey) {
    throw new Error('Impossibile leggere le chiavi della subscription');
  }
  return {
    userId,
    endpoint: subscription.endpoint,
    keys: {
      p256dh: arrayBufferToBase64(p256dhKey),
      auth: arrayBufferToBase64(authKey),
    },
    browser: getBrowserInfo(),
    timestamp: Date.now(),
  };
}

/**
 * Hook per opt-in esplicito alle push (niente requestPermission al mount).
 * Preferisci il context `usePushNotifications` da PushNotificationsContext
 * per condividere lo stato nell'app.
 */
export function usePushNotificationsState({ userId: userIdProp } = {}) {
  const [status, setStatus] = useState({
    isSupported: checkPushSupport(),
    isSubscribed: false,
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'default',
    optIn: readOptIn(),
    loading: false,
    error: null,
  });
  const syncingRef = useRef(false);

  const refreshStatus = useCallback(async () => {
    if (!checkPushSupport()) {
      setStatus((prev) => ({ ...prev, isSupported: false }));
      return;
    }

    try {
      const registration = await getSwRegistration();
      const subscription = registration
        ? await registration.pushManager.getSubscription()
        : null;

      setStatus((prev) => ({
        ...prev,
        isSupported: true,
        isSubscribed: Boolean(subscription),
        permission: Notification.permission,
        optIn: readOptIn(),
        error: null,
      }));
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        error: error.message,
      }));
    }
  }, []);

  const syncSubscription = useCallback(async () => {
    if (!checkPushSupport() || !VAPID_PUBLIC_KEY) return false;
    if (!readOptIn()) return false;
    if (Notification.permission !== 'granted') return false;
    if (syncingRef.current) return false;

    syncingRef.current = true;
    try {
      const registration = await getSwRegistration();
      if (!registration) return false;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const userId = userIdProp || getSafeUserId();
      if (userId) {
        const payload = await buildSubscriptionPayload(subscription, userId);
        await api.post('/api/push/subscribe', payload);
      }

      setStatus((prev) => ({
        ...prev,
        isSubscribed: true,
        permission: 'granted',
        optIn: true,
        error: null,
      }));
      return true;
    } catch (error) {
      console.error('Push sync failed:', error);
      setStatus((prev) => ({ ...prev, error: error.message }));
      return false;
    } finally {
      syncingRef.current = false;
    }
  }, [userIdProp]);

  const enable = useCallback(async () => {
    if (!checkPushSupport()) {
      const message = 'Notifiche push non supportate su questo browser';
      setStatus((prev) => ({ ...prev, error: message }));
      throw new Error(message);
    }
    if (!VAPID_PUBLIC_KEY) {
      const message = 'Chiave VAPID non configurata';
      setStatus((prev) => ({ ...prev, error: message }));
      throw new Error(message);
    }

    setStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const permission = await Notification.requestPermission();
      setStatus((prev) => ({ ...prev, permission }));

      if (permission !== 'granted') {
        writeOptIn(false);
        throw new Error('Permesso notifiche negato');
      }

      writeOptIn(true);
      const ok = await syncSubscription();
      if (!ok) throw new Error('Registrazione push non riuscita');

      setStatus((prev) => ({
        ...prev,
        loading: false,
        isSubscribed: true,
        optIn: true,
        permission: 'granted',
      }));
      return true;
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
        optIn: readOptIn(),
      }));
      throw error;
    }
  }, [syncSubscription]);

  const disable = useCallback(async () => {
    setStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const registration = await getSwRegistration();
      const subscription = registration
        ? await registration.pushManager.getSubscription()
        : null;

      if (subscription) {
        try {
          await api.patch('/api/push/unsubscribe', { endpoint: subscription.endpoint });
        } catch (err) {
          console.warn('Server unsubscribe failed:', err);
        }
        await subscription.unsubscribe();
      }

      writeOptIn(false);
      setStatus((prev) => ({
        ...prev,
        loading: false,
        isSubscribed: false,
        optIn: false,
        permission: Notification.permission,
      }));
      return true;
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      throw error;
    }
  }, []);

  // Sync silenzioso se l'utente aveva già optato in
  useEffect(() => {
    refreshStatus().then(() => {
      if (readOptIn() && Notification.permission === 'granted') {
        syncSubscription();
      }
    });
  }, [refreshStatus, syncSubscription, userIdProp]);

  return {
    isSupported: status.isSupported,
    isSubscribed: status.isSubscribed,
    /** @deprecated usa isSubscribed */
    isSetup: status.isSubscribed,
    permission: status.permission,
    optIn: status.optIn,
    loading: status.loading,
    error: status.error,
    enable,
    disable,
    syncSubscription,
    refreshStatus,
    /** @deprecated usa enable */
    retrySetup: enable,
    unsubscribe: disable,
  };
}

export { PUSH_OPT_IN_KEY };

/** @deprecated Usa usePushNotifications dallo context, oppure usePushNotificationsState */
export const usePushNotifications = usePushNotificationsState;

// hooks/usePushNotifications.js
import { useEffect, useRef, useState } from 'react';
import { api } from '../context/UserContext';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const SW_PATH = import.meta.env.VITE_SW_PATH || '/dev-LIGHTING-MAP/sw.js';

// Utility functions
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
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
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return window.btoa(binary);
}

function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
}

function getSafeUserData() {
  try {
    const userData = localStorage.getItem('userData');
    if (!userData) return null;
    
    const parsed = JSON.parse(userData);
    return parsed?.id || null;
  } catch (error) {
    console.error('Error parsing userData from localStorage:', error);
    return null;
  }
}

function checkPushSupport() {
  return {
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notification: 'Notification' in window
  };
}

export function usePushNotifications() {
  const isSetup = useRef(false);
  const setupPromise = useRef(null);
  const [status, setStatus] = useState({
    isSupported: false,
    isSetup: false,
    permission: null,
    error: null
  });

  useEffect(() => {
    // Evita setup multipli
    if (isSetup.current || setupPromise.current) return;

    async function setupPush() {
      try {
        setStatus(prev => ({ ...prev, error: null }));

        // 1. Verifica compatibilità
        const support = checkPushSupport();
        if (!support.serviceWorker || !support.pushManager || !support.notification) {
          throw new Error('Push notifications not supported in this browser');
        }

        setStatus(prev => ({ ...prev, isSupported: true }));
        // 2. Verifica configurazione
        if (!VAPID_PUBLIC_KEY) {
          throw new Error('VAPID_PUBLIC_KEY not configured');
        }
        if (!SERVER_URL) {
          throw new Error('SERVER_URL not configured');
        }

        // 3. Registra service worker
        const registration = await navigator.serviceWorker.register(SW_PATH);
        
        // Aspetta che il service worker sia pronto
        await navigator.serviceWorker.ready;

        // 4. Richiedi permessi
        const permission = await Notification.requestPermission();
        setStatus(prev => ({ ...prev, permission }));

        if (permission !== 'granted') {
          // console.log('Push notification permission denied');
          return;
        }

        // 5. Gestisci subscription
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          // console.log('Creating new push subscription...');
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
        }

        // 6. Prepara dati per il server
        const p256dhKey = subscription.getKey('p256dh');
        const authKey = subscription.getKey('auth');
        const userId = getSafeUserData();

        if (!p256dhKey || !authKey) {
          throw new Error('Unable to get subscription keys');
        }

        const subscriptionData = {
          userId,
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(p256dhKey),
            auth: arrayBufferToBase64(authKey)
          },
          browser: getBrowserInfo(),
          timestamp: Date.now()
        };

        // 7. Salva sul server (solo se c'è un userId)
        if (userId) {
          const response = await api.post(`${SERVER_URL}/api/push/subscribe`, subscriptionData);
          // console.log('Subscription saved on server:', response.data);
        } else {
          console.warn('No userId found, subscription not saved on server');
        }

        isSetup.current = true;
        setStatus(prev => ({ 
          ...prev, 
          isSetup: true, 
          error: null 
        }));

        console.log('Push notifications setup completed successfully');

      } catch (error) {
        console.error('Push notification setup failed:', error);
        setStatus(prev => ({ 
          ...prev, 
          error: error.message,
          isSetup: false 
        }));
      }
    }

    // Avvia setup una sola volta
    setupPromise.current = setupPush();

    // Cleanup
    return () => {
      // Reset refs se il componente viene smontato
      setupPromise.current = null;
    };
  }, []);

  // Funzione per ri-tentare il setup
  const retrySetup = () => {
    isSetup.current = false;
    setupPromise.current = null;
    setStatus({
      isSupported: false,
      isSetup: false,
      permission: null,
      error: null
    });
  };

  // Funzione per unsubscribe
  const unsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          console.log('Unsubscribed from push notifications');
        }
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
    }
  };

  return {
    isSetup: status.isSetup,
    isSupported: status.isSupported,
    permission: status.permission,
    error: status.error,
    retrySetup,
    unsubscribe
  };
}
import { useEffect } from "react";
import { api } from "../context/UserContext";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

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

export default function PushNotify({ title, body, userId, browser }) {
  useEffect(() => {
    async function setupPushNotifications() {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          console.error('Push notifications non supportate');
          return;
        }

        console.log('Registrando service worker...');
         const registration = await navigator.serviceWorker.register('/LIGHTING-MAP/sw.js');
        
        console.log('Service worker registrato:', registration);

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.error('Permesso notifiche negato');
          return;
        }

        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
        }
        console.log(subscription);
        const p256dhKey = subscription.getKey('p256dh');
        const authKey = subscription.getKey('auth');

        const subscriptionData = {
          userId: userId || null,
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(p256dhKey),
            auth: arrayBufferToBase64(authKey)
          },
          browser: browser || navigator.userAgent 
        };

        if (userId) {
          const response = await api.post(`${SERVER_URL}/api/push/subscribe`, subscriptionData);
          console.log('Subscription salvata sul server:', response.data);
        }

        const response = await api.post(`${SERVER_URL}/api/push/send-test-push`, {
          title,
          body
        });
        console.log('Notifica inviata:', response.data);

      } catch (error) {
        console.error('Errore setup push notifications:', error);
      }
    }

    setupPushNotifications();
  }, []);

  return null;
}
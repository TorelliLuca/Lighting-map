import { useEffect } from "react";
import {api} from "../context/UserContext";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY; // Inserisci la tua chiave pubblica VAPID
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

export default function NotificaPush({ title, body, userId, browser }) {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    let registration;
    navigator.serviceWorker.register('/sw.js').then(reg => {
      registration = reg;
      return Notification.requestPermission();
    }).then(permission => {
      if (permission !== 'granted') return;
      return registration.pushManager.getSubscription()
        .then(async sub => {
          if (sub) return sub;
          return registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
        });
    }).then(async subscription => {
      if (!subscription) return;
      // Invia subscription al server
        await api.post('/subscribe', {
            userId,
            subscription
        });
      // Invia la notifica
      await api.post("/send-push", {
        title,
        body
      });
    }).catch(console.error);
  }, [title, body, userId, browser]);

  return null;
}
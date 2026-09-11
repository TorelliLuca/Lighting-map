/* eslint-disable no-restricted-globals */
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { createHandlerBoundToURL } from 'workbox-precaching';

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// SPA navigations: fallback all'index precached (offline-friendly)
try {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL('index.html'), {
      denylist: [/^\/api\//, /\/api\//],
    })
  );
} catch {
  // createHandlerBoundToURL fallisce se index.html non è nel precache (es. alcuni ambienti di test)
}

const BASE = self.registration?.scope
  ? new URL(self.registration.scope).pathname.replace(/\/?$/, '/')
  : '/LIGHTING-MAP/';

const iconUrl = `${BASE}faviconWhite.png`;

const DEFAULT_NOTIFICATION_ACTIONS = [
  { action: 'open', title: 'Apri' },
  { action: 'dismiss', title: 'Chiudi' },
];

function resolveNotificationUrl(data) {
  const raw = data?.url;
  if (typeof raw === 'string' && raw.trim()) {
    const url = raw.trim();
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/')) {
      // Path assoluto sul sito: mantieni BASE PWA se manca
      if (url.startsWith(BASE)) return url;
      return `${BASE}${url.replace(/^\//, '')}`;
    }
    return `${BASE}${url}`;
  }
  return `${BASE}dashboard`;
}

async function openOrFocusUrl(targetUrl) {
  const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientList) {
    if ('focus' in client) {
      await client.focus();
      if ('navigate' in client) {
        return client.navigate(targetUrl);
      }
      return client;
    }
  }
  if (clients.openWindow) {
    return clients.openWindow(targetUrl);
  }
  return undefined;
}

async function bumpAppBadge() {
  try {
    if (!('setAppBadge' in self.navigator)) return;
    // Best-effort: senza conteggio server nel SW, segnala almeno 1.
    await self.navigator.setAppBadge(1);
  } catch {
    // ignore
  }
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text?.() || '' };
  }

  const title = data.title || 'Lighting Map';
  const targetUrl = resolveNotificationUrl(data);
  const options = {
    body: data.body || '',
    icon: data.icon || iconUrl,
    badge: data.badge || iconUrl,
    tag: data.tag || data.type || undefined,
    renotify: Boolean(data.renotify),
    data: {
      ...data,
      url: targetUrl,
    },
    actions: Array.isArray(data.actions) && data.actions.length > 0
      ? data.actions
      : DEFAULT_NOTIFICATION_ACTIONS,
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      bumpAppBadge(),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  const action = event.action || 'open';
  event.notification.close();

  if (action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || `${BASE}dashboard`;
  event.waitUntil(openOrFocusUrl(targetUrl));
});

self.addEventListener('notificationclose', () => {
  // no-op: lascia il badge fino a sync dall'app aperta
});

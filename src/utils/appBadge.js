/**
 * App Badge API (icona installata): sync conteggio notifiche non lette.
 * Supporto: Chromium desktop/Android; iOS Safari limitato/assente.
 */

export function isAppBadgeSupported() {
  return typeof navigator !== "undefined" && "setAppBadge" in navigator;
}

export async function syncAppBadge(count) {
  if (!isAppBadgeSupported()) return;
  try {
    const n = Math.max(0, Number(count) || 0);
    if (n > 0) await navigator.setAppBadge(n);
    else await navigator.clearAppBadge();
  } catch {
    // API opzionale: non bloccare l'UI
  }
}

export async function clearAppBadge() {
  if (!isAppBadgeSupported()) return;
  try {
    await navigator.clearAppBadge();
  } catch {
    // ignore
  }
}

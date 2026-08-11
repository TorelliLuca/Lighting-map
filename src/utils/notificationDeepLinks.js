/**
 * Path React Router per aprire la Dashboard con focus one-shot su un punto luce.
 * La Dashboard consuma i query param e li rimuove (stesso pattern di location.state).
 */
export function buildLightPointDashboardPath({
  townHallName,
  numeroPalo,
  lat,
  lng,
} = {}) {
  const params = new URLSearchParams();
  if (townHallName) params.set("comune", String(townHallName));
  if (numeroPalo != null && numeroPalo !== "") {
    params.set("focusPalo", String(numeroPalo));
  }
  if (lat != null && lat !== "") params.set("focusLat", String(lat));
  if (lng != null && lng !== "") params.set("focusLng", String(lng));
  const qs = params.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}

/** URL assoluto sotto il basename PWA, per payload Web Push / service worker. */
export function buildLightPointDashboardPushUrl(opts) {
  const base = import.meta.env.BASE_URL || "/";
  const path = buildLightPointDashboardPath(opts).replace(/^\//, "");
  return `${base}${path}`;
}

/**
 * Destinazione navigabile da una notifica in-app.
 * Preferisce `url` se già deep; per legacy `/dashboard` ricostruisce da `meta`.
 */
export function resolveNotificationNavigateTarget(notification) {
  if (!notification) return null;

  const url = typeof notification.url === "string" ? notification.url.trim() : "";
  const meta = notification.meta && typeof notification.meta === "object"
    ? notification.meta
    : {};

  const isBareDashboard =
    !url ||
    url === "/dashboard" ||
    url === "dashboard";

  if (url && !isBareDashboard) {
    return url.startsWith("/") ? url : `/${url}`;
  }

  const townHallName = meta.townHallName || meta.comune;
  const numeroPalo = meta.numeroPalo ?? meta.focusPalo;
  const lat = meta.lat ?? meta.focusLat;
  const lng = meta.lng ?? meta.focusLng;

  if (townHallName || numeroPalo || (lat != null && lng != null)) {
    return buildLightPointDashboardPath({
      townHallName,
      numeroPalo,
      lat,
      lng,
    });
  }

  return url || null;
}

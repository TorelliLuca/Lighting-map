# Variabili d'Ambiente

Il progetto utilizza variabili `VITE_*` per configurare servizi esterni e comportamenti runtime. Impostale in `.env.development` e `.env.production`.

## Variabili principali
- `VITE_SERVER_URL` — base URL del backend REST (es. https://api.example.com)
- `VITE_GOOGLE_MAPS_API` — API key Google Maps (modalità mappa complessa)
- `VITE_MAPTILER_API` — API key MapTiler (modalità mappa semplice/MapLibre)
- `VITE_PUBLIC_URL` — base URL pubblica per asset (favicon light/dark)
- `VITE_VAPID_PUBLIC_KEY` — chiave pubblica VAPID per notifiche push
- `VITE_SW_PATH` — path del Service Worker (default `/dev-LIGHTING-MAP/sw.js`)

## Esempio `.env.development`
```
VITE_SERVER_URL=http://localhost:3000
VITE_GOOGLE_MAPS_API=your_google_maps_key
VITE_MAPTILER_API=your_maptiler_key
VITE_PUBLIC_URL=
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
VITE_SW_PATH=/dev-LIGHTING-MAP/sw.js
```

## Esempio `.env.production`
```
VITE_SERVER_URL=https://api.yourdomain.tld
VITE_GOOGLE_MAPS_API=prod_google_maps_key
VITE_MAPTILER_API=prod_maptiler_key
VITE_PUBLIC_URL=/LIGHTING-MAP
VITE_VAPID_PUBLIC_KEY=prod_vapid_public_key
VITE_SW_PATH=/LIGHTING-MAP/sw.js
```

Note:
- Assicurati che `homepage` in `package.json` corrisponda al path di deploy (attuale: `/LIGHTING-MAP/`).
- Per le favicon, `App.jsx` seleziona `faviconWhite.png` o `faviconDark.png` in base al tema di sistema usando `VITE_PUBLIC_URL`.

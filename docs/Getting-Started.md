# Getting Started

Questa guida ti aiuta ad avviare rapidamente il progetto `Lighting Map` in locale.

## Prerequisiti
- Node.js 18+
- pnpm, npm o yarn
- Chiavi/endpoint per i servizi esterni:
  - `VITE_SERVER_URL` (backend REST)
  - `VITE_GOOGLE_MAPS_API` (modalità mappa complessa)
  - `VITE_MAPTILER_API` (modalità mappa semplice con MapLibre)
  - `VITE_VAPID_PUBLIC_KEY` (notifiche push)

## Installazione
```bash
# usando npm
npm install

# oppure pnpm
dpnm install

# oppure yarn
yarn install
```

## Configurazione variabili d'ambiente
Copia i file `.env.development` e `.env.production` come base e imposta i valori coerenti con la tua infrastruttura. Consulta `docs/ENV.md` per il dettaglio completo delle variabili supportate e degli esempi.

## Avvio in sviluppo
```bash
npm run dev
```
L'app sarà disponibile in locale sul port predefinito di Vite (es. http://localhost:5173). La base URL pubblica è configurata per `/LIGHTING-MAP` (vedi `package.json.homepage`).

## Build produzione
```bash
npm run build
npm run preview
```

## Storybook (documentazione UI interattiva)
```bash
npm run storybook
# build statico
npm run build-storybook
```

## Linting
```bash
npm run lint
```

## Struttura progetto (sintesi)
- `src/`
  - `components/` — UI riutilizzabile e viste di mappa (`MapLibreMap`, pannelli, modali, ecc.)
  - `pages/` — pagine applicative (`Dashboard`, `Login`, ecc.)
  - `context/` — `UserContext` e API client
  - `hooks/` — hooks custom (`useFilteredMarkers`, `usePushNotifications`)
  - `utils/` — funzioni di utilità (colori, marker, formattazioni)

## Flussi principali
- Autenticazione e profilo: `src/context/UserContext.jsx`
- Dashboard e mappa: `src/pages/Dashboard.jsx`
- Mappa semplice (MapLibre): `src/components/MapLibreMap.jsx`
- Clustering/marker Google Maps: `src/utils/createMarkers.jsx`

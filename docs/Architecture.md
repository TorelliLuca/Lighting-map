# Architettura

Questa sezione descrive l’architettura del progetto `Lighting Map`, le dipendenze principali e i flussi core.

## Stack e tool principali
- React 19 + Vite
- Routing: `react-router-dom`
- Stile: TailwindCSS
- Grafici: Recharts
- Mappe:
  - Modalità "complessa": Google Maps JavaScript API + `@googlemaps/markerclusterer` e custom `AdvancedMarkerElement`
  - Modalità "semplice": MapLibre GL + MapTiler styles
- Stato utente e API HTTP: `src/context/UserContext.jsx` con `axios`
- Notifiche Push: Service Worker esterno + VAPID
- Storybook per UI docs

## Struttura directory
- `src/components/`
  - `MapLibreMap.jsx` — rendering mappa con MapLibre e layers/cluster avanzati
  - `InfoPanel.jsx` — pannello statistiche con grafici
  - Modali, controlli mappa, header, ecc.
- `src/pages/`
  - `Dashboard.jsx` — orchestrazione dei flussi di mappa, filtri, editing, salvataggio stato
  - Pagine auth (`Login`, `SignIn`, `ResetPassword`, `ConfirmEmail`), gestione organizzazioni
- `src/context/`
  - `UserContext.jsx` — Auth, token, profilo, API di dominio (segnalazioni, punti luce, geojson)
- `src/hooks/`
  - `useFilteredMarkers.js` — filtri e GeoJSON lato client (per MapLibre)
  - `usePushNotifications.js` — setup iscrizione push
- `src/utils/`
  - `createMarkers.jsx` — pipeline Google Maps: creazione marker, clustering, filtri, cleanup
  - `ColorGenerator.jsx`, `utils.js`, `pushNotifications.js`

## Flusso mappa — Modalità complessa (Google Maps)
1. `Dashboard.jsx` carica Google Maps e inizializza `InfoWindow`.
2. Richiama `loadSelectedTownhalls(selectedCity)` da `UserContext` per ottenere i dati.
3. Con `setupMarkerClustering()` in `utils/createMarkers.jsx` crea i marker React-based e il clusterer.
4. I filtri sono applicati da `filterMarkers()` (marker QE/PL, segnalati, proprietà).
5. `updateMarkerColors()` ricalcola i colori su highlight/proprietà/tipo lampada ecc.
6. Editing marker: drag con evidenziazione; callback `onMarkerDragEnd` per salvataggio.

## Flusso mappa — Modalità semplice (MapLibre)
1. `Dashboard.jsx` chiama `getTownhallGeojson(selectedCity)` via `UserContext`.
2. I dati vengono convertiti in `markers` e passati a `useFilteredMarkers()`.
3. `MapLibreMap.jsx` gestisce layers: cluster animati per segnalati, marker PL (cerchi) e QE (quadrati-pittogramma), popup React `InfoWindow`.
4. Supporto editing singolo marker con layer evidenziato e `maplibregl.Marker` draggable.

## Stato persistito
- LocalStorage chiavi: `lighting-map-selected-city`, `lighting-map-highlight-option`, `lighting-map-filter-option`, `lighting-map-show-panel-number`, `lighting-map-show-streetlamp-number`, `lighting-map-visualization-mode`, `lighting-map-map-center`, `lighting-map-map-zoom`.

## Decisioni chiave
- Doppia modalità mappa per scalabilità: MapLibre per dataset grandi, Google Maps per ricchezza interattiva.
- Marker custom renderizzati con React per consistenza UI e riuso di componenti.
- Colori coordinati e legende generate in base all’opzione di evidenziazione.
- Robustezza cleanup risorse di mappa per evitare memory leak.

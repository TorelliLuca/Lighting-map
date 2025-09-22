# API — Hooks

Questa pagina documenta i principali hook custom.

## `useFilteredMarkers`
Percorso: `src/hooks/useFilteredMarkers.js`

Firma:
```js
function useFilteredMarkers({ markers, filterOption, selectedProprietaFilter, highlightOption })
```

- Parametri
  - `markers: Array<object>` — lista marker in formato app domain (con `lat`, `lng`, `marker`, ecc.).
  - `filterOption: 'SELECT'|'REPORTED'|'MARKER'|'PROPRIETA'` — tipo filtro.
  - `selectedProprietaFilter?: 'Municipale'|'EnelSole'` — usato se `filterOption==='PROPRIETA'`.
  - `highlightOption?: ''|'MARKER'|'PROPRIETA'|'LOTTO'|'TIPO_LAMPADA'|'TIPO_APPARECCHIO'` — determina la colorazione.

- Ritorno
  - `{ filteredMarkers: Array<object>, geojsonData: GeoJSON.FeatureCollection }`

- Note d’implementazione
  - Genera una mappa colori coerente tramite `generateLegendColorMap(markers, highlightOption)`.
  - Filtra lato client con regole: segnalati attivi, soli QE, proprietà.
  - Converte in GeoJSON aggiungendo `properties.color` per MapLibre.

- Esempio d’uso
```jsx
const { filteredMarkers, geojsonData } = useFilteredMarkers({
  markers: simpleMarkers,
  filterOption,
  selectedProprietaFilter,
  highlightOption,
});
```

Utility esportata:
- `generateLegendColorMap(markers, highlightOption)` — restituisce mapping valore->colore per `quadro`, `proprieta`, `lotto`, `tipo_lampada`, `tipo_apparecchio`.

---

## `usePushNotifications`
Percorso: `src/hooks/usePushNotifications.js`

Firma:
```js
function usePushNotifications()
```

- Flusso
  - Verifica supporto `serviceWorker`, `PushManager`, `Notification`.
  - Registra il service worker da `VITE_SW_PATH`.
  - Richiede permesso notifiche; crea/subscrive a push con VAPID key (`VITE_VAPID_PUBLIC_KEY`).
  - Invia subscription al server (`/api/push/subscribe`) se presente `userId` in `localStorage.userData`.

- Ritorno stato e azioni
  - `{ isSetup, isSupported, permission, error, retrySetup, unsubscribe }`
    - `retrySetup()` — resetta lo stato per riprovare.
    - `unsubscribe()` — annulla la sottoscrizione dal `PushManager`.

- Variabili d’ambiente richieste
  - `VITE_SERVER_URL`, `VITE_VAPID_PUBLIC_KEY`, `VITE_SW_PATH`.

- Note
  - Usa l’istanza `api` di `UserContext` per la chiamata di subscribe.
  - Funzioni di utilità incluse: `urlBase64ToUint8Array`, `arrayBufferToBase64`, `getBrowserInfo`, `getSafeUserData`, `checkPushSupport`.

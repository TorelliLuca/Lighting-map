# API — Componenti principali

Questa pagina riassume i componenti chiave e le loro props. Per componenti secondari o puramente presentazionali, fare riferimento direttamente al codice in `src/components/` e alle storie in `src/stories/` se presenti.

## `MapLibreMap`
Percorso: `src/components/MapLibreMap.jsx`

Mappa in modalità "semplice" basata su MapLibre/MapTiler con clustering, popup React e layer dinamici.

Props principali:
- `center?: [lng:number, lat:number]` — centro iniziale (default Roma).
- `zoom?: number` — zoom iniziale (default 12).
- `styleUrl?: string` — stile MapTiler.
- `onMapLoaded?: (map) => void` — callback quando la mappa è pronta.
- `geojsonData?: FeatureCollection` — dati dei marker (contiene `properties.color`).
- `showStreetLampNumber?: boolean` — mostra `numero_palo` per PL.
- `showPanelNumber?: boolean` — mostra `numero_palo` per QE.
- `onEditClick?: (marker) => void` — azione modifica da popup.
- `onDeleteClick?: (id) => void` — azione eliminazione da popup.
- `editingMarkerId?: string` — se presente, evidenzia ed abilita drag per quel marker.
- `onMarkerPositionChange?: (id, lat, lng) => void` — callback drag end.
- `selectedCity?: string` — usato per centrare su cambio città e filtrare interazioni.
- `onBeforeReport?: (marker) => void` — hook prima dell’inserimento segnalazione.
- `onBeforeReportCleanupTrigger?: any` — trigger cleanup (chiusura popup, ecc.).
- `onAfterCleanup?: () => void`
- `onMarkerSelect?: (marker|null) => void` — notifica selezione/deselezione marker.

Note:
- Layers per cluster segnalati con triangolo pulsante e per QE con glifi quadrati colorati generati on-the-fly.
- Gestione robusta cleanup layers/sorgenti/immagini.

## `InfoPanel`
Percorso: `src/components/InfoPanel.jsx`

Pannello di analisi con statistiche e grafici (Recharts) sui marker attivi.

Props:
- `activeMarkers: Array<{ data, ref }>` — lista marker attualmente visibili/attivi.
- `onClose: () => void` — chiusura pannello.
- `townhallName: string` — usato per recuperare il tempo medio di risposta.

Sezioni:
- Statistiche generali (contatori PL, QE, segnalazioni).
- Grafici a torta per proprietà, tipo apparecchio, tipo lampada.
- Grafici su segnalazioni/operazioni per mese.
- Elenco segnalazioni e operazioni recenti.

## `MapControls`, `LegendGlass`, `SearchBar`, `ResultsBottomSheet`, `SettingsMenu`
Percorso: `src/components/*.jsx`

Componenti UI che orchestrano filtri, ricerche, legenda, impostazioni e bottom sheet risultati.

- Accettano tipicamente props controllate da `Dashboard.jsx` (opzioni filtro/evidenziazione, ricerca testuale, toggle visualizzazioni).

## `EditLightPointModal`, `AddLightPointModal`, `AddElectricPanelForm`, `AddLightPointForm`
Percorso: `src/components/*.jsx`

Modali e form per creare/modificare punti luce o quadri elettrici.

- Usano funzioni di `UserContext` (`updateLightPoint`, `addLightPoint`, `deleteLightPoint`).
- Validazioni e feedback utente (toast, ecc.).

## `ProtectedRoute`
Percorso: `src/components/ProtectedRoute.jsx`

Wrapper route che richiede autenticazione.

- Verifica `isAuthenticated` dal `UserContext` e, se non autenticato, reindirizza al login.

## `Header`
Percorso: `src/components/Header.jsx`

Barra superiore che mostra contesto utente, selettori di città e azioni principali.

## Componenti vari
- `MapLoader` — stato di caricamento mappa.
- `MapStyleSwitcher` — switch satellite/strade per MapLibre.
- `ErrorBoundary` — cattura errori runtime nel sottoalbero.
- `PushNotify`/`NotificaPush` — UI legata alle notifiche push.

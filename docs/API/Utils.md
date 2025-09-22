# API — Utils

Questa pagina documenta le utility principali in `src/utils/`.

## `ColorGenerator.jsx`
Percorso: `src/utils/ColorGenerator.jsx`

Esporta:
- `DEFAULT_COLOR: string` — colore base (blu).
- `colorsBackground: string[]` — palette di base.
- `colorsGliph: string[]` — scala grigi/white per glifi.
- `coloreGliphOn: string` — colore evidenziazione glifo attivo.
- `getColorList(n: number): string[]` — restituisce `n` colori, ripetendo ciclicamente se `n` > base.

## `utils.js`
Percorso: `src/utils/utils.js`

- `clearBlanket(str?: string): string` — rimuove spazi e apici.
- `translateString(englishString: string): string` — mappa tipo segnalazione in italiano usando `translation_report_type`.
- `transformDateToIT(dateToConvert: string|number|Date): string` — formatta in italiano con timezone Europe/Rome.
- `listIgnoratedFieldsPL: string[]` — campi da ignorare per Punti Luce.
- `listIgnoratedFieldsQE: string[]` — campi da ignorare per Quadri Elettrici.
- `translation_report_type: Record<string,string>` — dizionario traduzioni report.
- `isOlderThan(reportDate: string|Date, n: number): boolean` — true se vecchio almeno `n` ore.
- `translateUserType(userType: 'DEFAULT_USER'|'MAINTAINER'|'ADMINISTRATOR'|'SUPER_ADMIN'): string`
- `capitalizeString(str: string): string` — capitalizza la prima lettera.
- `validateName(name: string): boolean` — solo lettere, spazi, apostrofi, accenti.
- `getContractStatus(endDate: string|Date): string` — "Attivo" | "In scadenza" | "Scaduto da X giorni".

## `createMarkers.jsx`
Percorso: `src/utils/createMarkers.jsx`

Funzioni principali per la modalità Google Maps:
- `createMarkers(markers, city, map, highlightOption, currentInfoWindow, userData, infoWindowRef, setCurrentInfoWindow, onEditClick, editingMarkerId, onMarkerDragEnd, onDeleteClick, showPanelNumber, showStreetLampNumber, setSelectedMarkerForInfo): Promise<Array<{ data, ref }>>`
  - Crea `AdvancedMarkerElement` personalizzati per PL e QE, gestisce click e InfoWindow React.
- `setupMarkerClustering(...) => Promise<{ markers, legendColorMap }>`
  - Importa librerie `marker` e `core`, crea marker in batch e prepara clustering con `MarkerClusterer` (renderer custom).
- `filterMarkers(markersWithRef, filterType, map, selectedProprietaFilter): Array` — filtra e ricostruisce cluster/visibilità.
- `updateMarkerColors(markersWithRef, highlightOption, editingMarkerId, showPanelNumber, showStreetLampNumber): void` — ri-renderizza componenti React dei marker per aggiornare colori/etichette.
- `cleanupMapResources(): void` — rimuove clusterer, listener, risorse.
- `generateLegendColorMap(markers, highlightOption): { quadro, proprieta, lotto, tipo_lampada, tipo_apparecchio }`

Componenti interni (solo per marker custom):
- `ElectricPanelMarker({ color, hasActiveNotifications, isOutOfLaw, nPanel, showPanelNumber })`
- `StreetLampMarker({ color, hasActiveNotifications, isOutOfLaw, nPanel })`

Note:
- Evidenziazione segnalazioni: triangolo giallo/rosso se in corso e/o fuori norma (`isOlderThan`).
- Colorazione coordinata per opzioni: `MARKER`, `PROPRIETA`, `LOTTO`, `TIPO_LAMPADA`, `TIPO_APPARECCHIO`.

## `pushNotifications.js`
Percorso: `src/utils/pushNotifications.js`

- `sendPushNotification(title: string, body: string, userId: string): Promise<any>`
  - Richiede `VITE_SERVER_URL` e usa `api` di `UserContext`.

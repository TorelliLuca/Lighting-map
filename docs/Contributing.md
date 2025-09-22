# Contributing

Grazie per il tuo contributo a Lighting Map! Questa guida descrive come lavorare in modo coerente con gli standard del progetto.

## Requisiti di stile e qualità
- Eslint attivo: esegui `npm run lint` prima di aprire una PR.
- Nominare in modo descrittivo componenti/variabili/props.
- Commenti JSDoc utili per funzioni complesse e hook.
- Mantieni componenti presentazionali "puramente visivi" separati da quelli "container".

## Branching e PR
- Crea branch dal principale (es. `feature/<descrizione>`, `fix/<ticket>`).
- Descrivi il problema, la soluzione proposta, e eventuali impatti sulla UI/ux.
- Allegare screenshot/gif quando modifichi UI o interazioni.

## Test manuali
- Verifica flussi chiave in `Dashboard` (filtri, legenda, ricerca, edit, mappe in entrambe le modalità).
- Controlla `UserContext`: login/logout, refresh token, chiamate API.

## Documentazione
- Aggiorna `docs/` se introduci nuovi hook, util o componenti di rilievo.
- Aggiungi sezioni o note in `Architecture.md` se cambi i flussi principali.

## Convenzioni
- Paths pubblici coerenti con `package.json.homepage` (`/LIGHTING-MAP/`).
- Evita side effects nei render, usa `useEffect` con dipendenze esplicite.
- Pulizia: rimuovi listener/layers su unmount o su cambio dipendenze (vedi `MapLibreMap.jsx`).

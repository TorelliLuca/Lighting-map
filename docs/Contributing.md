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

## Test automatici

### Unit (Vitest)
- `npm run test:unit` — logica pura e componenti UI leggeri (jsdom, senza browser).
- `npm run test:unit:watch` — modalità watch in sviluppo.
- `npm run test:coverage` — coverage su `src/utils` e `src/hooks`.
- `npm run test:storybook` — test delle story Storybook (browser Playwright via Vitest).

Quando tocchi helper in `src/utils/utils.js`, permessi ruolo o badge, aggiorna o aggiungi test co-located (`*.test.js` / `*.test.jsx`).

### E2E (Playwright)
1. Assicurati che il backend locale sia avviato.
2. Copia `.env.e2e.example` → `.env.e2e` e imposta `E2E_EMAIL` / `E2E_PASSWORD`.
3. Installa il browser una volta: `npm run test:e2e:install`.
4. Lancia `npm run test:e2e` (riusa Vite su `:5174` se già avviato, altrimenti lo parte Playwright).
   Nei test usa path relativi al `baseURL` (es. `page.goto("login")`, non `"/login"`), perché l’app è sotto `/LIGHTING-MAP/`.

Opzionali: `npm run test:e2e:ui`, `npm run test:e2e:headed`.

### Demo video (Playwright recordings)
Registrano il viewport in headless (nessuna finestra browser), utili per PR/docs dopo modifiche UI.

1. Backend + `.env.e2e` come per gli E2E.
2. `npm run record:demo` — genera WebM in `videos/raw/`.
3. Opzionale: `npm run record:demo:mp4` — converte in MP4 con ffmpeg (deve essere nel PATH).

Env utili: `PW_SLOWMO=120` (azioni più lente), `PW_DEMO=login-dashboard` o `PW_DEMO=quote-rejection` (una sola spec sotto `e2e/demos/`).
Le demo non partono con `npm run test:e2e`. Per aggiungere un flusso: crea `e2e/demos/<nome>.spec.js` e riusa `e2e/demos/helpers.js`.

Demo disponibili:
- `login-dashboard` — login e navigazione base (`E2E_EMAIL` / `E2E_PASSWORD`)
- `quote-rejection` — DEC respinge contestando una voce, manutentore corregge e reinvia (`E2E_MAINTAINER_*` + `E2E_ADMIN_*`)

I test E2E coprono smoke (login, route protette, navigazione base, gate ruoli) e, se configurati `E2E_MAINTAINER_*` + `E2E_ADMIN_*`, il flusso completo di respingimento/revisione preventivo (`quote-rejection.spec.js`). Non testare pan/zoom mappa o pixel-perfect.

Per il flusso preventivi servono backend avviato, un titolare manutentore (`LEAD_MAINTAINER`) e un amministratore DEC/RUP sullo stesso comune. In dev puoi usare i profili di `npm run login:dev` (es. `prova@2.com` / `giocoso`).

In CI: il job Vitest unit è sempre obbligatorio; Playwright parte solo se i secrets `E2E_EMAIL` e `E2E_PASSWORD` sono impostati.

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

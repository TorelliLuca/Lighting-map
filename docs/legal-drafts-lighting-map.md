# Meta

- lastUpdated: 2026-09-13
- productName: LightingMap
- isDraft: false
- legalName: [DA COMPILARE: Ragione sociale del Titolare, es. Studio Elettrotecnico Torelli S.r.l.]
- address: [DA COMPILARE: Indirizzo completo della sede legale]
- vatOrFiscalCode: [DA COMPILARE: P. IVA / C.F.]
- email: sicurezza@torellistudio.com
- pec: [DA COMPILARE: Indirizzo PEC]
- website: https://www.torellistudio.com
- dpo.appointed: false

---

# INFORMATIVA SUL TRATTAMENTO DEI DATI PERSONALI (LightingMap)
*Resa ai sensi degli artt. 13 e 14 del Regolamento UE 2016/679 ("GDPR") e del D.Lgs. 196/2003 e s.m.i.*

## 1. Premessa e Oggetto del Servizio

La presente Informativa sulla Privacy descrive le modalità di raccolta, utilizzo, conservazione e protezione dei dati personali degli utenti (di seguito "Utenti", che include amministratori, tecnici, manutentori, clienti e operatori) che accedono e utilizzano la piattaforma web e mobile **LightingMap** (di seguito "Piattaforma").

LightingMap è una soluzione software WebGIS dedicata alla mappatura, gestione, segnalazione guasti e manutenzione delle infrastrutture di illuminazione pubblica e impianti tecnologici.

## 2. Ruoli nel Trattamento dei Dati (Titolare e Responsabile)

Ai fini della normativa sulla protezione dei dati personali:

1. **[legalName] è Titolare del Trattamento (Art. 4 n. 7 GDPR)** per i dati relativi alla registrazione delle utenze, alle credenziali di autenticazione, all'invio di notifiche tecniche e alla sicurezza informatica della Piattaforma.
2. **[legalName] agisce in qualità di Responsabile del Trattamento (Art. 28 GDPR)** per conto dei Comuni, Enti Pubblici o Imprese clienti (Titolari del Trattamento) relativamente ai dati contenuti nelle segnalazioni operative, nei verbali di sopralluogo, nei preventivi/consuntivi e nei registri di manutenzione inerenti gli impianti di illuminazione pubblica gestiti tramite il software.

### Dati di contatto del Titolare:
* **Titolare del Trattamento:** [legalName]
* **Sede Legale:** [address]
* **Codice Fiscale / P. IVA:** [vatOrFiscalCode]
* **Sito web:** https://www.torellistudio.com
* **E-mail Privacy:** sicurezza@torellistudio.com
* **PEC:** [pec, se presente]

## 3. Categorie di Dati Personali Trattati

La Piattaforma raccoglie e tratta le seguenti tipologie di dati:

* **Dati di registrazione e profilo utente:** Nome, cognome, indirizzo e-mail, ruolo aziendale o operativo, Comune o Ente associato.
* **Credenziali di autenticazione:** Indirizzo email, password salvata in forma cifrata ed irreversibile (hash salato) e token di sessione (JWT).
* **Dati di geolocalizzazione e dati cartografici:** Coordinate GPS del dispositivo forniti dall'utente per la localizzazione sulla mappa durante la segnalazione o la manutenzione sul campo; posizione geografica dei punti luce e degli interventi.
* **Dati operativi e manutentivi:** Informazioni inserite negli interventi, note di cantiere, foto allegate ai sopralluoghi, preventivi, consuntivi e segnalazioni di anomalia.
* **Dati per le Notifiche Push:** Token identificativo del dispositivo/browser generato per l'invio delle comunicazioni di servizio (es. nuovi guasti assegnati o aggiornamento stato interventi).
* **Dati di log e di navigazione:** Indirizzo IP, data e ora di accesso, user-agent, log delle operazioni critiche di backend (audit log).
* **Preferenze di navigazione:** Stato dei filtri della mappa, città o livello di zoom preferito salvati sul dispositivo dell'utente.

## 4. Finalità, Basi Giuridiche e Tempi di Conservazione

| Finalità del Trattamento | Categorie di Dati | Base Giuridica (Art. 6 GDPR) | Periodo di Conservazione |
| :--- | :--- | :--- | :--- |
| **A. Erogazione dei servizi della Piattaforma** (creazione account, autenticazione, gestione delle funzionalità WebGIS e operativa). | Anagrafica, e-mail, credenziali, ruoli. | **Esecuzione del contratto** o di misure precontrattuali (Art. 6.1.b GDPR). | Per tutta la durata dell'account e fino a 12 mesi dalla chiusura dell'utenza. |
| **B. Gestione operativa degli impianti per conto degli Enti/Clienti** (segnalazioni, preventivi, consuntivi, verbali). | Dati operativi, allegati, coordinate impianti. | **Esecuzione del contratto** del cliente con l'Ente (Art. 6.1.b) o **Adempimento di un compito di interesse pubblico** (Art. 6.1.e). | Conservati secondo i termini contrattuali siglati con l'Ente Titolare e/o per i tempi prescritti dalla legge (10 anni per atti contabili). |
| **C. Geolocalizzazione in mappa sul campo** (ricerca impianti nelle vicinanze, posizionamento interventi). | Coordinate GPS del dispositivo. | **Consenso dell'interessato** espresso tramite il browser o le autorizzazioni del dispositivo (Art. 6.1.a GDPR). | I dati di posizione GPS in tempo reale sono processati all'istante e non tracciati in modo continuo, salvo salvataggio esplicito nella segnalazione. |
| **D. Invio di Notifiche Push** (avvisi su interventi, guasti o aggiornamenti di stato). | Token identificativo push del dispositivo. | **Consenso dell'interessato** fornito al momento dell'abilitazione del servizio (Art. 6.1.a GDPR). | Fino alla revoca del consenso da parte dell'utente (disattivazione delle notifiche da browser o dispositivo). |
| **E. Sicurezza informatica e prevenzione frodi/abusi** (audit log, tracciamento tentativi di accesso). | IP, timestamp, log di sistema, user-agent. | **Legittimo Interesse** del Titolare al mantenimento dell'integrità dei sistemi (Art. 6.1.f GDPR / Art. 32). | **12 mesi** dalla generazione del log, salvo esigenze legali o contenziosi. |
| **F. Adempimenti contabili e fiscali** (ove applicabili a licenze o servizi a pagamento). | Dati di fatturazione e anagrafici. | **Obbligo di legge** (Art. 6.1.c GDPR). | **10 anni** ai sensi dell'Art. 2220 del Codice Civile. |

## 5. Modalità del Trattamento e Sicurezza dei Dati

Il trattamento è eseguito prevalentemente con strumenti informatici. Il Titolare garantisce l'adozione di misure di sicurezza adeguate ex Art. 32 GDPR, tra cui:
* Cifratura di tutte le comunicazioni in transito tramite protocollo HTTPS / TLS.
* Cifratura delle password memorizzate nel database tramite algoritmi di hashing sicuri (es. bcrypt/argon2).
* Architettura ad accessi basati sui ruoli (RBAC) per garantire che ciascun utente acceda esclusivamente ai dati di propria competenza.
* Backup periodici cifrati e protezione del database da accessi non autorizzati.

## 6. Destinatari dei Dati e Trasferimenti

I dati personali potranno essere condivisi con:

1. **Personale autorizzato e istruito dal Titolare** (sviluppatori, tecnici manutentori, assistenza).
2. **Fornitori di servizi terzi (Responsabili del Trattamento ex art. 28 GDPR):** Fornitori di hosting cloud, database gestiti, servizi di invio e-mail transazionali.
3. **Fornitori di servizi cartografici (Tile Server / Mappe):** Durante la visualizzazione della mappa, il client può inviare richieste a servizi cartografici (es. MapLibre / OpenStreetMap / Google Maps). Tali richieste comportano la trasmissione dell'indirizzo IP del dispositivo al provider per l'erogazione delle tile di mappa.
4. **Enti Pubblici e Autorità di Vigilanza:** Qualora sia richiesto dalla legge o da ordini vincolanti delle Autorità competenti.

### Trasferimento Dati Extra-UE:
I dati sono conservati su server situati all'interno dello Spazio Economico Europeo (SEE). Qualora alcuni servizi di terze parti richiedessero il trasferimento verso paesi extra-UE, tale trasferimento avverrà esclusivamente in presenza di una Decisione di Adeguatezza della Commissione Europea (es. EU-US Data Privacy Framework) o tramite la stipula di Clausole Contrattuali Standard (SCC).

## 7. Diritti dell'Interessato

Gli utenti possono esercitare in qualsiasi momento i diritti sanciti dagli artt. 15 e ss. del GDPR:

* Accesso, rettifica, aggiornamento e cancellazione dei propri dati.
* Limitazione o opposizione al trattamento.
* Portabilità dei dati in formato strutturato e leggibile da dispositivo automatico.
* Revoca del consenso in qualsiasi momento (per notifiche push e geolocalizzazione) senza pregiudicare la liceità del trattamento effettuato prima della revoca.

Per esercitare tali diritti, è possibile inviare una richiesta scritta a: **sicurezza@torellistudio.com**.

Gli utenti hanno inoltre il diritto di proporre reclamo all'Autorità Garante per la Protezione dei Dati Personali (www.garanteprivacy.it).

---

# COOKIE POLICY E TECNOLOGIE DI ARCHIVIAZIONE LOCALE

## 1. Cosa sono queste tecnologie

La piattaforma **LightingMap** utilizza cookie tecnici e tecnologie di archiviazione web locale (come `localStorage` e `sessionStorage` HTML5) per garantire il corretto funzionamento delle mappe, il mantenimento delle sessioni di lavoro sicure e il salvataggio delle preferenze grafiche.

## 2. Elenco dettagliato delle tecnologie impiegate

Non vengono utilizzati cookie o strumenti di tracciamento per finalità pubblicitarie o di profilazione commerciale.

| Nome / Chiave Storage | Tipologia | Durata | Scopo / Finalità | Consenso Obbligatorio? |
| :--- | :--- | :--- | :--- | :--- |
| `jwt_token` / `auth` | `localStorage` | Fino a logout / Scadenza token | Mantenimento della sessione di autenticazione dell'utente per evitare il re-login continuo. | **NO** (Tecnico essenziale) |
| `map_settings` (zoom, centro, filtri) | `localStorage` | Permanente (fino a reset) | Salvataggio delle preferenze di visualizzazione della mappa per velocizzare l'esperienza d'uso. | **NO** (Funzionale) |
| `push_subscription_token` | `localStorage` | Fino a disattivazione | Memorizzazione dell'adesione dell'utente al servizio di Notifiche Push. | **SI** (Legato al consenso notifiche) |
| `tour_completed` | `sessionStorage` | Sessione browser | Gestione degli avvisi e dei tutorial guida per le prime interazioni. | **NO** (Funzionale) |

## 3. Gestione del Consenso e Banner Cookie

In conformità alle **Linee Guida del Garante Privacy del 10 giugno 2021** e alla direttiva ePrivacy:
* I cookie e gli strumenti di memorizzazione **strettamente necessari** o **funzionali** non richiedono un banner preventivo con pulsante "Accetta/Rifiuta", ma sono dettagliati nella presente policy.
* Nel caso in cui in futuro venissero integrati strumenti di web analytics non anonimizzati o servizi di profilazione, la Piattaforma provvederà ad integrare un idoneo Cookie Banner prima di abilitare i relativi script.

## 4. Disattivazione e pulizia dei dati locali

L'utente può gestire, bloccare o eliminare la memorizzazione locale in qualsiasi momento modificando le impostazioni del proprio browser web:

* **Google Chrome:** Impostazioni > Privacy e sicurezza > Cookie e altri dati dei siti.
* **Mozilla Firefox:** Opzioni > Privacy e sicurezza > Cookie e dati dei siti web.
* **Microsoft Edge:** Impostazioni > Cookie e autorizzazioni sito.
* **Safari:** Preferenze > Privacy > Gestisci dati siti web.

Per revocare le **Notifiche Push**, l'utente può accedere alle impostazioni di autorizzazione del proprio browser (icona del lucchetto vicino all'URL nella barra degli indirizzi) oppure alle impostazioni notifiche del sistema operativo mobile/desktop.

## 5. Aggiornamenti e Contatti
Per domande sulla presente Cookie Policy: **sicurezza@torellistudio.com**.

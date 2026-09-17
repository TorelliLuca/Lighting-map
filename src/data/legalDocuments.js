/**
 * Testi legali LightingMap (Privacy + Cookie).
 * Compila i campi in LEGAL_META.controller e aggiorna lastUpdated
 * dopo ogni revisione.
 *
 * Fonte editabile: docs/legal-drafts-lighting-map.md
 */

export const LEGAL_META = {
  isDraft: false,
  lastUpdated: "2026-09-13",
  productName: "LightingMap",
  controller: {
    legalName: "STUDIO ELETTROTECNICO P.I. TORELLI SOCIETA' SEMPLICE",
    address: "Corso Antonio Gramsci, 15/B, 12100 Cuneo CN",
    vatOrFiscalCode: "02117140042",
    email: "info@torellistudio.com",
    pec: "torellistudio@pec.it",
    website: "https://www.torellistudio.com",
  },
  dpo: {
    appointed: false,
    email: "",
  },
}

const draftNotice =
  "Questo documento è una bozza operativa predisposta dal team di sviluppo. Non costituisce ancora l’informativa ufficiale: i contenuti saranno revisionati e validati da un consulente privacy prima della pubblicazione definitiva."

export const privacyPolicy = {
  id: "privacy",
  title: "Informativa sul trattamento dei dati personali",
  subtitle:
    'Resa ai sensi degli artt. 13 e 14 del Regolamento UE 2016/679 ("GDPR") e del D.Lgs. 196/2003 e s.m.i.',
  path: "/privacy",
  draftNotice,
  sections: [
    {
      heading: "1. Premessa e oggetto del servizio",
      paragraphs: [
        `La presente Informativa sulla Privacy descrive le modalità di raccolta, utilizzo, conservazione e protezione dei dati personali degli utenti (di seguito "Utenti", che include amministratori, tecnici, manutentori, clienti e operatori) che accedono e utilizzano la piattaforma web e mobile ${LEGAL_META.productName} (di seguito "Piattaforma").`,
        "LightingMap è una soluzione software WebGIS dedicata alla mappatura, gestione, segnalazione guasti e manutenzione delle infrastrutture di illuminazione pubblica e impianti tecnologici.",
      ],
    },
    {
      heading: "2. Ruoli nel trattamento dei dati (Titolare e Responsabile)",
      paragraphs: [
        "Ai fini della normativa sulla protezione dei dati personali:",
      ],
      numberedList: [
        `${LEGAL_META.controller.legalName} è Titolare del Trattamento (Art. 4 n. 7 GDPR) per i dati relativi alla registrazione delle utenze, alle credenziali di autenticazione, all'invio di notifiche tecniche e alla sicurezza informatica della Piattaforma.`,
        `${LEGAL_META.controller.legalName} agisce in qualità di Responsabile del Trattamento (Art. 28 GDPR) per conto dei Comuni, Enti Pubblici o Imprese clienti (Titolari del Trattamento) relativamente ai dati contenuti nelle segnalazioni operative, nei verbali di sopralluogo, nei preventivi/consuntivi e nei registri di manutenzione inerenti gli impianti di illuminazione pubblica gestiti tramite il software.`,
      ],
      paragraphsAfter: ["Dati di contatto del Titolare:"],
      definitionList: [
        { term: "Titolare del Trattamento", description: LEGAL_META.controller.legalName },
        { term: "Sede Legale", description: LEGAL_META.controller.address },
        { term: "Codice Fiscale / P. IVA", description: LEGAL_META.controller.vatOrFiscalCode },
        { term: "Sito web", description: LEGAL_META.controller.website },
        { term: "E-mail Privacy", description: LEGAL_META.controller.email },
        ...(LEGAL_META.controller.pec
          ? [{ term: "PEC", description: LEGAL_META.controller.pec }]
          : []),
      ],
    },
    {
      heading: "3. Categorie di dati personali trattati",
      paragraphs: ["La Piattaforma raccoglie e tratta le seguenti tipologie di dati:"],
      definitionList: [
        {
          term: "Dati di registrazione e profilo utente",
          description:
            "Nome, cognome, indirizzo e-mail, ruolo aziendale o operativo, Comune o Ente associato.",
        },
        {
          term: "Credenziali di autenticazione",
          description:
            "Indirizzo email, password salvata in forma cifrata ed irreversibile (hash salato) e token di sessione (JWT).",
        },
        {
          term: "Dati di geolocalizzazione e dati cartografici",
          description:
            "Coordinate GPS del dispositivo forniti dall'utente per la localizzazione sulla mappa durante la segnalazione o la manutenzione sul campo; posizione geografica dei punti luce e degli interventi.",
        },
        {
          term: "Dati operativi e manutentivi",
          description:
            "Informazioni inserite negli interventi, note di cantiere, foto allegate ai sopralluoghi, preventivi, consuntivi e segnalazioni di anomalia.",
        },
        {
          term: "Dati per le Notifiche Push",
          description:
            "Token identificativo del dispositivo/browser generato per l'invio delle comunicazioni di servizio (es. nuovi guasti assegnati o aggiornamento stato interventi).",
        },
        {
          term: "Dati di log e di navigazione",
          description:
            "Indirizzo IP, data e ora di accesso, user-agent, log delle operazioni critiche di backend (audit log).",
        },
        {
          term: "Preferenze di navigazione",
          description:
            "Stato dei filtri della mappa, città o livello di zoom preferito salvati sul dispositivo dell'utente.",
        },
      ],
    },
    {
      heading: "4. Finalità, basi giuridiche e tempi di conservazione",
      table: {
        headers: [
          "Finalità del trattamento",
          "Categorie di dati",
          "Base giuridica (Art. 6 GDPR)",
          "Periodo di conservazione",
        ],
        rows: [
          [
            "A. Erogazione dei servizi della Piattaforma (creazione account, autenticazione, gestione delle funzionalità WebGIS e operativa).",
            "Anagrafica, e-mail, credenziali, ruoli.",
            "Esecuzione del contratto o di misure precontrattuali (Art. 6.1.b GDPR).",
            "Per tutta la durata dell'account e fino a 12 mesi dalla chiusura dell'utenza.",
          ],
          [
            "B. Gestione operativa degli impianti per conto degli Enti/Clienti (segnalazioni, preventivi, consuntivi, verbali).",
            "Dati operativi, allegati, coordinate impianti.",
            "Esecuzione del contratto del cliente con l'Ente (Art. 6.1.b) o adempimento di un compito di interesse pubblico (Art. 6.1.e).",
            "Conservati secondo i termini contrattuali siglati con l'Ente Titolare e/o per i tempi prescritti dalla legge (10 anni per atti contabili).",
          ],
          [
            "C. Geolocalizzazione in mappa sul campo (ricerca impianti nelle vicinanze, posizionamento interventi).",
            "Coordinate GPS del dispositivo.",
            "Consenso dell'interessato espresso tramite il browser o le autorizzazioni del dispositivo (Art. 6.1.a GDPR).",
            "I dati di posizione GPS in tempo reale sono processati all'istante e non tracciati in modo continuo, salvo salvataggio esplicito nella segnalazione.",
          ],
          [
            "D. Invio di Notifiche Push (avvisi su interventi, guasti o aggiornamenti di stato).",
            "Token identificativo push del dispositivo.",
            "Consenso dell'interessato fornito al momento dell'abilitazione del servizio (Art. 6.1.a GDPR).",
            "Fino alla revoca del consenso da parte dell'utente (disattivazione delle notifiche da browser o dispositivo).",
          ],
          [
            "E. Sicurezza informatica e prevenzione frodi/abusi (audit log, tracciamento tentativi di accesso).",
            "IP, timestamp, log di sistema, user-agent.",
            "Legittimo interesse del Titolare al mantenimento dell'integrità dei sistemi (Art. 6.1.f GDPR / Art. 32).",
            "12 mesi dalla generazione del log, salvo esigenze legali o contenziosi.",
          ],
          [
            "F. Adempimenti contabili e fiscali (ove applicabili a licenze o servizi a pagamento).",
            "Dati di fatturazione e anagrafici.",
            "Obbligo di legge (Art. 6.1.c GDPR).",
            "10 anni ai sensi dell'Art. 2220 del Codice Civile.",
          ],
        ],
      },
    },
    {
      heading: "5. Modalità del trattamento e sicurezza dei dati",
      paragraphs: [
        "Il trattamento è eseguito prevalentemente con strumenti informatici. Il Titolare garantisce l'adozione di misure di sicurezza adeguate ex Art. 32 GDPR, tra cui:",
      ],
      list: [
        "Cifratura di tutte le comunicazioni in transito tramite protocollo HTTPS / TLS.",
        "Cifratura delle password memorizzate nel database tramite algoritmi di hashing sicuri (es. bcrypt/argon2).",
        "Architettura ad accessi basati sui ruoli (RBAC) per garantire che ciascun utente acceda esclusivamente ai dati di propria competenza.",
        "Backup periodici cifrati e protezione del database da accessi non autorizzati.",
      ],
    },
    {
      heading: "6. Destinatari dei dati e trasferimenti",
      paragraphs: ["I dati personali potranno essere condivisi con:"],
      numberedList: [
        "Personale autorizzato e istruito dal Titolare (sviluppatori, tecnici manutentori, assistenza).",
        "Fornitori di servizi terzi (Responsabili del Trattamento ex art. 28 GDPR): fornitori di hosting cloud, database gestiti, servizi di invio e-mail transazionali.",
        "Fornitori di servizi cartografici (Tile Server / Mappe): durante la visualizzazione della mappa, il client può inviare richieste a servizi cartografici (es. MapLibre / OpenStreetMap / Google Maps). Tali richieste comportano la trasmissione dell'indirizzo IP del dispositivo al provider per l'erogazione delle tile di mappa.",
        "Enti Pubblici e Autorità di Vigilanza: qualora sia richiesto dalla legge o da ordini vincolanti delle Autorità competenti.",
      ],
      paragraphsAfter: [
        "Trasferimento dati Extra-UE: i dati sono conservati su server situati all'interno dello Spazio Economico Europeo (SEE). Qualora alcuni servizi di terze parti richiedessero il trasferimento verso paesi extra-UE, tale trasferimento avverrà esclusivamente in presenza di una Decisione di Adeguatezza della Commissione Europea (es. EU-US Data Privacy Framework) o tramite la stipula di Clausole Contrattuali Standard (SCC).",
      ],
    },
    {
      heading: "7. Diritti dell'interessato",
      paragraphs: [
        "Gli utenti possono esercitare in qualsiasi momento i diritti sanciti dagli artt. 15 e ss. del GDPR:",
      ],
      list: [
        "Accesso, rettifica, aggiornamento e cancellazione dei propri dati.",
        "Limitazione o opposizione al trattamento.",
        "Portabilità dei dati in formato strutturato e leggibile da dispositivo automatico.",
        "Revoca del consenso in qualsiasi momento (per notifiche push e geolocalizzazione) senza pregiudicare la liceità del trattamento effettuato prima della revoca.",
      ],
      paragraphsAfter: [
        `Per esercitare tali diritti, è possibile inviare una richiesta scritta a: ${LEGAL_META.controller.email}.`,
        "Gli utenti hanno inoltre il diritto di proporre reclamo all'Autorità Garante per la Protezione dei Dati Personali (www.garanteprivacy.it).",
      ],
    },
  ],
}

export const cookiePolicy = {
  id: "cookie",
  title: "Cookie policy e tecnologie di archiviazione locale",
  path: "/cookie",
  draftNotice,
  sections: [
    {
      heading: "1. Cosa sono queste tecnologie",
      paragraphs: [
        `La piattaforma ${LEGAL_META.productName} utilizza cookie tecnici e tecnologie di archiviazione web locale (come localStorage e sessionStorage HTML5) per garantire il corretto funzionamento delle mappe, il mantenimento delle sessioni di lavoro sicure e il salvataggio delle preferenze grafiche.`,
      ],
    },
    {
      heading: "2. Elenco dettagliato delle tecnologie impiegate",
      paragraphs: [
        "Non vengono utilizzati cookie o strumenti di tracciamento per finalità pubblicitarie o di profilazione commerciale.",
      ],
      table: {
        headers: [
          "Nome / Chiave storage",
          "Tipologia",
          "Durata",
          "Scopo / Finalità",
          "Consenso obbligatorio?",
        ],
        rows: [
          [
            "jwt_token / auth",
            "localStorage",
            "Fino a logout / Scadenza token",
            "Mantenimento della sessione di autenticazione dell'utente per evitare il re-login continuo.",
            "NO (Tecnico essenziale)",
          ],
          [
            "map_settings (zoom, centro, filtri)",
            "localStorage",
            "Permanente (fino a reset)",
            "Salvataggio delle preferenze di visualizzazione della mappa per velocizzare l'esperienza d'uso.",
            "NO (Funzionale)",
          ],
          [
            "push_subscription_token",
            "localStorage",
            "Fino a disattivazione",
            "Memorizzazione dell'adesione dell'utente al servizio di Notifiche Push.",
            "SI (Legato al consenso notifiche)",
          ],
          [
            "tour_completed",
            "sessionStorage",
            "Sessione browser",
            "Gestione degli avvisi e dei tutorial guida per le prime interazioni.",
            "NO (Funzionale)",
          ],
        ],
      },
    },
    {
      heading: "3. Gestione del consenso e banner cookie",
      paragraphs: [
        "In conformità alle Linee Guida del Garante Privacy del 10 giugno 2021 e alla direttiva ePrivacy:",
      ],
      list: [
        'I cookie e gli strumenti di memorizzazione strettamente necessari o funzionali non richiedono un banner preventivo con pulsante "Accetta/Rifiuta", ma sono dettagliati nella presente policy.',
        "Nel caso in cui in futuro venissero integrati strumenti di web analytics non anonimizzati o servizi di profilazione, la Piattaforma provvederà ad integrare un idoneo Cookie Banner prima di abilitare i relativi script.",
      ],
    },
    {
      heading: "4. Disattivazione e pulizia dei dati locali",
      paragraphs: [
        "L'utente può gestire, bloccare o eliminare la memorizzazione locale in qualsiasi momento modificando le impostazioni del proprio browser web:",
      ],
      list: [
        "Google Chrome: Impostazioni > Privacy e sicurezza > Cookie e altri dati dei siti.",
        "Mozilla Firefox: Opzioni > Privacy e sicurezza > Cookie e dati dei siti web.",
        "Microsoft Edge: Impostazioni > Cookie e autorizzazioni sito.",
        "Safari: Preferenze > Privacy > Gestisci dati siti web.",
      ],
      paragraphsAfter: [
        "Per revocare le Notifiche Push, l'utente può accedere alle impostazioni di autorizzazione del proprio browser (icona del lucchetto vicino all'URL nella barra degli indirizzi) oppure alle impostazioni notifiche del sistema operativo mobile/desktop.",
      ],
    },
    {
      heading: "5. Aggiornamenti e contatti",
      paragraphs: [
        `Per domande sulla presente Cookie Policy: ${LEGAL_META.controller.email}.`,
        "Per l'informativa completa sul trattamento dei dati personali si rinvia alla Privacy policy.",
      ],
    },
  ],
}

export const legalDocuments = [privacyPolicy, cookiePolicy]

export function getLegalDocument(id) {
  return legalDocuments.find((doc) => doc.id === id) ?? null
}

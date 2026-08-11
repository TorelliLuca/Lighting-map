import {
  canApproveQuoteByRole,
  canManageQuotesByRole,
} from "../utils/utils"

/**
 * Tutorial per-pagina: prima visita → wizard breve + eventuali step spotlight.
 * pageId è salvato in preferences.seenPageTours.
 */

const step = (element, popover, extras = {}) => ({
  element,
  popover: {
    side: "bottom",
    align: "start",
    ...popover,
  },
  ...extras,
})

export const PAGE_TOURS = {
  quotes: {
    id: "quotes",
    label: "Preventivi IMS",
    description: "Bozze, filtri e creazione preventivi",
    path: "/quotes",
    match: (pathname) => pathname === "/quotes",
    roles: ["MAINTAINER", "SUPER_ADMIN"],
    wizard: [
      {
        title: "Bozze preventivi IMS",
        body: "Qui trovi e gestisci i preventivi in bozza, da revisionare o in approvazione per il comune selezionato.",
      },
      {
        title: "Cosa puoi fare",
        body: "Filtra per stato, crea una nuova bozza o apri un preventivo esistente per modificarlo e inviarlo.",
      },
    ],
    steps: [
      step('[data-tour="page-quotes-title"]', {
        title: "Lista preventivi",
        description: "Panoramica dei preventivi IMS legati al comune corrente.",
      }),
      step('[data-tour="page-quotes-filters"]', {
        title: "Filtri di stato",
        description: "Passa tra in lavorazione, bozze, in approvazione e approvati.",
      }),
      step('[data-tour="page-quotes-create"]', {
        title: "Nuova bozza",
        description: "Crea un nuovo preventivo collegato a una segnalazione su un punto luce.",
        side: "left",
        align: "end",
      }),
    ],
  },

  consuntivi: {
    id: "consuntivi",
    label: "Consuntivi IMS",
    description: "Lista e filtri dei consuntivi",
    path: "/consuntivi",
    match: (pathname) => pathname === "/consuntivi",
    roles: ["MAINTAINER", "SUPER_ADMIN", "ADMINISTRATOR"],
    wizard: [
      {
        title: "Consuntivi IMS",
        body: "I consuntivi documentano i costi a consuntivo dopo un intervento straordinario.",
      },
      {
        title: "Flusso",
        body: "Filtra per stato, apri un consuntivo in bozza per completarlo oppure revisionane uno in attesa.",
      },
    ],
    steps: [
      step('[data-tour="page-consuntivi-title"]', {
        title: "Lista consuntivi",
        description: "Elenco dei consuntivi IMS del comune selezionato.",
      }),
      step('[data-tour="page-consuntivi-filters"]', {
        title: "Filtri",
        description: "Seleziona bozze, in revisione, approvati o da revisionare.",
      }),
    ],
  },

  "quotes-approval": {
    id: "quotes-approval",
    label: "Approvazione IMS",
    description: "Coda preventivi e consuntivi da approvare",
    path: "/quotes/approval",
    match: (pathname) => pathname === "/quotes/approval",
    roles: ["ADMINISTRATOR", "SUPER_ADMIN"],
    roleCheck: (user) => canApproveQuoteByRole(user) || user?.user_type === "SUPER_ADMIN",
    wizard: [
      {
        title: "Approvazione IMS",
        body: "Qui RUP/DEC esaminano preventivi e consuntivi in attesa di approvazione.",
      },
      {
        title: "Come procedere",
        body: "Scegli preventivi o consuntivi, filtra per stato e apri il documento per approvare o richiedere revisione.",
      },
    ],
    steps: [
      step('[data-tour="page-approval-title"]', {
        title: "Coda di approvazione",
        description: "Documenti IMS da revisionare per il comune corrente.",
      }),
      step('[data-tour="page-approval-type"]', {
        title: "Tipo documento",
        description: "Passa tra preventivi e consuntivi.",
      }),
      step('[data-tour="page-approval-status"]', {
        title: "Stato",
        description: "Filtra per in approvazione, approvati o da revisionare.",
      }),
    ],
  },

  report: {
    id: "report",
    label: "Segnalazione guasto",
    description: "Modulo di segnalazione sul punto luce",
    path: "/report?tourDemo=1",
    match: (pathname) => pathname === "/report",
    roles: ["DEFAULT_USER", "MAINTAINER", "ADMINISTRATOR", "SUPER_ADMIN"],
    wizard: [
      {
        title: "Nuova segnalazione",
        body: "Stai segnalando un guasto sul punto luce selezionato dalla mappa.",
      },
      {
        title: "Compilazione",
        body: "Indica tipo di guasto (e classe di rischio se richiesto), aggiungi una descrizione e invia. La classificazione potrà essere rivista in sopralluogo.",
      },
    ],
    steps: [
      step('[data-tour="page-report-title"]', {
        title: "Segnala guasto",
        description: "Modulo di segnalazione per il punto luce selezionato.",
      }),
      step('[data-tour="page-report-point"]', {
        title: "Punto selezionato",
        description: "Verifica numero palo, comune e indirizzo prima di inviare.",
      }),
      step('[data-tour="page-report-form"]', {
        title: "Dettagli segnalazione",
        description: "Seleziona il tipo di guasto adeguato e una classe di rischio provvisoria. Indica una descrizione (opzionale) e invia la segnalazione.",
      }),
    ],
  },

  operation: {
    id: "operation",
    label: "Chiusura intervento",
    description: "Documenta e chiudi un intervento",
    path: "/operation?tourDemo=1",
    match: (pathname) => pathname === "/operation",
    roles: ["MAINTAINER", "SUPER_ADMIN"],
    wizard: [
      {
        title: "Chiusura intervento",
        body: "Documenta l’intervento eseguito sul punto luce e chiudi la segnalazione collegata.",
      },
      {
        title: "Cosa fare",
        body: "Verifica il punto, seleziona la segnalazione da chiudere, aggiungi note e conferma il ripristino.",
      },
    ],
    steps: [
      step('[data-tour="page-operation-title"]', {
        title: "Chiudi intervento",
        description: "Pagina di chiusura intervento sul punto selezionato dalla mappa.",
      }),
      step('[data-tour="page-operation-point"]', {
        title: "Punto e contesto",
        description: "Controlla numero palo, comune e tipo di manutenzione (ordinaria/straordinaria).",
      }),
      step('[data-tour="page-operation-form"]', {
        title: "Chiusura",
        description: "Seleziona la segnalazione (se presenti più segnalazioni aperte sul punto), inserisci eventuali note (opzionale) e conferma.",
      }),
    ],
  },

  inspection: {
    id: "inspection",
    label: "Sopralluogo",
    description: "Esito e note del sopralluogo",
    path: "/inspection",
    replayable: false,
    match: (pathname) => pathname === "/inspection",
    roles: ["MAINTAINER", "SUPER_ADMIN"],
    wizard: [
      {
        title: "Sopralluogo",
        body: "Registra l’esito del sopralluogo: risoluzione, sospensione, programmazione o richiesta preventivo.",
      },
    ],
    steps: [
      step('[data-tour="page-inspection-title"]', {
        title: "Sopralluogo",
        description: "Scegli l’esito e salva le note del sopralluogo.",
      }),
    ],
  },

  extraordinary: {
    id: "extraordinary",
    label: "Straordinarie",
    description: "Dashboard interventi straordinari",
    path: "/extraordinary",
    match: (pathname) => pathname === "/extraordinary",
    roles: ["MAINTAINER", "SUPER_ADMIN", "ADMINISTRATOR"],
    wizard: [
      {
        title: "Straordinarie",
        body: "Panoramica delle segnalazioni straordinarie e del flusso preventivo / intervento / consuntivo.",
      },
    ],
    steps: [
      step('[data-tour="page-extraordinary-title"]', {
        title: "Dashboard straordinarie",
        description: "Monitora e apri le pratiche straordinarie del comune.",
      }),
    ],
  },
}

export const resolvePageTourId = (pathname) => {
  if (!pathname) return null
  for (const tour of Object.values(PAGE_TOURS)) {
    if (tour.match(pathname)) return tour.id
  }
  return null
}

export const getPageTour = (pageId) => PAGE_TOURS[pageId] || null

export const canUserSeePageTour = (tour, user) => {
  if (!tour) return false
  if (typeof tour.roleCheck === "function") return tour.roleCheck(user)
  if (!tour.roles) return true
  const type = user?.user_type
  if (type === "SUPER_ADMIN") return true
  return tour.roles.includes(type)
}

/** Alias utile: manutentori vedono quotes anche se LEAD */
export const shouldShowPageTour = (pageId, user, seenPageTours = {}) => {
  const tour = getPageTour(pageId)
  if (!tour) return false
  if (seenPageTours?.[pageId]) return false
  if (!canUserSeePageTour(tour, user)) return false
  // quotes: anche LEAD_MAINTAINER via canManageQuotes
  if (pageId === "quotes" && !canManageQuotesByRole(user) && user?.user_type !== "SUPER_ADMIN") {
    return false
  }
  if (pageId === "quotes-approval" && !canApproveQuoteByRole(user) && user?.user_type !== "SUPER_ADMIN") {
    return false
  }
  return true
}

export const DASHBOARD_TOUR_META = {
  id: "dashboard",
  label: "Mappa (Dashboard)",
  description: "Filtri, città, ricerca e menu del comune",
  path: "/dashboard",
}

/**
 * Tutorial che l'utente può rifare dal profilo (in base al ruolo).
 * Report/operation usano una modalità demo se aperti senza punto luce.
 */
export const getReplayableTutorials = (user) => {
  const list = [{ ...DASHBOARD_TOUR_META, kind: "dashboard" }]

  for (const tour of Object.values(PAGE_TOURS)) {
    if (tour.replayable === false) continue
    if (!canUserSeePageTour(tour, user)) continue
    if (tour.id === "quotes" && !canManageQuotesByRole(user) && user?.user_type !== "SUPER_ADMIN") {
      continue
    }
    if (
      tour.id === "quotes-approval" &&
      !canApproveQuoteByRole(user) &&
      user?.user_type !== "SUPER_ADMIN"
    ) {
      continue
    }
    // Report: non per rilevatori (la pagina li reindirizza)
    if (tour.id === "report" && user?.user_type === "SURVEYOR") continue
    list.push({
      id: tour.id,
      label: tour.label || tour.id,
      description: tour.description || "",
      path: tour.path || "/",
      kind: "page",
    })
  }

  return list
}

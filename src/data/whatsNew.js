import {
  canApproveQuoteByRole,
  canManageQuotesByRole,
} from "../utils/utils"

/** ID novità corrente: al rilascio cambia questo valore e aggiungi entry in WHATS_NEW_ENTRIES. */
export const CURRENT_WHATS_NEW_ID = "2026-03-onboarding"

const WIZARD_BY_ROLE = {
  DEFAULT_USER: [
    {
      title: "Benvenuto in Lighting Map",
      body: "Consulta la mappa dei punti luce del tuo comune, cerca pali e quadri e segnala eventuali guasti.",
    },
    {
      title: "Orientati sulla mappa",
      body: "Cambia città, evidenzia le segnalazioni aperte e filtra i punti luce per trovare subito ciò che ti serve.",
    },
    {
      title: "Pronto per iniziare?",
      body: "Ti faremo fare un rapido tour della Dashboard. Ripetibile dal menu utente.",
    },
  ],
  MAINTAINER: [
    {
      title: "Benvenuto, manutentore",
      body: "Da qui gestisci segnalazioni, sopralluoghi e interventi sui punti luce assegnati ai tuoi comuni.",
    },
    {
      title: "Priorità operative",
      body: "Usa filtri ed evidenziazione per isolare le segnalazioni aperte, poi apri la scheda del punto luce per operare.",
    },
    {
      title: "Pronto per iniziare?",
      body: "Ti faremo fare un rapido tour della Dashboard. Ripetibile dal menu utente.",
    },
  ],
  ADMINISTRATOR: [
    {
      title: "Benvenuto, amministrazione",
      body: "Monitora lo stato dell’impianto e, se sei RUP/DEC, approva i preventivi IMS dal menu del comune.",
    },
    {
      title: "Controllo sulla mappa",
      body: "Filtra per segnalazioni aperte, cambia comune e consulta legenda e impostazioni per una lettura chiara dei dati.",
    },
    {
      title: "Pronto per iniziare?",
      body: "Ti faremo fare un rapido tour della Dashboard. Ripetibile dal menu utente.",
    },
  ],
  SURVEYOR: [
    {
      title: "Benvenuto, rilevatore",
      body: "Usa la mappa per consultare e aggiornare i punti luce: ricerca, filtri e strumenti di rilievo.",
    },
    {
      title: "Navigazione e dati",
      body: "Cambia città, evidenzia per quadro/lotto e filtra le segnalazioni prima di intervenire sui marker.",
    },
    {
      title: "Pronto per iniziare?",
      body: "Ti faremo fare un rapido tour della Dashboard. Ripetibile dal menu utente.",
    },
  ],
  SUPER_ADMIN: [
    {
      title: "Benvenuto, Super Admin",
      body: "Hai accesso completo: mappa, operazioni, preventivi IMS e strumenti di rilievo.",
    },
    {
      title: "Panoramica controlli",
      body: "Città, evidenziazione (segnalazioni aperte), filtri, impostazioni e menu operativi del comune.",
    },
    {
      title: "Pronto per iniziare?",
      body: "Ti faremo fare un rapido tour della Dashboard. Ripetibile dal menu utente.",
    },
  ],
}

const DEFAULT_WIZARD = WIZARD_BY_ROLE.DEFAULT_USER

export const getOnboardingWizardSlides = (user) => {
  const type = user?.user_type || "DEFAULT_USER"
  return WIZARD_BY_ROLE[type] || DEFAULT_WIZARD
}

/** @deprecated usare getOnboardingWizardSlides(user) */
export const ONBOARDING_WIZARD_SLIDES = DEFAULT_WIZARD

export const WHATS_NEW_ENTRIES = [
  {
    id: "2026-03-onboarding",
    title: "Novità",
    slides: [
      {
        title: "Tutorial interattivo",
        body: "Al primo accesso trovi una guida passo-passo sulla Dashboard, personalizzata in base al tuo ruolo. Puoi riaprirla da «Ripeti tutorial».",
      },
      {
        title: "What’s New",
        body: "Quando pubblichiamo aggiornamenti rilevanti, vedrai un riepilogo delle novità al successivo accesso.",
      },
    ],
  },
]

export const getCurrentWhatsNew = () =>
  WHATS_NEW_ENTRIES.find((entry) => entry.id === CURRENT_WHATS_NEW_ID) || null

const openMapControls = () => {
  window.dispatchEvent(new CustomEvent("lighting-map:map-controls-open"))
}

const closeMapControls = () => {
  window.dispatchEvent(new CustomEvent("lighting-map:map-controls-close"))
}

const step = (element, popover, extras = {}) => ({
  element,
  popover: {
    side: "top",
    align: "start",
    ...popover,
  },
  ...extras,
})

const mapControlsStep = (element, popover) =>
  step(element, popover, {
    onHighlightStarted: () => {
      openMapControls()
    },
  })

/** Controlli mappa (FAB): filtri + legenda + impostazioni. Add-menu e org/user sono assemblati a runtime. */
const MAP_CONTROL_STEPS = [
  mapControlsStep('[data-tour="map-filters"]', {
    title: "Filtri e città",
    description:
      "Apri questo pannello per cambiare comune, evidenziare i punti luce e applicare i filtri sulla mappa.",
    side: "right",
    align: "center",
  }),
  mapControlsStep('[data-tour="map-city"]', {
    title: "Cambia città",
    description:
      "Seleziona il comune da visualizzare. Al cambio vengono caricati solo i punti luce di quella città.",
    side: "right",
    align: "start",
  }),
  mapControlsStep('[data-tour="map-highlight"]', {
    title: "Evidenzia · Segnalazioni aperte",
    description:
      "Di default evidenzia le segnalazioni aperte. Puoi anche colorare per quadro, proprietà, lotto, lampada o apparecchio.",
    side: "right",
    align: "start",
  }),
  mapControlsStep('[data-tour="map-filter"]', {
    title: "Filtra i punti luce",
    description:
      "Restringi la mappa: solo segnalazioni aperte, solo quadri, oppure per proprietà (Municipale / EnelSole).",
    side: "right",
    align: "start",
  }),
  
  step('[data-tour="settings-menu"]', {
    title: "Impostazioni mappa",
    description:
      "Attiva/disattiva numeri pali/quadri, linee elettriche e modalità semplice/complessa. Stampa la mappa e scarica il report delle segnalazioni.",
    side: "right",
    align: "center",
  },
  { onHighlightStarted: closeMapControls },),
  step(
    '[data-tour="legend"]',
    {
      title: "Legenda",
      description:
        "Guida ai colori dei marker in base all’evidenziazione attiva (segnalazioni, lotto, proprietà…).",
      side: "right",
      align: "center",
    },
    
  ),
]

const openOrgMenu = () => {
  window.dispatchEvent(new CustomEvent("lighting-map:org-menu-open"))
}

const closeOrgMenu = () => {
  window.dispatchEvent(new CustomEvent("lighting-map:org-menu-close"))
}

const SEARCH_STEP = step(
  '[data-tour="search-bar"]',
  {
    title: "Ricerca",
    description:
      "Cerca punti luce, quadri o lotti. Usa i filtri della barra per restringere i risultati.",
    side: "bottom",
    align: "center",
  },
  {
    onHighlightStarted: () => {
      closeMapControls()
      closeOrgMenu()
    },
  },
)

const USER_MENU_STEP = step(
  '[data-tour="user-menu"]',
  {
    title: "Menu utente",
    description:
      "Profilo, notifiche, organizzazione, manuale e  dal profilo puoi ripetere il tutorial o vedere le novità.",
    side: "bottom",
    align: "end",
  },
  {
    onHighlightStarted: () => {
      closeMapControls()
      closeOrgMenu()
    },
  },
)

const orgMenuStep = (element, popover) =>
  step(element, popover, {
    onHighlightStarted: () => {
      closeMapControls()
      openOrgMenu()
    },
  })

const ORG_MENU_STEPS = [
  orgMenuStep('[data-tour="org-menu"]', {
    title: "Menu del comune",
    description:
      "Apri il menu del comune per accedere a preventivi, consuntivi, approvazione e organizzazioni.",
    side: "bottom",
    align: "start",
  }),
  orgMenuStep('[data-tour="org-preventivi"]', {
    title: "Preventivi IMS",
    description:
      "Elenco e bozze dei preventivi straordinari. Da qui crei, modifichi e invii i documenti in approvazione.",
    side: "bottom",
    align: "start",
  }),
  orgMenuStep('[data-tour="org-consuntivi"]', {
    title: "Consuntivi IMS",
    description:
      "Consuntivi a valle degli interventi straordinari: completa le bozze e segui lo stato di revisione.",
    side: "bottom",
    align: "start",
  }),
  orgMenuStep('[data-tour="org-approvazione"]', {
    title: "Approvazione IMS",
    description:
      "Coda di approvazione per RUP/DEC: esamina preventivi e consuntivi in attesa.",
    side: "bottom",
    align: "start",
  }),
  orgMenuStep('[data-tour="org-organizzazioni"]', {
    title: "Organizzazioni",
    description: "Gestisci le organizzazioni collegate al comune selezionato.",
    side: "bottom",
    align: "start",
  }),
]

const ADD_MENU_STEP = step(
  '[data-tour="add-menu"]',
  {
    title: "Aggiungi elementi",
    description:
      "Inserisci nuovi punti luce o quadri elettrici sulla mappa durante il rilievo.",
    side: "right",
    align: "center",
  },
  {
    onHighlightStarted: () => {
      closeMapControls()
      closeOrgMenu()
    },
  },
)

/** @deprecated usare getTourStepsForUser(user) — mantenuto per compatibilità */
const COMMON_STEPS = [...MAP_CONTROL_STEPS, SEARCH_STEP, USER_MENU_STEP]

/**
 * Tour spotlight in base al ruolo. Target assenti vengono saltati a runtime.
 * Ordine: controlli mappa → ricerca → menu comune → profilo utente.
 */
export const getTourStepsForUser = (user) => {
  const type = user?.user_type || "DEFAULT_USER"
  const steps = [...MAP_CONTROL_STEPS]

  // Add-menu tra i bottoni di controllo (solo rilevatore / super admin)
  if (type === "SURVEYOR" || type === "SUPER_ADMIN") {
    steps.push(ADD_MENU_STEP)
  }

  steps.push(SEARCH_STEP)

  if (canManageQuotesByRole(user) || canApproveQuoteByRole(user) || type === "SUPER_ADMIN") {
    const orgSteps = ORG_MENU_STEPS.filter((s) => {
      if (s.element === '[data-tour="org-preventivi"]' || s.element === '[data-tour="org-consuntivi"]') {
        return canManageQuotesByRole(user) || type === "SUPER_ADMIN"
      }
      if (s.element === '[data-tour="org-approvazione"]' || s.element === '[data-tour="org-organizzazioni"]') {
        return canApproveQuoteByRole(user) || type === "SUPER_ADMIN"
      }
      return true
    })
    steps.push(...orgSteps)
  }

  steps.push(USER_MENU_STEP)
  return steps
}

/** @deprecated usare getTourStepsForUser(user) */
export const TOUR_STEPS = COMMON_STEPS

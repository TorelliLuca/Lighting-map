/**
 * Configurazione dichiarativa delle azioni InfoWindow + helper RBAC puri.
 * Ruoli: DEFAULT_USER | MAINTAINER | ADMINISTRATOR | SUPER_ADMIN | SURVEYOR
 */

import { normalizeLightPointForDisplay, canStartInspection, canStartOperation, canCompileQuote } from "./utils"
import { hasTopologyParent } from "./topologyLines"

export const INFO_WINDOW_ACTIONS = [
  {
    id: "sopralluogo",
    label: "Sopralluogo",
    title: "Effettua sopralluogo (su segnalazione o guasto rilevato sul campo)",
    priority: "primary",
    roles: ["MAINTAINER", "SUPER_ADMIN"],
    /** Visibile anche senza segnalazione: sopralluogo diretto del manutentore. */
    allowDirectDiscovery: true,
    order: 0,
  },
  {
    id: "preventivo",
    label: "Preventivo",
    title: "Compila o riprendi la bozza di preventivo IMS",
    priority: "primary",
    roles: ["MAINTAINER", "SUPER_ADMIN"],
    requiresPendingQuote: true,
    order: 0.5,
  },
  {
    id: "operazione",
    label: "Risolvi",
    title: "Avvia un'operazione per risolvere la segnalazione",
    priority: "primary",
    roles: ["MAINTAINER", "SUPER_ADMIN"],
    requiresOperableReport: true,
    order: 1,
  },
  {
    id: "segnala",
    label: "Segnala",
    title: "Segnala questo punto",
    priority: "primary",
    // Il MAINTAINER non segnala: apre un sopralluogo diretto sul guasto trovato.
    roles: ["DEFAULT_USER", "ADMINISTRATOR", "SUPER_ADMIN"],
    order: 2,
  },
  {
    id: "streetview",
    label: "Street view",
    title: "Visualizza in Street View",
    priority: "overflow",
    roles: "*",
    order: 3,
  },
  {
    id: "goto",
    label: "Vai al punto",
    title: "Naviga verso questo punto",
    priority: "overflow",
    roles: "*",
    order: 4,
  },
  {
    id: "modifica",
    label: "Modifica",
    title: "Modifica questo punto luce",
    priority: "overflow",
    roles: ["SUPER_ADMIN", "SURVEYOR"],
    order: 5,
  },
  {
    id: "duplica",
    label: "Duplica",
    title: "Duplica questo punto luce",
    priority: "overflow",
    roles: ["SUPER_ADMIN", "SURVEYOR"],
    order: 6,
  },
  {
    id: "set_parent",
    label: "Imposta genitore",
    title: "Seleziona sulla mappa il punto a monte (genitore elettrico)",
    priority: "overflow",
    roles: ["SUPER_ADMIN", "SURVEYOR"],
    order: 7,
    /** Solo PL (non QE, non gruppi differenziale) */
    requiresPl: true,
  },
  {
    id: "clear_parent",
    label: "Scollega linea",
    title: "Rimuove il collegamento elettrico al genitore",
    priority: "overflow",
    roles: ["SUPER_ADMIN", "SURVEYOR"],
    order: 8,
    requiresParent: true,
  },
  {
    id: "elimina",
    label: "Elimina",
    title: "Elimina questo punto luce",
    priority: "overflow",
    roles: ["SUPER_ADMIN", "SURVEYOR"],
    order: 9,
  }
]

const roleAllowed = (roles, userRole) => {
  if (roles === "*") return Boolean(userRole)
  if (!userRole || !Array.isArray(roles)) return false
  return roles.includes(userRole)
}

/** Filtra le azioni disponibili per il ruolo utente e lo stato del marker. */
export const getVisibleActions = (actions = INFO_WINDOW_ACTIONS, userRole, marker = null) =>
  actions
    .filter((action) => roleAllowed(action.roles, userRole))
    .filter((action) => {
      if (action.requiresInspectableReport) {
        return canStartInspection(userRole, marker?.segnalazioni_in_corso)
      }
      if (action.allowDirectDiscovery) {
        if (!["MAINTAINER", "SUPER_ADMIN"].includes(userRole)) return false
        if (canStartInspection(userRole, marker?.segnalazioni_in_corso)) return true
        const hasOpenOrdinary = (marker?.segnalazioni_in_corso || []).some(
          (s) => !s?.is_solved && s?.maintenance_category !== "EXTRAORDINARY",
        )
        return !hasOpenOrdinary
      }
      if (action.requiresPendingQuote) {
        return canCompileQuote(userRole, marker?.segnalazioni_in_corso)
      }
      if (action.requiresOperableReport) {
        return canStartOperation(userRole, marker?.segnalazioni_in_corso)
      }
      if (action.requiresPl && marker) {
        if (marker.marker !== "PL" || marker.is_differente_group) return false
      }
      if (action.requiresParent && marker) {
        if (!hasTopologyParent(marker)) return false
      }
      return true
    })
    .slice()
    .sort((a, b) => a.order - b.order)

/**
 * Un solo bottone primario:
 * - operazione se visibile
 * - altrimenti segnala se visibile
 */
export const getPrimaryAction = (visibleActions = []) => {
  const sopralluogo = visibleActions.find((a) => a.id === "sopralluogo")
  if (sopralluogo) return sopralluogo

  const preventivo = visibleActions.find((a) => a.id === "preventivo")
  if (preventivo) return preventivo

  const modifica = visibleActions.find((a) => a.id === "modifica")
  const elimina = visibleActions.find((a) => a.id === "elimina")
  const operazione = visibleActions.find((a) => a.id === "operazione")
  if (modifica && elimina && !operazione) return modifica
  if (operazione) return operazione
  return visibleActions.find((a) => a.id === "segnala") || null
}

/**
 * Secondo bottone in evidenza: Segnala quando il primario è Operazione.
 */
export const getSecondaryActions = (visibleActions = [], primaryAction) => {
  if (!primaryAction) return []
  if (primaryAction.id === "sopralluogo") {
    // Prima del sopralluogo non si fanno operazioni: evidenzia Preventivo se presente
    const preventivo = visibleActions.find((a) => a.id === "preventivo")
    return preventivo ? [preventivo] : []
  }
  if (primaryAction.id === "preventivo") {
    if (visibleActions.find((a) => a.id === "sopralluogo")){
      const sopralluogo = visibleActions.find((a) => a.id === "sopralluogo")
      return sopralluogo ? [sopralluogo] : []
    }else{
      const segnala = visibleActions.find((a) => a.id === "segnala")
      return segnala ? [segnala] : []
    }
  }
  if (primaryAction.id === "operazione") {
    const preventivo = visibleActions.find((a) => a.id === "preventivo")
    if (preventivo) return [preventivo]
    const segnala = visibleActions.find((a) => a.id === "segnala")
    return segnala ? [segnala] : []
  }
  if (primaryAction.id === "modifica") {
    const elimina = visibleActions.find((a) => a.id === "elimina")
    return elimina ? [elimina] : []
  }
  return []
}

/** Azioni residue per il menu overflow. */
export const getOverflowActions = (
  visibleActions = [],
  primaryAction,
  secondaryActions = [],
) => {
  const excluded = new Set([
    primaryAction?.id,
    ...secondaryActions.map((a) => a.id),
  ].filter(Boolean))
  return visibleActions.filter((a) => !excluded.has(a.id))
}

/** Breakpoint mobile InfoWindow sheet (&lt; 640px). */
export const INFO_WINDOW_MOBILE_MQ = "(max-width: 639px)"

export const isMobileInfoWindowViewport = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false
  }
  return window.matchMedia(INFO_WINDOW_MOBILE_MQ).matches
}

/** Prepara il content object da un marker (stesso schema usato in createMarkers). */
export const buildInfoWindowContent = (marker) => {
  if (!marker) return {}
  const content = normalizeLightPointForDisplay(marker)
  delete content.lat
  delete content.lng
  return content
}

/** Stime dimensioni popup desktop (allineate a InfoWindow POPUP_SHELL / POPUP_SCROLL_CLASS). */
export const POPUP_ESTIMATED_HEIGHT = 400
export const POPUP_ESTIMATED_WIDTH = 380
export const POPUP_MARKER_GAP = 14
export const POPUP_VIEWPORT_MARGIN = 20

/**
 * Calcola anchor, offset popup e pan mappa per massimizzare lo spazio visibile
 * dopo il centraggio sul marker (MapLibre Popup resta ancorato al punto geo).
 */
export const getMapLibrePopupPlacement = (
  map,
  {
    popupHeight = POPUP_ESTIMATED_HEIGHT,
    gap = POPUP_MARKER_GAP,
    margin = POPUP_VIEWPORT_MARGIN,
  } = {},
) => {
  const canvas = map.getCanvas()
  const viewH = canvas.clientHeight
  const centerY = viewH / 2
  const needed = popupHeight + gap

  const spaceAbove = centerY - margin
  const spaceBelow = viewH - centerY - margin

  const fitsAbove = spaceAbove >= needed
  const fitsBelow = spaceBelow >= needed

  let placeAbove
  if (fitsAbove && !fitsBelow) placeAbove = true
  else if (!fitsAbove && fitsBelow) placeAbove = false
  else placeAbove = spaceAbove >= spaceBelow

  const anchor = placeAbove ? "bottom" : "top"
  let offsetY = 0

  if (placeAbove) {
    const deficit = needed + margin - centerY
    offsetY = Math.max(0, deficit)
    offsetY = Math.min(offsetY, viewH - margin - 48)
  } else {
    const deficit = needed + margin - centerY
    offsetY = Math.min(0, -deficit)
    offsetY = Math.max(offsetY, -(centerY - margin - 48))
  }

  return {
    anchor,
    mapOffset: [0, offsetY],
    popupOffset: [0, placeAbove ? -gap : gap],
  }
}

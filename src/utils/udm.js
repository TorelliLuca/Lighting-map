/**
 * Unità di misura prezziario.
 * A DB si salvano forme ASCII canoniche (mq / mc); in UI si mostrano con esponenti (m² / m³).
 */

export const UDM_VALUES = Object.freeze([
  "cad",
  "m",
  "mq",
  "mc",
  "ml",
  "kg",
  "h",
  "n",
  "corpo",
  "%",
])

/** Etichette UI (esponenti per superfici/volumi). */
export const UDM_LABELS = Object.freeze({
  cad: "cad",
  m: "m",
  mq: "m²",
  mc: "m³",
  ml: "ml",
  kg: "kg",
  h: "h",
  n: "n",
  corpo: "corpo",
  "%": "%",
})

export const UDM_OPTIONS = UDM_VALUES.map((value) => ({
  value,
  label: UDM_LABELS[value],
}))

/** Alias accettati in import / dati legacy → valore canonico. */
const UDM_ALIASES = Object.freeze({
  cad: "cad",
  "cad.": "cad",
  cadauno: "cad",
  "c.adauno": "cad",
  pz: "cad",
  "pz.": "cad",
  pezzo: "cad",
  pezzi: "cad",
  "n.": "n",
  nr: "n",
  "n°": "n",
  n: "n",
  m: "m",
  ml: "ml",
  "m.l.": "ml",
  "m/l": "ml",
  kg: "kg",
  h: "h",
  ora: "h",
  ore: "h",
  corpo: "corpo",
  "corpo.": "corpo",
  acorpo: "corpo",
  "a.corpo": "corpo",
  "%": "%",
  perc: "%",
  // Superficie → mq
  mq: "mq",
  "mq.": "mq",
  m2: "mq",
  "m^2": "mq",
  "m²": "mq",
  "m².": "mq",
  // Volume → mc
  mc: "mc",
  "mc.": "mc",
  m3: "mc",
  "m^3": "mc",
  "m³": "mc",
  "m³.": "mc",
})

const normalizeKey = (raw) =>
  String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")

/**
 * Normalizza a valore canonico (mq/mc, …).
 * @returns {string|null} null se non riconosciuta (e fallback non impostato)
 */
export function normalizeUdm(raw, { fallback = "cad" } = {}) {
  const key = normalizeKey(raw)
  if (!key) {
    return fallback === undefined ? null : fallback
  }
  if (Object.prototype.hasOwnProperty.call(UDM_ALIASES, key)) {
    return UDM_ALIASES[key]
  }
  if (UDM_VALUES.includes(key)) return key
  if (fallback === undefined) return null
  return fallback
}

/** Vuoto = ammissibile (diventa cad). Rifiuta solo unità non riconosciute. */
export function isValidUdm(raw) {
  const key = normalizeKey(raw)
  if (!key) return true
  return normalizeUdm(raw, { fallback: null }) != null
}

/** Etichetta UI con esponenti (m² / m³). */
export function formatUdmLabel(raw) {
  const normalized = normalizeUdm(raw, { fallback: null })
  if (normalized && UDM_LABELS[normalized]) return UDM_LABELS[normalized]
  const text = String(raw || "").trim()
  return text || "—"
}

/**
 * Messaggio errore se U.M. non ammissibile.
 * @returns {string|null}
 */
export function validateUdmMessage(raw) {
  if (isValidUdm(raw)) return null
  return "U.M. non valida. Per le superfici usa mq (m²), per i volumi mc (m³)."
}

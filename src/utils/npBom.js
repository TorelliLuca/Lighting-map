/** Helpers condivisi per Nuovi Prezzi compositi (BOM). */

import { normalizeUdm } from "./udm"

/** Padding fisso del progressivo NP (NP-001, NP-002, …). */
export const NP_SEQ_PAD = 3
/** Padding del progressivo sotto-voce fuori prezzario (NP-001-01). */
export const NP_CHILD_SEQ_PAD = 2

export const NP_CODE_RE = /^NP-?(\d+)$/i

/** Estrae il progressivo da un codice NP (es. NP-001 → 1). */
export const parseNpSequence = (code) => {
  const match = NP_CODE_RE.exec(String(code || "").trim())
  if (!match) return null
  const n = Number.parseInt(match[1], 10)
  return Number.isFinite(n) ? n : null
}

/** Formatta un progressivo come NP-001. */
export const formatNpCode = (n) =>
  `NP-${String(Math.max(0, Number(n) || 0)).padStart(NP_SEQ_PAD, "0")}`

/** Normalizza NP-1 → NP-001; lascia invariati i codici non-NP. */
export const normalizeNpCode = (code) => {
  const n = parseNpSequence(code)
  return n == null ? String(code || "").trim() : formatNpCode(n)
}

/** Prossimo NP-n in base al prezziario (+ eventuali codici già in bozza). */
export const nextNpCode = (catalog = [], extraCodes = []) => {
  let max = 0
  for (const item of catalog || []) {
    const n = parseNpSequence(item?.code)
    if (n != null && n > max) max = n
  }
  for (const code of extraCodes || []) {
    const n = parseNpSequence(code)
    if (n != null && n > max) max = n
  }
  return formatNpCode(max + 1)
}

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/**
 * Prossimo identificativo interno per voce fuori prezzario nella distinta NP.
 * Esempio: parent NP-001 → NP-001-01, NP-001-02, …
 */
export const nextAdHocChildCode = (parentCode, children = []) => {
  const parent = normalizeNpCode(parentCode) || "NP-000"
  const re = new RegExp(`^${escapeRegExp(parent)}-(\\d+)$`, "i")
  let max = 0
  for (const child of children || []) {
    if (!child?.isAdHoc) continue
    const match = re.exec(String(child.materialCode || "").trim())
    if (match) max = Math.max(max, Number.parseInt(match[1], 10) || 0)
  }
  return `${parent}-${String(max + 1).padStart(NP_CHILD_SEQ_PAD, "0")}`
}

export const emptyBomChild = (parentCode = "", siblings = []) => ({
  materialCode: nextAdHocChildCode(parentCode, siblings),
  description: "",
  fullDescription: "",
  udm: "cad",
  quantity: 1,
  unitPrice: 0,
  category: "",
  isAdHoc: true,
})

export const mapBomFromCatalogItem = (fromCatalog) => ({
  materialCode: fromCatalog.code || "",
  description: fromCatalog.description || "",
  fullDescription: fromCatalog.fullDescription || "",
  udm: normalizeUdm(fromCatalog.udm),
  quantity: 1,
  unitPrice: Number(fromCatalog.unitPrice) || 0,
  category: fromCatalog.category || "",
  isAdHoc: false,
})

export const mapChildrenFromBom = (bom = []) =>
  (bom || []).map((item) => ({
    materialCode: item.materialCode || item.code || "",
    description: item.description || "",
    fullDescription: item.fullDescription || "",
    udm: normalizeUdm(item.udm),
    quantity: Number(item.quantity) || 1,
    unitPrice: Number(item.unitPrice) || 0,
    category: item.category || "",
    isAdHoc: Boolean(item.isAdHoc),
  }))

export const serializeLineItemSnapshot = (item) => ({
  materialCode: item.materialCode || "",
  description: item.description || "",
  fullDescription: item.fullDescription || "",
  udm: normalizeUdm(item.udm),
  quantity: Number(item.quantity) || 0,
  unitPrice: Number(item.unitPrice) || 0,
  category: item.category || "",
  isAdHoc: !!item.isAdHoc,
  isContested: !!item.isContested,
  contestNote: item.contestNote || "",
  children: (item.children || []).map((child) => ({
    materialCode: child.materialCode || "",
    description: child.description || "",
    fullDescription: child.fullDescription || "",
    udm: normalizeUdm(child.udm),
    quantity: Number(child.quantity) || 0,
    unitPrice: Number(child.unitPrice) || 0,
    category: child.category || "",
    isAdHoc: !!child.isAdHoc,
  })),
})

/** True se la voce è un NP senza almeno un componente con descrizione. */
export const isEmptyNpLine = (item) => {
  if (!item?.isAdHoc) return false
  const children = Array.isArray(item.children) ? item.children : []
  return !children.some((child) => String(child?.description || "").trim())
}

/** Titolo dialog dettagli: preferisci la descrizione breve. */
export const lineDetailsTitle = (item, fallback = "Dettagli") =>
  String(item?.description || "").trim() || fallback

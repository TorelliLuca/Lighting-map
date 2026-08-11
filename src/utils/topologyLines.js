/**
 * Utility client-side per linee topologiche da campo `parent`.
 */

import { applyFcQuadroToLegendMap, getColorList } from './ColorGenerator'

export const DEFAULT_TOPOLOGY_LINE_COLOR = '#64748b'

export function parseLatLng(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const n = parseFloat(String(value).replace(',', '.').trim())
  return Number.isFinite(n) ? n : null
}

export function toIdString(id) {
  if (id == null || id === '') return null
  if (typeof id === 'object' && id._id != null) return String(id._id)
  return String(id)
}

/** True se il nodo ha un genitore topologico (ObjectId o oggetto popolato). */
export function hasTopologyParent(marker) {
  return Boolean(toIdString(marker?.parent))
}

/**
 * Membri reali di un gruppo "differente" aggregato sulla mappa.
 */
export function parseDifferenteGroupMembers(marker) {
  if (!marker) return []
  if (Array.isArray(marker.differente_group_members)) {
    return marker.differente_group_members.filter((m) => m && toIdString(m._id))
  }
  if (typeof marker.differente_group_members_json === 'string') {
    try {
      const parsed = JSON.parse(marker.differente_group_members_json)
      return Array.isArray(parsed)
        ? parsed.filter((m) => m && toIdString(m._id))
        : []
    } catch {
      return []
    }
  }
  return []
}

/**
 * Risolve un click topologia in nodi reali (espande i gruppi differente).
 * @returns {{ members: object[], representative: object, isGroup: boolean } | null}
 */
export function resolveTopologyPick(marker) {
  if (!marker) return null
  const isGroup =
    marker.is_differente_group === true || marker.is_differente_group === 'true'
  if (isGroup) {
    const members = parseDifferenteGroupMembers(marker)
    if (!members.length) return null
    // Preferisci ordine differente A, B, ...
    const sorted = [...members].sort((a, b) => {
      const ma = /^differente\s+([a-z])/i.exec((a.composizione_punto || '').trim())
      const mb = /^differente\s+([a-z])/i.exec((b.composizione_punto || '').trim())
      const oa = ma ? ma[1].toLowerCase().charCodeAt(0) : 999
      const ob = mb ? mb[1].toLowerCase().charCodeAt(0) : 999
      return oa - ob
    })
    return {
      members: sorted,
      representative: sorted[0],
      isGroup: true,
      groupLabel: marker.numero_palo || marker.differente_group_numero_palo || '',
    }
  }
  if (!toIdString(marker._id)) return null
  return {
    members: [marker],
    representative: marker,
    isGroup: false,
    groupLabel: marker.numero_palo || '',
  }
}

/**
 * Ruoli che vedono segnalazioni soft e potenze topologia,
 * e che possono editare le linee (SUPER_ADMIN + SURVEYOR).
 */
const TOPOLOGY_ROLES = new Set(['SUPER_ADMIN', 'SURVEYOR'])

export function canSeeTopologyAnomalies(user) {
  if (!user) return false
  const role = user.user_type || user.role
  return TOPOLOGY_ROLES.has(role)
}

export function canEditTopology(user) {
  return canSeeTopologyAnomalies(user)
}

/**
 * PL senza parent (rilievo incompleto, non errore bloccante).
 * Esclude QE e gruppi differenziale aggregati.
 */
export function getUnlinkedLightPoints(markers = []) {
  return markers.filter((m) => {
    if (!m || m.marker !== 'PL') return false
    if (m.is_differente_group) return false
    return !toIdString(m.parent)
  })
}

export function getUnlinkedIdSet(markers = []) {
  return new Set(getUnlinkedLightPoints(markers).map((m) => toIdString(m._id)).filter(Boolean))
}

/** True se tipo_linea del figlio contiene la parola "interrato". */
export function isTipoLineaInterrato(tipoLinea) {
  if (tipoLinea == null || tipoLinea === '') return false
  return String(tipoLinea).toLowerCase().includes('interrato')
}

/**
 * Mappa quadro → colore (stessa palette della legenda MARKER).
 */
export function buildQuadroColorMap(markers = [], quadroColorsOverride = null) {
  if (quadroColorsOverride && typeof quadroColorsOverride === 'object') {
    return quadroColorsOverride
  }
  const uniqueValues = Array.from(
    new Set(markers.map((marker) => marker?.quadro).filter(Boolean)),
  )
  const colorList = getColorList(uniqueValues.length)
  const colorMappings = { quadro: {} }
  uniqueValues.forEach((val, idx) => {
    colorMappings.quadro[val] = colorList[idx]
  })
  applyFcQuadroToLegendMap(colorMappings)
  return colorMappings.quadro
}

/**
 * Etichetta quadro del QE a monte, se la catena parent arriva a un QE.
 * Senza QE in catena → stringa vuota (linea "non collegata").
 */
export function resolveConnectedQuadroLabel(marker, byId) {
  let cur = marker
  const seen = new Set()
  while (cur) {
    const id = toIdString(cur._id)
    if (!id || seen.has(id)) break
    seen.add(id)
    if (cur.marker === 'QE') {
      return cur.quadro != null ? String(cur.quadro).trim() : ''
    }
    const p = toIdString(cur.parent)
    if (!p) break
    cur = byId.get(p)
  }
  return ''
}

/**
 * Quadro effettivo per colorazione: catena parent→QE se presente, altrimenti campo `quadro`.
 */
export function getEffectiveQuadro(marker, byId) {
  if (!marker) return ''
  if (marker.marker === 'QE') {
    return marker.quadro != null ? String(marker.quadro).trim() : ''
  }
  const connected = resolveConnectedQuadroLabel(marker, byId)
  if (connected) return connected
  return marker.quadro != null ? String(marker.quadro).trim() : ''
}

/**
 * Propaga `quadro` ai PL la cui catena parent arriva a un QE (post-collegamento locale).
 */
export function syncQuadroFromTopologyChain(markers = []) {
  const byId = new Map()
  for (const m of markers) {
    const id = toIdString(m?._id)
    if (id) byId.set(id, m)
  }

  return markers.map((m) => {
    if (!m || m.marker === 'QE') return m
    const effective = getEffectiveQuadro(m, byId)
    if (!effective) return m
    const prev = m.quadro != null ? String(m.quadro).trim() : ''
    if (prev === effective) return m
    return { ...m, quadro: effective }
  })
}

/** Unisce aggiornamenti topologia per _id (ultimo vince). */
export function mergeTopologyUpdates(updates = []) {
  const byId = new Map()
  for (const u of updates) {
    const id = toIdString(u?._id)
    if (!id) continue
    byId.set(id, { ...byId.get(id), ...u, _id: id })
  }
  return [...byId.values()]
}

/**
 * FeatureCollection di LineString parent → child.
 * @param {Array} markers lista piatta di punti (con _id, parent, lat, lng, quadro, tipo_linea)
 * @param {{ quadroColors?: Record<string,string> }} [options]
 */
export function buildTopologyLineFeatures(markers = [], options = {}) {
  const byId = new Map()
  for (const m of markers) {
    const id = toIdString(m?._id)
    if (id) byId.set(id, m)
  }

  const markersForPalette = markers.map((m) => {
    const effective = getEffectiveQuadro(m, byId)
    return effective ? { ...m, quadro: effective } : m
  })
  const quadroColors = buildQuadroColorMap(markersForPalette, options.quadroColors || null)

  const features = []
  for (const m of markers) {
    const childId = toIdString(m?._id)
    const parentId = toIdString(m?.parent)
    if (!childId || !parentId) continue

    const parent = byId.get(parentId)
    if (!parent) continue

    const childLat = parseLatLng(m.lat)
    const childLng = parseLatLng(m.lng)
    const parentLat = parseLatLng(parent.lat)
    const parentLng = parseLatLng(parent.lng)
    if (childLat == null || childLng == null || parentLat == null || parentLng == null) continue

    // Colore solo se la linea è sotto un QE; altrimenti grigio
    const quadro =
      resolveConnectedQuadroLabel(m, byId) ||
      resolveConnectedQuadroLabel(parent, byId) ||
      ''
    const color =
      quadro && quadroColors[quadro] ? quadroColors[quadro] : DEFAULT_TOPOLOGY_LINE_COLOR
    const tipoLinea = m.tipo_linea || ''
    const dashed = isTipoLineaInterrato(tipoLinea) ? 1 : 0

    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [parentLng, parentLat],
          [childLng, childLat],
        ],
      },
      properties: {
        from: parentId,
        to: childId,
        from_numero: parent.numero_palo || '',
        to_numero: m.numero_palo || '',
        quadro,
        color,
        tipo_linea: tipoLinea,
        dashed,
      },
    })
  }

  return {
    type: 'FeatureCollection',
    features,
  }
}

export const EMPTY_TOPOLOGY_GEOJSON = {
  type: 'FeatureCollection',
  features: [],
}

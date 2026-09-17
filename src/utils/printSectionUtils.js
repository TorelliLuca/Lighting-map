import { waitForMapIdleExport, waitForMapReadyExport } from "./mapScaleUtils"

/** Zoom minimo MapLibre per punti non clusterati (`clusterMaxZoom: 14`). */
export const UNCLUSTER_MIN_ZOOM = 15

export const MAX_PRINT_SECTIONS = 20

export const OVERVIEW_SOURCE_ID = "print-sections-overview"
export const OVERVIEW_FILL_LAYER_ID = "print-sections-overview-fill"
export const OVERVIEW_LINE_LAYER_ID = "print-sections-overview-line"
export const OVERVIEW_LABEL_LAYER_ID = "print-sections-overview-label"

/**
 * @typedef {{ west: number, south: number, east: number, north: number }} GeoBounds
 * @typedef {{ x: number, y: number, width: number, height: number }} PixelRect
 */

/** Converte un rettangolo in pixel CSS del container in bounds geografici. */
export function rectPxToBounds(map, rect) {
  if (!map || !rect || typeof map.unproject !== "function") return null
  const nw = map.unproject([rect.x, rect.y])
  const se = map.unproject([rect.x + rect.width, rect.y + rect.height])
  return {
    west: Math.min(nw.lng, se.lng),
    east: Math.max(nw.lng, se.lng),
    north: Math.max(nw.lat, se.lat),
    south: Math.min(nw.lat, se.lat),
  }
}

/** Converte bounds geografici in rettangolo pixel CSS sul container corrente. */
export function boundsToRectPx(map, bounds) {
  if (!map || !bounds || typeof map.project !== "function") return null
  const nw = map.project([bounds.west, bounds.north])
  const se = map.project([bounds.east, bounds.south])
  const x = Math.min(nw.x, se.x)
  const y = Math.min(nw.y, se.y)
  const width = Math.abs(se.x - nw.x)
  const height = Math.abs(se.y - nw.y)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return null
  }
  return { x, y, width, height }
}

/** Limita i bounds figlio all'interno del padre. */
export function clampBoundsInside(child, parent) {
  if (!child || !parent) return child
  const west = Math.max(child.west, parent.west)
  const east = Math.min(child.east, parent.east)
  const south = Math.max(child.south, parent.south)
  const north = Math.min(child.north, parent.north)
  if (east <= west || north <= south) {
    const midLng = (parent.west + parent.east) / 2
    const midLat = (parent.south + parent.north) / 2
    const halfLng = Math.max((parent.east - parent.west) * 0.1, 1e-6)
    const halfLat = Math.max((parent.north - parent.south) * 0.1, 1e-6)
    return {
      west: midLng - halfLng,
      east: midLng + halfLng,
      south: midLat - halfLat,
      north: midLat + halfLat,
    }
  }
  return { west, east, south, north }
}

/** Clampa un rect pixel dentro un altro rect pixel (min size). */
export function clampRectInside(child, parent, minSize = 80) {
  if (!child || !parent) return child
  const maxW = Math.max(minSize, parent.width)
  const maxH = Math.max(minSize, parent.height)
  const width = Math.max(minSize, Math.min(child.width, maxW))
  const height = Math.max(minSize, Math.min(child.height, maxH))
  const x = Math.max(parent.x, Math.min(child.x, parent.x + parent.width - width))
  const y = Math.max(parent.y, Math.min(child.y, parent.y + parent.height - height))
  return { x, y, width, height }
}

export function boundsCenter(bounds) {
  if (!bounds) return null
  return {
    lng: (bounds.west + bounds.east) / 2,
    lat: (bounds.south + bounds.north) / 2,
  }
}

/**
 * Stima lo zoom per far entrare i bounds in un frame di width×height px.
 * Approssimazione Web Mercator (senza padding UI).
 */
export function estimateZoomToFitBounds(bounds, widthPx, heightPx, padding = 40) {
  if (!bounds || widthPx < 1 || heightPx < 1) return UNCLUSTER_MIN_ZOOM

  const usableW = Math.max(1, widthPx - padding * 2)
  const usableH = Math.max(1, heightPx - padding * 2)
  const centerLat = (bounds.south + bounds.north) / 2
  const cosLat = Math.max(0.01, Math.abs(Math.cos((centerLat * Math.PI) / 180)))

  const lngSpan = Math.max(1e-9, bounds.east - bounds.west)
  const latSpan = Math.max(1e-9, bounds.north - bounds.south)

  const worldPxAtZoom0 = 256
  const zoomX = Math.log2((usableW * 360) / (lngSpan * worldPxAtZoom0))
  const zoomY = Math.log2((usableH * 360) / (latSpan * worldPxAtZoom0 / cosLat))
  const zoom = Math.min(zoomX, zoomY)
  return Math.max(0, Math.min(22, zoom))
}

/** Zoom per sezione: fit + minimo non-cluster. */
export function getSectionZoom(bounds, widthPx, heightPx, minZoom = UNCLUSTER_MIN_ZOOM) {
  return Math.max(minZoom, estimateZoomToFitBounds(bounds, widthPx, heightPx))
}

export function createSectionId() {
  return `section-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Bounds iniziali di una sotto-area al centro del parent (40% della dimensione). */
export function createChildBoundsCentered(parent, fraction = 0.4) {
  if (!parent) return null
  const lngSpan = parent.east - parent.west
  const latSpan = parent.north - parent.south
  const halfLng = (lngSpan * fraction) / 2
  const halfLat = (latSpan * fraction) / 2
  const center = boundsCenter(parent)
  return clampBoundsInside(
    {
      west: center.lng - halfLng,
      east: center.lng + halfLng,
      south: center.lat - halfLat,
      north: center.lat + halfLat,
    },
    parent,
  )
}

export function padSectionIndex(index, total = 99) {
  const digits = String(total).length
  return String(index).padStart(Math.max(2, digits), "0")
}

function boundsToPolygonCoords(bounds) {
  return [[
    [bounds.west, bounds.north],
    [bounds.east, bounds.north],
    [bounds.east, bounds.south],
    [bounds.west, bounds.south],
    [bounds.west, bounds.north],
  ]]
}

/** GeoJSON FeatureCollection per overlay overview (poligoni + punti label). */
export function buildOverviewGeoJson(sections) {
  const features = []
  for (const section of sections) {
    if (!section?.bounds) continue
    const { bounds, index } = section
    const label = String(index)
    features.push({
      type: "Feature",
      properties: { index, label },
      geometry: {
        type: "Polygon",
        coordinates: boundsToPolygonCoords(bounds),
      },
    })
    features.push({
      type: "Feature",
      properties: { index, label },
      geometry: {
        type: "Point",
        coordinates: [boundsCenter(bounds).lng, boundsCenter(bounds).lat],
      },
    })
  }
  return { type: "FeatureCollection", features }
}

/** Aggiunge layer temporanei MapLibre con i rettangoli numerati. */
export function addOverviewSectionLayers(map, sections) {
  if (!map || typeof map.addSource !== "function") return () => {}

  removeOverviewSectionLayers(map)

  const geojson = buildOverviewGeoJson(sections)
  map.addSource(OVERVIEW_SOURCE_ID, { type: "geojson", data: geojson })

  map.addLayer({
    id: OVERVIEW_FILL_LAYER_ID,
    type: "fill",
    source: OVERVIEW_SOURCE_ID,
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: {
      "fill-color": "#ef4444",
      "fill-opacity": 0.28,
    },
  })

  map.addLayer({
    id: OVERVIEW_LINE_LAYER_ID,
    type: "line",
    source: OVERVIEW_SOURCE_ID,
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: {
      "line-color": "#dc2626",
      "line-width": 2.5,
      "line-dasharray": [2, 1.5],
    },
  })

  map.addLayer({
    id: OVERVIEW_LABEL_LAYER_ID,
    type: "symbol",
    source: OVERVIEW_SOURCE_ID,
    filter: ["==", ["geometry-type"], "Point"],
    layout: {
      "text-field": ["get", "label"],
      "text-size": 20,
      "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "#991b1b",
      "text-halo-width": 2,
    },
  })

  return () => removeOverviewSectionLayers(map)
}

export function removeOverviewSectionLayers(map) {
  if (!map || typeof map.getLayer !== "function") return
  try {
    for (const layerId of [OVERVIEW_LABEL_LAYER_ID, OVERVIEW_LINE_LAYER_ID, OVERVIEW_FILL_LAYER_ID]) {
      if (map.getLayer(layerId)) map.removeLayer(layerId)
    }
    if (map.getSource?.(OVERVIEW_SOURCE_ID)) map.removeSource(OVERVIEW_SOURCE_ID)
  } catch (error) {
    console.warn("Cleanup overlay stampa:", error)
  }
}

/** True se child è contenuto in parent (con tolleranza). */
export function isBoundsInside(child, parent, epsilon = 1e-8) {
  if (!child || !parent) return false
  return (
    child.west >= parent.west - epsilon &&
    child.east <= parent.east + epsilon &&
    child.south >= parent.south - epsilon &&
    child.north <= parent.north + epsilon
  )
}

/** Intersezione di due rect pixel; null se troppo piccola. */
export function intersectRects(a, b, minSize = 32) {
  if (!a || !b) return null
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.width, b.x + b.width)
  const bottom = Math.min(a.y + a.height, b.y + b.height)
  const width = right - x
  const height = bottom - y
  if (width < minSize || height < minSize) return null
  return { x, y, width, height }
}

/**
 * Porta la mappa a una vista salvata (center/zoom) oppure fit sui bounds.
 * Nessun vincolo di zoom minimo: la scala è quella scelta dall'utente.
 */
export async function restoreMapView(map, view, { signal } = {}) {
  if (!map || !view) throw new Error("Mappa o vista non validi")
  if (signal?.aborted) throw new DOMException("Export annullato", "AbortError")

  const center = view.center
  const lng = center?.lng ?? center?.[0]
  const lat = center?.lat ?? center?.[1]
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || !Number.isFinite(view.zoom)) {
    throw new Error("Vista mappa non valida")
  }

  map.jumpTo({
    center: [lng, lat],
    zoom: view.zoom,
    bearing: view.bearing ?? 0,
    pitch: view.pitch ?? 0,
  })

  await waitForMapReadyExport(map, signal)
  return { zoom: map.getZoom(), center: map.getCenter() }
}

/**
 * Fit geografico sui bounds (per overview se manca la vista salvata).
 * Usa fitBounds MapLibre quando disponibile.
 */
export async function flyMapToBounds(map, bounds, { padding = 48, signal } = {}) {
  if (!map || !bounds) throw new Error("Mappa o bounds non validi")
  if (signal?.aborted) throw new DOMException("Export annullato", "AbortError")

  if (typeof map.fitBounds === "function") {
    map.fitBounds(
      [
        [bounds.west, bounds.south],
        [bounds.east, bounds.north],
      ],
      {
        padding,
        duration: 0,
        bearing: 0,
        pitch: 0,
      },
    )
  } else {
    const center = boundsCenter(bounds)
    const container = map.getContainer()
    const width = container?.clientWidth || 800
    const height = container?.clientHeight || 600
    const zoom = estimateZoomToFitBounds(bounds, width, height, padding)
    map.jumpTo({
      center: [center.lng, center.lat],
      zoom,
      bearing: 0,
      pitch: 0,
    })
  }

  await waitForMapReadyExport(map, signal)
  return { zoom: map.getZoom(), center: map.getCenter() }
}

const MIN_PRINT_CROP = 32

/** Crop pixel dall'area geografica dopo aver ripristinato la vista. */
export function cropRectFromBounds(map, bounds, fallbackFullViewport = true) {
  const projected = boundsToRectPx(map, bounds)
  if (!map || typeof map.getContainer !== "function") return projected
  const container = map.getContainer()
  const full = {
    x: 0,
    y: 0,
    width: container.clientWidth,
    height: container.clientHeight,
  }
  if (!projected) return fallbackFullViewport ? full : null

  const x = Math.max(0, Math.min(projected.x, full.width - MIN_PRINT_CROP))
  const y = Math.max(0, Math.min(projected.y, full.height - MIN_PRINT_CROP))
  const width = Math.max(MIN_PRINT_CROP, Math.min(projected.width, full.width - x))
  const height = Math.max(MIN_PRINT_CROP, Math.min(projected.height, full.height - y))
  return { x, y, width, height }
}

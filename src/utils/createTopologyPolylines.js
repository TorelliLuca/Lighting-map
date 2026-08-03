import {
  buildTopologyLineFeatures,
  parseLatLng,
  toIdString,
  DEFAULT_TOPOLOGY_LINE_COLOR,
} from './topologyLines'

/**
 * Crea/distrugge google.maps.Polyline per le linee topologiche.
 */

export function clearTopologyPolylines(polylinesRef) {
  if (!polylinesRef?.current) return
  polylinesRef.current.forEach((line) => {
    try {
      line.setMap(null)
    } catch {
      // ignore
    }
  })
  polylinesRef.current = []
}

/**
 * @param {google.maps.Map} map
 * @param {Array} markers
 * @param {{ current: google.maps.Polyline[] }} polylinesRef
 * @param {{ quadroColors?: Record<string,string> }} [options]
 * @returns {number} numero linee create
 */
export function drawTopologyPolylines(map, markers, polylinesRef, options = {}) {
  clearTopologyPolylines(polylinesRef)
  if (!map || !window.google?.maps || !Array.isArray(markers)) return 0

  const fc = buildTopologyLineFeatures(markers, options)
  const lines = []

  for (const feature of fc.features) {
    const coords = feature.geometry?.coordinates
    if (!coords || coords.length < 2) continue
    const [fromLng, fromLat] = coords[0]
    const [toLng, toLat] = coords[1]
    const color = feature.properties?.color || DEFAULT_TOPOLOGY_LINE_COLOR
    const dashed = Number(feature.properties?.dashed) === 1

    const arrowIcon = {
      path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 3,
      strokeColor: color,
      fillColor: color,
      fillOpacity: 1,
      strokeWeight: 1,
    }

    const lineOptions = {
      path: [
        { lat: fromLat, lng: fromLng },
        { lat: toLat, lng: toLng },
      ],
      strokeColor: color,
      strokeOpacity: dashed ? 0 : 0.85,
      strokeWeight: 2,
      map,
      clickable: false,
      zIndex: 1,
      icons: dashed
        ? [
            {
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: 0.85,
                strokeColor: color,
                scale: 3,
              },
              offset: '0',
              repeat: '14px',
            },
            {
              icon: arrowIcon,
              offset: '50%',
              repeat: '72px',
            },
          ]
        : [
            {
              icon: arrowIcon,
              offset: '50%',
              repeat: '72px',
            },
          ],
    }

    const line = new window.google.maps.Polyline(lineOptions)
    lines.push(line)
  }

  polylinesRef.current = lines
  return lines.length
}

/**
 * Path helpers se serve costruire da due punti grezzi.
 */
export function latLngLiteralFromMarker(marker) {
  const lat = parseLatLng(marker?.lat)
  const lng = parseLatLng(marker?.lng)
  if (lat == null || lng == null) return null
  return { lat, lng, id: toIdString(marker._id) }
}

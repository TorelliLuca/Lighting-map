/**
 * Ray-casting: verifica se un punto [lng, lat] è dentro un anello poligonale.
 * @param {[number, number]} point - [lng, lat]
 * @param {Array<[number, number]>} ring - vertici [lng, lat], chiuso o aperto
 */
export function pointInPolygon(point, ring) {
  if (!point || !Array.isArray(ring) || ring.length < 3) return false

  const [x, y] = point
  let inside = false

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi

    if (intersect) inside = !inside
  }

  return inside
}

/**
 * Seleziona feature Point di una FeatureCollection dentro il poligono lazo.
 * @param {GeoJSON.FeatureCollection} geojson
 * @param {Array<[number, number]>} ring
 * @param {{ max?: number }} [options]
 * @returns {string[]} lista di _id
 */
export function selectFeatureIdsInPolygon(geojson, ring, options = {}) {
  const max = options.max ?? 500
  if (!geojson?.features?.length || !ring?.length) return []

  const closed =
    ring.length > 0 &&
    (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
      ? [...ring, ring[0]]
      : ring

  const ids = []
  for (const feature of geojson.features) {
    if (feature?.geometry?.type !== "Point") continue
    if (feature.properties?.is_differente_group === true || feature.properties?.is_differente_group === "true") {
      continue
    }
    const coords = feature.geometry.coordinates
    if (!coords || coords.length < 2) continue
    if (pointInPolygon(coords, closed)) {
      const id = feature.properties?._id
      if (id) ids.push(id)
      if (ids.length >= max) break
    }
  }
  return ids
}

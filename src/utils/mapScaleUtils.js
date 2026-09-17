const EARTH_CIRCUMFERENCE_M = 40075016.686
const DEFAULT_DPI = 96
const INCHES_PER_METER = 1 / 0.0254

/** Metri reali coperti da un pixel alla latitudine e zoom dati (Web Mercator). */
export function getMetersPerPixel(lat, zoom) {
  const clampedLat = Math.max(-85, Math.min(85, lat))
  return (
    (EARTH_CIRCUMFERENCE_M * Math.abs(Math.cos((clampedLat * Math.PI) / 180))) /
    Math.pow(2, zoom + 8)
  )
}

/** Denominatore scala cartografica (es. 5000 → 1:5000) a 96 DPI. */
export function getScaleDenominator(lat, zoom, dpi = DEFAULT_DPI) {
  const metersPerPixel = getMetersPerPixel(lat, zoom)
  return Math.max(1, Math.round(metersPerPixel * dpi * INCHES_PER_METER))
}

/** Zoom necessario per ottenere il denominatore di scala target. */
export function getZoomForScaleDenominator(lat, scaleDenominator, dpi = DEFAULT_DPI) {
  const targetMetersPerPixel = scaleDenominator / (dpi * INCHES_PER_METER)
  const clampedLat = Math.max(-85, Math.min(85, lat))
  const cosLat = Math.abs(Math.cos((clampedLat * Math.PI) / 180))
  const rawZoom =
    Math.log2((EARTH_CIRCUMFERENCE_M * cosLat) / (targetMetersPerPixel * Math.pow(2, 8)))
  return Math.max(0, Math.min(22, rawZoom))
}

/** Formatta il denominatore come etichetta "1:5000". */
export function formatScaleLabel(scaleDenominator) {
  if (!scaleDenominator || scaleDenominator <= 0) return "—"
  return `1:${scaleDenominator.toLocaleString("it-IT")}`
}

/** Sceglie la distanza “tonda” (m) e la larghezza barra (px) per la preview. */
export function getScaleBarMetrics(lat, zoom, maxBarWidthPx = 120) {
  const metersPerPixel = getMetersPerPixel(lat, zoom)
  const niceDistances = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]
  let chosenDistance = niceDistances[0]

  for (const distance of niceDistances) {
    const barWidth = distance / metersPerPixel
    if (barWidth <= maxBarWidthPx) {
      chosenDistance = distance
    } else {
      break
    }
  }

  const barWidthPx = Math.round(chosenDistance / metersPerPixel)
  const label =
    chosenDistance >= 1000
      ? `${(chosenDistance / 1000).toLocaleString("it-IT")} km`
      : `${chosenDistance.toLocaleString("it-IT")} m`

  return {
    distanceMeters: chosenDistance,
    barWidthPx,
    label,
    scaleDenominator: getScaleDenominator(lat, zoom),
  }
}

export const PRINT_SCALE_OPTIONS = [
  { value: "auto", label: "Scala attuale (auto)" },
  { value: "500", label: "1:500" },
  { value: "1000", label: "1:1000" },
  { value: "2000", label: "1:2000" },
  { value: "5000", label: "1:5000" },
  { value: "10000", label: "1:10000" },
]

export const PRINT_SIZE_PRESETS = [
  { value: "viewport", label: "Dimensione viewport", width: null, height: null },
  { value: "1920x1080", label: "1920 × 1080 px", width: 1920, height: 1080 },
  { value: "1280x720", label: "1280 × 720 px", width: 1280, height: 720 },
  { value: "custom", label: "Personalizzata", width: null, height: null },
]

const WATERMARK_LOGO_URL = `${import.meta.env.BASE_URL}faviconDark.png`

let watermarkLogoPromise = null

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = "async"
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Impossibile caricare il logo per il watermark"))
    image.src = src
  })
}

function getWatermarkLogo() {
  watermarkLogoPromise ??= loadImage(WATERMARK_LOGO_URL)
  return watermarkLogoPromise
}

function toPngLatin1Text(text) {
  return String(text)
    .replace(/©/g, "(c)")
    .replace(/—/g, "-")
    .replace(/[^\x20-\x7E]/g, "")
}

function buildExportMetadata({ cityName } = {}) {
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const basePath = import.meta.env.BASE_URL || "/"
  const platformUrl = `${origin}${basePath.replace(/\/$/, "")}`
  const year = new Date().getFullYear()

  return {
    Title: toPngLatin1Text(cityName ? `Lighting Map - ${cityName}` : "Lighting Map"),
    Author: "Lighting Map",
    Copyright: toPngLatin1Text(`(c) ${year} Lighting Map - Tutti i diritti riservati`),
    Description: toPngLatin1Text(
      cityName
        ? `Mappa illuminazione pubblica: ${cityName}. Esportata da Lighting Map (${platformUrl}).`
        : `Mappa illuminazione pubblica esportata da Lighting Map (${platformUrl}).`,
    ),
    Software: "Lighting Map Platform",
    Source: platformUrl,
    Comment: toPngLatin1Text(
      "Documento generato da Lighting Map. Uso, riproduzione o ridistribuzione non autorizzati sono vietati.",
    ),
  }
}

async function loadMapImageFromDataUrl(mapImageDataUrl) {
  const image = await loadImage(mapImageDataUrl)
  if (typeof image.decode === "function") {
    await image.decode()
  }
  if (image.naturalWidth > 0 && image.naturalHeight > 0) {
    return image
  }

  if (typeof createImageBitmap === "function") {
    const response = await fetch(mapImageDataUrl)
    const blob = await response.blob()
    const bitmap = await createImageBitmap(blob)
    if (bitmap.width > 0 && bitmap.height > 0) {
      return bitmap
    }
    bitmap.close?.()
  }

  throw new Error("Cattura mappa non valida")
}

async function applyWatermarkToCanvas(baseCanvas, logo, { scaleLabel, sectionLabel } = {}) {
  const width = baseCanvas.width
  const height = baseCanvas.height

  if (isCanvasMostlyBlank(baseCanvas)) {
    throw new Error("Cattura mappa non riuscita. Attendi il caricamento completo e riprova.")
  }

  const output = document.createElement("canvas")
  output.width = width
  output.height = height

  const ctx = output.getContext("2d")
  if (!ctx) {
    throw new Error("Canvas non supportato")
  }

  ctx.drawImage(baseCanvas, 0, 0, width, height)

  const sample = ctx.getImageData(Math.floor(width / 2), Math.floor(height / 2), 1, 1).data
  if (sample[3] < 12) {
    throw new Error("Cattura mappa non riuscita. Attendi il caricamento completo e riprova.")
  }

  const minDim = Math.min(width, height)
  const margin = Math.round(minDim * 0.025)

  if (sectionLabel) {
    const fontSize = Math.round(Math.max(14, Math.min(28, minDim * 0.028)))
    ctx.save()
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`
    ctx.textBaseline = "top"
    ctx.textAlign = "left"
    ctx.fillStyle = "#000000"
    ctx.fillText(String(sectionLabel), margin, margin)
    ctx.restore()
  }

  if (scaleLabel) {
    const fontSize = Math.round(Math.max(11, Math.min(18, minDim * 0.016)))
    const text = String(scaleLabel)
    ctx.save()
    ctx.font = `500 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`
    ctx.textBaseline = "bottom"
    ctx.textAlign = "left"
    ctx.fillStyle = "#000000"
    ctx.fillText(text, margin, height - margin)
    ctx.restore()
  }

  const logoSize = Math.round(Math.max(40, Math.min(112, minDim * 0.09)))
  const logoX = width - logoSize - margin
  const logoY = height - logoSize - margin

  ctx.save()
  ctx.globalAlpha = 0.65
  ctx.drawImage(logo, logoX, logoY, logoSize, logoSize)
  ctx.restore()

  return output
}

async function applyWatermark(mapImageDataUrl, logo, canvasWidth, canvasHeight, options) {
  const mapImage = await loadMapImageFromDataUrl(mapImageDataUrl)
  const sourceWidth = mapImage.width ?? mapImage.naturalWidth
  const sourceHeight = mapImage.height ?? mapImage.naturalHeight

  if (!sourceWidth || !sourceHeight) {
    mapImage.close?.()
    throw new Error("Cattura mappa non valida")
  }

  if (sourceWidth < 32 || sourceHeight < 32) {
    mapImage.close?.()
    throw new Error("Cattura mappa non riuscita. Attendi il caricamento completo e riprova.")
  }

  const width = canvasWidth || sourceWidth
  const height = canvasHeight || sourceHeight

  const baseCanvas = document.createElement("canvas")
  baseCanvas.width = width
  baseCanvas.height = height
  const baseCtx = baseCanvas.getContext("2d")
  if (!baseCtx) {
    mapImage.close?.()
    throw new Error("Canvas non supportato")
  }

  baseCtx.drawImage(mapImage, 0, 0, width, height)
  mapImage.close?.()

  return applyWatermarkToCanvas(baseCanvas, logo, options)
}

async function buildWatermarkedCanvas({ mapCanvas, mapCapture, logo, scaleLabel, sectionLabel }) {
  try {
    const mapImageDataUrl = await pickBestMapCapture(mapCapture)
    const canvas = await applyWatermark(mapImageDataUrl, logo, mapCanvas.width, mapCanvas.height, {
      scaleLabel,
      sectionLabel,
    })
    if (!isCanvasMostlyBlank(canvas)) return canvas
  } catch {
    // fallback
  }

  const pixelCanvas = readMapCanvasPixels(mapCanvas)
  if (pixelCanvas) {
    return applyWatermarkToCanvas(pixelCanvas, logo, { scaleLabel, sectionLabel })
  }

  const mapImageDataUrl = await pickBestMapCapture(mapCapture)
  return applyWatermark(mapImageDataUrl, logo, mapCanvas.width, mapCanvas.height, {
    scaleLabel,
    sectionLabel,
  })
}

/** Cattura la mappa su canvas senza watermark (per ritaglio precedente al logo). */
async function captureMapCanvasWithoutWatermark({ mapCanvas, mapCapture }) {
  // Copia 2D già pronta dallo snapshot (canvas con solo context 2d)
  if (mapCanvas?.width > 0 && mapCanvas?.height > 0) {
    let ctx2d = null
    try {
      ctx2d = mapCanvas.getContext("2d")
    } catch {
      ctx2d = null
    }
    if (ctx2d && !isCanvasMostlyBlank(mapCanvas)) {
      return mapCanvas
    }
  }

  try {
    const mapImageDataUrl = await pickBestMapCapture(mapCapture)
    const mapImage = await loadMapImageFromDataUrl(mapImageDataUrl)
    const sourceWidth = mapImage.width ?? mapImage.naturalWidth
    const sourceHeight = mapImage.height ?? mapImage.naturalHeight
    if (!sourceWidth || !sourceHeight) {
      mapImage.close?.()
      throw new Error("Cattura mappa non valida")
    }

    const width = (mapCanvas && mapCanvas.width) || sourceWidth
    const height = (mapCanvas && mapCanvas.height) || sourceHeight
    const baseCanvas = document.createElement("canvas")
    baseCanvas.width = width
    baseCanvas.height = height
    const baseCtx = baseCanvas.getContext("2d")
    if (!baseCtx) {
      mapImage.close?.()
      throw new Error("Canvas non supportato")
    }
    baseCtx.drawImage(mapImage, 0, 0, width, height)
    mapImage.close?.()
    if (!isCanvasMostlyBlank(baseCanvas)) return baseCanvas
  } catch {
    // fallback sotto
  }

  const pixelCanvas = readMapCanvasPixels(mapCanvas)
  if (pixelCanvas && !isCanvasMostlyBlank(pixelCanvas)) return pixelCanvas

  throw new Error("Cattura mappa non riuscita. Attendi il caricamento completo e riprova.")
}

function waitForMapRenderFrame(map, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Export annullato", "AbortError"))
      return
    }

    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener("abort", onAbort)
      map.off("render", onRender)
      requestAnimationFrame(() => resolve())
    }

    const onAbort = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      map.off("render", onRender)
      reject(new DOMException("Export annullato", "AbortError"))
    }

    const onRender = () => finish()

    signal?.addEventListener("abort", onAbort, { once: true })
    map.once("render", onRender)
    const timer = setTimeout(finish, 3000)
    map.triggerRepaint()
  })
}

async function isDataUrlMostlyTransparent(dataUrl) {
  const image = await loadImage(dataUrl)
  const width = image.naturalWidth
  const height = image.naturalHeight
  if (!width || !height) return true

  const sampleCanvas = document.createElement("canvas")
  const sampleSize = Math.min(48, width, height)
  sampleCanvas.width = sampleSize
  sampleCanvas.height = sampleSize
  const sampleCtx = sampleCanvas.getContext("2d")
  if (!sampleCtx) return true

  sampleCtx.drawImage(image, 0, 0, sampleSize, sampleSize)
  const pixels = sampleCtx.getImageData(0, 0, sampleSize, sampleSize).data
  return isPixelDataMostlyBlank(pixels, { minLit: 8 })
}

function isPixelDataMostlyBlank(data, { minLit = 16 } = {}) {
  let lit = 0
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]
    if (alpha < 12) continue
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    if (luminance > 10) lit += 1
  }
  return lit < minLit
}

function isCanvasMostlyBlank(canvas) {
  if (!canvas?.width || !canvas?.height) return true
  const ctx = canvas.getContext("2d")
  if (!ctx) return true
  const sampleW = Math.min(64, canvas.width)
  const sampleH = Math.min(64, canvas.height)
  try {
    const { data } = ctx.getImageData(
      Math.floor((canvas.width - sampleW) / 2),
      Math.floor((canvas.height - sampleH) / 2),
      sampleW,
      sampleH,
    )
    return isPixelDataMostlyBlank(data)
  } catch {
    return true
  }
}

function readMapCanvasPixels(mapCanvas) {
  // Riusa il context WebGL già creato da MapLibre (non crearne uno nuovo).
  const gl =
    mapCanvas.getContext("webgl2") ||
    mapCanvas.getContext("webgl")
  if (!gl) return null

  const width = mapCanvas.width
  const height = mapCanvas.height
  if (!width || !height) return null

  const pixels = new Uint8Array(width * height * 4)
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

  if (isPixelDataMostlyBlank(pixels, { minLit: 64 })) return null

  const output = document.createElement("canvas")
  output.width = width
  output.height = height
  const ctx = output.getContext("2d")
  if (!ctx) return null

  const imageData = ctx.createImageData(width, height)
  for (let y = 0; y < height; y += 1) {
    const srcRow = (height - 1 - y) * width * 4
    const dstRow = y * width * 4
    imageData.data.set(pixels.subarray(srcRow, srcRow + width * 4), dstRow)
  }
  ctx.putImageData(imageData, 0, 0)
  if (isCanvasMostlyBlank(output)) return null
  return output
}

function isCaptureDataUrlLikelyBlank(dataUrl) {
  // PNG vuoti/neri tipici ~50KB; una mappa reale è di solito >200KB
  return !dataUrl || dataUrl.length < 100000
}

function snapshotMapCanvas(map) {
  map.triggerRepaint?.()
  const mapCanvas = map.getCanvas()
  return {
    mapCanvas,
    pngDataUrl: mapCanvas.toDataURL("image/png"),
    jpegDataUrl: mapCanvas.toDataURL("image/jpeg", 0.95),
  }
}

/**
 * Snapshot affidabile: cattura SINCRONA dentro l'evento `render`.
 * Se si aspetta rAF dopo render, il buffer WebGL è spesso già vuoto (png ~50KB).
 */
async function snapshotMapCanvasReliable(map, signal) {
  if (signal?.aborted) throw new DOMException("Export annullato", "AbortError")

  return new Promise((resolve, reject) => {
    let settled = false

    const onAbort = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      map.off("render", onRender)
      reject(new DOMException("Export annullato", "AbortError"))
    }

    const onRender = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener("abort", onAbort)
      try {
        const glCanvas = map.getCanvas()
        const gl = glCanvas.getContext("webgl2") || glCanvas.getContext("webgl")
        const contextLost = Boolean(gl?.isContextLost?.())

        // Preferisci toDataURL nel frame di render (preserveDrawingBuffer)
        let pngDataUrl = glCanvas.toDataURL("image/png")
        let jpegDataUrl = glCanvas.toDataURL("image/jpeg", 0.95)
        let via = "toDataURL-sync-render"
        let mapCanvas = glCanvas

        if (isCaptureDataUrlLikelyBlank(pngDataUrl)) {
          const copy = document.createElement("canvas")
          copy.width = glCanvas.width || 1
          copy.height = glCanvas.height || 1
          const ctx = copy.getContext("2d")
          if (ctx) {
            ctx.drawImage(glCanvas, 0, 0)
            pngDataUrl = copy.toDataURL("image/png")
            jpegDataUrl = copy.toDataURL("image/jpeg", 0.95)
            mapCanvas = copy
            via = "drawImage-sync-render"
          }
        } else {
          // Copia 2D subito per non dipendere dal buffer GL dopo
          const copy = document.createElement("canvas")
          copy.width = glCanvas.width || 1
          copy.height = glCanvas.height || 1
          const ctx = copy.getContext("2d")
          if (ctx) {
            ctx.drawImage(glCanvas, 0, 0)
            if (!isCanvasMostlyBlank(copy)) {
              mapCanvas = copy
              pngDataUrl = copy.toDataURL("image/png")
              jpegDataUrl = copy.toDataURL("image/jpeg", 0.95)
              via = "toDataURL+copy-sync-render"
            }
          }
        }

        if (isCaptureDataUrlLikelyBlank(pngDataUrl)) {
          const fromGl = readMapCanvasPixels(glCanvas)
          if (fromGl && !isCanvasMostlyBlank(fromGl)) {
            pngDataUrl = fromGl.toDataURL("image/png")
            jpegDataUrl = fromGl.toDataURL("image/jpeg", 0.95)
            mapCanvas = fromGl
            via = "readPixels-sync-render"
          }
        }

        resolve({ mapCanvas, pngDataUrl, jpegDataUrl, via, contextLost })
      } catch (error) {
        reject(error)
      }
    }

    signal?.addEventListener("abort", onAbort, { once: true })
    map.once("render", onRender)
    const timer = setTimeout(() => {
      map.off("render", onRender)
      if (!settled) {
        settled = true
        signal?.removeEventListener("abort", onAbort)
        reject(new Error("Timeout attesa render mappa"))
      }
    }, 4000)
    map.triggerRepaint()
  })
}

/** Ricostruisce il framebuffer WebGL (necessario dopo toDataURL ripetuti). */
async function rebuildMapFramebuffer(map, signal) {
  if (!map || typeof map.resize !== "function") return
  if (signal?.aborted) throw new DOMException("Export annullato", "AbortError")
  map.resize()
  await waitForMapReadyExport(map, signal, 12000)
}

async function pickBestMapCapture({ pngDataUrl, jpegDataUrl }) {
  if (pngDataUrl?.startsWith("data:image/png") && !(await isDataUrlMostlyTransparent(pngDataUrl))) {
    return pngDataUrl
  }

  if (jpegDataUrl?.startsWith("data:image/jpeg") && !(await isDataUrlMostlyTransparent(jpegDataUrl))) {
    return jpegDataUrl
  }

  throw new Error("Cattura mappa non riuscita. Attendi il caricamento completo e riprova.")
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let j = 0; j < 8; j += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

function crc32(bytes) {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function writeUint32BE(view, offset, value) {
  view.setUint32(offset, value, false)
}

function createPngTextChunk(keyword, text) {
  const encoder = new TextEncoder()
  const keywordBytes = encoder.encode(keyword)
  const textBytes = encoder.encode(text)
  const data = new Uint8Array(keywordBytes.length + 1 + textBytes.length)
  data.set(keywordBytes, 0)
  data[keywordBytes.length] = 0
  data.set(textBytes, keywordBytes.length + 1)

  const chunk = new Uint8Array(12 + data.length)
  const view = new DataView(chunk.buffer)
  writeUint32BE(view, 0, data.length)
  chunk.set([0x74, 0x45, 0x58, 0x74], 4)
  chunk.set(data, 8)
  writeUint32BE(view, 8 + data.length, crc32(chunk.subarray(4, 8 + data.length)))
  return chunk
}

function injectPngMetadata(pngBuffer, metadata) {
  const source = new Uint8Array(pngBuffer)
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  for (let i = 0; i < signature.length; i += 1) {
    if (source[i] !== signature[i]) {
      throw new Error("Formato PNG non valido")
    }
  }

  let offset = 8
  const chunks = [source.slice(0, 8)]
  while (offset < source.length) {
    const view = new DataView(source.buffer, source.byteOffset + offset)
    const length = view.getUint32(0, false)
    const type = String.fromCharCode(source[offset + 4], source[offset + 5], source[offset + 6], source[offset + 7])
    const chunkEnd = offset + 12 + length
    const chunkBytes = source.slice(offset, chunkEnd)
    if (type === "IEND") {
      for (const [keyword, value] of Object.entries(metadata)) {
        if (value) chunks.push(createPngTextChunk(keyword, String(value)))
      }
    }
    chunks.push(chunkBytes)
    offset = chunkEnd
    if (type === "IEND") break
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const output = new Uint8Array(totalLength)
  let writeOffset = 0
  for (const chunk of chunks) {
    output.set(chunk, writeOffset)
    writeOffset += chunk.length
  }
  return output
}

function dataUrlToUint8Array(dataUrl) {
  const base64 = dataUrl.split(",")[1]
  if (!base64) {
    throw new Error("Formato immagine non valido")
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function getPngIdatByteLength(pngBytes) {
  let offset = 8
  let total = 0
  while (offset < pngBytes.length) {
    const view = new DataView(pngBytes.buffer, pngBytes.byteOffset + offset)
    const length = view.getUint32(0, false)
    const type = String.fromCharCode(
      pngBytes[offset + 4],
      pngBytes[offset + 5],
      pngBytes[offset + 6],
      pngBytes[offset + 7],
    )
    if (type === "IDAT") total += length
    offset += 12 + length
    if (type === "IEND") break
  }
  return total
}

async function canvasToPngBytes(canvas, metadata) {
  const dataUrl = canvas.toDataURL("image/png")
  const pngBytes = dataUrlToUint8Array(dataUrl)
  if (!metadata || Object.keys(metadata).length === 0) {
    return pngBytes
  }

  const idatBefore = getPngIdatByteLength(pngBytes)
  const enrichedBytes = injectPngMetadata(pngBytes, metadata)
  if (getPngIdatByteLength(enrichedBytes) !== idatBefore) {
    throw new Error("Metadati PNG non applicabili senza alterare l'immagine")
  }
  return enrichedBytes
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Ritaglia un canvas in pixel CSS del container mappa (tiene conto del devicePixelRatio).
 * Se outputWidth/Height sono forniti, riscala il ritaglio a quelle dimensioni.
 */
function cropCanvasToRect(sourceCanvas, cropRect, containerWidth, containerHeight, outputWidth, outputHeight) {
  if (!cropRect) return sourceCanvas

  const dprX = sourceCanvas.width / Math.max(1, containerWidth)
  const dprY = sourceCanvas.height / Math.max(1, containerHeight)

  const sx = Math.max(0, Math.round(cropRect.x * dprX))
  const sy = Math.max(0, Math.round(cropRect.y * dprY))
  const sw = Math.min(sourceCanvas.width - sx, Math.round(cropRect.width * dprX))
  const sh = Math.min(sourceCanvas.height - sy, Math.round(cropRect.height * dprY))

  if (sw < 32 || sh < 32) {
    throw new Error("Area di stampa troppo piccola")
  }

  const targetW = outputWidth || sw
  const targetH = outputHeight || sh
  const cropped = document.createElement("canvas")
  cropped.width = targetW
  cropped.height = targetH
  const ctx = cropped.getContext("2d")
  if (!ctx) throw new Error("Canvas non supportato")

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, targetW, targetH)
  return cropped
}

/**
 * Esporta la mappa MapLibre come PNG.
 * Se width/height sono forniti senza cropRect, ridimensiona temporaneamente il container.
 * Con cropRect (pixel CSS sul container) esporta solo l'area selezionata.
 * Con returnBlob: true restituisce un Blob PNG senza avviare il download.
 * beforeCapture: callback opzionale prima dello snapshot (es. overlay temporanei).
 */
export async function exportMapToPng(map, {
  width,
  height,
  scaleDenominator,
  filename,
  signal,
  cityName,
  cropRect,
  scaleLabel,
  sectionLabel,
  returnBlob = false,
  beforeCapture,
  restoreView = true,
} = {}) {
  if (!map || typeof map.getCanvas !== "function") {
    throw new Error("Mappa non disponibile per l'export")
  }

  const container = map.getContainer()
  const center = map.getCenter()
  const bearing = map.getBearing()
  const pitch = map.getPitch()
  const lat = center.lat

  const originalStyle = {
    width: container.style.width,
    height: container.style.height,
  }
  const originalZoom = map.getZoom()

  let targetZoom = originalZoom
  if (scaleDenominator && scaleDenominator !== "auto") {
    targetZoom = getZoomForScaleDenominator(lat, Number(scaleDenominator))
  }

  const resolvedScaleLabel =
    scaleLabel ||
    formatScaleLabel(
      scaleDenominator && scaleDenominator !== "auto"
        ? Number(scaleDenominator)
        : getScaleDenominator(lat, targetZoom),
    )

  const hasCrop = Boolean(
    cropRect &&
      Number.isFinite(cropRect.x) &&
      Number.isFinite(cropRect.y) &&
      Number.isFinite(cropRect.width) &&
      Number.isFinite(cropRect.height),
  )
  const exportWidth = width || container.clientWidth
  const exportHeight = height || container.clientHeight
  const isViewportExport = width == null && height == null
  // Con area di stampa non ridimensioniamo il container: ritagliamo e poi riscaliamo.
  const shouldResizeContainer = !isViewportExport && !hasCrop

  try {
    if (signal?.aborted) throw new DOMException("Export annullato", "AbortError")

    if (exportWidth < 100 || exportHeight < 100) {
      throw new Error("Dimensioni mappa non valide per l'export")
    }

    if (shouldResizeContainer) {
      container.style.width = `${exportWidth}px`
      container.style.height = `${exportHeight}px`
      map.resize()
    }

    if (targetZoom !== originalZoom) {
      map.jumpTo({ center, zoom: targetZoom, bearing, pitch })
    }

    await waitForMapReadyExport(map, signal)

    if (typeof beforeCapture === "function") {
      await beforeCapture(map)
      await waitForMapReadyExport(map, signal)
    }

    if (signal?.aborted) throw new DOMException("Export annullato", "AbortError")

    const logo = await getWatermarkLogo()
    let exportCanvas = null
    let lastError = null

    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (signal?.aborted) throw new DOMException("Export annullato", "AbortError")

      // Ricostruisci framebuffer, poi snapshot SINCRONO sul render
      await rebuildMapFramebuffer(map, signal)
      if (attempt > 0) {
        await nudgeMapForRedraw(map, signal)
      }

      try {
        const mapCapture = await snapshotMapCanvasReliable(map, signal)
        const mapCanvas = mapCapture.mapCanvas

        if (isCaptureDataUrlLikelyBlank(mapCapture.pngDataUrl) && isCaptureDataUrlLikelyBlank(mapCapture.jpegDataUrl)) {
          lastError = new Error("Frame mappa vuoto")
          continue
        }

        if (hasCrop) {
          const rawCanvas = await captureMapCanvasWithoutWatermark({ mapCanvas, mapCapture })
          if (isCanvasMostlyBlank(rawCanvas)) {
            lastError = new Error("Frame mappa vuoto")
            continue
          }
          const cropped = cropCanvasToRect(
            rawCanvas,
            cropRect,
            container.clientWidth,
            container.clientHeight,
            isViewportExport ? null : exportWidth,
            isViewportExport ? null : exportHeight,
          )
          exportCanvas = await applyWatermarkToCanvas(cropped, logo, {
            scaleLabel: resolvedScaleLabel,
            sectionLabel,
          })
        } else {
          exportCanvas = await buildWatermarkedCanvas({
            mapCanvas,
            mapCapture,
            logo,
            scaleLabel: resolvedScaleLabel,
            sectionLabel,
          })
        }
        break
      } catch (error) {
        lastError = error
        exportCanvas = null
      }
    }

    if (!exportCanvas) {
      throw lastError || new Error("Cattura mappa non riuscita. Attendi il caricamento completo e riprova.")
    }

    const metadata = buildExportMetadata({ cityName })
    let pngBytes
    try {
      pngBytes = await canvasToPngBytes(exportCanvas, metadata)
    } catch (metadataError) {
      console.warn("Metadati PNG non applicati, export senza metadati:", metadataError)
      pngBytes = await canvasToPngBytes(exportCanvas, null)
    }
    const blob = new Blob([pngBytes], { type: "image/png" })
    if (returnBlob) return blob
    downloadBlob(blob, filename || "mappa-export.png")
    return blob
  } finally {
    if (shouldResizeContainer) {
      container.style.width = originalStyle.width
      container.style.height = originalStyle.height
      map.resize()
    }
    if (restoreView && targetZoom !== originalZoom) {
      map.jumpTo({ center, zoom: originalZoom, bearing, pitch })
      await waitForMapIdle(map)
    }
  }
}

/** Espone wait idle per sequenze multi-export. */
export function waitForMapIdleExport(map, signal, timeoutMs = 12000) {
  return waitForMapIdle(map, signal, timeoutMs)
}

/** Attende idle + tile caricati (evita PNG neri tra un jump e l'altro). */
export async function waitForMapReadyExport(map, signal, timeoutMs = 20000) {
  await waitForMapIdle(map, signal, timeoutMs)
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (signal?.aborted) throw new DOMException("Export annullato", "AbortError")
    const tilesOk = typeof map.areTilesLoaded !== "function" || map.areTilesLoaded()
    const moving = typeof map.isMoving === "function" && map.isMoving()
    if (tilesOk && !moving) {
      await waitForMapRenderFrame(map, signal)
      await waitForMapRenderFrame(map, signal)
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 120))
  }
  await waitForMapRenderFrame(map, signal)
}

/**
 * Con tile già in cache, idle/tilesLoaded non bastano: il framebuffer può restare vuoto.
 * Un micro-zoom forza un ridisegno completo prima dello snapshot.
 */
async function nudgeMapForRedraw(map, signal) {
  if (!map || typeof map.getZoom !== "function") return
  if (signal?.aborted) throw new DOMException("Export annullato", "AbortError")

  const center = map.getCenter()
  const zoom = map.getZoom()
  const bearing = map.getBearing()
  const pitch = map.getPitch()
  const nudgedZoom = Math.min(22, zoom + 0.02)

  map.jumpTo({ center, zoom: nudgedZoom, bearing, pitch })
  await waitForMapIdle(map, signal, 8000)
  if (signal?.aborted) throw new DOMException("Export annullato", "AbortError")

  map.jumpTo({ center, zoom, bearing, pitch })
  await waitForMapReadyExport(map, signal, 12000)
}

/**
 * Attende il prossimo idle MapLibre.
 * Se la mappa è già idle, `once('idle')` non scatta mai: forziamo un
 * `triggerRepaint` e teniamo un timeout di sicurezza.
 */
function waitForMapIdle(map, signal, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Export annullato", "AbortError"))
      return
    }

    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener("abort", onAbort)
      map.off("idle", onIdle)
      resolve()
    }

    const onAbort = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      map.off("idle", onIdle)
      reject(new DOMException("Export annullato", "AbortError"))
    }

    const onIdle = () => finish()

    signal?.addEventListener("abort", onAbort, { once: true })
    map.once("idle", onIdle)

    const timer = setTimeout(() => {
      console.warn("waitForMapIdle: timeout, proseguo comunque")
      finish()
    }, timeoutMs)

    try {
      map.triggerRepaint?.()
    } catch {
      // ignore
    }
  })
}


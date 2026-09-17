import { useCallback, useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Check, Plus, Printer, Trash2, X } from "lucide-react"
import toast from "react-hot-toast"
import JSZip from "jszip"
import { usePrintAvailability, PRINT_DISABLED_MESSAGE } from "../hooks/usePrintAvailability"
import { useMediaQuery } from "../hooks/useMediaQuery"
import { INFO_WINDOW_MOBILE_MQ } from "../utils/infoWindowActions"
import {
  downloadBlob,
  exportMapToPng,
  formatScaleLabel,
  getScaleBarMetrics,
  getScaleDenominator,
  getZoomForScaleDenominator,
  PRINT_SCALE_OPTIONS,
  PRINT_SIZE_PRESETS,
} from "../utils/mapScaleUtils"
import {
  MAX_PRINT_SECTIONS,
  addOverviewSectionLayers,
  boundsToRectPx,
  clampBoundsInside,
  clampRectInside,
  createSectionId,
  cropRectFromBounds,
  flyMapToBounds,
  intersectRects,
  isBoundsInside,
  padSectionIndex,
  rectPxToBounds,
  removeOverviewSectionLayers,
  restoreMapView,
} from "../utils/printSectionUtils"

const MIN_PRINT_AREA_PX = 80
const HANDLE_SIZE = 12
const EDGE_MOVE_SIZE = 16

const clampRect = (rect, containerW, containerH) => {
  const width = Math.max(MIN_PRINT_AREA_PX, Math.min(rect.width, containerW))
  const height = Math.max(MIN_PRINT_AREA_PX, Math.min(rect.height, containerH))
  return {
    width,
    height,
    x: Math.max(0, Math.min(rect.x, containerW - width)),
    y: Math.max(0, Math.min(rect.y, containerH - height)),
  }
}

const resizeRectFromHandle = (startRect, handle, dx, dy) => {
  let { x, y, width, height } = startRect
  const right = x + width
  const bottom = y + height

  if (handle.includes("e")) width = Math.max(MIN_PRINT_AREA_PX, width + dx)
  if (handle.includes("s")) height = Math.max(MIN_PRINT_AREA_PX, height + dy)
  if (handle.includes("w")) {
    const nextX = Math.min(x + dx, right - MIN_PRINT_AREA_PX)
    width = right - nextX
    x = nextX
  }
  if (handle.includes("n")) {
    const nextY = Math.min(y + dy, bottom - MIN_PRINT_AREA_PX)
    height = bottom - nextY
    y = nextY
  }

  return { x, y, width, height }
}

/** Riquadro alle dimensioni px richieste (ridotto se non entra; mantiene il centro se possibile). */
const createRectFromPixelSize = (
  containerW,
  containerH,
  targetWidth,
  targetHeight,
  insets = {},
  currentRect = null,
) => {
  const left = insets.left || 0
  const right = insets.right || 0
  const top = insets.top || 0
  const bottom = insets.bottom || 0
  const availW = Math.max(MIN_PRINT_AREA_PX, containerW - left - right - 8)
  const availH = Math.max(MIN_PRINT_AREA_PX, containerH - top - bottom - 8)

  let width = Math.max(MIN_PRINT_AREA_PX, targetWidth)
  let height = Math.max(MIN_PRINT_AREA_PX, targetHeight)

  if (width > availW || height > availH) {
    const scale = Math.min(availW / width, availH / height, 1)
    width = Math.max(MIN_PRINT_AREA_PX, Math.floor(width * scale))
    height = Math.max(MIN_PRINT_AREA_PX, Math.floor(height * scale))
  }

  const centerX = currentRect
    ? currentRect.x + currentRect.width / 2
    : left + availW / 2
  const centerY = currentRect
    ? currentRect.y + currentRect.height / 2
    : top + availH / 2

  return clampRect(
    {
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
    },
    containerW,
    containerH,
  )
}

const resolveTargetPixelSize = (sizePreset, customWidth, customHeight, containerW, containerH, insets = {}) => {
  const left = insets.left || 0
  const right = insets.right || 0
  const top = insets.top || 0
  const bottom = insets.bottom || 0
  const availW = Math.max(MIN_PRINT_AREA_PX, containerW - left - right - 8)
  const availH = Math.max(MIN_PRINT_AREA_PX, containerH - top - bottom - 8)

  const preset = PRINT_SIZE_PRESETS.find((item) => item.value === sizePreset)
  if (!preset || preset.value === "viewport") {
    return { width: availW, height: availH }
  }
  if (preset.value === "custom") {
    const width = Number.parseInt(customWidth, 10)
    const height = Number.parseInt(customHeight, 10)
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
      return null
    }
    return { width, height }
  }
  return { width: preset.width, height: preset.height }
}

const HANDLES = [
  { key: "nw", cursor: "nwse-resize", style: { left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 } },
  { key: "n", cursor: "ns-resize", style: { left: "50%", top: -HANDLE_SIZE / 2, marginLeft: -HANDLE_SIZE / 2 } },
  { key: "ne", cursor: "nesw-resize", style: { right: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 } },
  { key: "e", cursor: "ew-resize", style: { right: -HANDLE_SIZE / 2, top: "50%", marginTop: -HANDLE_SIZE / 2 } },
  { key: "se", cursor: "nwse-resize", style: { right: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 } },
  { key: "s", cursor: "ns-resize", style: { left: "50%", bottom: -HANDLE_SIZE / 2, marginLeft: -HANDLE_SIZE / 2 } },
  { key: "sw", cursor: "nesw-resize", style: { left: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 } },
  { key: "w", cursor: "ew-resize", style: { left: -HANDLE_SIZE / 2, top: "50%", marginTop: -HANDLE_SIZE / 2 } },
]

/**
 * Overlay: maschera + riquadro tratteggiato trascinabile/ridimensionabile.
 * Opzionale: parentBoundsRect (bordo area totale), passiveRects (altre sezioni numerate).
 */
const PrintAreaOverlay = ({
  map,
  rect,
  onRectChange,
  label,
  disabled,
  parentBoundsRect = null,
  passiveRects = [],
  maskHoles = true,
}) => {
  const maskId = useId().replace(/:/g, "")
  const dragRef = useRef(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!map || typeof map.getContainer !== "function") return undefined
    const container = map.getContainer()
    const updateSize = () => {
      setContainerSize({
        width: container.clientWidth,
        height: container.clientHeight,
      })
    }
    updateSize()
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateSize) : null
    observer?.observe(container)
    map.on("resize", updateSize)
    return () => {
      observer?.disconnect()
      map.off("resize", updateSize)
    }
  }, [map])

  useEffect(() => {
    const onPointerMove = (event) => {
      const drag = dragRef.current
      if (!drag || disabled) return
      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY
      let next
      if (drag.mode === "move") {
        next = {
          ...drag.startRect,
          x: drag.startRect.x + dx,
          y: drag.startRect.y + dy,
        }
      } else {
        next = resizeRectFromHandle(drag.startRect, drag.handle, dx, dy)
      }
      let clamped = clampRect(next, containerSize.width, containerSize.height)
      if (parentBoundsRect) {
        clamped = clampRectInside(clamped, parentBoundsRect, MIN_PRINT_AREA_PX)
      }
      onRectChange(clamped)
    }
    const onPointerUp = () => {
      dragRef.current = null
    }
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    window.addEventListener("pointercancel", onPointerUp)
    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
    }
  }, [containerSize.height, containerSize.width, disabled, onRectChange, parentBoundsRect])

  if (!map || typeof map.getContainer !== "function") return null
  if (!rect && !parentBoundsRect && passiveRects.length === 0) return null
  const container = map.getContainer()
  if (!container || !containerSize.width) return null

  const startDrag = (mode, handle) => (event) => {
    if (disabled || !rect) return
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = {
      mode,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      startRect: { ...rect },
    }
  }

  const holeRects = maskHoles
    ? [rect, ...passiveRects.map((p) => p.rect)].filter(Boolean)
    : rect
      ? [rect]
      : []

  return createPortal(
    <div className="absolute inset-0 z-[500] overflow-hidden" style={{ pointerEvents: "none" }}>
      <svg className="absolute inset-0 h-full w-full" width="100%" height="100%">
        <defs>
          <mask id={`print-area-mask-${maskId}`}>
            <rect width="100%" height="100%" fill="white" />
            {holeRects.map((hole, idx) => (
              <rect
                key={`hole-${idx}`}
                x={hole.x}
                y={hole.y}
                width={hole.width}
                height={hole.height}
                fill="black"
              />
            ))}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(2, 12, 28, 0.52)"
          mask={`url(#print-area-mask-${maskId})`}
        />
      </svg>

      {parentBoundsRect && (
        <div
          className="absolute border-2 border-amber-400/80 pointer-events-none"
          style={{
            left: parentBoundsRect.x,
            top: parentBoundsRect.y,
            width: parentBoundsRect.width,
            height: parentBoundsRect.height,
          }}
        >
          <div className="absolute inset-x-0 -top-6 flex justify-center">
            <span className="rounded-md bg-amber-950/80 px-2 py-0.5 text-[10px] font-medium tracking-wide text-amber-100">
              Area totale
            </span>
          </div>
        </div>
      )}

      {passiveRects.map((item) => (
        <div
          key={item.id}
          className="absolute border-2 border-dashed border-red-500/85 pointer-events-none bg-red-500/25"
          style={{
            left: item.rect.x,
            top: item.rect.y,
            width: item.rect.width,
            height: item.rect.height,
          }}
        >
          <div className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-red-600 text-xs font-bold text-white shadow">
            {item.index}
          </div>
        </div>
      ))}

      {rect && (
      <div
        role="presentation"
        className="absolute border-2 border-dashed border-sky-300/95 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
          pointerEvents: "none",
        }}
      >
        {!disabled && (
          <>
            {/* Fasce bordo: spostano il riquadro; interno libero per pan mappa */}
            <div
              role="presentation"
              aria-label="Sposta area (bordo superiore)"
              className="pointer-events-auto absolute left-0 right-0 top-0 z-[5] cursor-move"
              style={{ height: EDGE_MOVE_SIZE, touchAction: "none" }}
              onPointerDown={startDrag("move")}
            />
            <div
              role="presentation"
              aria-label="Sposta area (bordo inferiore)"
              className="pointer-events-auto absolute bottom-0 left-0 right-0 z-[5] cursor-move"
              style={{ height: EDGE_MOVE_SIZE, touchAction: "none" }}
              onPointerDown={startDrag("move")}
            />
            <div
              role="presentation"
              aria-label="Sposta area (bordo sinistro)"
              className="pointer-events-auto absolute bottom-0 left-0 top-0 z-[5] cursor-move"
              style={{ width: EDGE_MOVE_SIZE, touchAction: "none" }}
              onPointerDown={startDrag("move")}
            />
            <div
              role="presentation"
              aria-label="Sposta area (bordo destro)"
              className="pointer-events-auto absolute bottom-0 right-0 top-0 z-[5] cursor-move"
              style={{ width: EDGE_MOVE_SIZE, touchAction: "none" }}
              onPointerDown={startDrag("move")}
            />
            <button
              type="button"
              aria-label="Sposta area di stampa"
              className="pointer-events-auto absolute inset-x-0 top-0 z-10 mx-auto mt-1.5 flex w-max cursor-move items-center justify-center rounded-md border border-sky-400/50 bg-slate-950/85 px-2 py-0.5 text-[11px] font-medium tracking-wide text-sky-100"
              style={{ touchAction: "none" }}
              onPointerDown={startDrag("move")}
            >
              {label || "Anteprima stampa"}
            </button>
          </>
        )}
        {disabled && (
          <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
            <span className="rounded-md bg-slate-950/75 px-2 py-0.5 text-[11px] font-medium tracking-wide text-sky-100">
              {label || "Anteprima stampa"}
            </span>
          </div>
        )}

        {!disabled &&
          HANDLES.map((handle) => (
            <button
              key={handle.key}
              type="button"
              aria-label={`Ridimensiona ${handle.key}`}
              className="pointer-events-auto absolute z-20 rounded-sm border border-sky-200 bg-sky-400 shadow"
              style={{
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                cursor: handle.cursor,
                touchAction: "none",
                ...handle.style,
              }}
              onPointerDown={startDrag("resize", handle.key)}
            />
          ))}
      </div>
      )}
    </div>,
    container,
  )
}

const ScaleBarPreview = ({ map, scaleMode }) => {
  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    if (!map || typeof map.getCenter !== "function") {
      setMetrics(null)
      return
    }

    const updateMetrics = () => {
      const center = map.getCenter()
      const zoom = map.getZoom()
      const scaleDenominator =
        scaleMode !== "auto" ? Number(scaleMode) : getScaleDenominator(center.lat, zoom)
      setMetrics({
        ...getScaleBarMetrics(center.lat, zoom),
        scaleDenominator,
      })
    }

    updateMetrics()
    map.on("move", updateMetrics)
    map.on("zoom", updateMetrics)

    return () => {
      map.off("move", updateMetrics)
      map.off("zoom", updateMetrics)
    }
  }, [map, scaleMode])

  if (!metrics) return null

  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-950/40 p-3 space-y-2">
      <div className="flex items-center justify-between text-xs text-blue-200">
        <span>Scala sulla mappa</span>
        <span className="font-medium">{formatScaleLabel(metrics.scaleDenominator)}</span>
      </div>
      <div className="flex items-end gap-2">
        <div
          className="h-2 border-b-2 border-l-2 border-r-2 border-blue-200"
          style={{ width: `${metrics.barWidthPx}px` }}
        />
        <span className="text-xs text-blue-300 pb-0.5">{metrics.label}</span>
      </div>
    </div>
  )
}

const usePrintExport = ({ map, visualizationMode, selectedCity, onClose, isOpen, isMobile }) => {
  const { isPrintAvailable } = usePrintAvailability(visualizationMode)
  const [exportMode, setExportMode] = useState("single") // single | multi
  const [multiStep, setMultiStep] = useState(1) // 1 area totale, 2 sezioni
  const [scaleMode, setScaleMode] = useState("auto")
  const [sizePreset, setSizePreset] = useState("1920x1080")
  const [customWidth, setCustomWidth] = useState("1920")
  const [customHeight, setCustomHeight] = useState("1080")
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState("")
  const [printRect, setPrintRect] = useState(null)
  /** @type {[{ bounds, center, zoom, bearing, pitch } | null, Function]} */
  const [totalArea, setTotalArea] = useState(null)
  const [sections, setSections] = useState([])
  const [isPlacingSection, setIsPlacingSection] = useState(false)
  const [parentBoundsRect, setParentBoundsRect] = useState(null)
  const [passiveRects, setPassiveRects] = useState([])
  const exportAbortRef = useRef(null)
  const savedViewRef = useRef(null)
  const applyingScaleRef = useRef(false)
  const syncingFromRectRef = useRef(false)

  const getSafeInsets = useCallback(
    (containerW, containerH) => {
      if (isMobile) {
        return { top: 8, right: 8, bottom: Math.round(containerH * 0.5), left: 8 }
      }
      const panelWidth = Math.min(400, containerW)
      return { top: 8, right: panelWidth + 8, bottom: 8, left: 8 }
    },
    [isMobile],
  )

  const updatePrintRect = useCallback((preserveRect = null) => {
    if (!map || typeof map.getContainer !== "function") {
      setPrintRect(null)
      return
    }
    if (syncingFromRectRef.current) {
      syncingFromRectRef.current = false
      return
    }
    const container = map.getContainer()
    const insets = getSafeInsets(container.clientWidth, container.clientHeight)
    const target = resolveTargetPixelSize(
      sizePreset,
      customWidth,
      customHeight,
      container.clientWidth,
      container.clientHeight,
      insets,
    )
    if (!target) {
      setPrintRect(null)
      return
    }
    setPrintRect((current) =>
      createRectFromPixelSize(
        container.clientWidth,
        container.clientHeight,
        target.width,
        target.height,
        insets,
        preserveRect || current,
      ),
    )
  }, [map, sizePreset, customWidth, customHeight, getSafeInsets])

  const syncConfirmedOverlays = useCallback(() => {
    if (!map || exportMode !== "multi" || multiStep !== 2 || !totalArea?.bounds) {
      setParentBoundsRect(null)
      setPassiveRects([])
      return
    }
    const container = map.getContainer()
    const viewport = {
      x: 0,
      y: 0,
      width: container.clientWidth,
      height: container.clientHeight,
    }
    const parentPx = boundsToRectPx(map, totalArea.bounds)
    const parentVisible = parentPx ? intersectRects(parentPx, viewport, MIN_PRINT_AREA_PX) : null
    setParentBoundsRect(parentVisible)

    // Mantieni il riquadro bozza dentro l'area overview visibile
    if (parentVisible) {
      setPrintRect((current) => {
        if (!current) return current
        const clamped = clampRectInside(current, parentVisible, MIN_PRINT_AREA_PX)
        if (
          Math.abs(clamped.x - current.x) < 0.5 &&
          Math.abs(clamped.y - current.y) < 0.5 &&
          Math.abs(clamped.width - current.width) < 0.5 &&
          Math.abs(clamped.height - current.height) < 0.5
        ) {
          return current
        }
        return clamped
      })
    }

    setPassiveRects(
      sections
        .map((s) => {
          if (!s.bounds) return null
          const rect = boundsToRectPx(map, s.bounds)
          if (!rect) return null
          const visible = intersectRects(rect, viewport, 8)
          return visible ? { id: s.id, index: s.index, rect: visible } : null
        })
        .filter(Boolean),
    )
  }, [map, exportMode, multiStep, totalArea, sections])

  useEffect(() => {
    if (!isPrintAvailable) {
      onClose?.()
      if (exportAbortRef.current) {
        exportAbortRef.current.abort()
        exportAbortRef.current = null
      }
    }
  }, [isPrintAvailable, onClose])

  // Salva/ripristina la vista mappa all'apertura/chiusura del pannello
  useEffect(() => {
    if (!map || typeof map.getCenter !== "function") return undefined

    if (isOpen) {
      if (!savedViewRef.current) {
        savedViewRef.current = {
          center: map.getCenter(),
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        }
      }
      return undefined
    }

    if (savedViewRef.current) {
      const view = savedViewRef.current
      savedViewRef.current = null
      applyingScaleRef.current = true
      map.jumpTo(view)
      queueMicrotask(() => {
        applyingScaleRef.current = false
      })
    }
    setPrintRect(null)
    setScaleMode("auto")
    setExportMode("single")
    setMultiStep(1)
    setTotalArea(null)
    setSections([])
    setIsPlacingSection(false)
    setParentBoundsRect(null)
    setPassiveRects([])
    setExportProgress("")
    removeOverviewSectionLayers(map)
    return undefined
  }, [isOpen, map])

  // Riquadro anteprima dalle dimensioni px (single + multi: draft quando si sta piazzando)
  useEffect(() => {
    if (!isOpen) return undefined
    if (!(exportMode === "multi" && multiStep === 2 && !isPlacingSection)) {
      updatePrintRect()
    }

    if (!map || typeof map.getContainer !== "function") return undefined
    const container = map.getContainer()
    const onResize = () => {
      if (exportMode === "multi" && multiStep === 2 && !isPlacingSection) return
      updatePrintRect()
    }
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null
    observer?.observe(container)
    map.on("resize", onResize)
    return () => {
      observer?.disconnect()
      map.off("resize", onResize)
    }
  }, [isOpen, map, updatePrintRect, exportMode, multiStep, isPlacingSection])

  // Overlay sezioni confermate + bordo area totale (step 2)
  useEffect(() => {
    if (!isOpen || exportMode !== "multi" || multiStep !== 2 || !map) return undefined
    syncConfirmedOverlays()
    const onMove = () => syncConfirmedOverlays()
    map.on("move", onMove)
    map.on("zoom", onMove)
    map.on("resize", onMove)
    return () => {
      map.off("move", onMove)
      map.off("zoom", onMove)
      map.off("resize", onMove)
    }
  }, [isOpen, map, exportMode, multiStep, syncConfirmedOverlays])

  // Scala fissa → zoom bloccato: single, oppure multi step 2 (stessa scala per ogni sezione)
  useEffect(() => {
    if (!isOpen || !map || typeof map.getCenter !== "function") return undefined
    if (scaleMode === "auto") return undefined
    if (exportMode === "multi" && multiStep !== 2) return undefined

    const applyScaleZoom = () => {
      if (applyingScaleRef.current || isExporting) return
      const center = map.getCenter()
      const targetZoom = getZoomForScaleDenominator(center.lat, Number(scaleMode))
      if (Math.abs(map.getZoom() - targetZoom) < 0.02) return
      applyingScaleRef.current = true
      map.jumpTo({
        center,
        zoom: targetZoom,
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      })
      map.once("idle", () => {
        applyingScaleRef.current = false
      })
    }

    applyScaleZoom()
    map.on("moveend", applyScaleZoom)

    const scrollZoom = map.scrollZoom
    scrollZoom?.disable?.()

    return () => {
      map.off("moveend", applyScaleZoom)
      scrollZoom?.enable?.()
    }
  }, [isOpen, map, scaleMode, isExporting, exportMode, multiStep])

  const handleCustomWidthChange = (value) => {
    setSizePreset("custom")
    setCustomWidth(value)
  }

  const handleCustomHeightChange = (value) => {
    setSizePreset("custom")
    setCustomHeight(value)
  }

  const handleSizePresetChange = (value) => {
    setSizePreset(value)
    const preset = PRINT_SIZE_PRESETS.find((item) => item.value === value)
    if (preset?.width && preset?.height) {
      setCustomWidth(String(preset.width))
      setCustomHeight(String(preset.height))
    }
  }

  const handlePrintRectChange = useCallback((nextRect) => {
    if (exportMode === "multi" && multiStep === 2 && map) {
      let rect = nextRect
      if (parentBoundsRect) {
        rect = clampRectInside(nextRect, parentBoundsRect, MIN_PRINT_AREA_PX)
      }
      setPrintRect(rect)
      return
    }

    setPrintRect((prev) => {
      const sizeChanged =
        !prev ||
        Math.abs(prev.width - nextRect.width) > 0.5 ||
        Math.abs(prev.height - nextRect.height) > 0.5
      if (sizeChanged) {
        syncingFromRectRef.current = true
        setSizePreset("custom")
        setCustomWidth(String(Math.round(nextRect.width)))
        setCustomHeight(String(Math.round(nextRect.height)))
      }
      return nextRect
    })
  }, [exportMode, multiStep, map, parentBoundsRect])

  const resolveExportDimensions = () => {
    const preset = PRINT_SIZE_PRESETS.find((item) => item.value === sizePreset)
    if (!preset || preset.value === "viewport") {
      return { width: null, height: null }
    }
    if (preset.value === "custom") {
      const width = Number.parseInt(customWidth, 10)
      const height = Number.parseInt(customHeight, 10)
      if (!Number.isFinite(width) || !Number.isFinite(height) || width < 100 || height < 100) {
        throw new Error("Inserisci dimensioni valide (minimo 100 px)")
      }
      return { width, height }
    }
    return { width: preset.width, height: preset.height }
  }

  const captureMapView = () => {
    const center = map.getCenter()
    return {
      center: { lng: center.lng, lat: center.lat },
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
    }
  }

  const handleExportModeChange = (mode) => {
    if (isExporting) return
    setExportMode(mode)
    setMultiStep(1)
    setTotalArea(null)
    setSections([])
    setIsPlacingSection(false)
    setParentBoundsRect(null)
    setPassiveRects([])
    setExportProgress("")
    setScaleMode("auto")
    if (map) removeOverviewSectionLayers(map)
    updatePrintRect()
  }

  const confirmTotalArea = () => {
    if (!map || !printRect) {
      toast.error("Anteprima area non pronta")
      return
    }
    const bounds = rectPxToBounds(map, printRect)
    if (!bounds) {
      toast.error("Impossibile calcolare l'area totale")
      return
    }
    setTotalArea({
      bounds,
      ...captureMapView(),
    })
    setSections([])
    setMultiStep(2)
    setIsPlacingSection(true)
    updatePrintRect()
    toast.success(
      "Area totale confermata. Posiziona la bozza e conferma la sezione, oppure aggiungine altre con +.",
    )
  }

  const startPlacingSection = () => {
    if (isExporting) return
    if (sections.length >= MAX_PRINT_SECTIONS) {
      toast.error(`Massimo ${MAX_PRINT_SECTIONS} sezioni`)
      return
    }
    setIsPlacingSection(true)
    updatePrintRect()
  }

  const confirmSection = () => {
    if (!map || !printRect || !totalArea?.bounds) {
      toast.error("Posiziona il riquadro della sezione")
      return
    }
    if (!isPlacingSection) {
      toast.error("Premi + per aggiungere una nuova sezione")
      return
    }
    if (sections.length >= MAX_PRINT_SECTIONS) {
      toast.error(`Massimo ${MAX_PRINT_SECTIONS} sezioni`)
      return
    }
    if (!parentBoundsRect) {
      toast.error("L'area overview non è visibile: riporta la mappa sull'area totale")
      return
    }
    let bounds = rectPxToBounds(map, printRect)
    if (!bounds) {
      toast.error("Impossibile calcolare la sezione")
      return
    }
    bounds = clampBoundsInside(bounds, totalArea.bounds)
    if (!isBoundsInside(bounds, totalArea.bounds, 1e-6)) {
      toast.error("La sezione deve restare dentro l'area overview")
      return
    }
    const view = captureMapView()
    const index = sections.length + 1
    const fixedScale = scaleMode !== "auto" ? Number(scaleMode) : null
    const zoom =
      fixedScale != null
        ? getZoomForScaleDenominator(view.center.lat, fixedScale)
        : view.zoom
    const section = {
      id: createSectionId(),
      index,
      bounds,
      ...view,
      zoom,
      fixedScale,
      scaleLabel: formatScaleLabel(
        fixedScale ?? getScaleDenominator(view.center.lat, zoom),
      ),
    }
    setSections((prev) => [...prev, section])
    setIsPlacingSection(false)
    setPrintRect(null)
    toast.success(`Sezione ${index} confermata`)
  }

  const removeSection = (id) => {
    setSections((prev) => {
      const filtered = prev.filter((s) => s.id !== id)
      return filtered.map((s, i) => ({ ...s, index: i + 1 }))
    })
  }

  const backToTotalArea = () => {
    setMultiStep(1)
    setSections([])
    setIsPlacingSection(false)
    setParentBoundsRect(null)
    setPassiveRects([])
    if (totalArea && map) {
      restoreMapView(map, totalArea).catch(() => {})
    }
    setTotalArea(null)
    updatePrintRect()
  }

  const handleExportSingle = async () => {
    if (!isPrintAvailable) {
      toast.error(PRINT_DISABLED_MESSAGE)
      return
    }
    if (!map) {
      toast.error("La mappa non è pronta. Attendi il caricamento completo.")
      return
    }
    if (!printRect) {
      toast.error("Anteprima stampa non pronta")
      return
    }
    if (isExporting) return

    let dimensions
    try {
      dimensions = resolveExportDimensions()
    } catch (error) {
      toast.error(error.message)
      return
    }

    const controller = new AbortController()
    exportAbortRef.current = controller
    setIsExporting(true)
    setExportProgress("")

    const citySlug = selectedCity ? selectedCity.replace(/\s+/g, "-").toLowerCase() : "mappa"
    const filename = `lighting-map-${citySlug}.png`
    const center = map.getCenter()
    const scaleLabel = formatScaleLabel(
      scaleMode !== "auto"
        ? Number(scaleMode)
        : getScaleDenominator(center.lat, map.getZoom()),
    )

    try {
      await exportMapToPng(map, {
        ...dimensions,
        scaleDenominator: "auto",
        filename,
        signal: controller.signal,
        cityName: selectedCity,
        cropRect: printRect,
        scaleLabel,
      })
      toast.success("Mappa esportata con successo")
    } catch (error) {
      if (error.name === "AbortError") {
        toast.error("Export annullato: attiva la versione semplificata per continuare")
      } else {
        toast.error(error.message || "Errore durante l'export della mappa")
      }
    } finally {
      exportAbortRef.current = null
      setIsExporting(false)
      setExportProgress("")
    }
  }

  const handleExportMulti = async () => {
    if (!isPrintAvailable) {
      toast.error(PRINT_DISABLED_MESSAGE)
      return
    }
    if (!map) {
      toast.error("La mappa non è pronta. Attendi il caricamento completo.")
      return
    }
    if (!totalArea?.bounds || sections.length === 0) {
      toast.error("Conferma almeno una sezione prima di esportare")
      return
    }
    if (isExporting) {
      return
    }

    let dimensions
    try {
      dimensions = resolveExportDimensions()
    } catch (error) {
      toast.error(error.message)
      return
    }

    const controller = new AbortController()
    exportAbortRef.current = controller
    setIsExporting(true)

    const citySlug = selectedCity ? selectedCity.replace(/\s+/g, "-").toLowerCase() : "mappa"
    const total = sections.length
    const savedView = captureMapView()
    let exportSucceeded = false

    const captureAtView = async ({
      view,
      bounds,
      sectionLabel,
      beforeCapture,
      fixedScaleDenominator = null,
    }) => {
      const container = map.getContainer()
      const width = dimensions.width || container.clientWidth
      const height = dimensions.height || container.clientHeight
      const fixedScale =
        Number.isFinite(fixedScaleDenominator) && fixedScaleDenominator > 0
          ? Number(fixedScaleDenominator)
          : null

      setExportProgress(`${sectionLabel}: inquadratura…`)
      if (view?.zoom != null || (fixedScale != null && view?.center)) {
        const center = view.center
        const lat = center?.lat ?? center?.[1] ?? map.getCenter().lat
        const exportView =
          fixedScale != null
            ? {
                ...view,
                zoom: getZoomForScaleDenominator(lat, fixedScale),
              }
            : view
        await restoreMapView(map, exportView, { signal: controller.signal })
      } else if (bounds) {
        await flyMapToBounds(map, bounds, { signal: controller.signal, padding: 40 })
      }

      const center = map.getCenter()
      const scaleLabel = formatScaleLabel(
        fixedScale ?? getScaleDenominator(center.lat, map.getZoom()),
      )
      const exportCrop = cropRectFromBounds(map, bounds, true)

      setExportProgress(`${sectionLabel}: cattura PNG…`)
      return exportMapToPng(map, {
        width,
        height,
        scaleDenominator: "auto",
        signal: controller.signal,
        cityName: selectedCity,
        cropRect: exportCrop,
        scaleLabel,
        sectionLabel,
        returnBlob: true,
        restoreView: false,
        beforeCapture,
      })
    }

    try {
      const blobs = []
      const activeFixedScale =
        scaleMode !== "auto" ? Number(scaleMode) : null

      for (let i = 0; i < sections.length; i += 1) {
        const section = sections[i]
        const blob = await captureAtView({
          view: section,
          bounds: section.bounds,
          sectionLabel: `Sezione ${section.index}`,
          fixedScaleDenominator: activeFixedScale ?? section.fixedScale ?? null,
        })
        blobs.push({
          name: `sezione-${padSectionIndex(section.index, total)}.png`,
          blob,
        })
        if (typeof map.resize === "function") {
          map.resize()
        }
      }

      setExportProgress("Overview…")
      const overviewBlob = await captureAtView({
        view: totalArea,
        bounds: totalArea.bounds,
        sectionLabel: "Overview",
        beforeCapture: async () => {
          addOverviewSectionLayers(map, sections)
        },
      })
      blobs.push({ name: "overview.png", blob: overviewBlob })

      setExportProgress("Creazione ZIP…")
      try {
        const zip = new JSZip()
        for (const file of blobs) {
          zip.file(file.name, file.blob)
        }
        const zipBlob = await zip.generateAsync({ type: "blob" })
        downloadBlob(zipBlob, `lighting-map-${citySlug}-sezioni.zip`)
        toast.success(`Esportate ${total} sezioni + overview`)
      } catch (zipError) {
        console.warn("ZIP non riuscito, download sequenziale:", zipError)
        for (const file of blobs) {
          downloadBlob(file.blob, `lighting-map-${citySlug}-${file.name}`)
        }
        toast.success("PNG scaricati in sequenza (ZIP non disponibile)")
      }

      exportSucceeded = true
    } catch (error) {
      if (error.name === "AbortError") {
        toast.error("Export annullato: attiva la versione semplificata per continuare")
      } else {
        toast.error(error.message || "Errore durante l'export multi-sezione")
      }
    } finally {
      removeOverviewSectionLayers(map)
      applyingScaleRef.current = true
      try {
        map.jumpTo({
          center: [savedView.center.lng, savedView.center.lat],
          zoom: savedView.zoom,
          bearing: savedView.bearing,
          pitch: savedView.pitch,
        })
      } catch {
        // ignore
      }
      const clearApplying = () => {
        applyingScaleRef.current = false
      }
      map.once("idle", clearApplying)
      setTimeout(clearApplying, 1500)
      exportAbortRef.current = null
      setIsExporting(false)
      setExportProgress("")
      if (exportSucceeded) {
        // Chiudi dopo il cleanup, così il prossimo open riparte pulito
        onClose?.()
      }
    }
  }

  const handleExport = () => {
    if (exportMode === "multi") {
      if (multiStep === 1) {
        confirmTotalArea()
        return
      }
      handleExportMulti()
      return
    }
    handleExportSingle()
  }

  return {
    exportMode,
    setExportMode: handleExportModeChange,
    multiStep,
    backToTotalArea,
    sections,
    isPlacingSection,
    startPlacingSection,
    confirmSection,
    removeSection,
    scaleMode,
    setScaleMode,
    sizePreset,
    setSizePreset: handleSizePresetChange,
    customWidth,
    setCustomWidth: handleCustomWidthChange,
    customHeight,
    setCustomHeight: handleCustomHeightChange,
    isExporting,
    exportProgress,
    handleExport,
    printRect,
    setPrintRect: handlePrintRectChange,
    parentBoundsRect,
    passiveRects,
    totalArea,
  }
}

const PrintExportFields = ({
  map,
  exportMode,
  setExportMode,
  multiStep,
  backToTotalArea,
  sections,
  isPlacingSection,
  startPlacingSection,
  confirmSection,
  removeSection,
  scaleMode,
  setScaleMode,
  sizePreset,
  setSizePreset,
  customWidth,
  setCustomWidth,
  customHeight,
  setCustomHeight,
  printRect,
  isExporting,
}) => {
  const showPxInputs = sizePreset === "custom"
  const requestedWidth =
    sizePreset === "custom"
      ? Number.parseInt(customWidth, 10)
      : PRINT_SIZE_PRESETS.find((item) => item.value === sizePreset)?.width
  const requestedHeight =
    sizePreset === "custom"
      ? Number.parseInt(customHeight, 10)
      : PRINT_SIZE_PRESETS.find((item) => item.value === sizePreset)?.height
  const rectScaledDown =
    printRect &&
    Number.isFinite(requestedWidth) &&
    Number.isFinite(requestedHeight) &&
    (Math.abs(printRect.width - requestedWidth) > 2 ||
      Math.abs(printRect.height - requestedHeight) > 2)

  const showScaleSelect = exportMode === "single" || (exportMode === "multi" && multiStep === 2)
  const showSize = exportMode === "single" || exportMode === "multi"

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="print-export-mode" className="text-xs font-medium text-blue-300 uppercase">
          Modalità export
        </label>
        <select
          id="print-export-mode"
          value={exportMode}
          onChange={(e) => setExportMode(e.target.value)}
          disabled={isExporting}
          className="w-full bg-blue-900/40 text-white border border-blue-500/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
        >
          <option value="single" className="bg-blue-900">
            Singola immagine
          </option>
          <option value="multi" className="bg-blue-900">
            Multi-sezione (ZIP)
          </option>
        </select>
      </div>

      {exportMode === "multi" && (
        <div className="rounded-lg border border-sky-500/25 bg-sky-950/30 px-3 py-2 text-xs text-sky-100/90 leading-relaxed space-y-1">
          <p className="font-medium text-sky-100">
            Step {multiStep}/2 — {multiStep === 1 ? "Area totale" : "Sezioni"}
          </p>
          {multiStep === 1 ? (
            <p>
              Inquadra l&apos;area totale e posiziona il riquadro. Alla conferma salviamo anche
              la scala/zoom attuali per l&apos;overview.
            </p>
          ) : (
            <p>
              Premi + per aggiungere una sezione, posiziona il riquadro e conferma.
              Puoi fissare una scala per usarla su tutte le sezioni. Poi esporta lo ZIP.
            </p>
          )}
          {multiStep === 2 && (
            <button
              type="button"
              onClick={backToTotalArea}
              disabled={isExporting}
              className="mt-1 text-sky-300 underline underline-offset-2 hover:text-sky-200 disabled:opacity-50"
            >
              Torna all&apos;area totale
            </button>
          )}
        </div>
      )}

      {exportMode === "single" && (
        <div className="rounded-lg border border-sky-500/25 bg-sky-950/30 px-3 py-2 text-xs text-sky-100/90 leading-relaxed">
          L&apos;anteprima mostra l&apos;area esportata. Puoi trascinare e ridimensionare il riquadro,
          oppure impostare scala e dimensioni in px. La scala comparirà in basso a sinistra nel PNG.
        </div>
      )}

      {showScaleSelect && (
        <>
          <div className="space-y-2">
            <label htmlFor="print-scale" className="text-xs font-medium text-blue-300 uppercase">
              Scala
            </label>
            <select
              id="print-scale"
              value={scaleMode}
              onChange={(e) => setScaleMode(e.target.value)}
              disabled={isExporting}
              className="w-full bg-blue-900/40 text-white border border-blue-500/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
            >
              {PRINT_SCALE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-blue-900">
                  {option.label}
                </option>
              ))}
            </select>
            {scaleMode !== "auto" && (
              <p className="text-[11px] text-blue-300/80">
                {exportMode === "multi"
                  ? "Zoom bloccato sulla scala selezionata per tutte le sezioni (pan libero)."
                  : "Zoom mappa bloccato sulla scala selezionata (pan libero)."}
              </p>
            )}
          </div>
          <ScaleBarPreview map={map} scaleMode={scaleMode} />
        </>
      )}

      {exportMode === "multi" && multiStep === 1 && (
        <ScaleBarPreview map={map} scaleMode="auto" />
      )}

      {exportMode === "multi" && multiStep === 2 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={startPlacingSection}
            disabled={
              isExporting ||
              isPlacingSection ||
              sections.length >= MAX_PRINT_SECTIONS
            }
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-900/40 px-3 py-2.5 text-sm font-medium text-red-50 hover:bg-red-800/50 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Aggiungi sezione {sections.length + 1}
          </button>

          <button
            type="button"
            onClick={confirmSection}
            disabled={isExporting || !isPlacingSection || !printRect}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-sky-500/40 bg-sky-900/40 px-3 py-2.5 text-sm font-medium text-sky-50 hover:bg-sky-800/50 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Conferma sezione {sections.length + 1}
          </button>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-medium text-blue-300 uppercase">
              Sezioni confermate ({sections.length})
            </span>
          </div>
          {sections.length === 0 ? (
            <p className="text-[11px] text-blue-300/80">
              Nessuna sezione ancora. Aggiungine una con + e confermala.
            </p>
          ) : (
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {sections.map((section) => (
                <li key={section.id}>
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 px-2 py-1.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-600 text-xs font-bold text-white">
                      {section.index}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">Sezione {section.index}</p>
                      {section.scaleLabel && (
                        <p className="truncate text-[10px] text-red-200/80">{section.scaleLabel}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSection(section.id)}
                      disabled={isExporting}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-300 hover:bg-red-950/40 disabled:opacity-40"
                      aria-label={`Elimina sezione ${section.index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showSize && (
        <>
          <div className="space-y-2">
            <label htmlFor="print-size" className="text-xs font-medium text-blue-300 uppercase">
              Dimensione output (px)
            </label>
            <select
              id="print-size"
              value={sizePreset}
              onChange={(e) => setSizePreset(e.target.value)}
              disabled={isExporting}
              className="w-full bg-blue-900/40 text-white border border-blue-500/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
            >
              {PRINT_SIZE_PRESETS.map((option) => (
                <option key={option.value} value={option.value} className="bg-blue-900">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {showPxInputs && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="print-width" className="text-xs text-blue-300">
                  Larghezza (px)
                </label>
                <input
                  id="print-width"
                  type="number"
                  min={100}
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  disabled={isExporting}
                  className="w-full bg-blue-900/40 text-white border border-blue-500/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="print-height" className="text-xs text-blue-300">
                  Altezza (px)
                </label>
                <input
                  id="print-height"
                  type="number"
                  min={100}
                  value={customHeight}
                  onChange={(e) => setCustomHeight(e.target.value)}
                  disabled={isExporting}
                  className="w-full bg-blue-900/40 text-white border border-blue-500/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {sizePreset !== "custom" && sizePreset !== "viewport" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-blue-500/20 bg-blue-950/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-blue-400">Larghezza</p>
                <p className="text-sm text-white font-medium">{requestedWidth} px</p>
              </div>
              <div className="rounded-lg border border-blue-500/20 bg-blue-950/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-blue-400">Altezza</p>
                <p className="text-sm text-white font-medium">{requestedHeight} px</p>
              </div>
            </div>
          )}

          {rectScaledDown && exportMode === "single" && (
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              Anteprima ridotta a {Math.round(printRect.width)}×{Math.round(printRect.height)} px
              (non entra a schermo). L&apos;export sarà {requestedWidth}×{requestedHeight} px
              con la stessa inquadratura centrale.
            </p>
          )}
        </>
      )}
    </div>
  )
}

const ExportFooterButton = ({ onExport, isExporting, mapDisabled, label, progress }) => (
  <div className="space-y-2">
    {progress && (
      <p className="text-center text-xs text-sky-200/90">{progress}</p>
    )}
    <button
      type="button"
      onClick={onExport}
      disabled={isExporting || mapDisabled}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Printer className="h-4 w-4" />
      {isExporting ? "Esportazione in corso…" : label}
    </button>
  </div>
)

export const PrintExportSideWindow = ({
  isOpen,
  onClose,
  map,
  visualizationMode,
  selectedCity,
}) => {
  const isMobile = useMediaQuery(INFO_WINDOW_MOBILE_MQ)
  const exportState = usePrintExport({
    map,
    visualizationMode,
    selectedCity,
    onClose,
    isOpen,
    isMobile,
  })

  if (!isOpen || typeof document === "undefined") {
    return null
  }

  const isMultiStep2 = exportState.exportMode === "multi" && exportState.multiStep === 2
  const showDraftOverlay = !isMultiStep2 || exportState.isPlacingSection
  const overlayLabel = isMultiStep2
    ? `Bozza sezione ${exportState.sections.length + 1}`
    : exportState.printRect
      ? `${Math.round(exportState.printRect.width)}×${Math.round(exportState.printRect.height)} px`
      : "Anteprima stampa"

  const footerLabel =
    exportState.exportMode === "multi"
      ? exportState.multiStep === 1
        ? "Conferma area totale"
        : "Esporta ZIP sezioni"
      : "Esporta PNG"

  const mapDisabled =
    !map ||
    (!isMultiStep2 && !exportState.printRect) ||
    (isMultiStep2 && exportState.sections.length === 0)

  const header = (
    <div className="flex items-center justify-between border-b border-blue-500/30 bg-blue-900/50 px-4 py-3 shrink-0">
      <div className="min-w-0 pr-3">
        <h3 className="text-base font-semibold text-white">Esporta mappa</h3>
        {selectedCity && (
          <p className="text-sm text-blue-300 truncate">{selectedCity}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-blue-300 hover:bg-blue-800/50 border border-blue-500/30 shrink-0"
        aria-label="Chiudi pannello export"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )

  const fields = <PrintExportFields map={map} {...exportState} />

  const footer = (
    <div className="border-t border-blue-500/30 bg-blue-900/50 p-4 shrink-0">
      <ExportFooterButton
        onExport={exportState.handleExport}
        isExporting={exportState.isExporting}
        mapDisabled={mapDisabled}
        label={footerLabel}
        progress={exportState.exportProgress}
      />
    </div>
  )

  const hasOverlayContent =
    (showDraftOverlay && exportState.printRect) ||
    (isMultiStep2 && (exportState.parentBoundsRect || exportState.passiveRects.length > 0))

  const overlay = hasOverlayContent && !exportState.isExporting ? (
    <PrintAreaOverlay
      map={map}
      rect={showDraftOverlay ? exportState.printRect : null}
      onRectChange={exportState.setPrintRect}
      label={overlayLabel}
      disabled={exportState.isExporting}
      parentBoundsRect={isMultiStep2 ? exportState.parentBoundsRect : null}
      passiveRects={isMultiStep2 ? exportState.passiveRects : []}
      maskHoles
    />
  ) : null

  if (isMobile) {
    return createPortal(
      <>
        {overlay}
        <div className="fixed inset-0 z-[10050] flex flex-col justify-end pointer-events-none">
          <div
            className="relative z-10 flex max-h-[50vh] flex-col rounded-t-2xl border border-blue-500/30 bg-black/90 backdrop-blur-xl shadow-[0_0_25px_rgba(0,149,255,0.15)] animate-[printSheetUp_0.22s_ease-out] pointer-events-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Esporta mappa"
          >
            {header}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              {fields}
            </div>
            {footer}
          </div>
          <style>{`
            @keyframes printSheetUp {
              from { transform: translateY(100%); opacity: 0.6; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
        </div>
      </>,
      document.body,
    )
  }

  return createPortal(
    <>
      {overlay}
      <div className="fixed inset-0 z-[10050] pointer-events-none">
        <aside
          className="absolute right-0 top-0 flex h-full w-full max-w-[400px] flex-col border-l border-blue-500/30 bg-black/85 backdrop-blur-xl shadow-[0_0_25px_rgba(0,149,255,0.15)] pointer-events-auto animate-[printSideIn_0.22s_ease-out]"
          role="dialog"
          aria-modal="true"
          aria-label="Esporta mappa"
        >
          {header}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {fields}
          </div>
          {footer}
        </aside>
        <style>{`
          @keyframes printSideIn {
            from { transform: translateX(100%); opacity: 0.7; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>
      </div>
    </>,
    document.body,
  )
}

/** @deprecated Usare PrintExportSideWindow */
export const PrintExportPanel = PrintExportSideWindow

export default PrintExportSideWindow

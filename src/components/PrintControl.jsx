import { useCallback, useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Printer, X } from "lucide-react"
import toast from "react-hot-toast"
import { usePrintAvailability, PRINT_DISABLED_MESSAGE } from "../hooks/usePrintAvailability"
import { useMediaQuery } from "../hooks/useMediaQuery"
import { INFO_WINDOW_MOBILE_MQ } from "../utils/infoWindowActions"
import {
  exportMapToPng,
  formatScaleLabel,
  getScaleBarMetrics,
  getScaleDenominator,
  getZoomForScaleDenominator,
  PRINT_SCALE_OPTIONS,
  PRINT_SIZE_PRESETS,
} from "../utils/mapScaleUtils"

const MIN_PRINT_AREA_PX = 80
const HANDLE_SIZE = 12

/** Crea/aggiorna il riquadro alle dimensioni px richieste (scala se non entra nel viewport). */
const createRectFromPixelSize = (
  containerW,
  containerH,
  targetWidth,
  targetHeight,
  currentRect = null,
  insets = {},
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
    : left + (containerW - left - right) / 2
  const centerY = currentRect
    ? currentRect.y + currentRect.height / 2
    : top + (containerH - top - bottom) / 2

  return clampRect(
    {
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
    },
    containerW,
    containerH,
    null,
  )
}

const resolveTargetPixelSize = (sizePreset, customWidth, customHeight, containerW, containerH) => {
  const preset = PRINT_SIZE_PRESETS.find((item) => item.value === sizePreset)
  if (!preset || preset.value === "viewport") {
    return {
      width: Math.round(containerW * 0.7),
      height: Math.round(containerH * 0.7),
    }
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

const clampRect = (rect, containerW, containerH, aspectRatio) => {
  let { x, y, width, height } = rect

  width = Math.max(MIN_PRINT_AREA_PX, Math.min(width, containerW))
  height = Math.max(MIN_PRINT_AREA_PX, Math.min(height, containerH))

  if (aspectRatio && aspectRatio > 0) {
    const byWidth = { width, height: width / aspectRatio }
    const byHeight = { width: height * aspectRatio, height }
    if (byWidth.height <= containerH && byWidth.height >= MIN_PRINT_AREA_PX) {
      width = byWidth.width
      height = byWidth.height
    } else {
      width = Math.min(containerW, Math.max(MIN_PRINT_AREA_PX, byHeight.width))
      height = width / aspectRatio
      if (height > containerH) {
        height = containerH
        width = height * aspectRatio
      }
    }
  }

  x = Math.max(0, Math.min(x, containerW - width))
  y = Math.max(0, Math.min(y, containerH - height))

  return { x, y, width, height }
}

const resizeRectFromHandle = (startRect, handle, dx, dy, aspectRatio) => {
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

  if (aspectRatio && aspectRatio > 0) {
    if (handle === "e" || handle === "w") {
      height = width / aspectRatio
      if (handle === "w") y = bottom - height
      else y = startRect.y + (startRect.height - height) / 2
    } else if (handle === "n" || handle === "s") {
      width = height * aspectRatio
      if (handle === "n") x = right - width
      else x = startRect.x + (startRect.width - width) / 2
    } else {
      // angoli: usa la dimensione dominante rispetto al rapporto
      const nextByW = width / aspectRatio
      if (handle.includes("n")) {
        height = nextByW
        y = bottom - height
      } else {
        height = nextByW
      }
      if (handle.includes("w")) {
        width = height * aspectRatio
        x = right - width
      } else {
        width = height * aspectRatio
      }
    }
  }

  return { x, y, width, height }
}

/**
 * Overlay sulla mappa: maschera scura + riquadro tratteggiato ridimensionabile.
 */
const PrintAreaOverlay = ({ map, rect, onRectChange, aspectRatio, disabled }) => {
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
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(updateSize)
      : null
    observer?.observe(container)
    map.on("resize", updateSize)

    return () => {
      observer?.disconnect()
      map.off("resize", updateSize)
    }
  }, [map])

  useEffect(() => {
    if (!containerSize.width || !containerSize.height || !rect) return
    const next = clampRect(rect, containerSize.width, containerSize.height, aspectRatio)
    if (
      Math.abs(next.x - rect.x) > 0.5 ||
      Math.abs(next.y - rect.y) > 0.5 ||
      Math.abs(next.width - rect.width) > 0.5 ||
      Math.abs(next.height - rect.height) > 0.5
    ) {
      onRectChange(next)
    }
  }, [aspectRatio, containerSize.height, containerSize.width, onRectChange, rect])

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
        next = resizeRectFromHandle(drag.startRect, drag.handle, dx, dy, aspectRatio)
      }

      onRectChange(clampRect(next, containerSize.width, containerSize.height, aspectRatio))
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
  }, [aspectRatio, containerSize.height, containerSize.width, disabled, onRectChange])

  if (!map || typeof map.getContainer !== "function" || !rect) return null
  const container = map.getContainer()
  if (!container || !containerSize.width) return null

  const startDrag = (mode, handle) => (event) => {
    if (disabled) return
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

  const handles = [
    { key: "nw", cursor: "nwse-resize", style: { left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 } },
    { key: "n", cursor: "ns-resize", style: { left: "50%", top: -HANDLE_SIZE / 2, marginLeft: -HANDLE_SIZE / 2 } },
    { key: "ne", cursor: "nesw-resize", style: { right: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 } },
    { key: "e", cursor: "ew-resize", style: { right: -HANDLE_SIZE / 2, top: "50%", marginTop: -HANDLE_SIZE / 2 } },
    { key: "se", cursor: "nwse-resize", style: { right: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 } },
    { key: "s", cursor: "ns-resize", style: { left: "50%", bottom: -HANDLE_SIZE / 2, marginLeft: -HANDLE_SIZE / 2 } },
    { key: "sw", cursor: "nesw-resize", style: { left: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 } },
    { key: "w", cursor: "ew-resize", style: { left: -HANDLE_SIZE / 2, top: "50%", marginTop: -HANDLE_SIZE / 2 } },
  ]

  return createPortal(
    <div
      className="absolute inset-0 z-[500] overflow-hidden"
      style={{ pointerEvents: "none" }}
      aria-hidden={disabled}
    >
      <svg className="absolute inset-0 h-full w-full" width="100%" height="100%">
        <defs>
          <mask id={`print-area-mask-${maskId}`}>
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(2, 12, 28, 0.52)"
          mask={`url(#print-area-mask-${maskId})`}
        />
      </svg>

      <div
        role="presentation"
        className="absolute border-2 border-dashed border-sky-300/95 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
          pointerEvents: disabled ? "none" : "auto",
          cursor: disabled ? "default" : "move",
          touchAction: "none",
        }}
        onPointerDown={startDrag("move")}
      >
        <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
          <span className="rounded-md bg-slate-950/75 px-2 py-0.5 text-[11px] font-medium tracking-wide text-sky-100">
            Area di stampa
          </span>
        </div>

        {!disabled &&
          handles.map((handle) => (
            <button
              key={handle.key}
              type="button"
              aria-label={`Ridimensiona ${handle.key}`}
              className="absolute z-10 rounded-sm border border-sky-200 bg-sky-400 shadow"
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
      const previewZoom =
        scaleMode !== "auto"
          ? getZoomForScaleDenominator(center.lat, Number(scaleMode))
          : zoom
      const scaleDenominator =
        scaleMode !== "auto" ? Number(scaleMode) : getScaleDenominator(center.lat, zoom)
      setMetrics({
        ...getScaleBarMetrics(center.lat, previewZoom),
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
        <span>Scala</span>
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
  const [scaleMode, setScaleMode] = useState("auto")
  const [sizePreset, setSizePreset] = useState("viewport")
  const [customWidth, setCustomWidth] = useState("1920")
  const [customHeight, setCustomHeight] = useState("1080")
  const [selectArea, setSelectArea] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [printRect, setPrintRect] = useState(null)
  const exportAbortRef = useRef(null)
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

  useEffect(() => {
    if (!isPrintAvailable) {
      onClose?.()
      if (exportAbortRef.current) {
        exportAbortRef.current.abort()
        exportAbortRef.current = null
      }
    }
  }, [isPrintAvailable, onClose])

  useEffect(() => {
    if (!isOpen) {
      setSelectArea(false)
      setPrintRect(null)
    }
  }, [isOpen])

  // Attiva/disattiva overlay e inizializza il riquadro dalle dimensioni px
  useEffect(() => {
    if (!isOpen || !selectArea || !map || typeof map.getContainer !== "function") {
      if (!selectArea) setPrintRect(null)
      return
    }

    const container = map.getContainer()
    const target = resolveTargetPixelSize(
      sizePreset,
      customWidth,
      customHeight,
      container.clientWidth,
      container.clientHeight,
    )
    if (!target) return

    const next = createRectFromPixelSize(
      container.clientWidth,
      container.clientHeight,
      target.width,
      target.height,
      null,
      getSafeInsets(container.clientWidth, container.clientHeight),
    )
    setPrintRect(next)

    if (sizePreset === "viewport") {
      syncingFromRectRef.current = true
      setSizePreset("custom")
      setCustomWidth(String(Math.round(next.width)))
      setCustomHeight(String(Math.round(next.height)))
    }
    // Solo quando si attiva la selezione area
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectArea, isOpen, map, isMobile])

  // Aggiorna il rettangolo quando cambiano le dimensioni in px (preset/custom)
  useEffect(() => {
    if (!isOpen || !selectArea || !map || typeof map.getContainer !== "function") return
    if (syncingFromRectRef.current) {
      syncingFromRectRef.current = false
      return
    }

    const container = map.getContainer()
    const target = resolveTargetPixelSize(
      sizePreset,
      customWidth,
      customHeight,
      container.clientWidth,
      container.clientHeight,
    )
    if (!target) return

    setPrintRect((current) =>
      createRectFromPixelSize(
        container.clientWidth,
        container.clientHeight,
        target.width,
        target.height,
        current,
        getSafeInsets(container.clientWidth, container.clientHeight),
      ),
    )
  }, [
    sizePreset,
    customWidth,
    customHeight,
    selectArea,
    isOpen,
    map,
    getSafeInsets,
  ])

  const handlePrintRectChange = useCallback(
    (nextRect) => {
      setPrintRect(nextRect)
      if (!selectArea) return
      syncingFromRectRef.current = true
      setSizePreset("custom")
      setCustomWidth(String(Math.round(nextRect.width)))
      setCustomHeight(String(Math.round(nextRect.height)))
    },
    [selectArea],
  )

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

  const handleExport = async () => {
    if (!isPrintAvailable) {
      toast.error(PRINT_DISABLED_MESSAGE)
      return
    }
    if (!map) {
      toast.error("La mappa non è pronta. Attendi il caricamento completo.")
      return
    }
    if (selectArea && !printRect) {
      toast.error("Seleziona un'area di stampa sulla mappa")
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

    const citySlug = selectedCity ? selectedCity.replace(/\s+/g, "-").toLowerCase() : "mappa"
    const filename = `lighting-map-${citySlug}.png`

    try {
      await exportMapToPng(map, {
        ...dimensions,
        scaleDenominator: scaleMode,
        filename,
        signal: controller.signal,
        cityName: selectedCity,
        cropRect: selectArea ? printRect : undefined,
      })
      toast.success("Mappa esportata con successo")
      onClose?.()
    } catch (error) {
      if (error.name === "AbortError") {
        toast.error("Export annullato: attiva la versione semplificata per continuare")
      } else {
        toast.error(error.message || "Errore durante l'export della mappa")
      }
    } finally {
      exportAbortRef.current = null
      setIsExporting(false)
    }
  }

  return {
    scaleMode,
    setScaleMode,
    sizePreset,
    setSizePreset: handleSizePresetChange,
    customWidth,
    setCustomWidth: handleCustomWidthChange,
    customHeight,
    setCustomHeight: handleCustomHeightChange,
    selectArea,
    setSelectArea,
    isExporting,
    handleExport,
    printRect,
    setPrintRect: handlePrintRectChange,
  }
}

const PrintExportFields = ({
  map,
  scaleMode,
  setScaleMode,
  sizePreset,
  setSizePreset,
  customWidth,
  setCustomWidth,
  customHeight,
  setCustomHeight,
  selectArea,
  setSelectArea,
  printRect,
}) => {
  const showPxInputs = selectArea || sizePreset === "custom"
  const requestedWidth =
    sizePreset === "custom"
      ? Number.parseInt(customWidth, 10)
      : PRINT_SIZE_PRESETS.find((item) => item.value === sizePreset)?.width
  const requestedHeight =
    sizePreset === "custom"
      ? Number.parseInt(customHeight, 10)
      : PRINT_SIZE_PRESETS.find((item) => item.value === sizePreset)?.height
  const rectScaledDown =
    selectArea &&
    printRect &&
    Number.isFinite(requestedWidth) &&
    Number.isFinite(requestedHeight) &&
    (Math.abs(printRect.width - requestedWidth) > 2 ||
      Math.abs(printRect.height - requestedHeight) > 2)

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-950/40 px-3 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={selectArea}
          onChange={(e) => setSelectArea(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-blue-400 bg-blue-900 text-blue-500 focus:ring-blue-500/50"
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-white">Seleziona area di stampa</span>
          <span className="block text-xs text-blue-300/90 mt-0.5 leading-relaxed">
            Mostra un riquadro tratteggiato sulla mappa. Puoi trascinarlo, ridimensionarlo
            o impostarne la dimensione in pixel.
          </span>
        </span>
      </label>

      {selectArea && (
        <div className="rounded-lg border border-sky-500/25 bg-sky-950/30 px-3 py-2 text-xs text-sky-100/90 leading-relaxed">
          Trascina il riquadro sulla mappa oppure modifica larghezza/altezza in px qui sotto.
          Fuori dal riquadro puoi ancora spostare e zoomare la mappa.
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="print-scale" className="text-xs font-medium text-blue-300 uppercase">
          Scala
        </label>
        <select
          id="print-scale"
          value={scaleMode}
          onChange={(e) => setScaleMode(e.target.value)}
          className="w-full bg-blue-900/40 text-white border border-blue-500/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          {PRINT_SCALE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} className="bg-blue-900">
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <ScaleBarPreview map={map} scaleMode={scaleMode} />

      <div className="space-y-2">
        <label htmlFor="print-size" className="text-xs font-medium text-blue-300 uppercase">
          {selectArea ? "Dimensione area / output (px)" : "Dimensione output"}
        </label>
        <select
          id="print-size"
          value={sizePreset}
          onChange={(e) => setSizePreset(e.target.value)}
          className="w-full bg-blue-900/40 text-white border border-blue-500/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          {PRINT_SIZE_PRESETS.map((option) => (
            <option key={option.value} value={option.value} className="bg-blue-900">
              {option.label}
            </option>
          ))}
        </select>
        {selectArea && (
          <p className="text-[11px] text-blue-300/80">
            Le dimensioni in px impostano il riquadro sulla mappa e la risoluzione del PNG.
          </p>
        )}
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
              className="w-full bg-blue-900/40 text-white border border-blue-500/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
              className="w-full bg-blue-900/40 text-white border border-blue-500/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>
      )}

      {rectScaledDown && (
        <p className="text-[11px] text-amber-200/90 leading-relaxed">
          Il riquadro è stato ridotto a {Math.round(printRect.width)}×{Math.round(printRect.height)} px
          perché non entra nella porzione visibile della mappa. L&apos;export userà comunque{" "}
          {requestedWidth}×{requestedHeight} px.
        </p>
      )}
    </div>
  )
}

const ExportFooterButton = ({ onExport, isExporting, mapDisabled }) => (
  <button
    type="button"
    onClick={onExport}
    disabled={isExporting || mapDisabled}
    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <Printer className="h-4 w-4" />
    {isExporting ? "Esportazione in corso…" : "Esporta PNG"}
  </button>
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

  const fields = (
    <PrintExportFields map={map} {...exportState} />
  )

  const footer = (
    <div className="border-t border-blue-500/30 bg-blue-900/50 p-4 shrink-0">
      <ExportFooterButton
        onExport={exportState.handleExport}
        isExporting={exportState.isExporting}
        mapDisabled={!map || (exportState.selectArea && !exportState.printRect)}
      />
    </div>
  )

  const overlay =
    exportState.selectArea && exportState.printRect ? (
      <PrintAreaOverlay
        map={map}
        rect={exportState.printRect}
        onRectChange={exportState.setPrintRect}
        aspectRatio={null}
        disabled={exportState.isExporting}
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

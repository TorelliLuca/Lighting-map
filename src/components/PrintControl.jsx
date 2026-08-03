import { useCallback, useEffect, useRef, useState } from "react"
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

const usePrintExport = ({ map, visualizationMode, selectedCity, onClose }) => {
  const { isPrintAvailable } = usePrintAvailability(visualizationMode)
  const [scaleMode, setScaleMode] = useState("auto")
  const [sizePreset, setSizePreset] = useState("viewport")
  const [customWidth, setCustomWidth] = useState("1920")
  const [customHeight, setCustomHeight] = useState("1080")
  const [isExporting, setIsExporting] = useState(false)
  const exportAbortRef = useRef(null)

  useEffect(() => {
    if (!isPrintAvailable) {
      onClose?.()
      if (exportAbortRef.current) {
        exportAbortRef.current.abort()
        exportAbortRef.current = null
      }
    }
  }, [isPrintAvailable, onClose])

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
    setSizePreset,
    customWidth,
    setCustomWidth,
    customHeight,
    setCustomHeight,
    isExporting,
    handleExport,
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
}) => (
  <div className="space-y-4">
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
        Dimensione
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
    </div>

    {sizePreset === "custom" && (
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
  </div>
)

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
  const exportState = usePrintExport({ map, visualizationMode, selectedCity, onClose })

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
        mapDisabled={!map}
      />
    </div>
  )

  if (isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-[10050] flex flex-col justify-end">
        <button
          type="button"
          aria-label="Chiudi pannello export"
          className="absolute inset-0 bg-black/45"
          onClick={onClose}
        />
        <div
          className="relative z-10 flex max-h-[88vh] flex-col rounded-t-2xl border border-blue-500/30 bg-black/90 backdrop-blur-xl shadow-[0_0_25px_rgba(0,149,255,0.15)] animate-[printSheetUp_0.22s_ease-out]"
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
      </div>,
      document.body,
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[10050] pointer-events-none">
      <button
        type="button"
        className="absolute inset-0 bg-black/20 pointer-events-auto"
        aria-label="Chiudi pannello export"
        onClick={onClose}
      />
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
    </div>,
    document.body,
  )
}

/** @deprecated Usare PrintExportSideWindow */
export const PrintExportPanel = PrintExportSideWindow

export default PrintExportSideWindow

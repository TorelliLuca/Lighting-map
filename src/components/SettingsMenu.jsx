import { useState, useRef, useEffect } from "react"
import {
  SlidersHorizontal,
  X,
  Info,
  Download,
  Printer,
  AlertTriangle,
  DownloadCloud,
  ChevronDown,
} from "lucide-react"
import toast from "react-hot-toast"
import InfoTooltip from "./ui/InfoTooltip"
import MapFabBottomSheet from "./ui/MapFabBottomSheet"
import { usePrintAvailability, PRINT_DISABLED_MESSAGE } from "../hooks/usePrintAvailability"
import { usePwa } from "../context/PwaContext"
import { useMediaQuery } from "../hooks/useMediaQuery"
import { INFO_WINDOW_MOBILE_MQ } from "../utils/infoWindowActions"
import PrintExportSideWindow from "./PrintControl"

const ToggleRow = ({ label, pressed, onToggle }) => (
  <div className="flex items-center justify-between gap-3 min-h-11">
    <span className="text-blue-200 text-sm font-medium">{label}</span>
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        pressed ? "bg-blue-600" : "bg-gray-400"
      }`}
      aria-pressed={pressed}
    >
      <span className="sr-only">Attiva/disattiva {label}</span>
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          pressed ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  </div>
)

const AccordionSection = ({ id, title, tooltip, open, onToggle, children }) => (
  <div className="border-b border-blue-500/20 last:border-b-0">
    <button
      type="button"
      onClick={() => onToggle(id)}
      className="flex w-full items-center justify-between gap-2 py-3 text-left min-h-11"
      aria-expanded={open}
    >
      <span className="flex items-center gap-1.5">
        <span className="text-blue-300 font-semibold text-xs uppercase tracking-wide">
          {title}
        </span>
        {tooltip && <InfoTooltip text={tooltip} />}
      </span>
      <ChevronDown
        className={`h-4 w-4 text-blue-400 shrink-0 transition-transform duration-200 ${
          open ? "rotate-180" : ""
        }`}
      />
    </button>
    {open && <div className="pb-4 space-y-2">{children}</div>}
  </div>
)

const actionBtnClass =
  "flex items-center gap-2 px-4 py-2.5 text-blue-200 hover:text-white hover:bg-blue-700/30 border border-blue-500/30 hover:border-blue-500/50 rounded-lg transition-colors w-full min-h-11"

function SettingsMenu({
  showPanelNumber,
  onTogglePanelNumber,
  showStreetLampNumber,
  onToggleStreetLampNumber,
  showTopologyLines,
  onToggleTopologyLines,
  onShowStats,
  onDownloadReport,
  visualizationMode,
  onToggleVisualizationMode,
  isComplexAllowed,
  isLoadingCityLightPoints,
  map,
  selectedCity,
  interactionsDisabled = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPrintPanelOpen, setIsPrintPanelOpen] = useState(false)
  const [showPrintDisabledHint, setShowPrintDisabledHint] = useState(false)
  const [openSection, setOpenSection] = useState("visualizzazione")
  const menuRef = useRef(null)
  const buttonRef = useRef(null)
  const isMobile = useMediaQuery(INFO_WINDOW_MOBILE_MQ)
  const { isPrintAvailable, tooltipMessage } = usePrintAvailability(visualizationMode)
  const { canInstall, isInstalled, isIosSafari, promptInstall } = usePwa()
  const [showIosInstallHelp, setShowIosInstallHelp] = useState(false)

  const [showWarning, setShowWarning] = useState(false)
  const [fallWarning, setFallWarning] = useState(false)
  const [showComplexTooltip, setShowComplexTooltip] = useState(false)
  const tooltipTimeoutRef = useRef(null)

  useEffect(() => {
    if (!isComplexAllowed) {
      setShowWarning(true)
      setFallWarning(false)
      const timer1 = setTimeout(() => setFallWarning(true), 2500)
      const timer2 = setTimeout(() => {
        setShowWarning(false)
        setFallWarning(false)
      }, 3200)
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
      }
    }
    setShowWarning(false)
    setFallWarning(false)
  }, [isComplexAllowed])

  useEffect(() => {
    if (showComplexTooltip) {
      tooltipTimeoutRef.current = setTimeout(() => setShowComplexTooltip(false), 2500)
      return () => clearTimeout(tooltipTimeoutRef.current)
    }
  }, [showComplexTooltip])

  useEffect(() => {
    if (!isPrintAvailable) setIsPrintPanelOpen(false)
  }, [isPrintAvailable])

  useEffect(() => {
    if (!isExpanded) {
      setOpenSection("visualizzazione")
    }
  }, [isExpanded])

  const closeMenu = () => setIsExpanded(false)

  const handlePrintMapClick = () => {
    if (!isPrintAvailable) {
      setShowPrintDisabledHint(true)
      toast.error(PRINT_DISABLED_MESSAGE)
      setTimeout(() => setShowPrintDisabledHint(false), 2500)
      return
    }
    closeMenu()
    setIsPrintPanelOpen(true)
  }

  const handleInstallApp = async () => {
    try {
      const result = await promptInstall()
      if (result === "ios-manual") {
        setShowIosInstallHelp((prev) => !prev)
        return
      }
      if (result) toast.success("Installazione avviata")
    } catch {
      toast.error("Installazione non disponibile")
    }
  }

  useEffect(() => {
    if (isMobile) return undefined

    function handleClickOutside(event) {
      if (
        isExpanded &&
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        closeMenu()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [isExpanded, isMobile])

  const toggleSection = (id) => {
    setOpenSection((prev) => (prev === id ? null : id))
  }

  const panelBody = (
    <>
      <AccordionSection
        id="visualizzazione"
        title="Visualizzazione"
        tooltip="Overlay sulla mappa e modalità semplice/complessa. La modalità complessa può essere bloccata con troppi punti luce."
        open={openSection === "visualizzazione"}
        onToggle={toggleSection}
      >
        <div className="flex flex-col items-start mb-1 relative">
          <div className="flex items-center w-full gap-2 select-none relative min-h-11">
            {isLoadingCityLightPoints && (
              <div
                className="absolute left-1/2 -translate-x-1/2 top-0 w-24 h-8 flex items-center justify-center bg-white/70 rounded-full z-30"
                style={{ pointerEvents: "all" }}
              >
                <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
              </div>
            )}
            <span
              className={`text-sm font-medium ${
                visualizationMode === "semplice" ? "text-blue-200" : "text-blue-400/60"
              }`}
            >
              Semplice
            </span>
            <button
              type="button"
              onClick={() => {
                if (isLoadingCityLightPoints) return
                if (visualizationMode === "semplice" && isComplexAllowed) {
                  onToggleVisualizationMode()
                }
                if (visualizationMode === "complessa") onToggleVisualizationMode()
              }}
              className={`relative mx-2 inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none border border-blue-500/30 shadow-sm
                ${visualizationMode === "complessa" ? (isComplexAllowed ? "bg-blue-600" : "bg-gray-400") : "bg-blue-600"}
                ${
                  (!isComplexAllowed && visualizationMode === "complessa") || isLoadingCityLightPoints
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer"
                }`}
              aria-pressed={visualizationMode === "complessa"}
              disabled={
                visualizationMode === "semplice"
                  ? !isComplexAllowed || isLoadingCityLightPoints
                  : isLoadingCityLightPoints
              }
              title={
                isLoadingCityLightPoints
                  ? "Caricamento..."
                  : isComplexAllowed
                    ? ""
                    : "Modalità complessa disabilitata per numero elevato di punti"
              }
              style={isLoadingCityLightPoints ? { pointerEvents: "none" } : {}}
            >
              <span
                className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200
                  ${visualizationMode === "complessa" ? "translate-x-6" : "translate-x-0"}`}
              />
            </button>
            <span
              className={`text-sm font-medium flex items-center gap-1 ${
                visualizationMode === "complessa" ? "text-blue-200" : "text-blue-400/60"
              }`}
              style={{ position: "relative" }}
              onMouseEnter={() => {
                if (!isComplexAllowed) setShowComplexTooltip(true)
              }}
              onMouseLeave={() => {
                if (!isComplexAllowed) setShowComplexTooltip(false)
              }}
              onTouchStart={() => {
                if (!isComplexAllowed) setShowComplexTooltip(true)
              }}
              onTouchEnd={() => {
                if (!isComplexAllowed) setShowComplexTooltip(false)
              }}
            >
              Complessa
              {!isComplexAllowed && (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-blue-400/80 ml-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 11V7a4 4 0 10-8 0v4M5 11h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2z"
                    />
                  </svg>
                  {showComplexTooltip && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-yellow-100 border border-yellow-400 text-yellow-800 text-[11px] rounded-lg px-2 py-1.5 shadow-lg flex items-start gap-1.5 pointer-events-none">
                      <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0 mt-0.5" />
                      Modalità complessa bloccata: il comune selezionato ha troppi punti luce.
                    </div>
                  )}
                </>
              )}
            </span>
          </div>
          {showWarning && (
            <div
              className={`mt-2 w-full z-20 bg-yellow-100 border border-yellow-400 text-yellow-800 text-xs rounded-lg px-3 py-2 shadow-lg flex items-center gap-2 transition-all duration-700
                ${fallWarning ? "translate-y-2 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"}`}
            >
              <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
              Modalità complessa non disponibile: il comune selezionato ha troppi punti luce.
            </div>
          )}
        </div>

        <ToggleRow
          label="Mostra numero quadro"
          pressed={showPanelNumber}
          onToggle={onTogglePanelNumber}
        />
        <ToggleRow
          label="Mostra numero palo"
          pressed={showStreetLampNumber}
          onToggle={onToggleStreetLampNumber}
        />
        <ToggleRow
          label="Mostra linee elettriche"
          pressed={showTopologyLines}
          onToggle={onToggleTopologyLines}
        />

        {canInstall && !isInstalled && (
          <div className="pt-1 w-full">
            <button type="button" onClick={handleInstallApp} className={actionBtnClass}>
              <DownloadCloud className="h-4 w-4" />
              Installa app
            </button>
            {showIosInstallHelp && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-blue-950/80 border border-blue-500/30 text-blue-100 text-xs leading-relaxed">
                {!isIosSafari ? (
                  <p>
                    Apri questa pagina in <span className="font-semibold text-white">Safari</span>,
                    poi usa Condividi → Aggiungi a Home.
                  </p>
                ) : (
                  <ol className="list-decimal list-inside space-y-1">
                    <li>
                      Tocca <span className="font-semibold text-white">Condividi</span> (icona con
                      la freccia in alto)
                    </li>
                    <li>
                      Scorri e tocca{" "}
                      <span className="font-semibold text-white">Aggiungi a Home</span>
                    </li>
                    <li>Conferma con Aggiungi</li>
                  </ol>
                )}
              </div>
            )}
          </div>
        )}
      </AccordionSection>

      <AccordionSection
        id="esporta"
        title="Esporta e analisi"
        tooltip="Statistiche impianto, report segnalazioni e stampa mappa."
        open={openSection === "esporta"}
        onToggle={toggleSection}
      >
        <button
          type="button"
          onClick={() => {
            onShowStats()
            closeMenu()
          }}
          className={actionBtnClass}
        >
          <Info className="h-4 w-4" />
          Statistiche impianto
        </button>
        <button type="button" onClick={onDownloadReport} className={actionBtnClass}>
          <Download className="h-4 w-4" />
          Scarica report
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={handlePrintMapClick}
            onMouseEnter={() => {
              if (!isPrintAvailable) setShowPrintDisabledHint(true)
            }}
            onMouseLeave={() => setShowPrintDisabledHint(false)}
            onTouchStart={() => {
              if (!isPrintAvailable) setShowPrintDisabledHint(true)
            }}
            onTouchEnd={() => {
              if (!isPrintAvailable) setTimeout(() => setShowPrintDisabledHint(false), 2000)
            }}
            aria-disabled={!isPrintAvailable}
            title={tooltipMessage}
            className={`${actionBtnClass} ${
              isPrintAvailable
                ? "cursor-pointer"
                : "text-blue-200/50 border-blue-500/20 opacity-70 cursor-not-allowed hover:bg-transparent hover:text-blue-200/50"
            } ${isPrintPanelOpen && isPrintAvailable ? "bg-blue-700/30 border-blue-500/50" : ""}`}
          >
            <Printer className="h-4 w-4" />
            Stampa mappa
          </button>
          {!isPrintAvailable && showPrintDisabledHint && (
            <div
              role="tooltip"
              className="mt-2 w-full rounded-lg border border-yellow-400/60 bg-yellow-100 px-3 py-2 text-[11px] text-yellow-900 shadow-lg flex items-start gap-2"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-600 mt-0.5" />
              <span>{PRINT_DISABLED_MESSAGE}</span>
            </div>
          )}
        </div>
      </AccordionSection>
    </>
  )

  const mobileSheet = isMobile && (
    <MapFabBottomSheet isOpen={isExpanded} onClose={closeMenu} title="Impostazioni">
      {panelBody}
    </MapFabBottomSheet>
  )

  return (
    <div className={`fixed bottom-24 left-6 z-3 ${interactionsDisabled ? "opacity-50" : ""}`}>
      <button
        ref={buttonRef}
        onClick={() => !interactionsDisabled && setIsExpanded(!isExpanded)}
        disabled={interactionsDisabled}
        title={interactionsDisabled ? "Disponibile al termine del caricamento" : undefined}
        className="p-3 bg-black/70 hover:bg-blue-900/70 text-blue-400 rounded-full backdrop-blur-xl border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300 hover:scale-110 disabled:cursor-not-allowed disabled:hover:scale-100"
        aria-label={isExpanded ? "Chiudi impostazioni" : "Apri impostazioni"}
      >
        {isExpanded ? <X className="h-5 w-5" /> : <SlidersHorizontal className="h-5 w-5" />}
      </button>

      {!isMobile && (
        <div
          ref={menuRef}
          className={`absolute bottom-16 left-0 transition-all duration-300 origin-bottom-left ${
            isExpanded
              ? "scale-100 opacity-100 pointer-events-auto"
              : "scale-95 opacity-0 pointer-events-none"
          }`}
        >
          <div className="bg-black/70 backdrop-blur-xl border border-blue-500/40 rounded-xl shadow-[0_0_25px_rgba(0,149,255,0.15)] p-4 min-w-[280px] max-w-[min(92vw,320px)] max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
            {panelBody}
          </div>
        </div>
      )}

      {mobileSheet}

      <PrintExportSideWindow
        isOpen={isPrintPanelOpen && isPrintAvailable}
        onClose={() => setIsPrintPanelOpen(false)}
        map={map}
        visualizationMode={visualizationMode}
        selectedCity={selectedCity}
      />
    </div>
  )
}

export default SettingsMenu

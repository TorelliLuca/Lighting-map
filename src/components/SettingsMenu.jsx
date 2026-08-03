import { useState, useRef, useEffect } from "react"
import { SlidersHorizontal, X, Info, Download, HelpCircle, Printer, AlertTriangle, DownloadCloud } from "lucide-react"
import toast from "react-hot-toast"
import InfoTooltip from "./ui/InfoTooltip"
import { usePrintAvailability, PRINT_DISABLED_MESSAGE } from "../hooks/usePrintAvailability"
import { usePwa } from "../context/PwaContext"
import PrintExportSideWindow from "./PrintControl"

function SettingsMenu({
  showPanelNumber,
  onTogglePanelNumber,
  showStreetLampNumber,
  onToggleStreetLampNumber,
  showTopologyLines,
  onToggleTopologyLines,
  onShowStats,
  onDownloadReport,
  onAddPoint,
  onShowFaq,
  onShowIlluminazionePubblica,
  isSuperAdmin,
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
  const menuRef = useRef(null)
  const buttonRef = useRef(null)
  const { isPrintAvailable, tooltipMessage } = usePrintAvailability(visualizationMode)
  const { canInstall, isInstalled, isIosSafari, promptInstall } = usePwa()
  const [showIosInstallHelp, setShowIosInstallHelp] = useState(false)

  // Stato per gestire la nuvoletta warning e la sua animazione
  const [showWarning, setShowWarning] = useState(false);
  const [fallWarning, setFallWarning] = useState(false);

  // Mostra la nuvoletta solo quando isComplexAllowed diventa false
  useEffect(() => {
    if (!isComplexAllowed) {
      setShowWarning(true);
      setFallWarning(false);
      const timer1 = setTimeout(() => {
        setFallWarning(true);
      }, 2500);
      const timer2 = setTimeout(() => {
        setShowWarning(false);
        setFallWarning(false);
      }, 3200);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else {
      setShowWarning(false);
      setFallWarning(false);
    }
  }, [isComplexAllowed]);

  // Tooltip per la label "Complessa"
  const [showComplexTooltip, setShowComplexTooltip] = useState(false);
  const tooltipTimeoutRef = useRef(null);

  // Chiudi tooltip mobile dopo 2.5s
  useEffect(() => {
    if (showComplexTooltip) {
      tooltipTimeoutRef.current = setTimeout(() => setShowComplexTooltip(false), 2500);
      return () => clearTimeout(tooltipTimeoutRef.current);
    }
  }, [showComplexTooltip]);

  useEffect(() => {
    if (!isPrintAvailable) {
      setIsPrintPanelOpen(false)
    }
  }, [isPrintAvailable])

  const handlePrintMapClick = () => {
    if (!isPrintAvailable) {
      setShowPrintDisabledHint(true)
      toast.error(PRINT_DISABLED_MESSAGE)
      setTimeout(() => setShowPrintDisabledHint(false), 2500)
      return
    }
    setIsExpanded(false)
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
    function handleClickOutside(event) {
      if (
        isExpanded &&
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsExpanded(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isExpanded])

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

      <div
        ref={menuRef}
        className={`absolute bottom-16 left-0 transition-all duration-300 origin-bottom-right ${
          isExpanded ? "scale-100 opacity-100 pointer-events-auto" : "scale-95 opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-black/70 backdrop-blur-xl border border-blue-500/40 rounded-xl shadow-[0_0_25px_rgba(0,149,255,0.15)] p-6 space-y-6 min-w-[260px]">
          <div className="space-y-4">
            {/* Azioni */}
            <div>
              <div className="flex items-center gap-1">
                <div className="text-blue-300 font-semibold text-xs uppercase mb-2">Azioni</div>
                <InfoTooltip text="Visualizza statistiche dell'impianto, esporta la mappa o scarica il file .csv di resoconto delle segnalazioni" />
              </div>
              <button
                onClick={onShowStats}
                className="flex items-center gap-2 px-4 py-2 text-blue-200 hover:text-white hover:bg-blue-700/30 border border-blue-500/30 hover:border-blue-500/50 rounded-lg transition-colors w-full"
              >
                <Info className="h-4 w-4" />
                Statistiche impianto
              </button>
              <button
                onClick={onDownloadReport}
                className="flex items-center gap-2 px-4 py-2 text-blue-200 hover:text-white hover:bg-blue-700/30 border border-blue-500/30 hover:border-blue-500/50 rounded-lg transition-colors w-full mt-2"
              >
                <Download className="h-4 w-4" />
                Scarica report
              </button>
              <div className="relative mt-2">
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
                  className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors w-full ${
                    isPrintAvailable
                      ? "text-blue-200 hover:text-white hover:bg-blue-700/30 border-blue-500/30 hover:border-blue-500/50 cursor-pointer"
                      : "text-blue-200/50 border-blue-500/20 opacity-70 cursor-not-allowed"
                  } ${isPrintPanelOpen && isPrintAvailable ? "bg-blue-700/30 border-blue-500/50" : ""}`}
                >
                  <Printer className="h-4 w-4" />
                  Stampa mappa
                </button>
                {!isPrintAvailable && showPrintDisabledHint && (
                  <div
                    role="tooltip"
                    className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-52 rounded-lg border border-yellow-400/60 bg-yellow-100 px-3 py-2 text-[11px] text-yellow-900 shadow-lg flex items-start gap-2 z-30 pointer-events-none"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-600 mt-0.5" />
                    <span>{PRINT_DISABLED_MESSAGE}</span>
                  </div>
                )}
              </div>

            </div>
            {/* Supporto */}
            <div>
              <div className="flex items-center gap-1">
                <div className="text-blue-300 font-semibold text-xs uppercase mb-2">Supporto</div>
                <InfoTooltip text="Trova risposte alle domande frequenti o scopri di più sull'illuminazione pubblica." />
              </div>
              <button
                onClick={onShowFaq}
                className="flex items-center gap-2 px-4 py-2 text-blue-200 hover:text-white hover:bg-blue-700/30 border border-blue-500/30 hover:border-blue-500/50 rounded-lg transition-colors w-full"
              >
                <HelpCircle className="h-4 w-4" />
                Manuale operativo
              </button>
              <button
                onClick={onShowIlluminazionePubblica}
                className="flex items-center gap-2 px-4 py-2 text-blue-200 hover:text-white hover:bg-blue-700/30 border border-blue-500/30 hover:border-blue-500/50 rounded-lg transition-colors w-full mt-2"
              >
                <Info className="h-4 w-4" />
                Scopri di più
              </button>
            </div>
            {/* Preferenze */}
            <div>
              <div className="flex items-center gap-1">
                <div className="text-blue-300 font-semibold text-xs uppercase mb-2">Preferenze</div>
                <InfoTooltip text="Mostra il numero del quadro e del palo, e le linee elettriche della rete radiale sul comune." />
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-200 text-sm font-medium">Mostra numero quadro</span>
                <button
                  onClick={onTogglePanelNumber}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showPanelNumber ? 'bg-blue-600' : 'bg-gray-400'}`}
                  aria-pressed={showPanelNumber}
                >
                  <span className="sr-only">Attiva/disattiva numero quadro</span>
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showPanelNumber ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-200 text-sm font-medium">Mostra numero palo</span>
                <button
                  onClick={onToggleStreetLampNumber}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showStreetLampNumber ? 'bg-blue-600' : 'bg-gray-400'}`}
                  aria-pressed={showStreetLampNumber}
                >
                  <span className="sr-only">Attiva/disattiva numero palo</span>
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showStreetLampNumber ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-200 text-sm font-medium">Mostra linee elettriche</span>
                <button
                  onClick={onToggleTopologyLines}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showTopologyLines ? 'bg-blue-600' : 'bg-gray-400'}`}
                  aria-pressed={showTopologyLines}
                >
                  <span className="sr-only">Attiva/disattiva linee elettriche</span>
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showTopologyLines ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
              {canInstall && !isInstalled && (
                <div className="mb-3 w-full">
                  <button
                    type="button"
                    onClick={handleInstallApp}
                    className="flex items-center gap-2 px-4 py-2 text-blue-200 hover:text-white hover:bg-blue-700/30 border border-blue-500/30 hover:border-blue-500/50 rounded-lg transition-colors w-full"
                  >
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
                            Tocca <span className="font-semibold text-white">Condividi</span>{" "}
                            (icona con la freccia in alto)
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
              {/* Modalità visualizzazione: slider custom con "Semplice" e "Complessa" */}
              <div className="flex items-center gap-1">
                <div className="text-blue-300 font-semibold text-xs uppercase mb-2">Visualizzazione</div>
                <InfoTooltip text="Scegli tra modalità semplice o complessa per la visualizzazione dei punti luce. La modalità complessa mostra più dettagli e strumenti più evoluti come StreetView, ma potrebbe essere disabilitata se ci sono troppi punti." />
              </div>
              <div className="flex flex-col items-start mb-2 relative">
                <div className="flex items-center w-full gap-2 select-none relative">
                  {/* Overlay loader sopra lo slider se loading */}
                  {isLoadingCityLightPoints && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 w-24 h-8 flex items-center justify-center bg-white/70 rounded-full z-30" style={{pointerEvents:'all'}}>
                      <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    </div>
                  )}
                  {/* Etichetta sinistra */}
                  <span className={`text-sm font-medium ${visualizationMode === 'semplice' ? 'text-blue-200' : 'text-blue-400/60'}`}>Semplice</span>
                  {/* Slider custom */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isLoadingCityLightPoints) return;
                      if (visualizationMode === 'semplice' && isComplexAllowed) onToggleVisualizationMode();
                      if (visualizationMode === 'complessa') onToggleVisualizationMode();
                    }}
                    className={`relative mx-2 inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none border border-blue-500/30 shadow-sm
                      ${visualizationMode === 'complessa' ? (isComplexAllowed ? 'bg-blue-600' : 'bg-gray-400') : 'bg-blue-600'}
                      ${(!isComplexAllowed && visualizationMode === 'complessa') || isLoadingCityLightPoints ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                    aria-pressed={visualizationMode === 'complessa'}
                    disabled={visualizationMode === 'semplice' ? !isComplexAllowed || isLoadingCityLightPoints : isLoadingCityLightPoints}
                    title={isLoadingCityLightPoints ? 'Caricamento...' : (isComplexAllowed ? '' : 'Modalità complessa disabilitata per numero elevato di punti')}
                    style={isLoadingCityLightPoints ? {pointerEvents:'none'} : {}}
                  >
                    {/* Thumb animato */}
                    <span
                      className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200
                        ${visualizationMode === 'complessa' ? 'translate-x-6' : 'translate-x-0'}`}
                    />
                  </button>
                  {/* Etichetta destra + lucchetto se bloccato */}
                  <span
                    className={`text-sm font-medium flex items-center gap-1 ${visualizationMode === 'complessa' ? 'text-blue-200' : 'text-blue-400/60'}`}
                    style={{ position: 'relative' }}
                    onMouseEnter={() => { if (!isComplexAllowed) setShowComplexTooltip(true); }}
                    onMouseLeave={() => { if (!isComplexAllowed) setShowComplexTooltip(false); }}
                    onTouchStart={() => { if (!isComplexAllowed) setShowComplexTooltip(true); }}
                    onTouchEnd={() => { if (!isComplexAllowed) setShowComplexTooltip(false); }}
                  >
                    Complessa
                    {!isComplexAllowed && (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400/80 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 10-8 0v4M5 11h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2z" />
                        </svg>
                        {/* Tooltip/nuvoletta */}
                        {showComplexTooltip && (
                          <div className="absolute left-full ml-2 top-1 bg-yellow-100 border border-yellow-400 text-yellow-800 text-[11px] rounded-lg px-2 py-1 shadow-lg flex items-center gap-1 z-30 animate-fade-in min-w-[120px] max-w-xs text-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.054 0 1.658-1.14 1.105-2.045l-6.928-12.01c-.526-.912-1.684-.912-2.21 0l-6.928 12.01c-.553.905.051 2.045 1.105 2.045z" />
                            </svg>
                            Modalità complessa bloccata: il comune selezionato ha troppi punti luce.
                          </div>
                        )}
                      </>
                    )}
                  </span>
                </div>
                {/* Nuvoletta warning spostata a destra e con animazione di caduta */}
                {showWarning && (
                  <div className={`absolute top-0 left-full ml-4 z-20 bg-yellow-100 border border-yellow-400 text-yellow-800 text-xs rounded-lg px-3 py-2 shadow-lg flex items-center gap-2 transition-all duration-700
                    ${fallWarning ? 'translate-y-8 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.054 0 1.658-1.14 1.105-2.045l-6.928-12.01c-.526-.912-1.684-.912-2.21 0l-6.928 12.01c-.553.905.051 2.045 1.105 2.045z" />
                    </svg>
                    Modalità complessa non disponibile: il comune selezionato ha troppi punti luce.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
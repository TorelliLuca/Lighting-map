import { useState, useRef, useEffect } from "react"
import { SlidersHorizontal, X, Info, Download, Plus, HelpCircle } from "lucide-react"
import InfoTooltip from "./ui/InfoTooltip"

function SettingsMenu({ showPanelNumber, onTogglePanelNumber, showStreetLampNumber, onToggleStreetLampNumber, onShowStats, onDownloadReport, onAddPoint, onShowFaq, onShowIlluminazionePubblica, isSuperAdmin, visualizationMode, onToggleVisualizationMode, isComplexAllowed, isLoadingCityLightPoints }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)

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
    <div className="fixed bottom-24 left-6 z-3">
      <button
        ref={buttonRef}
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3 bg-black/70 hover:bg-blue-900/70 text-blue-400 rounded-full backdrop-blur-xl border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300 hover:scale-110"
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
                <InfoTooltip text="Visualizza statistiche dell'impianto, grafici o scarica il file .csv di resoconto delle segnalazioni" />
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
                FAQ
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
                <InfoTooltip text="Mostra il numero del quadro e il numero del palo sotto ai marker." />
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
    </div>
  )
}

export default SettingsMenu 
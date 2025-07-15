import { useState, useRef, useEffect } from "react"
import { SlidersHorizontal, X, Info, Download, Plus, HelpCircle } from "lucide-react"

function SettingsMenu({ showPanelNumber, onTogglePanelNumber, showStreetLampNumber, onToggleStreetLampNumber, onShowStats, onDownloadReport, onAddPoint, onShowFaq, onShowIlluminazionePubblica, isSuperAdmin }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)

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
              <div className="text-blue-300 font-semibold text-xs uppercase mb-2">Azioni</div>
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
              {isSuperAdmin && (
                <button
                  onClick={onAddPoint}
                  className="flex items-center gap-2 px-4 py-2 text-blue-200 hover:text-white hover:bg-blue-700/30 border border-blue-500/30 hover:border-blue-500/50 rounded-lg transition-colors w-full mt-2"
                >
                  <Plus className="h-4 w-4" />
                  Aggiungi punto
                </button>
              )}
            </div>
            {/* Supporto */}
            <div>
              <div className="text-blue-300 font-semibold text-xs uppercase mb-2">Supporto</div>
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
              <div className="text-blue-300 font-semibold text-xs uppercase mb-2">Preferenze</div>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsMenu 
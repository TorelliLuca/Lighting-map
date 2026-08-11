import { Lasso, Copy, Plus, X, Wrench, Cable } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import MapFabBottomSheet from "./ui/MapFabBottomSheet"
import { useMediaQuery } from "../hooks/useMediaQuery"
import { INFO_WINDOW_MOBILE_MQ } from "../utils/infoWindowActions"

const actionBtnClass =
  "flex items-center gap-3 px-4 py-2.5 text-blue-200 hover:text-white hover:bg-blue-700/30 border border-blue-500/30 hover:border-blue-500/50 rounded-lg transition-colors w-full min-h-11"

function AddMenu({
  onAddPoint,
  onDuplicatePoint,
  onToggleLasso,
  isLassoActive = false,
  showLasso = false,
  showAddTools = true,
  showTopologyEdit = false,
  isTopologyEditActive = false,
  onToggleTopologyEdit,
  interactionsDisabled = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)
  const isMobile = useMediaQuery(INFO_WINDOW_MOBILE_MQ)

  const closeMenu = () => setIsExpanded(false)

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

  const handleAddClick = () => {
    if (interactionsDisabled) return
    onAddPoint()
    closeMenu()
  }

  const handleDuplicateClick = () => {
    if (interactionsDisabled) return
    onDuplicatePoint()
    closeMenu()
  }

  const handleLassoClick = () => {
    if (interactionsDisabled || !onToggleLasso) return
    onToggleLasso()
    closeMenu()
  }

  const handleTopologyClick = () => {
    if (interactionsDisabled || !onToggleTopologyEdit) return
    onToggleTopologyEdit()
    closeMenu()
  }

  const activeTool = isTopologyEditActive || isLassoActive

  const panelBody = (
    <div className="space-y-3">
      {showAddTools && (
        <>
          <button type="button" onClick={handleAddClick} className={actionBtnClass}>
            <Plus className="h-4 w-4" />
            Aggiungi nuovo
          </button>
          <button type="button" onClick={handleDuplicateClick} className={actionBtnClass}>
            <Copy className="h-4 w-4" />
            Duplica
          </button>
        </>
      )}
      {showLasso && (
        <button
          type="button"
          onClick={handleLassoClick}
          className={`${actionBtnClass} ${
            isLassoActive
              ? "text-white bg-blue-700/40 border-blue-400/60"
              : ""
          }`}
        >
          <Lasso className="h-4 w-4" />
          {isLassoActive ? "Disattiva lazo" : "Sposta con lazo"}
        </button>
      )}
      {showTopologyEdit && (
        <button
          type="button"
          onClick={handleTopologyClick}
          className={`${actionBtnClass} ${
            isTopologyEditActive
              ? "text-white bg-blue-700/40 border-blue-400/60"
              : ""
          }`}
        >
          <Cable className="h-4 w-4" />
          {isTopologyEditActive ? "Disattiva modalità linee" : "Attiva modalità linee"}
        </button>
      )}
    </div>
  )

  return (
    <div
      data-tour="add-menu"
      className={`fixed bottom-60 left-6 z-2 ${interactionsDisabled ? "opacity-50" : ""}`}
    >
      <button
        ref={buttonRef}
        onClick={() => !interactionsDisabled && setIsExpanded(!isExpanded)}
        disabled={interactionsDisabled}
        className={`p-3 text-blue-200 border border-blue-500/40 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.3)] backdrop-blur-xl transition-all duration-300 focus:outline-none flex items-center justify-center hover:scale-110 disabled:cursor-not-allowed disabled:hover:scale-100 ${
          activeTool
            ? "bg-blue-700/80 hover:bg-blue-600/80"
            : "bg-black/70 hover:bg-blue-900/70"
        }`}
        title={
          interactionsDisabled
            ? "Disponibile al termine del caricamento"
            : isTopologyEditActive
              ? "Modalità linee attiva"
              : isLassoActive
                ? "Strumento lazo attivo"
                : "Strumenti rilievo"
        }
        aria-label={isExpanded ? "Chiudi menu aggiunta" : "Apri menu aggiunta"}
      >
        {isExpanded ? (
          <X className="h-5 w-5" />
        ) : isTopologyEditActive ? (
          <Cable className="h-5 w-5" />
        ) : isLassoActive ? (
          <Lasso className="h-5 w-5" />
        ) : (
          <Wrench className="h-5 w-5" />
        )}
      </button>

      {!isMobile && (
        <div
          ref={menuRef}
          className={`absolute bottom-16 left-0 transition-all duration-300 origin-bottom-right ${
            isExpanded
              ? "scale-100 opacity-100 pointer-events-auto"
              : "scale-95 opacity-0 pointer-events-none"
          }`}
        >
          <div className="bg-black/70 backdrop-blur-xl border border-blue-500/40 rounded-xl shadow-[0_0_25px_rgba(0,149,255,0.15)] p-4 space-y-3 min-w-[220px]">
            {panelBody}
          </div>
        </div>
      )}

      {isMobile && (
        <MapFabBottomSheet isOpen={isExpanded} onClose={closeMenu} title="Strumenti rilievo">
          {panelBody}
        </MapFabBottomSheet>
      )}
    </div>
  )
}

export default AddMenu

import { Lasso, Copy, Plus, X, Wrench, Cable } from "lucide-react"
import { useEffect, useRef, useState } from "react"

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
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [isExpanded])

  const handleAddClick = () => {
    if (interactionsDisabled) return
    onAddPoint()
    setIsExpanded(false)
  }

  const handleDuplicateClick = () => {
    if (interactionsDisabled) return
    onDuplicatePoint()
    setIsExpanded(false)
  }

  const handleLassoClick = () => {
    if (interactionsDisabled || !onToggleLasso) return
    onToggleLasso()
    setIsExpanded(false)
  }

  const handleTopologyClick = () => {
    if (interactionsDisabled || !onToggleTopologyEdit) return
    onToggleTopologyEdit()
    setIsExpanded(false)
  }

  const activeTool = isTopologyEditActive || isLassoActive

  return (
    <div className={`fixed bottom-60 left-6 z-2 ${interactionsDisabled ? "opacity-50" : ""}`}>
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

      <div
        ref={menuRef}
        className={`absolute bottom-16 left-0 transition-all duration-300 origin-bottom-right ${
          isExpanded ? "scale-100 opacity-100 pointer-events-auto" : "scale-95 opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-black/70 backdrop-blur-xl border border-blue-500/40 rounded-xl shadow-[0_0_25px_rgba(0,149,255,0.15)] p-4 space-y-3 min-w-[220px]">
          {showAddTools && (
            <>
              <button
                onClick={handleAddClick}
                className="flex items-center gap-3 px-4 py-2 text-blue-200 hover:text-white hover:bg-blue-700/30 border border-blue-500/30 hover:border-blue-500/50 rounded-lg transition-colors w-full"
              >
                <Plus className="h-4 w-4" />
                Aggiungi nuovo
              </button>
              <button
                onClick={handleDuplicateClick}
                className="flex items-center gap-3 px-4 py-2 text-blue-200 hover:text-white hover:bg-blue-700/30 border border-blue-500/30 hover:border-blue-500/50 rounded-lg transition-colors w-full"
              >
                <Copy className="h-4 w-4" />
                Duplica
              </button>
            </>
          )}
          {showLasso && (
            <button
              onClick={handleLassoClick}
              className={`flex items-center gap-3 px-4 py-2 border rounded-lg transition-colors w-full ${
                isLassoActive
                  ? "text-white bg-blue-700/40 border-blue-400/60"
                  : "text-blue-200 hover:text-white hover:bg-blue-700/30 border-blue-500/30 hover:border-blue-500/50"
              }`}
            >
              <Lasso className="h-4 w-4" />
              {isLassoActive ? "Disattiva lazo" : "Sposta con lazo"}
            </button>
          )}
          {showTopologyEdit && (
            <button
              onClick={handleTopologyClick}
              className={`flex items-center gap-3 px-4 py-2 border rounded-lg transition-colors w-full ${
                isTopologyEditActive
                  ? "text-white bg-blue-700/40 border-blue-400/60"
                  : "text-blue-200 hover:text-white hover:bg-blue-700/30 border-blue-500/30 hover:border-blue-500/50"
              }`}
            >
              <Cable className="h-4 w-4" />
              {isTopologyEditActive ? "Disattiva modalità linee" : "Attiva modalità linee"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default AddMenu

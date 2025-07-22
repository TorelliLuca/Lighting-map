import { useState, useRef, useEffect } from "react"
import { Plus, Copy, X } from "lucide-react"

function AddMenu({ onAddPoint, onDuplicatePoint }) {
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
    onAddPoint();
    setIsExpanded(false);
  }

  const handleDuplicateClick = () => {
    onDuplicatePoint();
    setIsExpanded(false);
  }

  return (
    <div className="fixed bottom-60 left-6 z-3">
      <button
        ref={buttonRef}
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3 bg-black/70 hover:bg-blue-900/70 text-blue-200 border border-blue-500/40 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.3)] backdrop-blur-xl transition-all duration-300 focus:outline-none flex items-center justify-center hover:scale-110"
        title="Aggiungi nuovo punto"
        aria-label={isExpanded ? "Chiudi menu aggiunta" : "Apri menu aggiunta"}
      >
        {isExpanded ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      </button>

      <div
        ref={menuRef}
        className={`absolute bottom-16 left-0 transition-all duration-300 origin-bottom-right ${
          isExpanded ? "scale-100 opacity-100 pointer-events-auto" : "scale-95 opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-black/70 backdrop-blur-xl border border-blue-500/40 rounded-xl shadow-[0_0_25px_rgba(0,149,255,0.15)] p-4 space-y-3 min-w-[220px]">
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
        </div>
      </div>
    </div>
  )
}

export default AddMenu 
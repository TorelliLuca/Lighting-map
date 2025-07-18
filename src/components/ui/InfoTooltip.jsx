import { useRef, useState, useEffect, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import { Info } from "lucide-react"

/**
 * Componente Tooltip a nuvoletta, dark & blue glass style, posizionato a destra dell'icona.
 * Props:
 * - text: string (testo da mostrare nella nuvoletta)
 * - className: string (opzionale, per custom styling)
 */
export default function InfoTooltip({ text, className = "" }) {
  const [open, setOpen] = useState(false)
  const iconRef = useRef(null)
  const tooltipRef = useRef(null)
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 })

  // Calcola la posizione dell'icona e posiziona il tooltip a destra dell'icona
  useLayoutEffect(() => {
    if (open && iconRef.current && tooltipRef.current) {
      const iconRect = iconRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      // Tooltip a destra dell'icona, leggermente in basso
      let left = iconRect.right + 8
      let top = iconRect.top + iconRect.height / 2 - tooltipRect.height / 2
      // Se tooltip va fuori dallo schermo a destra, posizionalo più a sinistra
      if (left + tooltipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tooltipRect.width - 8
      }
      // Se tooltip va fuori in alto, correggi
      if (top < 8) top = 8
      // Se tooltip va fuori in basso, correggi
      if (top + tooltipRect.height > window.innerHeight - 8) {
        top = window.innerHeight - tooltipRect.height - 8
      }
      setTooltipPos({ left, top })
    }
  }, [open])

  // Chiudi tooltip su click/tap fuori
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target) &&
        iconRef.current &&
        !iconRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("touchstart", handleClick)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("touchstart", handleClick)
    }
  }, [open])

  // Gestione focus tastiera (accessibilità)
  function handleKeyDown(e) {
    if (e.key === "Escape") setOpen(false)
    if ((e.key === "Enter" || e.key === " ") && !open) setOpen(true)
  }

  // Tooltip glass dark/blue style, posizionato fixed a destra dell'icona
  function TooltipBubble() {
    return createPortal(
      <div
        ref={tooltipRef}
        role="tooltip"
        tabIndex={-1}
        className="z-[120] fixed min-w-[180px] max-w-xs bg-black/80 text-blue-100 text-sm rounded-xl shadow-[0_0_25px_rgba(0,149,255,0.25)] border border-blue-500/40 px-4 py-3 flex items-start gap-2 animate-fade-in-up select-none backdrop-blur-xl"
        style={{ left: tooltipPos.left, top: tooltipPos.top }}
      >
        <span className="mt-0.5">
          <Info className="h-4 w-4 text-blue-400" />
        </span>
        <span className="flex-1 leading-snug">{text}</span>
        <button
          aria-label="Chiudi tooltip"
          className="ml-2 text-blue-400 hover:text-blue-200 focus:outline-none"
          onClick={() => setOpen(false)}
          tabIndex={0}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>,
      document.body
    )
  }

  return (
    <span className={`flex relative bottom-1 ${className} `} >
      <button
        ref={iconRef}
        type="button"
        aria-label="Mostra informazioni"
        aria-expanded={open}
        tabIndex={0}
        className="ml-3 p-0 rounded-full focus:ring-2 focus:ring-blue-400 focus:outline-none border-none bg-transparent text-blue-400 hover:text-blue-200 transition-colors self-center"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        style={{ background: "none", verticalAlign: 'middle' }}
      >
        <Info className="h-4 w-4 align-middle" />
      </button>
      {open && <TooltipBubble />}
    </span>
  )
}

// Tailwind animazione fade-in-up
// .animate-fade-in-up { @apply transition-all duration-200 ease-out opacity-0 translate-y-2; animation: fadeInUp 0.2s forwards; }
// @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } } 
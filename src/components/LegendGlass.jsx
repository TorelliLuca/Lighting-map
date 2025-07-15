import { useState, useEffect, useRef } from "react"
import { BookOpen, X } from "lucide-react"
import { DEFAULT_COLOR } from "../utils/ColorGenerator"

function LegendGlass({ highlightOption, legendColorMap }) {
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const legendRef = useRef(null)
  const buttonRef = useRef(null)

  // Responsive: chiudi su mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 640)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])
  useEffect(() => {
    if (isMobile) setOpen(false)
  }, [isMobile])

  // Chiudi la legenda se clicco fuori (UX migliorata)
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        open &&
        legendRef.current &&
        !legendRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [open])

  // Semplificato: prendo direttamente la mappa colori passata come prop
  let legendItems = []
  if (highlightOption === "PROPRIETA" && legendColorMap.proprieta) {
    legendItems = [
        { label: "Comune", color: "#3b82f6" },
        { label: "EnelSole", color: "#ef4444" },
        { label: "Altro", color: "#6b7280" },
      ]
  } else if (highlightOption === "MARKER" && legendColorMap.quadro) {
    legendItems = Object.entries(legendColorMap.quadro).map(([label, color]) => ({ label, color }))
  } else if (highlightOption === "LOTTO" && legendColorMap.lotto) {
    legendItems = Object.entries(legendColorMap.lotto).map(([label, color]) => ({ label, color }))
  } else if (highlightOption === "TIPO_LAMPADA" && legendColorMap.tipo_lampada) {
    legendItems = [
      { label: "PC", color: "#3b82f6" },
      ...Object.entries(legendColorMap.tipo_lampada)
        .map(([label, color]) => ({ label: label.split(" ")[0], color }))
        .filter(item => item.label !== "PC")
    ]
  } else if (highlightOption === "TIPO_APPARECCHIO" && legendColorMap.tipo_apparecchio) {
    legendItems = Object.entries(legendColorMap.tipo_apparecchio).map(([label, color]) => ({ label, color }))
  } else {
    legendItems = [
      { label: "Segnalazione aperta", color: "#FFCC00" },
      { label: "Nessuna segnalazione", color: DEFAULT_COLOR },
    ]
  }

  return (
    <div className="fixed bottom-42 left-6 z-2 select-none">
      {/* Bottone palette */}
      <button
        ref={buttonRef}
        aria-label={open ? "Chiudi legenda" : "Apri legenda"}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-center w-12 h-12 rounded-full border border-blue-500/40 bg-black/70 text-blue-300 shadow-lg backdrop-blur-xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${open ? "ring-2 ring-blue-500/60" : ""}`}
        style={{ boxShadow: "0 0 15px rgba(59,130,246,0.3)" }}
      >
        {open ? <X className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
      </button>
      {/* Legenda espansa, ora scorribile e con scrollbar custom */}
      <div
        ref={legendRef}
        className={`fixed left-6 bottom-60 z-[9999] bg-black/70 backdrop-blur-xl border border-blue-500/40 rounded-xl shadow-[0_0_25px_rgba(0,149,255,0.15)] p-6 space-y-6 min-w-[260px] transition-all duration-300 overflow-hidden ${open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"} scrollbar-thin scrollbar-thumb-blue-700/70 scrollbar-track-blue-950/40`}
        style={{
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          minWidth: "220px",
          maxHeight: isMobile ? "10rem" : "15rem",
          overflowY: "auto",
        }}
      >
        <h4 className="text-blue-200 text-lg font-semibold mb-3 flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Legenda
        </h4>
        <ul className="space-y-2">
          {legendItems.length === 0 && (
            <li className="text-blue-300 text-sm">Nessun dato disponibile</li>
          )}
          {legendItems.map((item, idx) => (
            <li key={item.label + idx} className="flex items-center gap-3 animate-fadein">
              <span
                className="inline-block rounded-full border border-blue-400 shadow"
                style={{ width: 22, height: 22, background: item.color }}
              ></span>
              <span className="text-white text-base font-medium truncate" title={item.label}>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <style>{`
        @media (max-width: 640px) {
          .fixed.top-40.right-4 {
            top: 1rem;
            right: 1rem;
          }
          .w-64 {
            width: 90vw !important;
            min-width: 0 !important;
          }
        }
        .animate-fadein {
          animation: fadein 0.5s;
        }
        @keyframes fadein {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Scrollbar custom per Chrome/Edge */
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #1e40af;
          border-radius: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #1e293b;
        }
      `}</style>
    </div>
  )
}

export default LegendGlass 
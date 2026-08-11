import { useMemo, useState, useEffect, useRef } from "react"
import { BookOpen, Search, X } from "lucide-react"
import { DEFAULT_COLOR, FC_QUADRO_COLOR, isFcQuadro } from "../utils/ColorGenerator"
import MapFabBottomSheet from "./ui/MapFabBottomSheet"
import { useMediaQuery } from "../hooks/useMediaQuery"
import { INFO_WINDOW_MOBILE_MQ } from "../utils/infoWindowActions"

const HIGHLIGHT_TITLES = {
  PROPRIETA: "Proprietà",
  MARKER: "Quadro",
  LOTTO: "Lotto",
  TIPO_LAMPADA: "Tipo lampada",
  TIPO_APPARECCHIO: "Tipo apparecchio",
}

const SEARCH_THRESHOLD = 8

function buildLegendItems(highlightOption, legendColorMap = {}) {
  if (highlightOption === "PROPRIETA" && legendColorMap.proprieta) {
    return [
      { label: "Comune", color: "#3b82f6" },
      { label: "EnelSole", color: "#ef4444" },
      { label: "Altro", color: "#6b7280" },
    ]
  }
  if (highlightOption === "MARKER" && legendColorMap.quadro) {
    return Object.entries(legendColorMap.quadro).map(([label, color]) => ({
      label,
      color: isFcQuadro(label) ? FC_QUADRO_COLOR : color,
    }))
  }
  if (highlightOption === "LOTTO" && legendColorMap.lotto) {
    return Object.entries(legendColorMap.lotto).map(([label, color]) => ({
      label,
      color,
    }))
  }
  if (highlightOption === "TIPO_LAMPADA" && legendColorMap.tipo_lampada) {
    return [
      { label: "PC", color: "#3b82f6" },
      ...Object.entries(legendColorMap.tipo_lampada)
        .map(([label, color]) => ({ label: label.split(" ")[0], color }))
        .filter((item) => item.label !== "PC"),
    ]
  }
  if (highlightOption === "TIPO_APPARECCHIO" && legendColorMap.tipo_apparecchio) {
    return Object.entries(legendColorMap.tipo_apparecchio).map(([label, color]) => ({
      label,
      color,
    }))
  }
  return [
    { label: "Segnalazione aperta", color: "#FFCC00" },
    { label: "Nessuna segnalazione", color: DEFAULT_COLOR },
  ]
}

function getLegendSubtitle(highlightOption) {
  return HIGHLIGHT_TITLES[highlightOption] || "Segnalazioni"
}

const LegendList = ({ items, dense = false, columns = 1 }) => {
  if (items.length === 0) {
    return <p className="text-blue-300/80 text-sm py-2">Nessun dato disponibile</p>
  }

  return (
    <ul
      className={`${dense ? "gap-y-1.5" : "gap-y-2"} grid ${
        columns === 2 ? "grid-cols-2 gap-x-4" : "grid-cols-1"
      }`}
    >
      {items.map((item, idx) => (
        <li
          key={`${item.label}-${idx}`}
          className="flex items-center gap-2.5 min-w-0 rounded-md px-1.5 py-1 -mx-1.5 hover:bg-blue-900/30 transition-colors"
        >
          <span
            className="inline-block shrink-0 rounded-full border border-blue-400/50 shadow-sm"
            style={{
              width: dense ? 14 : 16,
              height: dense ? 14 : 16,
              background: item.color,
            }}
            aria-hidden
          />
          <span
            className={`text-white truncate ${dense ? "text-xs" : "text-sm"} font-medium`}
            title={item.label}
          >
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  )
}

function LegendGlass({
  highlightOption,
  legendColorMap,
  items: customItems = null,
  title: customTitle = null,
  subtitle: customSubtitle = null,
  className = "fixed bottom-42 left-6 z-40 select-none",
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const isMobile = useMediaQuery(INFO_WINDOW_MOBILE_MQ)
  const panelRef = useRef(null)
  const buttonRef = useRef(null)
  const searchRef = useRef(null)

  const legendItems = useMemo(
    () => (Array.isArray(customItems) ? customItems : buildLegendItems(highlightOption, legendColorMap)),
    [customItems, highlightOption, legendColorMap],
  )

  const subtitle = customSubtitle ?? getLegendSubtitle(highlightOption)
  const title = customTitle ?? `Legenda · ${subtitle}`
  const showSearch = !isMobile && legendItems.length >= SEARCH_THRESHOLD

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return legendItems
    return legendItems.filter((item) => item.label.toLowerCase().includes(q))
  }, [legendItems, query])

  useEffect(() => {
    setOpen(false)
    setQuery("")
  }, [isMobile])

  useEffect(() => {
    setQuery("")
  }, [highlightOption, customItems])

  useEffect(() => {
    if (isMobile || !open) return undefined

    function handleClickOutside(event) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    function handleKey(event) {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open, isMobile])

  useEffect(() => {
    if (open && showSearch) {
      const t = window.setTimeout(() => searchRef.current?.focus(), 80)
      return () => window.clearTimeout(t)
    }
  }, [open, showSearch, highlightOption, customItems])

  const closeMenu = () => setOpen(false)

  const fabButton = (
    <button
      ref={buttonRef}
      type="button"
      aria-label={open ? "Chiudi legenda" : "Apri legenda"}
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
      className={`flex items-center justify-center w-12 h-12 rounded-full border border-blue-500/40 bg-black/70 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.3)] backdrop-blur-xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
        open ? "ring-2 ring-blue-500/60" : ""
      }`}
    >
      {open ? <X className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
    </button>
  )

  // —— Mobile: FAB + bottom sheet ——
  if (isMobile) {
    return (
      <div className={className} data-tour="legend">
        {fabButton}
        <MapFabBottomSheet isOpen={open} onClose={closeMenu} title={title} tall>
          <LegendList items={legendItems} dense />
        </MapFabBottomSheet>
      </div>
    )
  }

  // —— Desktop: FAB + pannello laterale più ampio ——
  const useTwoColumns = filteredItems.length > 6

  return (
    <div className={className} data-tour="legend">
      {fabButton}

      <div
        ref={panelRef}
        role="dialog"
        aria-label={title}
        className={`absolute bottom-0 left-16 origin-bottom-left transition-all duration-200 ${
          open
            ? "opacity-100 scale-100 pointer-events-auto translate-x-0"
            : "opacity-0 scale-95 pointer-events-none -translate-x-1"
        }`}
      >
        <div className="w-[min(420px,calc(100vw-7rem))] max-h-[min(52vh,440px)] flex flex-col rounded-2xl border border-blue-500/40 bg-black/80 backdrop-blur-xl shadow-[0_0_30px_rgba(0,149,255,0.18)] overflow-hidden">
          <div className="shrink-0 flex items-start gap-3 px-4 pt-3.5 pb-2.5 border-b border-blue-500/25">
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900/50 border border-blue-500/30">
              <BookOpen className="h-4 w-4 text-blue-300" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-white truncate">{title}</h2>
              <p className="text-[11px] text-blue-300/80 mt-0.5">
                {legendItems.length === 0
                  ? "Nessuna voce"
                  : `${legendItems.length} ${legendItems.length === 1 ? "voce" : "voci"}`}
                {query.trim() && filteredItems.length !== legendItems.length
                  ? ` · ${filteredItems.length} trovate`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Chiudi legenda"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-300 hover:bg-blue-800/50 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {showSearch && (
            <div className="shrink-0 px-3 pt-2.5 pb-1">
              <label className="relative block">
                <span className="sr-only">Cerca nella legenda</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-400/80" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cerca…"
                  className="w-full rounded-lg border border-blue-500/30 bg-blue-950/50 py-2 pl-9 pr-3 text-sm text-white placeholder:text-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </label>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 scrollbar-app">
            {filteredItems.length === 0 && legendItems.length > 0 ? (
              <p className="text-blue-300/80 text-sm py-4 text-center">Nessun risultato</p>
            ) : (
              <LegendList items={filteredItems} dense columns={useTwoColumns ? 2 : 1} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LegendGlass

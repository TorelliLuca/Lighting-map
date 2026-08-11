"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Filter, X, MapPin, Building, Grid } from "lucide-react"
import InfoTooltip from "./ui/InfoTooltip"
import MapFabBottomSheet from "./ui/MapFabBottomSheet"
import MapControlSelect from "./ui/MapControlSelect"
import { useMediaQuery } from "../hooks/useMediaQuery"
import { INFO_WINDOW_MOBILE_MQ } from "../utils/infoWindowActions"

const HIGHLIGHT_OPTIONS = [
  { value: "", label: "Segnalazioni aperte" },
  { value: "MARKER", label: "Quadro" },
  { value: "PROPRIETA", label: "Proprietà" },
  { value: "LOTTO", label: "Lotto" },
  { value: "TIPO_LAMPADA", label: "Tipo Lampada" },
  { value: "TIPO_APPARECCHIO", label: "Tipo Apparecchio" },
]

const FILTER_OPTIONS = [
  { value: "SELECT", label: "Nessun Filtro" },
  { value: "REPORTED", label: "Segnalazioni Aperte" },
  { value: "MARKER", label: "Quadro" },
  { value: "PROPRIETA", label: "Proprietà" },
]

function MapControls({
  selectedCity,
  setSelectedCity,
  highlightOption,
  setHighlightOption,
  filterOption,
  setFilterOption,
  cities,
  selectedProprietaFilter,
  setSelectedProprietaFilter,
  interactionsDisabled = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)
  const isMobile = useMediaQuery(INFO_WINDOW_MOBILE_MQ)

  const closeMenu = () => setIsExpanded(false)

  const cityOptions = useMemo(
    () =>
      [...(cities || [])]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((city) => ({ value: city.name, label: city.name })),
    [cities],
  )

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
        // Non chiudere se il click è sulla lista del select (portal su body)
        if (event.target.closest?.('[role="listbox"]')) return
        // Non chiudere durante il product tour
        if (event.target.closest?.(".driver-popover, .driver-overlay, .driver-active-element")) return
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

  useEffect(() => {
    const open = () => setIsExpanded(true)
    const close = () => setIsExpanded(false)
    window.addEventListener("lighting-map:map-controls-open", open)
    window.addEventListener("lighting-map:map-controls-close", close)
    return () => {
      window.removeEventListener("lighting-map:map-controls-open", open)
      window.removeEventListener("lighting-map:map-controls-close", close)
    }
  }, [])

  const handleCityChange = (value) => {
    setSelectedCity(value)
    closeMenu()
  }

  const handleHighlightChange = (value) => {
    if (interactionsDisabled) return
    setHighlightOption(value)
    closeMenu()
  }

  const handleFilterChange = (value) => {
    if (interactionsDisabled) return
    setFilterOption(value)
    // Se sceglie Proprietà resta aperto per i radio; altrimenti chiude
    if (value !== "PROPRIETA") {
      closeMenu()
    }
  }

  const handleProprietaChange = (value) => {
    if (interactionsDisabled) return
    setSelectedProprietaFilter(value)
    closeMenu()
  }

  const panelBody = (
    <div className="space-y-5">
      <div className="space-y-2" data-tour="map-city">
        <label htmlFor="map-control-city" className="flex items-center gap-2 text-sm font-medium text-blue-200">
          <MapPin className="h-4 w-4" />
          Città
          <InfoTooltip
            text="Seleziona la città di cui vuoi visualizzare punti luce sulla mappa. Cambiando città verranno caricati solo i dati relativi al comune scelto. Puoi cambiare città anche durante il caricamento."
            className="top-0.5"
          />
        </label>
        <MapControlSelect
          id="map-control-city"
          value={selectedCity}
          onChange={handleCityChange}
          options={cityOptions}
          openUpward
          maxVisible={5}
          aria-label="Seleziona città"
        />
      </div>

      <div
        className={`space-y-2 ${interactionsDisabled ? "opacity-50" : ""}`}
        data-tour="map-highlight"
      >
        <label
          htmlFor="map-control-highlight"
          className="flex items-center gap-2 text-sm font-medium text-blue-200"
        >
          <Building className="h-4 w-4" />
          Evidenzia Per
          <InfoTooltip
            text="Scegli come evidenziare i punti luce sulla mappa: per quadro elettrico, proprietà (EnelSole, comunale, altro), lotto di appartenenza, tipo di lampada o apparecchio illuminante."
            className="top-0.5"
          />
        </label>
        <MapControlSelect
          id="map-control-highlight"
          value={highlightOption}
          onChange={handleHighlightChange}
          options={HIGHLIGHT_OPTIONS}
          openUpward
          maxVisible={6}
          disabled={interactionsDisabled}
          aria-label="Evidenzia per"
        />
      </div>

      <div
        className={`space-y-2 ${interactionsDisabled ? "opacity-50" : ""}`}
        data-tour="map-filter"
      >
        <label
          htmlFor="map-control-filter"
          className="flex items-center gap-2 text-sm font-medium text-blue-200"
        >
          <Grid className="h-4 w-4" />
          Filtra Per
          <InfoTooltip
            text="Filtra i punti luce e i quadri elettrici per categoria: visualizza solo quelli con segnalazioni aperte, solo i quadri, oppure seleziona per proprietà (EnelSole o comunali)."
            className="top-0.5"
          />
        </label>
        <MapControlSelect
          id="map-control-filter"
          value={filterOption}
          onChange={handleFilterChange}
          options={FILTER_OPTIONS}
          openUpward
          maxVisible={4}
          disabled={interactionsDisabled}
          aria-label="Filtra per"
        />
        {filterOption === "PROPRIETA" && (
          <div className="flex flex-col gap-2 mt-2">
            <span className="text-sm font-medium text-blue-200 mb-1">Proprietà</span>
            <div className="flex gap-4">
              <label className={`inline-flex items-center min-h-11 ${interactionsDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
                <input
                  type="radio"
                  name="proprieta-filter"
                  value="Municipale"
                  checked={selectedProprietaFilter === "Municipale"}
                  onChange={() => handleProprietaChange("Municipale")}
                  disabled={interactionsDisabled}
                  className="form-radio text-blue-500 focus:ring-blue-500"
                />
                <span className="ml-1 text-blue-100">Municipale</span>
              </label>
              <label className={`inline-flex items-center min-h-11 ${interactionsDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
                <input
                  type="radio"
                  name="proprieta-filter"
                  value="Enelsole"
                  checked={selectedProprietaFilter === "Enelsole"}
                  onChange={() => handleProprietaChange("Enelsole")}
                  disabled={interactionsDisabled}
                  className="form-radio text-blue-500 focus:ring-blue-500"
                />
                <span className="ml-1 text-blue-100">Enelsole</span>
              </label>
            </div>
          </div>
        )}
      </div>
      {interactionsDisabled && (
        <p className="text-xs text-blue-300/80">
          Evidenziazione e filtri disponibili al termine del caricamento. Puoi comunque cambiare città.
        </p>
      )}
    </div>
  )

  return (
    <div className="fixed bottom-6 left-6 z-20" data-tour="map-filters">
      <button
        ref={buttonRef}
        onClick={() => setIsExpanded(!isExpanded)}
        title={interactionsDisabled ? "Cambia città (filtri disponibili a fine caricamento)" : undefined}
        className="p-3 bg-black/70 hover:bg-blue-900/70 text-blue-400 rounded-full backdrop-blur-xl border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300 hover:scale-110"
        aria-label={isExpanded ? "Chiudi filtri" : "Apri filtri"}
      >
        {isExpanded ? <X className="h-5 w-5" /> : <Filter className="h-5 w-5" />}
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
          <div className="bg-black/70 backdrop-blur-xl border border-blue-500/40 rounded-xl shadow-[0_0_25px_rgba(0,149,255,0.15)] p-6 max-w-[min(92vw,320px)] max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain min-w-[280px]">
            {panelBody}
          </div>
        </div>
      )}

      {isMobile && (
        <MapFabBottomSheet
          isOpen={isExpanded}
          onClose={closeMenu}
          title="Filtri mappa"
          tall
        >
          {panelBody}
        </MapFabBottomSheet>
      )}
    </div>
  )
}

export default MapControls

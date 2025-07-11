"use client"

import { useState, useRef, useEffect } from "react"
import { Filter, X, MapPin, Building, Grid } from "lucide-react"

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
    }
  }, [isExpanded])

  return (
    <div className="fixed bottom-6 left-6 z-20">
      <button
        ref={buttonRef}
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3 bg-black/70 hover:bg-blue-900/70 text-blue-400 rounded-full backdrop-blur-xl border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300 hover:scale-110"
        aria-label={isExpanded ? "Close controls" : "Open controls"}
      >
        {isExpanded ? <X className="h-5 w-5" /> : <Filter className="h-5 w-5" />}
      </button>

      <div
        ref={menuRef}
        className={`absolute bottom-16 left-0 transition-all duration-300 origin-bottom-left ${
          isExpanded ? "scale-100 opacity-100 pointer-events-auto" : "scale-95 opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-black/70 backdrop-blur-xl border border-blue-500/40 rounded-xl shadow-[0_0_25px_rgba(0,149,255,0.15)] p-6 space-y-6 min-w-[300px]">
          <div className="space-y-2">
            <label htmlFor="city" className="flex items-center gap-2 text-sm font-medium text-blue-200">
              <MapPin className="h-4 w-4" />
              Città
            </label>
            <div className="relative">
              <select
                id="city"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full bg-blue-900/40 text-white border border-blue-500/40 rounded-xl px-4 py-3 text-sm 
                focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200
                appearance-none"
              >
                {cities
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((city) => (
                    <option key={city.name} value={city.name} className="bg-blue-900 text-white">
                      {city.name}
                    </option>
                  ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="highlight" className="flex items-center gap-2 text-sm font-medium text-blue-200">
              <Building className="h-4 w-4" />
              Evidenzia Per
            </label>
            <div className="relative">
              <select
                id="highlight"
                value={highlightOption}
                onChange={(e) => setHighlightOption(e.target.value)}
                className="w-full bg-blue-900/40 text-white border border-blue-500/40 rounded-xl px-4 py-3 text-sm 
                focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200
                appearance-none"
              >
                <option value="" className="bg-blue-900 text-white">
                  Segnalazioni aperte
                </option>
                <option value="MARKER" className="bg-blue-900 text-white">
                  Quadro
                </option>
                <option value="PROPRIETA" className="bg-blue-900 text-white">
                  Proprietà
                </option>
                <option value="LOTTO" className="bg-blue-900 text-white">
                  Lotto
                </option>
                <option value="TIPO_LAMPADA" className="bg-blue-900 text-white">
                  Tipo Lampada
                </option>
                <option value="TIPO_APPARECCHIO" className="bg-blue-900 text-white">
                  Tipo Apparecchio
                </option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="filter" className="flex items-center gap-2 text-sm font-medium text-blue-200">
              <Grid className="h-4 w-4" />
              Filtra Per
            </label>
            <div className="relative">
              <select
                id="filter"
                value={filterOption}
                onChange={(e) => setFilterOption(e.target.value)}
                className="w-full bg-blue-900/40 text-white border border-blue-500/40 rounded-xl px-4 py-3 text-sm 
                focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200
                appearance-none"
              >
                <option value="SELECT" className="bg-blue-900 text-white">
                  Nessun Filtro
                </option>
                <option value="REPORTED" className="bg-blue-900 text-white">
                  Segnalazioni Aperte
                </option>
                <option value="MARKER" className="bg-blue-900 text-white">
                  Quadro
                </option>
                <option value="PROPRIETA" className="bg-blue-900 text-white">
                  Proprietà
                </option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {/* Radio per Proprietà */}
            {filterOption === "PROPRIETA" && (
              <div className="flex flex-col gap-2 mt-2">
                <span className="text-sm font-medium text-blue-200 mb-1">Proprietà</span>
                <div className="flex gap-4">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="proprieta-filter"
                      value="Municipale"
                      checked={selectedProprietaFilter === "Municipale"}
                      onChange={() => setSelectedProprietaFilter("Municipale")}
                      className="form-radio text-blue-500 focus:ring-blue-500"
                    />
                    <span className="ml-1 text-blue-100">Municipale</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="proprieta-filter"
                      value="Enelsole"
                      checked={selectedProprietaFilter === "Enelsole"}
                      onChange={() => setSelectedProprietaFilter("Enelsole")}
                      className="form-radio text-blue-500 focus:ring-blue-500"
                    />
                    <span className="ml-1 text-blue-100">Enelsole</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapControls


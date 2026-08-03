/* eslint-disable react/prop-types */
"use client"

import { useState, useEffect, useRef } from "react"
import { Building2, Search, X, Loader2, Check } from "lucide-react"
import axios from "axios"

const BASE_URL = import.meta.env.VITE_SERVER_URL

export default function TownhallAutocomplete({
  value = "",
  onChange,
  error = "",
  disabled = false,
  placeholder = "Cerca un comune italiano..."
}) {
  const [searchTerm, setSearchTerm] = useState(value || "")
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const wrapperRef = useRef(null)

  // Sincronizza searchTerm con il valore dal parent se cambia dall'esterno
  useEffect(() => {
    if (value !== undefined && value !== searchTerm && !isOpen) {
      setSearchTerm(value)
    }
  }, [value, searchTerm, isOpen])

  // Chiudi dropdown al click esterno
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Helper per estrarre nome comune e sigla provincia da oggetto DB/GeoJSON o stringa
  const parseTownhall = (item) => {
    if (!item) return { name: "", sigla: "", fullName: "" }
    if (typeof item === "string") {
      return { name: item, sigla: "", fullName: item }
    }

    const props = item.properties || item
    const name = props.comune || props.name || props.denominazione || ""
    const sigla = props.sigla || props.den_uts || props.provincia || ""
    const fullName = sigla && sigla !== "-" ? `${name} (${sigla})` : name

    return { name, sigla, fullName, raw: item }
  }

  // Debounced API search fetch
  useEffect(() => {
    const trimmed = searchTerm.trim()
    if (!trimmed || trimmed.length < 2 || !isOpen) {
      setSuggestions([])
      setIsLoading(false)
      return
    }

    // Se il termine coincide esattamente con la selezione corrente, non cercare di nuovo
    if (value && searchTerm === value) {
      return
    }

    setIsLoading(true)
    const handler = setTimeout(async () => {
      try {
        // Chiamata all'endpoint del backend per la ricerca dei comuni per prefisso    
        const response = await axios.get(`${BASE_URL}/suggest-townhall-name/prefix`, {
          params: { prefix: trimmed }
        })

        const data = response?.data
        let results = []
        if (Array.isArray(data)) {
          results = data
        } else if (data && Array.isArray(data.features)) {
          results = data.features
        } else if (data && Array.isArray(data.results)) {
          results = data.results
        }

        const parsedList = results.map(parseTownhall).filter(item => item.name)
        setSuggestions(parsedList)
      } catch (err) {
        console.error("Errore durante la ricerca dei comuni dal backend:", err)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(handler)
  }, [searchTerm, isOpen, value])

  const handleSelect = (item) => {
    const { name } = typeof item === "string" ? parseTownhall(item) : item
    setSearchTerm(name)
    setIsOpen(false)
    setSuggestions([])
    if (onChange) {
      onChange(name, item)
    }
  }

  const handleClear = () => {
    setSearchTerm("")
    setSuggestions([])
    setIsOpen(false)
    if (onChange) {
      onChange("", null)
    }
  }

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelect(suggestions[selectedIndex])
      }
    } else if (e.key === "Escape") {
      setIsOpen(false)
    }
  }

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-400">
          <Building2 className="h-5 w-5" />
        </div>

        <input
          type="text"
          value={searchTerm}
          disabled={disabled}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setIsOpen(true)
            setSelectedIndex(-1)
            if (value && e.target.value !== value) {
              onChange("", null)
            }
          }}
          onFocus={() => {
            if (searchTerm.trim().length >= 2) {
              setIsOpen(true)
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`block w-full pl-10 pr-10 py-3 rounded-xl border ${
            error ? "border-red-500/50 focus:border-red-500/50" : "border-blue-500/30 focus:border-blue-500/50"
          } bg-blue-900/20 text-white placeholder-blue-300/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-expanded={isOpen}
          autoComplete="off"
        />

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
          ) : searchTerm ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="text-blue-400 hover:text-blue-200 transition-colors p-1 rounded-md"
              title="Cancella selezione"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <Search className="h-4 w-4 text-blue-400/60 pointer-events-none" />
          )}
        </div>
      </div>

      {/* Dropdown dei suggerimenti */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-2 w-full max-h-60 overflow-y-auto rounded-xl border border-blue-500/40 bg-slate-950/95 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] divide-y divide-blue-500/10 custom-scrollbar">
          {suggestions.map((item, index) => {
            const isSelected = item.name === value
            const isHighlighted = index === selectedIndex
            return (
              <li
                key={`${item.name}-${item.sigla}-${index}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`px-4 py-3 cursor-pointer flex items-center justify-between text-sm transition-colors ${
                  isHighlighted || isSelected
                    ? "bg-blue-600/30 text-white"
                    : "text-blue-100 hover:bg-blue-900/40"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{item.name}</span>
                  {item.sigla && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                      {item.sigla}
                    </span>
                  )}
                </div>
                {isSelected && <Check className="h-4 w-4 text-blue-400" />}
              </li>
            )
          })}
        </ul>
      )}

      {/* Stato nessun risultato trovato */}
      {isOpen && !isLoading && searchTerm.trim().length >= 2 && suggestions.length === 0 && (
        <div className="absolute z-50 mt-2 w-full p-4 rounded-xl border border-blue-500/30 bg-slate-950/95 backdrop-blur-xl shadow-xl text-center text-sm text-blue-200/70">
          Nessun comune trovato per &quot;<span className="text-white font-medium">{searchTerm}</span>&quot;
        </div>
      )}
    </div>
  )
}


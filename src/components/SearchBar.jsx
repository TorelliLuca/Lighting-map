import { useState, useRef, useEffect } from "react"
import { Search, X, Clock, Lightbulb, Map, PanelTop } from "lucide-react"

// Icone per i tipi di marker
const markerIcons = {
  NumeroPalo: <Lightbulb className="w-5 h-5 text-yellow-400" />, // Punto luce
  Quadro: <PanelTop className="w-5 h-5 text-blue-400" />, // Quadro elettrico
  Lotto: <Map className="w-5 h-5 text-green-400" />, // Lotto
}

const filterOptions = [
  { value: "NumeroPalo", label: "Numero Palo", icon: <Lightbulb className="w-4 h-4 mr-1 text-yellow-400" /> },
  { value: "Quadro", label: "Quadro", icon: <PanelTop className="w-4 h-4 mr-1 text-blue-400" /> },
  { value: "Lotto", label: "Lotto", icon: <Map className="w-4 h-4 mr-1 text-green-400" /> },
]

export default function SearchBar({
  searchQuery,
  setSearchQuery,
  searchFilter,
  setSearchFilter,
  suggestions = [],
  onSuggestionClick,
  onSubmit,
  onClear,
  history = [],
  onHistoryClick,
  onRemoveHistory,
  isLoading,
}) {
  const [inputFocused, setInputFocused] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Chiudi il dropdown se clicchi fuori
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showDropdown])

  // Gestione submit
  const handleSubmit = (e) => {
    e.preventDefault()
    if (onSubmit) onSubmit()
  }

  // Gestione clear
  const handleClear = () => {
    setSearchQuery("")
    if (onClear) onClear()
    inputRef.current?.focus()
  }

  // Mostra storico solo se barra vuota E input in focus
  const showHistory = inputFocused && !searchQuery.trim() && history.length > 0
  // Mostra suggerimenti se input in focus, query non vuota e ci sono suggerimenti
  const showSuggestionsDropdown = inputFocused && suggestions.length > 0
  // Mostra dropdown se storico o suggerimenti
  const showDropdownMenu = showHistory || showSuggestionsDropdown

  // Se la cronologia è in focus e la barra è vuota, ma ci sono meno di 5 elementi nella cronologia, mostra anche i suggerimenti classici (senza duplicati)
  let showCombined = false
  if (showHistory && history.length < 5 && suggestions.length > 0) {
    showCombined = true
  }

  // Filtra suggerimenti già presenti nella cronologia
  const filteredSuggestions = showCombined
    ? suggestions.filter(sugg => !history.some(h => h.label === (sugg.type === "NumeroPalo" ? `PL n° ${sugg.value}` : sugg.type === "Quadro" ? `Quadro ${sugg.value}` : `Lotto ${sugg.value}`)))
    : suggestions


  return (
    <div className="w-full max-w-md mx-auto sticky top-0 z-[9999]">
      <form
        onSubmit={handleSubmit}
        className="flex items-center bg-black/40 backdrop-blur-xl border border-blue-500/30 shadow-lg rounded-2xl px-2 py-1 relative transition-all duration-200"
      >
        {/* Icona ricerca */}
        <span className="pl-2 flex items-center">
          <Search className="w-5 h-5 text-blue-400" />
        </span>
        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Cerca..."
          className="flex-1 bg-transparent outline-none text-white placeholder-blue-300/70 px-3 py-2 text-base"
          onFocus={() => setInputFocused(true)}
          onBlur={() => setTimeout(() => setInputFocused(false), 150)}
        />
        {/* Select custom */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-900/40 border border-blue-500/20 text-blue-200 hover:bg-blue-900/60 transition-colors"
            onClick={() => setShowDropdown(v => !v)}
            tabIndex={0}
          >
            {filterOptions.find(opt => opt.value === searchFilter)?.icon}
            <span className="hidden sm:inline">{filterOptions.find(opt => opt.value === searchFilter)?.label}</span>
            <svg className="w-3 h-3 ml-1 text-blue-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-40 bg-black/95 backdrop-blur-xl border border-blue-500/30 rounded-xl shadow-lg z-50 animate-fade-in">
              {filterOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`flex items-center w-full px-3 py-2 text-blue-200 hover:bg-blue-900/40 transition-colors ${searchFilter === opt.value ? 'font-bold' : ''}`}
                  onClick={() => {
                    setSearchFilter(opt.value)
                    setShowDropdown(false)
                  }}
                >
                  {opt.icon}
                  <span className="ml-1">{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Clear button */}
        {searchQuery && (
          <button
            type="button"
            className="ml-2 p-1 rounded-full hover:bg-blue-900/40 transition-colors"
            onClick={handleClear}
            tabIndex={0}
            aria-label="Cancella"
          >
            <X className="w-5 h-5 text-blue-300" />
          </button>
        )}
        {/* Submit invisibile per invio con Enter */}
        <button type="submit" className="hidden">Cerca</button>
      </form>

      {/* Suggerimenti o storico */}
      {showDropdownMenu && (
        <div className="absolute left-0 right-0 mt-2 bg-black/95 backdrop-blur-xl border border-blue-500/30 rounded-xl shadow-lg z-50 animate-fade-in overflow-hidden">
          {showHistory ? (
            <div>
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center px-4 py-2 group hover:bg-blue-900/40 transition-colors cursor-pointer"
                  onClick={() => onHistoryClick(item)}
                >
                  <Clock className="w-4 h-4 text-blue-300 mr-2" />
                  <span className="flex-1 text-blue-200 truncate">{item.label}</span>
                  <button
                    className="ml-2 p-1 rounded hover:bg-red-900/30"
                    onClick={e => { e.stopPropagation(); onRemoveHistory(item); }}
                    tabIndex={0}
                    aria-label="Rimuovi dalla cronologia"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))}
              {/* Mostra suggerimenti classici se meno di 5 elementi in cronologia */}
              {showCombined && filteredSuggestions.length > 0 && (
                <>
                  <div className="border-t border-blue-500/20 my-1" />
                  {filteredSuggestions.map((sugg, idx) => (
                    <div
                      key={"sugg-" + idx}
                      className="flex items-center px-4 py-2 cursor-pointer hover:bg-blue-900/40 transition-colors group"
                      onClick={() => onSuggestionClick(sugg)}
                    >
                      <span className="mr-2">
                        {markerIcons[sugg.type] || <Map className="w-5 h-5 text-blue-300" />}
                      </span>
                      <span className="text-blue-200 font-medium">
                        {sugg.type === "NumeroPalo" && `PL n° ${sugg.value}`}
                        {sugg.type === "Quadro" && `Quadro ${sugg.value}`}
                        {sugg.type === "Lotto" && `Lotto ${sugg.value}`}
                      </span>
                      {sugg.address && (
                        <span className="ml-2 text-blue-300/70 text-sm truncate">{sugg.address}</span>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div>
              {filteredSuggestions.length > 0 ? filteredSuggestions.map((sugg, idx) => (
                <div
                  key={idx}
                  className="flex items-center px-4 py-2 cursor-pointer hover:bg-blue-900/40 transition-colors group"
                  onClick={() => onSuggestionClick(sugg)}
                >
                  {/* Icona tipo marker */}
                  <span className="mr-2">
                    {markerIcons[sugg.type] || <Map className="w-5 h-5 text-blue-300" />}
                  </span>
                  {/* Testo principale */}
                  <span className="text-blue-200 font-medium">
                    {sugg.type === "NumeroPalo" && `PL n° ${sugg.value}`}
                    {sugg.type === "Quadro" && `Quadro ${sugg.value}`}
                    {sugg.type === "Lotto" && `Lotto ${sugg.value}`}
                  </span>
                  {/* Testo secondario (indirizzo) */}
                  {sugg.address && (
                    <span className="ml-2 text-blue-300/70 text-sm truncate">{sugg.address}</span>
                  )}
                </div>
              )) : (
                <div className="px-4 py-2 text-blue-300/70 italic">Nessun risultato</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
} 
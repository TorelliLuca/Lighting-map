"use client"

import { useState, useContext, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { User, LogOut } from "lucide-react"
import { LightbulbLoader } from "./lightbulb-loader"
import Logo from "./Logo"
import { translateUserType } from "../utils/utils"
import SearchBar from "./SearchBar"

function Header({
  UserContext,
  searchQuery,
  setSearchQuery,
  searchFilter,
  setSearchFilter,
  handleSearch,
  handleSearchInputChange,
  navigateToNextMarker,
  navigateToPrevMarker,
  foundMarkers,
  showSuggestions,
  filteredSuggestions,
  currentMarkerIndex,
  setCurrentMarkerIndex,
  allMarkers,
}) {
  const [isLoading, setIsLoading] = useState(false)
  const markerIndex = currentMarkerIndex || 0
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)
  const [suggestionsWidth, setSuggestionsWidth] = useState(0)
  const [isSearchBarOpen, setIsSearchBarOpen] = useState(false)
  const searchInputRef = useRef(null)
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
  const [showBottomSheet, setShowBottomSheet] = useState(false)
  const [searchHistory, setSearchHistory] = useState([])

  // Update suggestions width based on input width
  useEffect(() => {
    if (inputRef.current) {
      setSuggestionsWidth(inputRef.current.offsetWidth)
    }
  }, [inputRef.current, searchFilter])



  // Get unique suggestions based on search filter
  const getUniqueSuggestions = () => {
    // Se la query è vuota, mostra tutti i marker
    const query = searchQuery.trim().toLowerCase()

    let suggestions = allMarkers && allMarkers.length > 0 ? [...allMarkers] : [...filteredSuggestions]
    // Se il filtro è NumeroPalo, mostra solo i marker con marker === 'PL'
    if (searchFilter === "NumeroPalo") {
      suggestions = suggestions.filter(marker => marker.data.marker === "PL")
    }
    // Filtra i marker in base al campo selezionato e alla query
    const filtered = !query
      ? suggestions
      : suggestions.filter(marker => {
          const value =
            searchFilter === "NumeroPalo"
              ? String(marker.data.numero_palo)
              : searchFilter === "Quadro"
                ? String(marker.data.quadro)
                : String(marker.data.lotto)
          return value && value.toLowerCase().includes(query)
        })

    // Rendi unici i suggerimenti in base al valore
    const uniqueValues = new Set()
    const uniqueSuggestions = []

    filtered.forEach((marker) => {
      const value =
        searchFilter === "NumeroPalo"
          ? marker.data.numero_palo
          : searchFilter === "Quadro"
            ? marker.data.quadro
            : marker.data.lotto

      if (!uniqueValues.has(value)) {
        uniqueValues.add(value)
        uniqueSuggestions.push(marker)
      }
    })

    // Limita a 5 suggerimenti
    return uniqueSuggestions.slice(0, 5)
  }

  // Adatta i suggerimenti al nuovo formato richiesto da SearchBar
  const mappedSuggestions = getUniqueSuggestions().map(marker =>{ 
    return({
    type: searchFilter,
    value:
      searchFilter === "NumeroPalo"
        ? marker.data.numero_palo
        : searchFilter === "Quadro"
          ? marker.data.quadro
          : marker.data.lotto,
    address: marker.data.indirizzo || "",
  })})

  // Funzione per aggiungere allo storico
  const addToHistory = (item) => {
    setSearchHistory((prev) => {
      if (prev.find(h => h.label === item.label)) return prev
      return [item, ...prev].slice(0, 5)
    })
  }

  // Funzione per gestire click su suggerimento
  const handleSuggestionClick = (sugg) => {
    setSearchQuery(sugg.value)
    setIsLoading(true)
    handleSearch(sugg.value)
    setIsLoading(false)
    addToHistory({ label: `${sugg.type === "NumeroPalo" ? "PL n° " : sugg.type === "Quadro" ? "Quadro " : "Lotto "}${sugg.value}`, value: sugg.value })
  }

  // Funzione per gestire click su storico
  const handleHistoryClick = (item) => {
    setSearchQuery(item.value)
    setIsLoading(true)
    handleSearch(item.value)
    setIsLoading(false)
  }

  // Funzione per rimuovere una voce dallo storico
  const handleRemoveHistory = (item) => {
    setSearchHistory((prev) => prev.filter(h => h.label !== item.label))
  }

  // Funzione submit
  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setIsLoading(true)
    handleSearch()
    setIsLoading(false)
  }

  const { userData, clearUserData, logout, fetchUserProfile } = useContext(UserContext)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    clearUserData()
    navigate("/", { replace: true })
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "/" && document.activeElement !== searchInputRef.current) {
        event.preventDefault()
        setIsSearchBarOpen(true)
        if (searchInputRef.current) {
          searchInputRef.current.focus()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (foundMarkers?.length > 0) {
      setIsBottomSheetOpen(true)
    } else {
      setIsBottomSheetOpen(false)
    }
  }, [foundMarkers?.length])

  // Add event listener to close bottom sheet when clicking on the map
  useEffect(() => {
    const handleMapClick = () => {
      setShowBottomSheet(false)
    }

    // Assuming the map container has an id or class you can target
    const mapElement = document.getElementById("map-container")
    if (mapElement) {
      mapElement.addEventListener("click", handleMapClick)
    }

    return () => {
      if (mapElement) {
        mapElement.removeEventListener("click", handleMapClick)
      }
    }
  }, [])

  return (
    <header className="top-0 bg-black/40 backdrop-blur-xl border-b border-blue-500/20 shadow-[0_0_15px_rgba(0,149,255,0.15)] p-4 relative z-[9999]">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center">
          <Logo className="flex items-center" />
        </div>

        {/* Nuova SearchBar */}
        <div className="flex-1 max-w-md relative">
          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchFilter={searchFilter}
            setSearchFilter={setSearchFilter}
            suggestions={mappedSuggestions}
            onSuggestionClick={handleSuggestionClick}
            onSubmit={handleSubmit}
            onClear={() => setSearchQuery("")}
            history={searchHistory}
            onHistoryClick={handleHistoryClick}
            onRemoveHistory={handleRemoveHistory}
            isLoading={isLoading}
          />
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-900/20 p-1.5 rounded-full border border-blue-500/30">
              <User className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">
                {userData?.name} {userData?.surname}
              </div>
              <div className="text-xs text-blue-300">
                {translateUserType(userData?.user_type) || "Utente"}
              </div>
            </div>
          </div>

          <button
            className="p-2 bg-red-900/20 hover:bg-red-800/30 text-red-400 rounded-lg border border-red-500/20 transition-colors duration-200"
            title="Logout"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header


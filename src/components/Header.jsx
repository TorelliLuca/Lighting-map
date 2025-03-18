"use client"

import { useState, useContext, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Search, User, LogOut } from "lucide-react"
import { LightbulbLoader } from "./lightbulb-loader"
import Logo from "./Logo"
import { translateUserType } from "../utils/utils"

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

  // Update suggestions width based on input width
  useEffect(() => {
    if (inputRef.current) {
      setSuggestionsWidth(inputRef.current.offsetWidth)
    }
  }, [inputRef.current, searchFilter])

  // Get unique suggestions based on search filter
  const getUniqueSuggestions = () => {
    const suggestions =
      !searchQuery.trim() && allMarkers && allMarkers.length > 0 ? [...allMarkers] : [...filteredSuggestions]

    // Create an object to track unique values
    const uniqueValues = new Set()
    const uniqueSuggestions = []

    suggestions.forEach((marker) => {
      const value =
        searchFilter === "NumeroPalo"
          ? marker.data.numero_palo
          : searchFilter === "Quadro"
            ? marker.data.quadro
            : marker.data.lotto

      // Only add this suggestion if we haven't seen this value before
      if (!uniqueValues.has(value)) {
        uniqueValues.add(value)
        uniqueSuggestions.push(marker)
      }
    })

    // Return exactly 5 unique suggestions
    return uniqueSuggestions.slice(0, 5)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsLoading(true)
    handleSearch()
    setIsLoading(false)

  }

  const handleSuggestionClick = (value) => {
    setIsLoading(true)
    handleSearch(value)
    setIsLoading(false)

  }

  const { userData, clearUserData, logout, fetchUserProfile } = useContext(UserContext)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    clearUserData()
    navigate("/", { replace: true })
  }

  const uniqueSuggestions = getUniqueSuggestions()
  const getTotalUniqueValues = () => {
    const source = !searchQuery.trim() ? allMarkers : filteredSuggestions
    if (!source) return 0

    const uniqueValues = new Set()
    source.forEach((marker) => {
      const value =
        searchFilter === "NumeroPalo"
          ? marker.data.numero_palo
          : searchFilter === "Quadro"
            ? marker.data.quadro
            : marker.data.lotto
      uniqueValues.add(value)
    })

    return uniqueValues.size
  }

  const totalUniqueValues = getTotalUniqueValues()

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

        <form onSubmit={handleSubmit} className="flex-1 max-w-md relative">
          <div className="flex">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-blue-400" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchInputChange}
                placeholder="Cerca..."
                className="block w-full pl-10 pr-3 py-2 rounded-l-lg border border-blue-500/30 
                bg-blue-900/20 text-white placeholder-blue-300/50 backdrop-blur-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                onFocus={() => setInputFocused(true)}
                onBlur={() => setTimeout(() => setInputFocused(false), 200)} // Delay to allow clicking on suggestions
              />
              {(showSuggestions || inputFocused) && (
                <div
                  ref={suggestionsRef}
                  className="fixed z-[9999] mt-1 bg-black/95 backdrop-blur-xl border border-blue-500/30 rounded-lg shadow-[0_0_15px_rgba(0,149,255,0.2)]"
                  style={{
                    width: `${suggestionsWidth}px`,
                  }}
                >
                  {uniqueSuggestions.length > 0 ? (
                    uniqueSuggestions.map((marker, index) => {
                      const value =
                        searchFilter === "NumeroPalo"
                          ? marker.data.numero_palo
                          : searchFilter === "Quadro"
                            ? marker.data.quadro
                            : marker.data.lotto

                      return (
                        <div
                          key={index}
                          onClick={() => {
                            handleSuggestionClick(value)
                          }}
                          className="px-4 py-2 hover:bg-blue-900/50 cursor-pointer text-blue-200 transition-colors duration-150"
                        >
                          {value}
                        </div>
                      )
                    })
                  ) : (
                    <div className="px-4 py-2 text-blue-300/70 italic">Nessun risultato</div>
                  )}
                  {/* Add hint if there are more unique results than shown */}
                  {totalUniqueValues > 5 && (
                    <div className="px-4 py-2 text-blue-300/50 text-xs italic text-center border-t border-blue-500/20">
                      {totalUniqueValues - 5} altri risultati disponibili
                    </div>
                  )}
                </div>
              )}
            </div>
            <select
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3 py-2 bg-blue-900/50 border-y border-blue-500/30 text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"            >
              <option value="NumeroPalo">Numero palo</option>
              <option value="Quadro">Quadro</option>
              <option value="Lotto">Lotto</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-r-lg border border-blue-500 transition-colors duration-200 flex items-center"
              disabled={isLoading}
            >
              {isLoading ? <LightbulbLoader /> : "Cerca"}
            </button>
          </div>
        </form>

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


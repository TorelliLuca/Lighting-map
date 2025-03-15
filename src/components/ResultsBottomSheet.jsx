"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, ChevronUp, AlertTriangle, X } from "lucide-react"

function ResultsBottomSheet({
  foundMarkers,
  currentMarkerIndex,
  setCurrentMarkerIndex,
  navigateToNextMarker,
  navigateToPrevMarker,
  searchFilter,
  map,
  infoWindowRef,
  onClose,
  cityChanged,
  filterOption,
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showSingleResultToast, setShowSingleResultToast] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const markerIndex = currentMarkerIndex || 0
  const bottomSheetRef = useRef(null)
  const toastTimeoutRef = useRef(null)

  // Handle city changes or other navigation events
  useEffect(() => {
    if (cityChanged) {
      handleClose()
    }
  }, [cityChanged, filterOption])

  // Function to handle closing the component
  const handleClose = () => {
    setIsVisible(false)
    // Call the parent component's onClose callback if provided
    if (typeof onClose === "function") {
      onClose()
    }
  }

  // Close bottom sheet when clicking on the map
  useEffect(() => {
    const handleMapClick = (e) => {
      // Check if the click is outside the bottom sheet
      if (bottomSheetRef.current && !bottomSheetRef.current.contains(e.target)) {
        setIsExpanded(false)
      }
    }

    // Assuming the map container has an id or class you can target
    document.addEventListener("click", handleMapClick)

    return () => {
      document.removeEventListener("click", handleMapClick)
    }
  }, [])

  // Auto-expand when new results are found
  useEffect(() => {
    if (foundMarkers.length > 0) {
      setIsVisible(true) // Show the component when markers are found

      // Show toast for single result
      if (foundMarkers.length === 1) {
        setShowSingleResultToast(true)

        // Clear any existing timeout
        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current)
        }

        // Hide the toast after 2 seconds
        toastTimeoutRef.current = setTimeout(() => {
          setShowSingleResultToast(false)
        }, 2000)
      } else {
        setIsExpanded(true)
        setShowSingleResultToast(false)
      }
    } else {
      // No markers found
      setIsVisible(false)
    }

    // Cleanup timeout on unmount
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [foundMarkers.length])

  // If no markers found or component is not visible, don't render anything
  if (foundMarkers.length === 0 || !isVisible) return null

  // For single result, show only toast message
  if (foundMarkers.length === 1 && !isExpanded) {
    return showSingleResultToast ? (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black/90 text-blue-300 px-4 py-2 rounded-lg border border-blue-500/30 shadow-[0_0_15px_rgba(0,149,255,0.2)] z-[19] backdrop-blur-xl">
        1 risultato trovato
      </div>
    ) : null
  }

  return (
    <div
      ref={bottomSheetRef}
      className={`fixed inset-x-0 bottom-0 z-[18] transition-all duration-300 ease-in-out ${
        isExpanded ? "translate-y-0" : "translate-y-[calc(100%-40px)]"
      }`}
      onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling to document
    >
      {/* The sheet content */}
      <div className="relative bg-black/90 backdrop-blur-xl border-t border-blue-500/30 shadow-[0_-5px_15px_rgba(0,149,255,0.15)] rounded-t-xl max-h-[50vh] overflow-hidden flex flex-col">
        {/* Handle for dragging - clicking this toggles the sheet */}
        <div
          className="flex justify-center p-2 cursor-pointer hover:bg-blue-900/20 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="w-10 h-1 bg-blue-500/30 rounded-full"></div>
          <div className="absolute right-4 top-6 flex items-center space-x-2">
            <span className="text-sm text-blue-300 font-medium">
              {foundMarkers.length > 1 ? `${markerIndex + 1} di ${foundMarkers.length}` : "1 result"}
            </span>
          </div>
          <div className="absolute left-4 top-0">
            <ChevronUp
              className={`h-5 w-5 text-blue-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
            />
          </div>

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation() // Prevent triggering the parent's onClick
              handleClose()
            }}
            className="absolute top-0 right-2 p-1 hover:bg-blue-900/30 rounded-full transition-colors"
            aria-label="Close results"
            title="Close results"
          >
            <X className="h-4 w-4 text-blue-400" />
          </button>
        </div>

        {/* Results navigation - only show for multiple results */}
        {foundMarkers.length > 1 && (
          <div className="flex items-center justify-center space-x-2 p-2 border-t border-blue-500/20">
            <button
              type="button"
              onClick={navigateToPrevMarker}
              className="p-1 bg-blue-900/30 hover:bg-blue-800/50 text-blue-400 rounded border border-blue-500/30 transition-colors duration-150"
              aria-label="Previous result"
              title="Previous result"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={navigateToNextMarker}
              className="p-1 bg-blue-900/30 hover:bg-blue-800/50 text-blue-400 rounded border border-blue-500/30 transition-colors duration-150"
              aria-label="Next result"
              title="Next result"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Results list */}
        <div
          className={`overflow-y-auto p-4 space-y-3 transition-opacity duration-300 ${isExpanded ? "opacity-100 max-h-[calc(50vh-80px)]" : "opacity-0 max-h-0"}`}
        >
          {foundMarkers.map((marker, index) => {
            const hasActiveReports = marker.data.segnalazioni_in_corso && marker.data.segnalazioni_in_corso.length > 0

            return (
              <div
                key={index}
                onClick={() => {
                  setCurrentMarkerIndex(index)
                  const marker = foundMarkers[index]
                  if (map) {
                    map.setCenter(
                      new window.google.maps.LatLng(
                        Number.parseFloat(marker.data.lat),
                        Number.parseFloat(marker.data.lng),
                      ),
                    )
                    if (marker.ref) {
                      if (!infoWindowRef.current) {
                        infoWindowRef.current = new window.google.maps.InfoWindow()
                      }
                      window.google.maps.event.trigger(marker.ref, "gmp-click")
                    }
                  }
                }}
                className={`p-3 rounded-lg border transition-colors duration-200 cursor-pointer ${
                  hasActiveReports
                    ? "bg-yellow-900/30 border-yellow-500/50 hover:bg-yellow-900/40"
                    : index === markerIndex
                      ? "bg-blue-900/40 border-blue-500/50 shadow-[0_0_10px_rgba(0,149,255,0.15)]"
                      : "bg-blue-900/10 border-blue-500/20 hover:bg-blue-900/20"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="text-white font-medium flex items-center gap-2">
                      {searchFilter === "NumeroPalo"
                        ? `ID: ${marker.data.numero_palo}`
                        : searchFilter === "Quadro"
                          ? `Quadro: ${marker.data.quadro}`
                          : `Lotto: ${marker.data.lotto}`}

                      {hasActiveReports && (
                        <AlertTriangle className="h-4 w-4 text-yellow-400" title="Segnalazioni attive" />
                      )}
                    </div>

                    {/* Display the additional information */}
                    <div className="text-blue-300 text-sm grid grid-cols-1 gap-1">
                      {marker.data.indirizzo && (
                        <div>
                          <strong>Indirizzo:</strong> {marker.data.indirizzo}
                        </div>
                      )}
                      {searchFilter !== "Lotto" && marker.data.lotto && (
                        <div>
                          <strong>Lotto:</strong> {marker.data.lotto}
                        </div>
                      )}
                      {searchFilter !== "Quadro" && marker.data.quadro && (
                        <div>
                          <strong>Quadro:</strong> {marker.data.quadro}
                        </div>
                      )}
                      {searchFilter !== "NumeroPalo" && marker.data.numero_palo && (
                        <div>
                          <strong>Numero palo:</strong> {marker.data.numero_palo}
                        </div>
                      )}
                      {marker.data.proprieta && (
                        <div>
                          <strong>Proprietà:</strong> {marker.data.proprieta}
                        </div>
                      )}
                      {marker.data.tipo_apparecchio && (
                        <div>
                          <strong>Tipo apparecchio: </strong>
                          {marker.data.tipo_apparecchio}
                        </div>
                      )}
                    </div>
                  </div>

                  {index === markerIndex && !hasActiveReports && (
                    <div className="h-2 w-2 mt-2 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(0,149,255,0.5)]"></div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ResultsBottomSheet


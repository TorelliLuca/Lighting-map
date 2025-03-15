"use client"

import { useState, useEffect, useContext, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { UserContext } from "../context/UserContext"
import Header from "../components/Header"
import MapControls from "../components/MapControls"
import InfoPanel from "../components/InfoPanel"
import MapButton from "../components/MapButton"
import { Info, Download, HelpCircle, LocateFixed } from "lucide-react"
import ResultsBottomSheet from "../components/ResultsBottomSheet"

import { translateString, transformDateToIT } from "../utils/utils"
import createMarkers from "../utils/createMarkers"

const BASE_URL = import.meta.env.VITE_SERVER_URL
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API

function Dashboard() {
  const { userData, loadSelectedTownhalls, downloadReport } = useContext(UserContext)
  const navigate = useNavigate()
  const mapRef = useRef(null)
  const infoWindowRef = useRef(null)
  const userLocationRef = useRef(null)
  const userLocationCircleRef = useRef(null)
  const [map, setMap] = useState(null)
  const [activeMarkers, setActiveMarkers] = useState([])
  const [selectedCity, setSelectedCity] = useState("")
  const [highlightOption, setHighlightOption] = useState("")
  const [filterOption, setFilterOption] = useState("SELECT")
  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const [showStreetView, setShowStreetView] = useState(false)
  const [jsonResponseForDownload, setJsonResponseForDownload] = useState(null)
  const [currentInfoWindow, setCurrentInfoWindow] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchFilter, setSearchFilter] = useState("NumeroPalo")
  const [foundMarkers, setFoundMarkers] = useState([])
  const [markerIndex, setMarkerIndex] = useState(0)
  const [suggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState([])
  const [currentMarkerIndex, setCurrentMarkerIndex] = useState(0)
  const [streetViewVisible, setStreetViewVisible] = useState(false)
  const mapContainerRef = useRef(null)

  useEffect(() => {
    if (!userData) {
      navigate("/")
      return
    }

    if (userData.town_halls_list && userData.town_halls_list.length > 0) {
      setSelectedCity(userData.town_halls_list[0].name)
    }
  }, [userData, navigate])

  // Effetto separato per l'inizializzazione della mappa (eseguito solo una volta)
  useEffect(() => {
    const scriptId = "google-maps-script"

    // Funzione di inizializzazione della mappa
    const initMap = () => {
      if (!mapRef.current) return

      const mapInstance = new window.google.maps.Map(mapRef.current, {
        zoom: 15,
        center: new window.google.maps.LatLng(0, 0),
        mapId: "3893e55ce832a481",
        streetViewControl: true, // Enable the Street View control
      })

      // Create the InfoWindow
      infoWindowRef.current = new window.google.maps.InfoWindow()

      // Add click listener to the map to close InfoWindow when clicking on the map
      mapInstance.addListener("click", () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.close()
          setCurrentInfoWindow(null)
        }
      })

      setMap(mapInstance)
      initializeStreetViewFunctionality(mapInstance)
    }

    // Callback globale che Google Maps chiamerà quando sarà caricato
    window.initGoogleMaps = () => {
      initMap()
    }

    // Verifica se Google Maps è già caricato
    if (window.google) {
      initMap()
      return
    }

    // Verifica se lo script è già nel DOM
    if (document.getElementById(scriptId)) {
      // Lo script è già stato aggiunto ma potrebbe non essere ancora caricato
      const checkGoogleInterval = setInterval(() => {
        if (window.google) {
          clearInterval(checkGoogleInterval)
          initMap()
        }
      }, 100)

      return () => clearInterval(checkGoogleInterval)
    }

    // Carica lo script se non è presente
    const script = document.createElement("script")
    script.id = scriptId
    // Correzione dei parametri: libraries unificato e aggiunta callback
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&v=beta&libraries=marker,places&callback=initGoogleMaps`
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    // Cleanup
    return () => {
      // Rimuovi la callback globale quando il componente viene smontato
      window.initGoogleMaps = null
    }
  }, [])

  useEffect(() => {
    if (map && selectedCity) {
      loadMapData()
    }
  }, [map, selectedCity])

  // Add this useEffect after the other useEffect hooks
  useEffect(() => {
    // Set CSS variables for component heights
    const headerElement = document.querySelector("header")
    const controlsElement = document.querySelector(".map-controls")

    if (headerElement) {
      const headerHeight = headerElement.offsetHeight
      document.documentElement.style.setProperty("--header-height", `${headerHeight}px`)
    }

    if (controlsElement) {
      const controlsHeight = controlsElement.offsetHeight
      document.documentElement.style.setProperty("--controls-height", `${controlsHeight}px`)
    }

    // Update on resize
    const handleResize = () => {
      if (headerElement) {
        document.documentElement.style.setProperty("--header-height", `${headerElement.offsetHeight}px`)
      }
      if (controlsElement) {
        document.documentElement.style.setProperty("--controls-height", `${controlsElement.offsetHeight}px`)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const loadMapData = async () => {
    try {
      if (!selectedCity) return

      // Clear previous markers first
      removeMarkers()

      const response = await loadSelectedTownhalls(selectedCity)
      const data = await response.data
      const markers = data.punti_luce.map((point) => ({
        ...point,
        lat: point.lat.replace(",", "."),
        lng: point.lng.replace(",", "."),
      }))

      setJsonResponseForDownload(createReportJSON(data))

      // Store all markers in state
      const allMarkers = await createMarkers(
        markers,
        selectedCity,
        map,
        highlightOption,
        currentInfoWindow,
        userData,
        infoWindowRef,
        setCurrentInfoWindow,
      )
      applyFilters(allMarkers)
      setActiveMarkers(allMarkers)

      if (markers.length > 0) {
        map.setCenter(
          new window.google.maps.LatLng(Number.parseFloat(markers[0].lat), Number.parseFloat(markers[0].lng)),
        )
      }

      startGeolocation()
    } catch (error) {
      console.error("Error loading map data:", error)
    }
  }

  const removeMarkers = () => {
    if (activeMarkers && activeMarkers.length > 0) {
      activeMarkers.forEach((marker) => {
        if (marker.ref) {
          marker.ref.setMap(null)
        }
      })
      setActiveMarkers([])
    }
  }

  const createReportJSON = (th) => {
    const jsonToSend = {
      segnalazioni_in_corso: [],
      segnalazioni_risolte: [],
      operazioni_effettuate: [],
    }

    th.punti_luce.forEach((pl) => {
      if (pl.segnalazioni_in_corso && pl.segnalazioni_in_corso.length > 0) {
        pl.segnalazioni_in_corso.forEach((report) => {
          const objToInsert = {
            COMUNE: selectedCity,
            NUMERO_PALO: pl.numero_palo,
            INDIRIZZO: pl.indirizzo,
            DATA_SEGNALAZIONE: transformDateToIT(report.report_date),
            TIPO_DI_SEGNALAZIONE: translateString(report.report_type),
            DESCRIZIONE: report.description,
          }
          jsonToSend.segnalazioni_in_corso.push(objToInsert)
        })
      }

      if (pl.segnalazioni_risolte && pl.segnalazioni_risolte.length > 0) {
        pl.segnalazioni_risolte.forEach((report) => {
          const objToInsert = {
            COMUNE: selectedCity,
            NUMERO_PALO: pl.numero_palo,
            INDIRIZZO: pl.indirizzo,
            DATA_SEGNALAZIONE: transformDateToIT(report.report_date),
            TIPO_DI_SEGNALAZIONE: translateString(report.report_type),
            DESCRIZIONE: report.description,
          }
          jsonToSend.segnalazioni_risolte.push(objToInsert)
        })
      }

      if (pl.operazioni_effettuate && pl.operazioni_effettuate.length > 0) {
        pl.operazioni_effettuate.forEach((operation) => {
          const objToInsert = {
            COMUNE: selectedCity,
            NUMERO_PALO: pl.numero_palo,
            INDIRIZZO: pl.indirizzo,
            DATA_OPERAZIONE: transformDateToIT(operation.operation_date),
            TIPO_DI_OPERAZIONE: translateString(operation.operation_type),
            DESCRIZIONE: operation.note,
            RESPONSABILE_OPERAZIONE: operation.operation_responsible
              ? operation.operation_responsible.name + "_" + operation.operation_responsible.surname
              : "",
          }
          jsonToSend.operazioni_effettuate.push(objToInsert)
        })
      }
    })

    return jsonToSend
  }

  const filterMarkers = (markers, filterType) => {
    switch (filterType) {
      case "REPORTED":
        return markers.filter((marker) => marker.data.segnalazioni_in_corso.length > 0)
      case "MARKER":
        return markers.filter((marker) => marker.data.marker === "QE")
      default:
        return markers
    }
  }

  const applyFilters = (markers) => {
    // Hide all markers first
    markers.forEach((marker) => marker.ref.setMap(null))

    // Apply filters
    let filteredMarkers = [...markers]
    if (filterOption !== "SELECT") {
      filteredMarkers = filterMarkers(markers, filterOption)
    }

    // Show filtered markers
    filteredMarkers.forEach((marker) => marker.ref.setMap(map))
  }

  const startGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }

          if (!userLocationRef.current) {
            // Create user location marker
            const userLocationElement = document.createElement("div")
            userLocationElement.className = "user-location"
            userLocationElement.innerHTML = '<div class="user-dot"></div>'

            userLocationRef.current = new window.google.maps.marker.AdvancedMarkerElement({
              position: pos,
              map: map,
              content: userLocationElement,
            })

            // Create accuracy circle
            userLocationCircleRef.current = new window.google.maps.Circle({
              map: map,
              radius: position.coords.accuracy,
              fillColor: "#4285F4",
              fillOpacity: 0.2,
              strokeColor: "#4285F4",
              strokeOpacity: 0.5,
              strokeWeight: 1,
            })
          } else {
            userLocationRef.current.position = pos
            userLocationCircleRef.current.setCenter(pos)
            userLocationCircleRef.current.setRadius(position.coords.accuracy)
          }

          // Show accuracy circle only if accuracy is good enough
          if (position.coords.accuracy < 15) {
            userLocationCircleRef.current.setMap(map)
          } else {
            userLocationCircleRef.current.setMap(null)
          }
        },
        (error) => {
          console.error("Geolocation error:", error)
        },
        {
          enableHighAccuracy: true,
        },
      )
    }
  }

  const initializeStreetViewFunctionality = (mapInstance) => {
    if (!mapInstance) {
      console.error("Map instance not provided to initializeStreetViewFunctionality")
      return
    }

    // Get the native Street View panorama from the map
    const panorama = mapInstance.getStreetView()

    // Configure the panorama with better defaults
    panorama.setOptions({
      enableCloseButton: true,
      visible: false,
      addressControl: true,
      fullscreenControl: true,
      zoomControl: true,
      panControl: true,
    })

    // Create Street View service to check for availability
    const streetViewService = new window.google.maps.StreetViewService()

    // Define the global toggle function
    window.toggleStreetView = (lat, lng) => {
      try {
        // Parse coordinates to ensure they're numbers
        const parsedLat = Number.parseFloat(lat)
        const parsedLng = Number.parseFloat(lng)

        if (isNaN(parsedLat) || isNaN(parsedLng)) {
          console.error("Invalid coordinates:", lat, lng)
          return
        }

        // Create the position
        const position = new window.google.maps.LatLng(parsedLat, parsedLng)

        // Check if Street View is available at this position
        streetViewService.getPanorama({ location: position, radius: 50 }, (data, status) => {
          if (status === window.google.maps.StreetViewStatus.OK) {
            // Street View is available, set position
            panorama.setPosition(position)

            // Set POV
            panorama.setPov({
              heading: 0,
              pitch: 0,
              zoom: 1,
            })

            // Show Street View
            panorama.setVisible(true)
            setStreetViewVisible(true)
          } else {
            console.error("Street View not available at this location")
            alert("Street View non disponibile in questa posizione")
          }
        })
      } catch (error) {
        console.error("Error in toggleStreetView:", error)
      }
    }

    // Define the global close function
    window.closeStreetView = () => {
      panorama.setVisible(false)
      setStreetViewVisible(false)
    }

    // Add listener for the Street View visibility changes
    panorama.addListener("visible_changed", () => {
      const isVisible = panorama.getVisible()
      setStreetViewVisible(isVisible)
    })
  }

  const handleDownloadReport = async () => {
    if (!jsonResponseForDownload) return

    try {
      const response = await downloadReport(jsonResponseForDownload)
      console.log(response)
      const blob = response.data

      if (blob && blob.size > 0) {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        const date = new Date()
        const dateTime = date.getDate() + "-" + (date.getMonth() + 1) + "-" + date.getFullYear()
        a.download = `${selectedCity}_report_segnalazioni_${dateTime}`
        document.body.appendChild(a)
        a.click()
        a.remove()
      } else {
        throw new Error("The Blob is undefined or empty")
      }
    } catch (error) {
      console.error("Error downloading report:", error)
    }
  }

  const handleSearch = (query) => {
    if (!searchQuery && !query) {
      alert("Please enter a search value")
      return
    }

    let queryToSend
    if (!query) {
      queryToSend = searchQuery
    } else {
      queryToSend = query
    }

    let results = []

    switch (searchFilter) {
      case "NumeroPalo":
        results = activeMarkers.filter(
          (m) => m.data.numero_palo && m.data.numero_palo.toLowerCase() === queryToSend.toLowerCase(),
        )
        break
      case "Quadro":
        results = activeMarkers.filter(
          (m) => m.data.quadro && m.data.quadro.toLowerCase() === queryToSend.toLowerCase(),
        )
        break
      case "Lotto":
        results = activeMarkers.filter((m) => m.data.lotto && m.data.lotto.toLowerCase() === queryToSend.toLowerCase())
        break
      default:
        break
    }

    if (results.length === 0) {
      alert("No results found")
      return
    }

    setFoundMarkers(results)
    setMarkerIndex(0)
    setCurrentMarkerIndex(0)

    // Center map on first result
    const firstResult = results[0]
    map.setZoom(18)
    map.setCenter(
      new window.google.maps.LatLng(Number.parseFloat(firstResult.data.lat), Number.parseFloat(firstResult.data.lng)),
    )

    setSearchQuery("")
    setShowSuggestions(false)
  }

  const handleSearchInputChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)

    if (!value) {
      setShowSuggestions(false)
      setFilteredSuggestions([])
      return
    }

    // Filter suggestions based on input
    let suggestions = []
    const lowerValue = value.toLowerCase()

    switch (searchFilter) {
      case "NumeroPalo":
        suggestions = activeMarkers.filter(
          (m) => m.data.numero_palo && m.data.numero_palo.toLowerCase().startsWith(lowerValue),
        )
        break
      case "Quadro":
        suggestions = activeMarkers.filter((m) => m.data.quadro && m.data.quadro.toLowerCase().startsWith(lowerValue))
        break
      case "Lotto":
        suggestions = activeMarkers.filter((m) => m.data.lotto && m.data.lotto.toLowerCase().startsWith(lowerValue))
        break
      default:
        break
    }

    // Remove duplicates
    const uniqueValues = new Set()
    const uniqueSuggestions = suggestions.filter((m) => {
      let value
      switch (searchFilter) {
        case "NumeroPalo":
          value = m.data.numero_palo
          break
        case "Quadro":
          value = m.data.quadro
          break
        case "Lotto":
          value = m.data.lotto
          break
        default:
          value = ""
      }

      if (value && !uniqueValues.has(value.toLowerCase())) {
        uniqueValues.add(value.toLowerCase())
        return true
      }
      return false
    })

    setFilteredSuggestions(uniqueSuggestions)
    setShowSuggestions(uniqueSuggestions.length > 0)
  }

  const handleSuggestionClick = () => {
    handleSearch()
  }

  const navigateToNextMarker = () => {
    if (foundMarkers.length <= 1) return

    const newIndex = (markerIndex + 1) % foundMarkers.length
    setMarkerIndex(newIndex)
    setCurrentMarkerIndex(newIndex)

    const marker = foundMarkers[newIndex]
    map.setCenter(new window.google.maps.LatLng(Number.parseFloat(marker.data.lat), Number.parseFloat(marker.data.lng)))
    // Highlight the marker by simulating a click
    if (marker.ref) {
      // Create a temporary InfoWindow if needed
      if (!infoWindowRef.current) {
        infoWindowRef.current = new window.google.maps.InfoWindow()
      }

      // Trigger the marker's click event
      window.google.maps.event.trigger(marker.ref, "gmp-click")
    }
  }

  const navigateToPrevMarker = () => {
    if (foundMarkers.length <= 1) return

    const newIndex = (markerIndex - 1 + foundMarkers.length) % foundMarkers.length
    setMarkerIndex(newIndex)
    setCurrentMarkerIndex(newIndex)

    const marker = foundMarkers[newIndex]
    map.setCenter(new window.google.maps.LatLng(Number.parseFloat(marker.data.lat), Number.parseFloat(marker.data.lng)))
    if (marker.ref) {
      // Create a temporary InfoWindow if needed
      if (!infoWindowRef.current) {
        infoWindowRef.current = new window.google.maps.InfoWindow()
      }

      // Trigger the marker's click event
      window.google.maps.event.trigger(marker.ref, "gmp-click")
    }
  }

  const goToUserLocation = () => {
    if (userLocationRef.current) {
      map.setCenter(userLocationRef.current.position)
      map.setZoom(18)
    }
  }

  window.navigateToLocation = (lat, lng) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
    window.open(url)
  }

  window.reportPoint = (city, numeroPalo, lat, lng, addr) => {
    navigate(
      `/report?comune=${encodeURIComponent(city)}&numeroPalo=${encodeURIComponent(numeroPalo)}&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&adr=${encodeURIComponent(addr)}`,
    )
  }

  window.startOperation = (city, numeroPalo, lat, lng) => {
    navigate(
      `/operation?comune=${encodeURIComponent(city)}&numeroPalo=${encodeURIComponent(numeroPalo)}&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
    )
  }

  useEffect(() => {
    if (activeMarkers.length > 0 && map) {
      // Remove existing markers
      removeMarkers()
      // Recreate markers with new highlighting
      createMarkers(
        activeMarkers.map((marker) => marker.data),
        selectedCity,
        map,
        highlightOption,
        currentInfoWindow,
        userData,
        infoWindowRef,
        setCurrentInfoWindow,
      ).then((newMarkers) => {
        setActiveMarkers(newMarkers)
        applyFilters(newMarkers)
      })
    }
  }, [filterOption, highlightOption])

  return (
    <div className="flex flex-col h-[100vh] max-h-[100vh] overflow-hidden bg-gradient-to-br from-black via-blue-950 to-black">
      <Header
        UserContext={UserContext}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchFilter={searchFilter}
        setSearchFilter={setSearchFilter}
        handleSearch={handleSearch}
        handleSearchInputChange={handleSearchInputChange}
        navigateToNextMarker={navigateToNextMarker}
        navigateToPrevMarker={navigateToPrevMarker}
        foundMarkers={foundMarkers}
        showSuggestions={suggestions}
        filteredSuggestions={filteredSuggestions}
        currentMarkerIndex={currentMarkerIndex}
        setCurrentMarkerIndex={setCurrentMarkerIndex}
        allMarkers={activeMarkers}
      />

      <div className="relative flex-grow" ref={mapContainerRef} id="map-container">
        {/* Main map container - always present */}
        <div
          ref={mapRef}
          className="w-full flex-grow"
          style={{
            position: "relative",
            zIndex: streetViewVisible ? 0 : 1,
            height: "calc(100vh - var(--header-height))",
          }}
        />

        {/* Map controls - only visible when Street View is not active */}
        {!streetViewVisible && (
          <>
            <div className="absolute top-22 left-4 z-10 flex flex-col gap-2">
              <MapButton icon={Info} onClick={() => setShowInfoPanel(true)} title="Mostra Pannello Informazioni" />
              <MapButton icon={Download} onClick={handleDownloadReport} title="Scarica Report" />
              <a
                href="https://www.torellistudio.com/studio/ufaq-category/utilizzo-lighting-map/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapButton icon={HelpCircle} title="Aiuto" />
              </a>
            </div>

            <div className="absolute top-1/4 right-4 z-10 flex flex-col gap-2">
              <MapButton icon={LocateFixed} onClick={goToUserLocation} title="Vai alla mia posizione" />
            </div>

            {showInfoPanel && <InfoPanel activeMarkers={activeMarkers} onClose={() => setShowInfoPanel(false)} />}
          </>
        )}
      </div>

      <MapControls
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        highlightOption={highlightOption}
        setHighlightOption={setHighlightOption}
        filterOption={filterOption}
        setFilterOption={setFilterOption}
        cities={userData?.town_halls_list || []}
        /*className="map-controls"*/
      />
      <ResultsBottomSheet
        foundMarkers={foundMarkers}
        currentMarkerIndex={currentMarkerIndex}
        setCurrentMarkerIndex={setCurrentMarkerIndex}
        navigateToNextMarker={navigateToNextMarker}
        navigateToPrevMarker={navigateToPrevMarker}
        searchFilter={searchFilter}
        map={map}
        infoWindowRef={infoWindowRef}
        cityChanged={selectedCity}
        highlightOption={highlightOption}
        filterOption={filterOption}
      />
      <style jsx="true">{`
        :root {
          --header-height: 4rem;
          --controls-height: 3rem;
        }

        /* Prevent body scrolling */
        body {
          overflow: hidden;
          position: fixed;
          width: 100%;
          height: 100%;
        }

        /* Make map take full available height */
        .gm-style {
          height: 100% !important;
        }

        /* Responsive adjustments */
        @media (max-width: 640px) {
          .map-controls {
            padding: 0.25rem;
          }
          
          /* Ensure buttons are easier to tap on mobile */
          .map-button {
            min-width: 40px;
            min-height: 40px;
          }
        }

        /* Ensure map container fills available space */
        #map-container {
          flex: 1;
          position: relative;
          min-height: 0;
        }

        .user-location {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-dot {
          width: 16px;
          height: 16px;
          background-color: #3b82f6;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }

        /* Google Maps InfoWindow styling */
        .gm-style .gm-style-iw-c {
          background-color: transparent !important;
          padding: 0 !important;
          border-radius: 12px !important;
          box-shadow: none !important;
        }

        .gm-style .gm-style-iw-d {
          overflow: hidden !important;
          padding: 0 !important;
        }

        .gm-style .gm-style-iw-t::after {
          display: none;
        }

        .gm-style-iw-tc {
          display: none !important;
        }
        
        /* Fix for Street View controls */
        .gm-style .gm-svpc {
          top: 60px !important;
        }
        
        /* Make sure Street View is above the header */
        .gm-style-pbc, 
        .gm-style-pbc + div {
          z-index: 10000 !important;
        }

        @media (max-width: 640px) {
          .gm-style {
            height: calc(100vh - 8rem) !important;
          }
          
          /* Make controls more compact on mobile */
          .map-controls {
            height: 3rem;
            padding: 0.25rem;
          }
        }
      `}</style>
    </div>
  )
}

export default Dashboard


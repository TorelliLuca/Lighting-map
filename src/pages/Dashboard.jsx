"use client"

import { useState, useEffect, useContext, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { UserContext } from "../context/UserContext"
import Header from "../components/Header"
import MapControls from "../components/MapControls"
import InfoPanel from "../components/InfoPanel"
import MapButton from "../components/MapButton"
import {  LocateFixed, Plus } from "lucide-react"
import ResultsBottomSheet from "../components/ResultsBottomSheet"
import { MapLoader } from "../components/MapLoader"
import EditLightPointModal from "../components/EditLightPointModal"
import AddLightPointModal from "../components/AddLightPointModal"

import LegendGlass from "../components/LegendGlass"
import SettingsMenu from "../components/SettingsMenu"
import AddMenu from "../components/AddMenu.jsx"; // Importa il nuovo componente
import MapLibreMap from "../components/MapLibreMap";
import ErrorBoundary from "../components/ErrorBoundary.jsx"

import { translateString, transformDateToIT } from "../utils/utils"
import { createMarkers, setupMarkerClustering, filterMarkers, cleanupMapResources, updateMarkerColors, currentClusterer } from "../utils/createMarkers.jsx"
import useFilteredMarkers from '../hooks/useFilteredMarkers';
import { generateLegendColorMap } from '../hooks/useFilteredMarkers'; // importa la funzione

import toast, { Toaster } from "react-hot-toast"

const BASE_URL = import.meta.env.VITE_SERVER_URL
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API

const STORAGE_KEY_PREFIX = "lighting-map-"
const STORAGE_KEYS = {
  SELECTED_CITY: `${STORAGE_KEY_PREFIX}selected-city`,
  HIGHLIGHT_OPTION: `${STORAGE_KEY_PREFIX}highlight-option`,
  FILTER_OPTION: `${STORAGE_KEY_PREFIX}filter-option`,
  MAP_CENTER: `${STORAGE_KEY_PREFIX}map-center`,
  MAP_ZOOM: `${STORAGE_KEY_PREFIX}map-zoom`,
}

function Dashboard() {
  const { userData, loadSelectedTownhalls, downloadReport, updateLightPoint, addLightPoint, deleteLightPoint, refreshToken, getTownhallGeojson, getTownhallLightpointsCount } = useContext(UserContext)
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
  // Add a new state for tracking map loading status
  const [isMapLoading, setIsMapLoading] = useState(true)
  // Add a new state to store all markers before filtering
  const [allMarkersData, setAllMarkersData] = useState([])
  // Add state to track the current city's data loading status
  const [cityDataLoaded, setCityDataLoaded] = useState(false)
  // Stato per la mappa colori della legenda
  const [legendColorMap, setLegendColorMap] = useState({ proprieta: {}, quadro: {}, lotto: {} })

  // Stati per la modalità di modifica
  const [editingMarker, setEditingMarker] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [editingMarkerId, setEditingMarkerId] = useState(null)
  const [originalData, setOriginalData] = useState(null)
  
  // Stati per l'aggiunta di nuovi elementi
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const [selectedProprietaFilter, setSelectedProprietaFilter] = useState("Municipale")
  
  // Ref per mantenere il valore corrente di editingMarker nei listener
  const editingMarkerRef = useRef(null)
  const originalDataRef = useRef(null)
  const isDraggingRef = useRef(false)
  const [highlightedMarkerId, setHighlightedMarkerId] = useState(null)

  // Stato per mostrare/nascondere il numero quadro sui marker
  const [showPanelNumber, setShowPanelNumber] = useState(true)
  // Stato per mostrare/nascondere il numero palo sui punti luce
  const [showStreetLampNumber, setShowStreetLampNumber] = useState(false)

  // Stato per la modalità di visualizzazione ("semplice" o "complessa")
  const [visualizationMode, setVisualizationMode] = useState("complessa")
  const [isComplexAllowed, setIsComplexAllowed] = useState(true)

  // Nuovo stato per markers semplici (modalità MapLibre)
  const [simpleMarkers, setSimpleMarkers] = useState([]);
  // Stato per il marker in editing (modalità semplice)
  const [editingSimpleMarker, setEditingSimpleMarker] = useState(null);
  const [isEditSimpleModalOpen, setIsEditSimpleModalOpen] = useState(false);
  const [originalSimpleData, setOriginalSimpleData] = useState(null);
  const [pendingReportParams, setPendingReportParams] = useState({});
  const [cleanupTrigger, setCleanupTrigger] = useState(0);
  const [shouldCleanupMap, setShouldCleanupMap] = useState(false);
  const mapLibreRef = useRef(null)
  const [selectedMarkerForInfo, setSelectedMarkerForInfo] = useState(null);
  const [electricPanels, setElectricPanels] = useState([]);

  // Carica i dati GeoJSON quando la modalità è semplice e cambia la città
  useEffect(() => {
    if (visualizationMode !== "semplice" || !selectedCity) {
      setSimpleMarkers([]);
      setActiveMarkers([]); // Svuota anche activeMarkers
      return;
    }
    setIsMapLoading(true);
    getTownhallGeojson(selectedCity)
      .then(res => {
        if (res?.data?.features) {
          // Trasforma i marker per simpleMarkers
          const simpleMarkers = res.data.features.map(f => ({
            ...f.properties,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            city: res.data.city 
          }));
          setSimpleMarkers(simpleMarkers);
          // Trasforma i marker per activeMarkers (formato richiesto)
          try{
            
          const activeMarkersFormat = simpleMarkers.map(m => {
            // Controllo robusto su lat/lng
            let lat = m.lat;
            let lng = m.lng;
            // Se sono stringhe numeriche, le converto in numero
            if (typeof lat === "string") lat = parseFloat(lat.replace(",", "."));
            if (typeof lng === "string") lng = parseFloat(lng.replace(",", "."));
            // Se non sono numeri validi, fallback a ""
            const latStr = (typeof lat === "number" && !isNaN(lat)) ? lat.toString() : "";
            const lngStr = (typeof lng === "number" && !isNaN(lng)) ? lng.toString() : "";

            return {
              data: {
                ...m,
                lat: latStr,
                lng: lngStr,
              },
              ref: ""
            };
          });
          setActiveMarkers(activeMarkersFormat);   
          setAllMarkersData(activeMarkersFormat);
          const panels = activeMarkersFormat
        .filter(marker => marker.data.marker === 'QE')
        .map(marker => marker.data.numero_palo)
        .filter(Boolean); // Rimuovi eventuali valori nulli o vuoti
      setElectricPanels([...new Set(panels)]); // Usa Set per valori unici
        }catch(e){setActiveMarkers([]);}
        } else {
          setSimpleMarkers([]);
          setActiveMarkers([]);
          setAllMarkersData([]);
          setElectricPanels([]);
        }
      })
      .catch(() => {
        setSimpleMarkers([]);
        setActiveMarkers([]);
        setAllMarkersData([]);
        setElectricPanels([]);
      })
      .finally(() => setIsMapLoading(false));
  }, [visualizationMode, selectedCity, getTownhallGeojson]);

  useEffect(()=>{
    const activeMarkersFormat = simpleMarkers.map(m => {
      // Controllo robusto su lat/lng
      let lat = m.lat;
      let lng = m.lng;
      // Se sono stringhe numeriche, le converto in numero
      if (typeof lat === "string") lat = parseFloat(lat.replace(",", "."));
      if (typeof lng === "string" ) lng = parseFloat(lng.replace(",", "."));
      // Se non sono numeri validi, fallback a ""
      const latStr = (typeof lat === "number" && !isNaN(lat)) ? lat.toString() : "";
      const lngStr = (typeof lng === "number" && !isNaN(lng)) ? lng.toString() : "";

      return {
        data: {
          ...m,
          lat: latStr,
          lng: lngStr,
        },
        ref: ""
      };
    });
    const panels = activeMarkersFormat
      .filter(marker => marker.data.marker === 'QE')
      .map(marker => marker.data.numero_palo)
      .filter(Boolean); // Rimuovi eventuali valori nulli o vuoti
    setElectricPanels([...new Set(panels)]);
  }, [simpleMarkers])




  // Applica i filtri lato client ai marker semplici (MapLibre)
  const { geojsonData: simpleGeojsonData, filteredMarkers } = useFilteredMarkers({
    markers: simpleMarkers,
    filterOption,
    selectedProprietaFilter,
    highlightOption,
  });


  // Aggiorna legendColorMap ogni volta che cambiano i marker filtrati o l'opzione di evidenziazione
  useEffect(() => {
    const colorMap = generateLegendColorMap(filteredMarkers, highlightOption);
    setLegendColorMap(colorMap);
  }, [filteredMarkers, highlightOption])


  useEffect(() => {
    if (visualizationMode === "semplice" && simpleGeojsonData && simpleGeojsonData.features) {
      const filteredMarkers = simpleGeojsonData.features.map(f => ({
        data: {
          ...f.properties,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0]
        },
        ref: ""
      }))
      setActiveMarkers(filteredMarkers)
    }
  }, [visualizationMode, simpleGeojsonData])

  // Add this function to save state to localStorage
  const saveStateToStorage = useCallback(() => {
    if (selectedCity) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_CITY, selectedCity)
    }
    localStorage.setItem(STORAGE_KEYS.HIGHLIGHT_OPTION, highlightOption)
    localStorage.setItem(STORAGE_KEYS.FILTER_OPTION, filterOption)
    localStorage.setItem("lighting-map-show-panel-number", JSON.stringify(showPanelNumber))
    localStorage.setItem("lighting-map-show-streetlamp-number", JSON.stringify(showStreetLampNumber))
    localStorage.setItem("lighting-map-visualization-mode", visualizationMode)
    // Save map position if available
    if (map) {
      const center = map.getCenter()
      if (center) {
        localStorage.setItem(STORAGE_KEYS.MAP_CENTER, JSON.stringify({ lat: center.lat(), lng: center.lng() }))
      }
      localStorage.setItem(STORAGE_KEYS.MAP_ZOOM, map.getZoom().toString())
    }
  }, [selectedCity, highlightOption, filterOption, map, showPanelNumber, showStreetLampNumber, visualizationMode])


  // Add this function to restore state from localStorage
  const restoreStateFromStorage = useCallback(() => {
    const storedCity = localStorage.getItem(STORAGE_KEYS.SELECTED_CITY)
    const storedHighlight = localStorage.getItem(STORAGE_KEYS.HIGHLIGHT_OPTION)
    const storedFilter = localStorage.getItem(STORAGE_KEYS.FILTER_OPTION)
    const storedShowPanelNumber = localStorage.getItem("lighting-map-show-panel-number")
    const storedShowStreetLampNumber = localStorage.getItem("lighting-map-show-streetlamp-number")
    const storedVisualizationMode = localStorage.getItem("lighting-map-visualization-mode")

    // Only restore city if it's in the user's allowed cities
    if (storedCity && userData?.town_halls_list?.some((city) => city.name === storedCity)) {
      setSelectedCity(storedCity)
    } else if (userData?.town_halls_list?.length > 0) {
      // Fall back to first city if stored city is not available
      setSelectedCity(userData.town_halls_list[0].name)
    }

    if (storedHighlight) {
      setHighlightOption(storedHighlight)
    }

    if (storedFilter) {
      setFilterOption(storedFilter)
    }
    if (storedShowPanelNumber !== null) {
      setShowPanelNumber(JSON.parse(storedShowPanelNumber))
    }
    if (storedShowStreetLampNumber !== null) {
      setShowStreetLampNumber(JSON.parse(storedShowStreetLampNumber))
    }
    if (storedVisualizationMode) {
      setVisualizationMode(storedVisualizationMode)
    }
  }, [userData])

  useEffect(() => {
    if (!userData) {
      navigate("/")
      return
    }

    if (userData.town_halls_list && userData.town_halls_list.length > 0) {
      setSelectedCity(userData.town_halls_list[0].name)
    }
  }, [userData, navigate])

  // Add a new useEffect to restore state when the component mounts
  // Add this after the useEffect that initializes userData
  useEffect(() => {
    if (userData) {
      restoreStateFromStorage()
    }
  }, [userData, restoreStateFromStorage])

  // Effetto separato per l'inizializzazione della mappa (eseguito solo una volta)
  useEffect(() => {
    if (visualizationMode !== "complessa") {
      setMap(null); // azzera lo stato mappa quando si esce dalla modalità complessa
      return;
    }

    const scriptId = "google-maps-script"

    // Funzione di inizializzazione della mappa
    const initMap = () => {
      if (!mapRef.current) return

      // Svuota il div prima di reinizializzare
      mapRef.current.innerHTML = "";

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
          setSelectedMarkerForInfo(null);
        }
      })

      // Aggiungo listener per l'evento di chiusura dell'infowindow (es. click sulla 'x')
      infoWindowRef.current.addListener('closeclick', () => {
        setCurrentInfoWindow(null);
        setSelectedMarkerForInfo(null);
      });

      setMap(mapInstance)

      // Add this to the initMap function in the useEffect that initializes the map
      // Inside the initMap function, after setMap(mapInstance), add:
      const storedCenter = localStorage.getItem(STORAGE_KEYS.MAP_CENTER)
      const storedZoom = localStorage.getItem(STORAGE_KEYS.MAP_ZOOM)

      if (storedCenter && storedZoom) {
        try {
          const center = JSON.parse(storedCenter)
          mapInstance.setCenter(new window.google.maps.LatLng(center.lat, center.lng))
          mapInstance.setZoom(Number.parseInt(storedZoom, 10))
        } catch (error) {
          console.error("Error restoring map position:", error)
        }
      }

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

    // Load MarkerClusterer script
    const markerClustererScript = document.createElement("script")
    markerClustererScript.src = "https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js"
    markerClustererScript.async = true
    document.head.appendChild(markerClustererScript)

    // Cleanup
    return () => {
      // Rimuovi la callback globale quando il componente viene smontato
      window.initGoogleMaps = null

      // Clean up all map resources
      cleanupMapResources()
      setMap(null) // azzera lo stato mappa quando il componente viene smontato
    }
  }, [visualizationMode])

  // Effect to load map data when map is ready and city is selected
  useEffect(() => {
    if (map && selectedCity) {
      // Reset city data loaded flag
      setCityDataLoaded(false)

      // Clean up previous data and load new data
      cleanupAndLoadMapData()
    }
  }, [map, selectedCity])

  // Ricrea i marker solo quando cambiano i dati base (città, caricamento dati)
  useEffect(() => {
    if (allMarkersData.length > 0 && map && cityDataLoaded) {
      
      // Applica solo i filtri, non ricreare i marker
      const filteredMarkers = filterMarkers(allMarkersData, filterOption, map, selectedProprietaFilter)
      setActiveMarkers(filteredMarkers)
    }
  }, [filterOption, highlightOption, cityDataLoaded, allMarkersData, map, selectedProprietaFilter])

  useEffect(() => {
    if (allMarkersData.length > 0) {
      updateMarkerColors(allMarkersData, highlightOption, editingMarkerId, showPanelNumber, showStreetLampNumber)
    }
  }, [highlightOption, editingMarkerId, allMarkersData, showPanelNumber, showStreetLampNumber])

  // Quando cambia showPanelNumber o showStreetLampNumber, forza il cleanup e il rerender dei marker
  useEffect(() => {
    if (map && selectedCity && cityDataLoaded) {
      cleanupMapResources();
      // Ricarica i marker con il nuovo stato showPanelNumber/showStreetLampNumber
      cleanupAndLoadMapData();
    }
  }, [showPanelNumber, showStreetLampNumber]);

  // Monitora i cambiamenti di editingMarker
  useEffect(() => {
    editingMarkerRef.current = editingMarker
  }, [editingMarker])

  // Monitora i cambiamenti di originalData
  useEffect(() => {
    originalDataRef.current = originalData
  }, [originalData])

  // Monitora i cambiamenti di isDragging
  useEffect(() => {
    isDraggingRef.current = isDragging
  }, [isDragging])

  // Gestisco il draggable e l'evidenziazione solo sul marker in editing
  useEffect(() => {
    if (!map || !allMarkersData.length) return;
    // Trova il marker in editing
    const markerObj = allMarkersData.find(m => m.data._id === editingMarkerId);
    // Rimuovi evidenziazione e draggable da tutti
    allMarkersData.forEach(m => {
      if (m.ref) {
        m.ref.gmpDraggable = false;
        if (m.ref.content?.classList) m.ref.content.classList.remove('editing-marker', 'editing-marker-glow');
      }
    });
    // Applica solo se editing attivo
    if (markerObj && markerObj.ref && editingMarkerId) {
      markerObj.ref.gmpDraggable = true;
      if (markerObj.ref.content?.classList) markerObj.ref.content.classList.add('editing-marker', 'editing-marker-glow');
    }
  }, [editingMarkerId, allMarkersData, map]);

  // Evidenziazione marker trovato tramite ricerca
  useEffect(() => {

    if (!allMarkersData.length) return;
    // Se c'è un marker in editing, non sovrascrivere la sua evidenziazione
    if (editingMarkerId) return;
    // Rimuovi la classe da tutti
    allMarkersData.forEach(m => {
      if (m.ref && m.ref.content?.classList) {
        m.ref.content.classList.remove('editing-marker', 'editing-marker-glow');
      }
    });
    // Applica la classe solo al marker selezionato dalla ricerca
    if (highlightedMarkerId) {
      const markerObj = allMarkersData.find(m => m.data._id === highlightedMarkerId);
      if (markerObj && markerObj.ref && markerObj.ref.content?.classList) {

        markerObj.ref.content.classList.add('editing-marker', 'editing-marker-glow');
      }
    }
  }, [highlightedMarkerId, allMarkersData, editingMarkerId]);

  // Quando chiudi la ricerca o cambi città, rimuovi evidenziazione
  useEffect(() => {
    if (foundMarkers.length === 0) {
      setHighlightedMarkerId(null);
    }
  }, [foundMarkers]);

  // Add another useEffect to set loading state to false when component unmounts
  useEffect(() => {
    return () => {
      setIsMapLoading(false)
      cleanupMapResources()
    }
  }, [])

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

  // Add a useEffect to save state when relevant state changes
  useEffect(() => {
    if (userData && selectedCity) {
      saveStateToStorage()
    }
  }, [selectedCity, highlightOption, filterOption, map, saveStateToStorage, userData])

  // Aggiorna la soglia ogni volta che cambia allMarkersData
  useEffect(() => {
    const MAX_MARKERS_COMPLEX = 1000;
    if (allMarkersData.length > MAX_MARKERS_COMPLEX) {
      setVisualizationMode("semplice")
      setIsComplexAllowed(false)
    } else {
      setIsComplexAllowed(true)
    }
  }, [allMarkersData])

  // Stato per la mappa città -> numero punti luce
  const [cityLightPointsMap, setCityLightPointsMap] = useState({});
  const [isLoadingCityLightPoints, setIsLoadingCityLightPoints] = useState(false);

  // Ogni volta che cambia selectedCity, aggiorna la mappa e lo stato
  useEffect(() => {
    async function fetchCityLightPoints() {
      if (!userData?.id || !selectedCity) return;
      setIsLoadingCityLightPoints(true);
      try {
        const res = await getTownhallLightpointsCount(); 
        setCityLightPointsMap(prev => ({ ...prev, [selectedCity]: res.data[selectedCity] }));
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingCityLightPoints(false);
      }
    }
    fetchCityLightPoints();
  }, [userData?._id, selectedCity]);

  // Aggiorna isComplexAllowed ogni volta che cambia la città o la mappa
  useEffect(() => {
    if (selectedCity && cityLightPointsMap[selectedCity] !== undefined) {
      setIsComplexAllowed(cityLightPointsMap[selectedCity] <= 2000);
      // Se la modalità attuale è complessa ma non permessa, forzo la semplice
      if (visualizationMode === "complessa" && cityLightPointsMap[selectedCity] > 2000) {
        setVisualizationMode("semplice");
      }
    }
  }, [selectedCity, cityLightPointsMap]);

  useEffect(() => {
    if (map && visualizationMode === "complessa") {
      const handleZoomChanged = () => {
        const zoom = map.getZoom();
        localStorage.setItem(STORAGE_KEYS.MAP_ZOOM, zoom.toString());
      };
      map.addListener("zoom_changed", handleZoomChanged);

      // Cleanup del listener quando il componente si smonta o la mappa cambia
      return () => {
        window.google.maps.event.clearListeners(map, "zoom_changed");
      };
    }else if (mapLibreRef.current && visualizationMode === "semplice") {
      let lastZoom = mapLibreRef.current.getZoom();
      const handleMoveEnd = () => {
        const zoom = mapLibreRef.current.getZoom();
        if (zoom !== lastZoom) {
          localStorage.setItem(STORAGE_KEYS.MAP_ZOOM, zoom.toString());
          lastZoom = zoom;
        }
      };
      mapLibreRef.current.on("moveend", handleMoveEnd);


      return () => {
        mapLibreRef.current.off("moveend", handleMoveEnd);
      };
    }
  }, [map,mapLibreRef, visualizationMode]);

  // Function to clean up previous data and load new data
  const cleanupAndLoadMapData = async () => {


    try {
      if (!selectedCity) return

      // Set loading state to true when starting to load data
      setIsMapLoading(true)

      // Clear previous markers and data
      cleanupPreviousData()

      const response = await loadSelectedTownhalls(selectedCity)
      
      const data = await response.data


      // Implement progressive loading for large datasets
      const processMarkers = async () => {
        // Process markers in smaller chunks to prevent UI freezing
        const chunkSize = 1000
        const allMarkers = []

        for (let i = 0; i < data.punti_luce.length; i += chunkSize) {
          // Process a chunk of markers
          const chunk = data.punti_luce.slice(i, i + chunkSize).map((point) => ({
            ...point,
            lat: point.lat.replace(",", "."),
            lng: point.lng.replace(",", "."),
          }))

          // Allow UI to update between chunks
          if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, 0))
          }

          allMarkers.push(...chunk)
        }

        return allMarkers
      }

      const markers = await processMarkers()

      
      // Store all markers in state e la mappa colori
      const { markers: allMarkers } = await setupMarkerClustering(
        markers,
        selectedCity,
        map,
        highlightOption,
        currentInfoWindow,
        userData,
        infoWindowRef,
        setCurrentInfoWindow,
        handleEditClick,
        editingMarkerId,
        handleMarkerDragEnd,
        handleDeleteMarker,
        showPanelNumber,
        showStreetLampNumber,
        setSelectedMarkerForInfo,
      )

      setAllMarkersData(allMarkers)
      // Then apply filters
      const filteredMarkers = filterMarkers(allMarkers, filterOption, map, selectedProprietaFilter)
      setActiveMarkers(filteredMarkers)

      const legendColorMap = generateLegendColorMap(filteredMarkers.map(m => m.data), highlightOption)
      setLegendColorMap(legendColorMap)

      // Estrai i quadri elettrici
      const panels = allMarkers
        .filter(marker => marker.data.marker === 'QE')
        .map(marker => marker.data.numero_palo)
        .filter(Boolean); // Rimuovi eventuali valori nulli o vuoti
      setElectricPanels([...new Set(panels)]); // Usa Set per valori unici

      if (markers.length > 0) {
        map.setCenter(
          new window.google.maps.LatLng(Number.parseFloat(markers[0].lat), Number.parseFloat(markers[0].lng)),
        )
      }

      startGeolocation()

      // Set city data loaded flag to true
      setCityDataLoaded(true)

      // Set loading state to false when data is loaded
      setIsMapLoading(false)
    } catch (error) {
      console.error("Error loading map data:", error)
      // Make sure to set loading to false even if there's an error
      setIsMapLoading(false)
      setCityDataLoaded(false)
    }
  }

  // Function to clean up previous data
  const cleanupPreviousData = () => {
    // Clear search results
    setFoundMarkers([])
    setMarkerIndex(0)
    setCurrentMarkerIndex(0)
    setSearchQuery("")
    setShowSuggestions(false)
    setFilteredSuggestions([])

    // Clear markers
    removeMarkers()

    // Clear all markers data
    setAllMarkersData([])

    // Close any open info windows
    if (infoWindowRef.current) {
      infoWindowRef.current.close()
    }
    setCurrentInfoWindow(null)

    // Clean up map resources
    cleanupMapResources()

    // Reset editing state
    setEditingMarker(null)
    setOriginalData(null)
    setEditingMarkerId(null)
    setIsEditModalOpen(false)
    setIsDragging(false)
    
    // Reset add modal state
    setIsAddModalOpen(false)
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

    if(!selectedCity) return

    const response = await loadSelectedTownhalls(selectedCity)
      
    const th = await response.data

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
            SEGNALATORE: report.user_creator_id
              ? report.user_creator_id.name + " " + report.user_creator_id.surname
              : "",
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
            SEGNALATORE: report.user_creator_id
              ? report.user_creator_id.name + " " + report.user_creator_id.surname
              : "",
            OPERATORE: report.user_responsible_id
              ? report.user_responsible_id.name + " " + report.user_responsible_id.surname
              : "",
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
              ? operation.operation_responsible.name + " " + operation.operation_responsible.surname
              : "",
          }
          jsonToSend.operazioni_effettuate.push(objToInsert)
        })
      }
    })

    if (!jsonToSend) return

    try {
      const response = await downloadReport(jsonToSend)
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

    let queryToSend = query || searchQuery

    let results = []

    if (visualizationMode === "semplice") {
      // Cerca tra le features del GeoJSON
      if (!simpleGeojsonData || !simpleGeojsonData.features) {
        alert("Nessun dato disponibile per la ricerca")
        return
      }
      switch (searchFilter) {
        case "NumeroPalo":
          results = simpleGeojsonData.features.filter(
            (f) => f.properties.numero_palo && String(f.properties.numero_palo).toLowerCase() === queryToSend.toLowerCase()
          )
          break
        case "Quadro":
          results = simpleGeojsonData.features.filter(
            (f) => f.properties.quadro && String(f.properties.quadro).toLowerCase() === queryToSend.toLowerCase()
          )
          break
        case "Lotto":
          results = simpleGeojsonData.features.filter(
            (f) => f.properties.lotto && String(f.properties.lotto).toLowerCase() === queryToSend.toLowerCase()
          )
          break
        default:
          break
      }

      if (results.length === 0) {
        alert("No results found")
        return
      }

      // Adatta i risultati al formato compatibile con ResultsBottomSheet
      const adaptedResults = results.map(f => ({
        data: {
          ...f.properties,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0]
        },
        ref: null,
        geometry: f.geometry
      }))

      setFoundMarkers(adaptedResults)
      setMarkerIndex(0)
      setCurrentMarkerIndex(0)
      // Centra la mappa su MapLibre
      const firstResult = results[0]
      if (mapLibreRef.current && mapLibreRef.current.flyTo && firstResult.geometry && firstResult.geometry.coordinates) {
        mapLibreRef.current.flyTo({
          center: [firstResult.geometry.coordinates[0], firstResult.geometry.coordinates[1]],
          zoom: 30
        })
      }
      setSearchQuery("")
      setShowSuggestions(false)
      return
    }else{

    // --- LOGICA ORIGINALE GOOGLE MAPS ---
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
    setHighlightedMarkerId(results[0].data._id) // Evidenzia il primo risultato

    // Center map on first result
    const firstResult = results[0]
    map.setZoom(18)
    map.setCenter(
      new window.google.maps.LatLng(Number.parseFloat(firstResult.data.lat), Number.parseFloat(firstResult.data.lng)),
    )
    window.google.maps.event.trigger(firstResult.ref, "gmp-click")
    setSearchQuery("")
    setShowSuggestions(false)
  }
  }

  const handleSearchInputChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)

    if (!value) {
      setShowSuggestions(false)
      setFilteredSuggestions([])
      return
    }

    let suggestions = []
    const lowerValue = value.toLowerCase()

    if (visualizationMode === "semplice") {
      // Modalità MapLibre: filtra su simpleGeojsonData.features
      if (!simpleGeojsonData || !simpleGeojsonData.features) {
        setFilteredSuggestions([])
        setShowSuggestions(false)
        return
      }
      switch (searchFilter) {
        case "NumeroPalo":
          suggestions = simpleGeojsonData.features.filter(
            (f) => f.properties.numero_palo && String(f.properties.numero_palo).toLowerCase().startsWith(lowerValue)
          )
          break
        case "Quadro":
          suggestions = simpleGeojsonData.features.filter(
            (f) => f.properties.quadro && String(f.properties.quadro).toLowerCase().startsWith(lowerValue)
          )
          break
        case "Lotto":
          suggestions = simpleGeojsonData.features.filter(
            (f) => f.properties.lotto && String(f.properties.lotto).toLowerCase().startsWith(lowerValue)
          )
          break
        default:
          break
      }
      // Remove duplicates
      const uniqueValues = new Set()
      const uniqueSuggestions = suggestions.filter((f) => {
        let value
        switch (searchFilter) {
          case "NumeroPalo":
            value = f.properties.numero_palo
            break
          case "Quadro":
            value = f.properties.quadro
            break
          case "Lotto":
            value = f.properties.lotto
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
      // Adatta i suggerimenti
      const adaptedSuggestions = uniqueSuggestions.map(f => ({
        data: {
          ...f.properties,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0]
        },
        ref: null,
        geometry: f.geometry
      }))
      setFilteredSuggestions(adaptedSuggestions)
      setShowSuggestions(adaptedSuggestions.length > 0)
      return
    }

    // Modalità Google Maps classica
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
    setHighlightedMarkerId(foundMarkers[newIndex].data._id) // Evidenzia il nuovo marker

    const marker = foundMarkers[newIndex]

    if (visualizationMode === "semplice") {
      // MapLibre
      if (mapLibreRef.current && mapLibreRef.current.flyTo && marker.data.lat && marker.data.lng) {
        mapLibreRef.current.flyTo({
          center: [parseFloat(marker.data.lng), parseFloat(marker.data.lat)],
          zoom: 30
        })
      }
    } else {
      // Google Maps
      map.setCenter(new window.google.maps.LatLng(Number.parseFloat(marker.data.lat), Number.parseFloat(marker.data.lng)))
      if (marker.ref) {
        if (!infoWindowRef.current) {
          infoWindowRef.current = new window.google.maps.InfoWindow()
        }
        window.google.maps.event.trigger(marker.ref, "gmp-click")
      }
    }
  }

  const navigateToPrevMarker = () => {
    if (foundMarkers.length <= 1) return

    const newIndex = (markerIndex - 1 + foundMarkers.length) % foundMarkers.length
    setMarkerIndex(newIndex)
    setCurrentMarkerIndex(newIndex)
    setHighlightedMarkerId(foundMarkers[newIndex].data._id) // Evidenzia il nuovo marker

    const marker = foundMarkers[newIndex]

    if (visualizationMode === "semplice") {
      // MapLibre
      if (mapLibreRef.current && mapLibreRef.current.flyTo && marker.data.lat && marker.data.lng) {
        mapLibreRef.current.flyTo({
          center: [parseFloat(marker.data.lng), parseFloat(marker.data.lat)],
          zoom: 30
        })
      }
    } else {
      // Google Maps
      map.setCenter(new window.google.maps.LatLng(Number.parseFloat(marker.data.lat), Number.parseFloat(marker.data.lng)))
      if (marker.ref) {
        if (!infoWindowRef.current) {
          infoWindowRef.current = new window.google.maps.InfoWindow()
        }
        window.google.maps.event.trigger(marker.ref, "gmp-click")
      }
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

  window.reportPoint = (city, id) => {
    navigate(
      `/report?comune=${encodeURIComponent(city)}&id=${encodeURIComponent(id)}}`,
    )
  }

  window.startOperation = (city, numeroPalo, lat, lng) => {
    navigate(
      `/operation?comune=${encodeURIComponent(city)}&numeroPalo=${encodeURIComponent(numeroPalo)}&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
    )
  }

  // Add this function to the Dashboard component to handle viewport changes
  const setupMapViewportListeners = () => {
    if (!map) return

    // Add listener for when the map becomes idle after panning/zooming
    map.addListener("idle", () => {
      // Only process if we have markers and we're not currently loading
      if (allMarkersData.length > 0 && !isMapLoading) {
        const bounds = map.getBounds()
        const zoom = map.getZoom()

        // At high zoom levels, ensure all markers in view are visible
        if (zoom >= 15) {
          // Get current viewport bounds
          if (bounds) {
            // Filter markers to only those in the current viewport
            const markersInView = allMarkersData.filter((marker) => {
              if (!marker.ref || !marker.ref.position) return false
              return bounds.contains(marker.ref.position)
            })

            // If we have a reasonable number of markers in view, ensure they're all visible
            if (markersInView.length > 0 && markersInView.length < 200) {
              // Make sure these markers are on the map
              markersInView.forEach((marker) => {
                if (marker.ref) {
                  marker.ref.map = map
                }
              })
            }
          }
        }
      }
    })
  }

  // Add this to the useEffect that initializes the map
  useEffect(() => {
    if (map) {
      setupMapViewportListeners()
    }
  }, [map])

  // Funzioni per la modalità di modifica
  const handleEditClick = (marker) => {
    if (userData?.user_type === "SUPER_ADMIN") {

      
      // Se c'è già un marker in modifica, chiedi conferma
      if (editingMarkerRef.current && editingMarkerRef.current._id !== marker._id) {
        if (hasChangesInCurrentMarker()) {
          const shouldSave = window.confirm('Ci sono modifiche non salvate. Vuoi salvare prima di modificare un altro punto?')
          if (shouldSave) {
            // Salva le modifiche correnti
            handleSaveCurrentMarker().then(() => {
              // Dopo il salvataggio, apri il nuovo marker
              openMarkerForEditing(marker)
            })
          } else {
            // Chiudi senza salvare e apri il nuovo marker
            handleCloseEditModal()
            setTimeout(() => {
              openMarkerForEditing(marker)
            }, 100)
          }
        } else {
          // Nessuna modifica, apri direttamente il nuovo marker
          openMarkerForEditing(marker)
        }
      } else {
        // Nessun marker in modifica, apri direttamente
        openMarkerForEditing(marker)
      }
    }
  }

  const openMarkerForEditing = (marker) => {
    setEditingMarker(marker)

    // Fai una deep copy per evitare che i riferimenti si influenzino
    const originalCopy = JSON.parse(JSON.stringify(marker))
    setOriginalData(originalCopy)
    setEditingMarkerId(marker._id)
    setIsEditModalOpen(true)
    setIsDragging(true)
    
    // Chiudi l'InfoWindow se aperto
    if (currentInfoWindow) {
      currentInfoWindow.close()
      setCurrentInfoWindow(null)
    }
  }

  const hasChangesInCurrentMarker = () => {
    
    if (!editingMarkerRef.current || !originalDataRef.current) {
      return false
    }
    
    const editingString = JSON.stringify(editingMarkerRef.current)
    const originalString = JSON.stringify(originalDataRef.current)
    const hasDataChanges = editingString !== originalString

    
    return hasDataChanges || isDraggingRef.current
  }

  const handleSaveCurrentMarker = async () => {
    if (!editingMarkerRef.current) return
    
    try {
      // Prepara i dati per l'invio al server
      const dataToSend = {
        ...editingMarkerRef.current
      }

      await updateLightPoint(dataToSend._id, dataToSend)
      // Aggiorna i dati locali
      setAllMarkersData(prevMarkers => 
        prevMarkers.map(marker => {
          if (marker.data._id === editingMarkerRef.current._id) {
            return {
              ...marker,
              data: editingMarkerRef.current
            }
          }
          return marker
        })
      )
      toast.success("Marker aggiornato con successo")
      return true
    } catch (error) {
      console.error('Errore durante il salvataggio del marker:', error)
      toast.error("Errore durante il salvataggio del marker")
      return false
    }
  }

  const handleMarkerDragEnd = (markerId, newLat, newLng, isLive = false) => {
    // Aggiorna la posizione del marker nei dati
    setAllMarkersData(prevMarkers => 
      prevMarkers.map(marker => {
        if (marker.data._id === markerId) {
          return {
            ...marker,
            data: {
              ...marker.data,
              lat: newLat.toString(),
              lng: newLng.toString()
            }
          }
        }
        return marker
      })
    )

    // Aggiorna anche il marker in editing
    if (editingMarker && editingMarker._id === markerId) {
      setEditingMarker(prev => ({
        ...prev,
        lat: newLat.toString(),
        lng: newLng.toString()
      }))
    }
  }

  const handlePositionChange = (lat, lng) => {
    if (editingMarkerId) {
      handleMarkerDragEnd(editingMarkerId, lat, lng)
    }
  }

  const handleSaveMarker = async (updatedMarker) => {
    try {
      // Prepara i dati per l'invio al server
      const dataToSend = {
        ...updatedMarker,
      }
      
      await updateLightPoint(dataToSend._id, dataToSend)

      setAllMarkersData(prevMarkers =>
        prevMarkers.map(marker => {
          if (marker.data._id === updatedMarker._id) {
            return {
              ...marker,
              data: updatedMarker
            }
          }
          return marker
        })
      )
      setIsEditModalOpen(false)
      setEditingMarker(null)
      setOriginalData(null)
      toast.success("Marker aggiornato con successo")

      // Non ricaricare tutti i dati, aggiorna solo il marker specifico
      await cleanupAndLoadMapData()
      // Dopo il cleanup, centra la mappa sul marker appena salvato
      if (map && updatedMarker.lat && updatedMarker.lng) {
        const latNum = parseFloat(updatedMarker.lat)
        const lngNum = parseFloat(updatedMarker.lng)
        if (!isNaN(latNum) && !isNaN(lngNum)) {
          map.setCenter(new window.google.maps.LatLng(latNum, lngNum))
          map.setZoom(localStorage.getItem(STORAGE_KEYS.MAP_ZOOM) || 18) // Usa lo zoom salvato o un valore di default
        }
      }
    } catch (error) {
      console.error('Errore durante il salvataggio del marker:', error)
      toast.error("Errore durante il salvataggio del marker")
    }
  }

  // Ripristina la posizione originale del marker sulla mappa e nello stato
  const restoreMarkerPosition = () => {
    if (!editingMarker || !originalData) return;
    setAllMarkersData(prevMarkers =>
      prevMarkers.map(marker => {
        if (marker.data._id === editingMarker._id) {
          // Aggiorna anche la posizione del marker sulla mappa
          if (marker.ref) {
            marker.ref.position = new window.google.maps.LatLng(originalData.lat, originalData.lng);
          }
          return {
            ...marker,
            data: {
              ...marker.data,
              lat: originalData.lat,
              lng: originalData.lng
            }
          }
        }
        return marker;
      })
    );
  };

  const handleCloseEditModal = () => {
    // Se ci sono modifiche non salvate sulla posizione, ripristina
    if (
      editingMarker && originalData &&
      (editingMarker.lat !== originalData.lat || editingMarker.lng !== originalData.lng)
    ) {
      restoreMarkerPosition();
    }
    setEditingMarker(null);
    setOriginalData(null);
    setEditingMarkerId(null);
    setIsEditModalOpen(false);
    setIsDragging(false);
  };

  const handleCenterMapOnMarker = (lat, lng) => {
    if (map) {
      const latNum = parseFloat(lat)
      const lngNum = parseFloat(lng)
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        map.setCenter(new window.google.maps.LatLng(latNum, lngNum))
        map.setZoom(18) // Zoom più vicino per facilitare il drag
      }
    }
  }

  const handleCenterMapOnCurrentMarker = () => {
    if (editingMarker && map) {
      const latNum = parseFloat(editingMarker.lat)
      const lngNum = parseFloat(editingMarker.lng)
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        map.setCenter(new window.google.maps.LatLng(latNum, lngNum))
        map.setZoom(18) // Zoom più vicino per facilitare il drag
      }
    }
  }

  // Funzioni per l'aggiunta di nuovi elementi
  const handleAddNewElement = () => {
    if (userData?.user_type === "SUPER_ADMIN") {
      setIsAddModalOpen(true)
    }
  }
  const handleDuplicateElement = async () => {
    if (userData?.user_type !== "SUPER_ADMIN") return;

    if (!selectedMarkerForInfo) {
      toast.error("Seleziona un punto luce o un quadro sulla mappa prima di duplicare.");
      return;
    }

    try {
      const originalData = selectedMarkerForInfo;
      const duplicatedData = JSON.parse(JSON.stringify(originalData));

      // Rimuovo l'ID e suggerisco un nuovo nome
      delete duplicatedData._id;
      delete duplicatedData.id;
      if (duplicatedData.numero_palo) {
        duplicatedData.numero_palo = `${originalData.numero_palo}_copia`;
      }

      // Sposto leggermente la posizione per evitare sovrapposizioni
      const offset = 0.0001; // Circa 10-11 metri
      let newLat, newLng
      if (visualizationMode === 'semplice') {
      newLat = originalData.lat + offset;
      newLng = originalData.lng + offset;
      }else{
        newLat = parseFloat(originalData.lat) + offset
        newLng = parseFloat(originalData.lng) + offset
      }
      duplicatedData.lat = newLat.toString();
      duplicatedData.lng = newLng.toString();
      
      const dataToSend = {
        light_point: duplicatedData,
        town_hall: selectedCity,
        return_object: true
      };

      const response = await addLightPoint(dataToSend);
      if (response.status === 201) {
        toast.success("Elemento duplicato con successo!");
        
        // La modalità semplice si affida all'aggiornamento dello stato simpleMarkers
        // e non richiede un ricaricamento completo come cleanupAndLoadMapData.
        if (visualizationMode === 'semplice') {
          // Aggiungiamo il nuovo marker allo stato
          setSimpleMarkers(prev => [...prev, response.data]);
        } else {
          await cleanupAndLoadMapData();
        }
        handleEditSimpleClick(response.data);
        // Centro la mappa sul nuovo punto
        if (visualizationMode === "complessa" && map) {

          const latLng = new window.google.maps.LatLng(newLat, newLng)
          map.setCenter(latLng);
          map.setZoom(localStorage.getItem(STORAGE_KEYS.MAP_ZOOM) || 20);
        } else if (visualizationMode === "semplice" && mapLibreRef.current) {
          mapLibreRef.current.flyTo({ center: [newLng, newLat], zoom: localStorage.getItem(STORAGE_KEYS.MAP_ZOOM) });
        }

      } else {
        toast.error(response.data || "Errore durante la duplicazione.");
      }
    } catch (error) {
      console.error('Errore durante la duplicazione:', error);
      toast.error(error.response?.data?.message || "Errore imprevisto durante la duplicazione.");
    }
  };

  const handleSaveNewElement = async (formData) => {
    if (visualizationMode === "semplice") {
      try {
        const dataToSend = {
          light_point: { ...formData },
          town_hall: selectedCity,
          return_object: true,
        };

        const response = await addLightPoint(dataToSend);
        
        if (response.status === 201) {
          toast.success("Elemento aggiunto con successo!");
          const newMarker = response.data;
          
          setSimpleMarkers(prev => [...prev, newMarker]);

          if (mapLibreRef.current && newMarker.lat && newMarker.lng) {
            const latNum = parseFloat(newMarker.lat);
            const lngNum = parseFloat(newMarker.lng);
            if (!isNaN(latNum) && !isNaN(lngNum)) {
              mapLibreRef.current.flyTo({ center: [lngNum, latNum], zoom: localStorage.getItem(STORAGE_KEYS.MAP_ZOOM) });
            }
          }
        } else {
            toast.error(response.data?.message || "Errore durante l'aggiunta dell'elemento");
        }
      } catch (error) {
        console.error("Errore durante l'aggiunta dell'elemento:", error);
        toast.error(error.response?.data?.message || "Errore durante l'aggiunta dell'elemento");
      }
    } else { // Modalità "complessa"
      try {
        const dataToSend = {
          light_point: {...formData},
          town_hall: selectedCity
        };
        
        const response = await addLightPoint(dataToSend);
        if (response.status === 201) {
          toast.success(response.data);
          
          await cleanupAndLoadMapData();

          if (map && formData.lat && formData.lng) {
            const latNum = parseFloat(formData.lat);
            const lngNum = parseFloat(formData.lng);
            if (!isNaN(latNum) && !isNaN(lngNum)) {
              map.setCenter(new window.google.maps.LatLng(latNum, lngNum));
              map.setZoom(localStorage.getItem(STORAGE_KEYS.MAP_ZOOM) || 18);
            }
          }
        }
      } catch (error) {
        console.error('Errore durante l\'aggiunta dell\'elemento:', error);
        toast.error('Errore durante l\'aggiunta dell\'elemento');
      }
    }
  }

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false)
  }

  // Funzione per gestire l'eliminazione di un marker
  const handleDeleteMarker = async (marker) => {
    // Mostra un popup di conferma
    const isConfirmed = window.confirm(
      `Sei sicuro di voler eliminare il ${marker.marker === "QE" ? "quadro elettrico" : "punto luce"} "${marker.numero_palo}"?\n\nQuesta azione non può essere annullata.`
    )

    if (!isConfirmed) {
      return
    }

    try {
      // Chiama l'API per eliminare il marker

      const response = await deleteLightPoint(marker._id)
      
      if (response.status === 200) {
        toast.success(response.data)
        
        // Rimuovi il marker dai dati locali
        setAllMarkersData(prevMarkers => {
          // Trova il marker da eliminare e rimuovilo dalla mappa
          const markerToRemove = prevMarkers.find(m => m.data._id === marker._id)
          if (markerToRemove && markerToRemove.ref) {
            markerToRemove.ref.setMap(null)
          }
          if (currentClusterer) {
            currentClusterer.removeMarker(markerToRemove.ref)
          }
          // Aggiorna lo stato rimuovendo il marker
          return prevMarkers.filter(m => m.data._id !== marker._id)
        })
        
        // Chiudi l'InfoWindow se aperto
        if (infoWindowRef.current) {
          infoWindowRef.current.close()
          setCurrentInfoWindow(null)
        }
        window.location.reload()
        // Ricarica i dati della mappa per aggiornare la visualizzazione
        //await cleanupAndLoadMapData()
      }else{
        toast.error(response.data)
      }
    } catch (error) {
      console.error('Errore durante l\'eliminazione del marker:', error)
      toast.error("Errore durante l'eliminazione dell'elemento")
    }
  }

  // Funzione per cambiare la modalità di visualizzazione
  const handleToggleVisualizationMode = () => {
    if (isComplexAllowed) {
      setVisualizationMode((prev) => (prev === "complessa" ? "semplice" : "complessa"));
    }
  };

  // Funzione per gestire l'edit in modalità semplice (MapLibre)
  const handleEditSimpleClick = (marker) => {
    setEditingSimpleMarker(marker);
    setOriginalSimpleData({ ...marker });
    setIsEditSimpleModalOpen(true);
  };

  // Funzione per gestire il salvataggio in modalità semplice (MapLibre)
  const handleSaveSimpleMarker = async (updatedMarker) => {
    try {
      // Chiamata API
      await updateLightPoint(updatedMarker._id, updatedMarker);
      // Aggiorna lo stato locale
      setSimpleMarkers(prevMarkers => prevMarkers.map(m => m._id === updatedMarker._id ? { ...updatedMarker } : m));
      setIsEditSimpleModalOpen(false);
      setEditingSimpleMarker(null);
      setOriginalSimpleData(null);
      toast.success("Marker aggiornato con successo");
    } catch (error) {
      console.error('Errore durante il salvataggio del marker:', error);
      toast.error("Errore durante il salvataggio del marker");
    }
  };

  // Funzione per gestire l'eliminazione in modalità semplice (MapLibre)
  const handleDeleteSimpleMarker = async (marker) => {
    const isConfirmed = window.confirm(
      `Sei sicuro di voler eliminare il ${marker.marker === "QE" ? "quadro elettrico" : "punto luce"} "${marker.numero_palo}"?\n\nQuesta azione non può essere annullata.`
    );
    if (!isConfirmed) return;
    try {
      await deleteLightPoint(marker._id);
      setSimpleMarkers(prevMarkers => prevMarkers.filter(m => m._id !== marker._id));
      toast.success("Elemento eliminato con successo");
      setIsEditSimpleModalOpen(false);
      setEditingSimpleMarker(null);
      setOriginalSimpleData(null);
    } catch (error) {
      console.error('Errore durante l\'eliminazione del marker:', error);
      toast.error("Errore durante l'eliminazione dell'elemento");
    }
  };

  // Funzione per aggiornare la posizione del marker durante il drag (MapLibre)
  const handleSimpleMarkerPositionChange = (markerId, newLat, newLng) => {
    setSimpleMarkers(prevMarkers => prevMarkers.map(m => m._id === markerId ? { ...m, lat: newLat, lng: newLng } : m));
    if (editingSimpleMarker && editingSimpleMarker._id === markerId) {
      setEditingSimpleMarker(prev => ({ ...prev, lat: newLat, lng: newLng }));
    }
  };

  // Funzione da passare a InfoWindow per triggerare il cleanup e la navigazione
  const handleBeforeReport = (params) => {
    setPendingReportParams(params);
    setCleanupTrigger(t => t + 1); // Cambia il trigger per attivare il cleanup
  };

  // Callback da passare a MapLibreMap: naviga solo dopo il cleanup
  const handleAfterCleanup = () => {
    if (pendingReportParams) {
      navigate(
        `/report?comune=${encodeURIComponent(pendingReportParams.city)}&id=${encodeURIComponent(pendingReportParams.id)}`
      );
      setPendingReportParams(null);
    }
  };


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

      {isMapLoading && <MapLoader />}

      <div className="relative flex-grow" ref={mapContainerRef} id="map-container">
        {/* Main map container - always present */}
        {visualizationMode === "semplice" ? (
          simpleGeojsonData  ? (
            <ErrorBoundary>
              <MapLibreMap
                ref={mapLibreRef}
                geojsonData={simpleGeojsonData}
                showStreetLampNumber={showStreetLampNumber}
                showPanelNumber={showPanelNumber}
                onEditClick={handleEditSimpleClick}
                onDeleteClick={handleDeleteSimpleMarker}
                editingMarkerId={editingSimpleMarker ? editingSimpleMarker._id : null}
                onMarkerPositionChange={handleSimpleMarkerPositionChange}
                selectedCity={selectedCity}
                onBeforeReport={handleBeforeReport}
                onBeforeReportCleanupTrigger={cleanupTrigger}
                onAfterCleanup={handleAfterCleanup}
                onMarkerSelect={setSelectedMarkerForInfo}
              />
            </ErrorBoundary>
          ) : <MapLoader />
        ) : (
          <div
            key={visualizationMode}
            ref={mapRef}
            className="w-full flex-grow"
            style={{
              position: "relative",
              zIndex: streetViewVisible ? 0 : 1,
              height: "calc(100vh - var(--header-height))",
            }}
          />
        )}
        {/* Legenda glass in alto a destra */}
        <div className="fixed left-6 bottom-60 z-3">
          <LegendGlass highlightOption={highlightOption} activeMarkers={activeMarkers} legendColorMap={legendColorMap} />
        </div>
        {/* Map controls - only visible when Street View is not active */}
        {!streetViewVisible && visualizationMode ==="complessa" && (
          <>
            {/* Pulsanti principali spostati nel menu impostazioni */}
            <div className="absolute top-1/4 right-4 z-10 flex flex-col gap-2">
              <MapButton icon={LocateFixed} onClick={goToUserLocation} title="Vai alla mia posizione" />
            </div>
            
          </>
        )}
        {showInfoPanel && <InfoPanel activeMarkers={allMarkersData} onClose={() => setShowInfoPanel(false)} townhallName={selectedCity} />}
        <Toaster position="top-right" />
      </div>

      <MapControls
        selectedCity={selectedCity}
        setSelectedCity={(city) => {
          setSelectedCity(city)
          // Don't need to call saveStateToStorage here as it will be triggered by the useEffect
        }}
        highlightOption={highlightOption}
        setHighlightOption={(option) => {
          setHighlightOption(option)
          // Don't need to call saveStateToStorage here as it will be triggered by the useEffect
        }}
        filterOption={filterOption}
        setFilterOption={(option) => {
          setFilterOption(option)
          // Don't need to call saveStateToStorage here as it will be triggered by the useEffect
        }}
        cities={userData?.town_halls_list || []}
        selectedProprietaFilter={selectedProprietaFilter}
        setSelectedProprietaFilter={setSelectedProprietaFilter}
      />
      {/* FAB per aggiunta punto, solo per SUPER_ADMIN */}
      {userData?.user_type === "SUPER_ADMIN" && (
        <AddMenu
          onAddPoint={handleAddNewElement}
          onDuplicatePoint={handleDuplicateElement}
        />
      )}
      <SettingsMenu
        showPanelNumber={showPanelNumber}
        onTogglePanelNumber={() => setShowPanelNumber((prev) => !prev)}
        showStreetLampNumber={showStreetLampNumber}
        onToggleStreetLampNumber={() => setShowStreetLampNumber((prev) => !prev)}
        onShowStats={() => setShowInfoPanel(true)}
        onDownloadReport={handleDownloadReport}
        onAddPoint={handleAddNewElement}
        onShowFaq={() => window.open("https://www.torellistudio.com/studio/ufaq-category/utilizzo-lighting-map/", "_blank")}
        onShowIlluminazionePubblica={() => window.open("https://www.torellistudio.com/studio/category/illuminazione-pubblica/", "_blank")}
        isSuperAdmin={userData?.role === "superadmin"}
        visualizationMode={visualizationMode}
        onToggleVisualizationMode={handleToggleVisualizationMode}
        isComplexAllowed={isComplexAllowed}
        isLoadingCityLightPoints={isLoadingCityLightPoints}
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
        visualizationMode={visualizationMode}
        mapLibreRef={mapLibreRef}
      />
      <EditLightPointModal
        isOpen={isEditModalOpen}
        marker={editingMarker}
        onClose={handleCloseEditModal}
        onSave={handleSaveMarker}
        map={map}
        allMarkersData={allMarkersData}
        electricPanels={electricPanels}
      />
      <AddLightPointModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSave={handleSaveNewElement}
        map={visualizationMode === "complessa" ? map : mapLibreRef.current}
        selectedCity={selectedCity}
        userData={userData}
        visualizationMode={visualizationMode}
        electricPanels={electricPanels}
      />
      <EditLightPointModal
        isOpen={isEditSimpleModalOpen}
        marker={editingSimpleMarker}
        onClose={() => {
          setIsEditSimpleModalOpen(false);
          setEditingSimpleMarker(null);
          setOriginalSimpleData(null);
        }}
        onSave={handleSaveSimpleMarker}
        map={null} // non serve per MapLibre
        allMarkersData={simpleMarkers}
        electricPanels={electricPanels}
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

        /* Google Maps InfoWindow styling improvements */
        .gm-style .gm-style-iw-c {
          background-color: transparent !important;
          padding: 0 !important;
          border-radius: 12px !important;
          box-shadow: none !important;
          max-width: 90vw !important; /* Limit width on mobile */
        }

        .gm-style .gm-style-iw-d {
          overflow: hidden !important;
          padding: 0 !important;
          max-width: 90vw !important; /* Limit width on mobile */
        }

        /* Responsive adjustments for InfoWindow */
        @media (max-width: 640px) {
          .gm-style .gm-style-iw-c {
            max-width: 85vw !important;
          }
          
          .gm-style .gm-style-iw-d {
            max-width: 85vw !important;
          }
        }

        /* Ensure InfoWindow content is readable */
        .gm-style .gm-style-iw-c .content-container {
          font-size: 14px;
        }

        @media (max-width: 480px) {
          .gm-style .gm-style-iw-c .content-container {
            font-size: 13px;
          }
        }

        /* Additional InfoWindow styling improvements */
        .gm-style .gm-style-iw-c {
          min-width: 300px !important;
        }
        
        .gm-style .gm-style-iw-d {
          min-width: 300px !important;
        }
        
        /* Reduce line height in InfoWindow */
        .gm-style .gm-style-iw-c .content-container {
          line-height: 1.3;
        }
        
        /* Ensure buttons at bottom are properly sized */
        .gm-style .gm-style-iw-c .content-container + div {
          padding: 8px;
        }
        
        /* Adjust spacing for mobile */
        @media (max-width: 480px) {
          .gm-style .gm-style-iw-c {
            min-width: 280px !important;
          }
          
          .gm-style .gm-style-iw-c .content-container {
            line-height: 1.2;
            font-size: 12px;
          }
        }
        .editing-marker {
          filter: drop-shadow(0 0 32px #000000) brightness(1.3) contrast(1.2) !important;
          border: none !important;
          border-radius: 50% !important;
          box-shadow: 0 0 32px 8px #000000 !important;
          z-index: 2000 !important;
          transition: filter 0.2s, box-shadow 0.2s;
        }

        .editing-marker-glow {
          animation: editing-marker-glow 1s infinite alternate !important;
        }

        @keyframes editing-marker-glow {
          0% {
            box-shadow: 0 0 32px 8px #000000;
            filter: brightness(1.3) contrast(1.2) drop-shadow(0 0 32px #000000);
          }
          100% {
            box-shadow: 0 0 48px 16px #000000;
            filter: brightness(1.5) contrast(1.4) drop-shadow(0 0 48px #000000);
          }
        }
      `}</style>
    </div>
  )
}

export default Dashboard
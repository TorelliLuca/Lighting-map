import { createRoot } from "react-dom/client"
import { MarkerClusterer, GridAlgorithm } from "@googlemaps/markerclusterer"
import { IoPin } from "rocketicons/io5"
import { colorsBackground, DEFAULT_COLOR } from "../utils/ColorGenerator"
import InfoWindow from "../components/InfoWindow"
import { MdReportProblem } from "rocketicons/md"
import { PlugIcon as HousePlug } from "lucide-react"
import { isOlderThan } from "./utils"

// Global variable to store the clusterer instance
let currentClusterer = null
// Global variable to store event listeners for cleanup
let mapEventListeners = []
// Global variable to store the last created markers (per cleanup dei React root)
let lastCreatedMarkers = []

// Custom Electric Panel component with notification status indicator
const ElectricPanelMarker = ({ color, hasActiveNotifications, isOutOfLaw }) => {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ width: "55px", height: "65px", filter: "drop-shadow(0px 0px 1px white)" }}
    >
      {/* Main lamp icon */}
      <HousePlug color={color} style={{ minWidth: "35px", minHeight: "35px" }} />

      {/* Notification indicator */}
      {hasActiveNotifications && !isOutOfLaw ? (
        <MdReportProblem
          size={10}
          color="#FFBF00"
          style={{
            position: "absolute",
            bottom: "40px",
            left: "35px",
            minWidth: "10px",
            minHeight: "10px",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ) : hasActiveNotifications && isOutOfLaw ? (
        <MdReportProblem
          size={10}
          color="#FF4545"
          style={{
            position: "absolute",
            bottom: "40px",
            left: "35px",
            minWidth: "10px",
            minHeight: "10px",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ) : (
        <></>
      )}
    </div>
  )
}

const StreetLampMarker = ({ color, hasActiveNotifications, isOutOfLaw }) => {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        width: "45px",
        height: "55px",
        filter: "drop-shadow(0px 0px 1px white)",
        display: "inline-flex",
      }}
    >
      {/* Main lamp icon */}
      <IoPin size={24} color={color} style={{ minWidth: "30px", minHeight: "30px" }} />

      {/* Notification indicator */}
      {hasActiveNotifications && !isOutOfLaw ? (
        <MdReportProblem
          size={10}
          color="#FFBF00"
          style={{
            position: "absolute",
            top: "20px",
            right: "10px",
            left: "10px",
            minWidth: "10px",
            minHeight: "10px",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ) : hasActiveNotifications && isOutOfLaw ? (
        <MdReportProblem
          size={10}
          color="#FF4545"
          style={{
            position: "absolute",
            top: "20px",
            right: "10px",
            left: "10px",
            minWidth: "10px",
            minHeight: "10px",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ) : (
        <></>
      )}
    </div>
  )
}

// Custom cluster renderer
const createCustomClusterRenderer = () => {
  return {
    render: ({ count, position }) => {
      const div = document.createElement("div")
      div.className = "flex items-center justify-center rounded-full bg-blue-500 text-white font-bold shadow-lg"
      div.style.width = `${Math.min(60, Math.max(40, 40 + Math.log10(count) * 10))}px`
      div.style.height = `${Math.min(60, Math.max(40, 40 + Math.log10(count) * 10))}px`
      div.style.padding = "8px"
      div.style.cursor = "pointer"
      div.style.transition = "all 0.3s ease"
      div.style.border = "2px solid white"
      div.innerHTML = `<div>${count}</div>`

      // Create a basic Google Maps marker
      return new window.google.maps.marker.AdvancedMarkerElement({
        position,
        content: div,
      })
    },
  }
}

// Clean up all map resources
const cleanupMapResources = () => {
  // Clean up clusterer
  if (currentClusterer && currentClusterer.map) {
    if (currentClusterer.markers.length > 0) {
      try{
        currentClusterer.clearMarkers()
      } catch (error) {
        console.error("Error clearing clusterer markers:", error)
      }
    }
    currentClusterer = null
  }

  // Clean up event listeners
  if (mapEventListeners.length > 0) {
    mapEventListeners.forEach((listener) => {
      if (listener && typeof listener === "object" && listener.remove) {
        listener.remove()
      } else if (typeof window.google !== "undefined" && window.google.maps && window.google.maps.event) {
        window.google.maps.event.removeListener(listener)
      }
    })
    mapEventListeners = []
  }

  // // Clean up React roots dei marker (safe)
  // if (lastCreatedMarkers && lastCreatedMarkers.length > 0) {
  //   lastCreatedMarkers.forEach(({ reactRoot }) => {
  //     // Safe: controlla che il root sia valido e abbia il metodo unmount
  //     if (reactRoot && typeof reactRoot.unmount === 'function') {
  //       try {
  //         console.log("provo a smontare")
  //         reactRoot.unmount()
  //       } catch (e) {
  //         console.error("Error unmounting React root:", e)
  //         // Ignora errori se già smontato
  //       }
  //     }
  //   })
  //   lastCreatedMarkers = []
  // }
}

const createMarkers = async (
  markers,
  city,
  map,
  highlightOption,
  currentInfoWindow,
  userData,
  infoWindowRef,
  setCurrentInfoWindow,
  onEditClick,
  editingMarkerId,
  onMarkerDragEnd,
) => {
  if (!window.google || !map) return []

  // Create a mapping of unique values to colors for consistent coloring
  const colorMappings = {
    quadro: {},
    proprieta: {},
    lotto: {},
  }
  const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker")
  
  let NcolorToUse = colorsBackground.length - 1
  const newMarkers = []

  // Create info window container and React root once
  const infoWindowContainer = document.createElement("div")
  const reactRoot = createRoot(infoWindowContainer)

  // Add necessary CSS for animations to document head
  const style = document.createElement("style")
  style.textContent = `
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
      100% { opacity: 1; transform: scale(1); }
    }
    .animate-pulse {
      animation: pulse 1.5s ease-in-out infinite;
    }
    .editing-marker {
      cursor: move !important;
      z-index: 1000 !important;
    }
    .editing-marker:hover {
      transform: scale(1.1);
      transition: transform 0.2s ease;
    }
  `
  document.head.appendChild(style)

  for (const marker of markers) {
    const content = { ...marker }
    delete content.lat
    delete content.lng

    const position = new window.google.maps.LatLng(marker.lat, marker.lng)
    const hasActiveNotifications = marker.segnalazioni_in_corso && marker.segnalazioni_in_corso.length > 0
    const isOutOfLaw =
      marker.segnalazioni_in_corso &&
      marker.segnalazioni_in_corso.some((report) => {
        return (
          (report.report_type === "LIGHT_POINT_OFF" && isOlderThan(report.report_date, 48)) ||
          (report.report_type === "PLANT_OFF" && isOlderThan(report.report_date, 4))
        )
      })

    let markerColor = DEFAULT_COLOR

    // Highlighting logic - prioritizza normal color coding when highlight option is set
    if (highlightOption === "") {
      markerColor = hasActiveNotifications ? "#FFCC00" : DEFAULT_COLOR
    } else if (highlightOption === "MARKER") {
      if (marker.quadro) {
        if (!colorMappings.quadro[marker.quadro]) {
          if (NcolorToUse < 0) NcolorToUse = colorsBackground.length - 1
          colorMappings.quadro[marker.quadro] = colorsBackground[NcolorToUse--]
        }
        markerColor = colorMappings.quadro[marker.quadro]
      }
    } else if (highlightOption === "PROPRIETA") {
      if (marker.proprieta) {
        if (!colorMappings.proprieta[marker.proprieta]) {
          if (NcolorToUse < 0) NcolorToUse = colorsBackground.length - 1
          colorMappings.proprieta[marker.proprieta] = colorsBackground[NcolorToUse--]
        }
        markerColor = colorMappings.proprieta[marker.proprieta]
      }
    } else if (highlightOption === "LOTTO") {
      if (marker.lotto) {
        if (!colorMappings.lotto[marker.lotto]) {
          if (NcolorToUse < 0) NcolorToUse = colorsBackground.length - 1
          colorMappings.lotto[marker.lotto] = colorsBackground[NcolorToUse--]
        }
        markerColor = colorMappings.lotto[marker.lotto]
      }
    }

    let markerElement
    const customContainer = document.createElement("div")
    const customRoot = createRoot(customContainer)

    // Check if this marker is being edited
    const isEditing = editingMarkerId === marker._id

    if (marker.marker === "QE") {
      customRoot.render(
        <ElectricPanelMarker
          color={markerColor}
          hasActiveNotifications={hasActiveNotifications}
          isOutOfLaw={isOutOfLaw}
        />,
      )
    } else {
      customRoot.render(
        <StreetLampMarker
          color={markerColor}
          hasActiveNotifications={hasActiveNotifications}
          isOutOfLaw={isOutOfLaw}
        />,
      )
    }

    markerElement = customContainer

    // Add editing class if this marker is being edited
    if (isEditing) {
      customContainer.classList.add('editing-marker')
    }

    const mapMarker = new AdvancedMarkerElement({
      position,
      content: markerElement,
      // Don't add to map directly - MarkerClusterer will handle this
    })

    // Make marker draggable if it's being edited
    if (isEditing) {
      mapMarker.gmpDraggable = true
      
      // Add drag end listener
      mapMarker.addListener("dragend", (event) => {
        const newPosition = event.latLng
        if (onMarkerDragEnd) {
          onMarkerDragEnd(marker._id, newPosition.lat(), newPosition.lng())
        }
      })
    }

    // Add click event
    mapMarker.addListener("click", () => {
      if (currentInfoWindow) {
        currentInfoWindow.close()
      }

      // Update the React root rendering
      reactRoot.render(
        <InfoWindow 
          content={content} 
          marker={marker} 
          city={city} 
          userData={userData} 
          onEditClick={onEditClick}
        />
      )

      // Use the React container as InfoWindow content
      infoWindowRef.current.setContent(infoWindowContainer)
      infoWindowRef.current.open(map, mapMarker)
      setCurrentInfoWindow(infoWindowRef.current)
    })

    newMarkers.push({ data: marker, ref: mapMarker, reactRoot: customRoot, reactContainer: customContainer })
  }

  // Salva i marker creati globalmente per cleanup
  lastCreatedMarkers = newMarkers

  return newMarkers
}

// Funzione per aggiornare i colori dei marker esistenti tramite rerender React
const updateMarkerColors = (markers, highlightOption, editingMarkerId) => {
  const colorMappings = { quadro: {}, proprieta: {}, lotto: {} }
  let NcolorToUse = colorsBackground.length - 1

  markers.forEach(({ data, reactRoot, reactContainer }) => {
    // Safe: esci se il root non è valido o già smontato
    if (!reactRoot || typeof reactRoot.render !== 'function') return

    let markerColor = DEFAULT_COLOR
    const hasActiveNotifications = data.segnalazioni_in_corso && data.segnalazioni_in_corso.length > 0
    const isOutOfLaw =
      data.segnalazioni_in_corso &&
      data.segnalazioni_in_corso.some((report) => {
        return (
          (report.report_type === "LIGHT_POINT_OFF" && isOlderThan(report.report_date, 48)) ||
          (report.report_type === "PLANT_OFF" && isOlderThan(report.report_date, 4))
        )
      })

    if (highlightOption === "") {
      markerColor = hasActiveNotifications ? "#FFCC00" : DEFAULT_COLOR
    } else if (highlightOption === "MARKER") {
      if (data.quadro) {
        if (!colorMappings.quadro[data.quadro]) {
          if (NcolorToUse < 0) NcolorToUse = colorsBackground.length - 1
          colorMappings.quadro[data.quadro] = colorsBackground[NcolorToUse--]
        }
        markerColor = colorMappings.quadro[data.quadro]
      }
    } else if (highlightOption === "PROPRIETA") {
      if (data.proprieta) {
        if (!colorMappings.proprieta[data.proprieta]) {
          if (NcolorToUse < 0) NcolorToUse = colorsBackground.length - 1
          colorMappings.proprieta[data.proprieta] = colorsBackground[NcolorToUse--]
        }
        markerColor = colorMappings.proprieta[data.proprieta]
      }
    } else if (highlightOption === "LOTTO") {
      if (data.lotto) {
        if (!colorMappings.lotto[data.lotto]) {
          if (NcolorToUse < 0) NcolorToUse = colorsBackground.length - 1
          colorMappings.lotto[data.lotto] = colorsBackground[NcolorToUse--]
        }
        markerColor = colorMappings.lotto[data.lotto]
      }
    }

    // Rerender del componente React nel container esistente
    if (data.marker === "QE") {
      reactRoot.render(
        <ElectricPanelMarker
          color={markerColor}
          hasActiveNotifications={hasActiveNotifications}
          isOutOfLaw={isOutOfLaw}
        />
      )
    } else {
      reactRoot.render(
        <StreetLampMarker
          color={markerColor}
          hasActiveNotifications={hasActiveNotifications}
          isOutOfLaw={isOutOfLaw}
        />
      )
    }

    // Aggiorna la classe per l'editing se serve
    if (reactContainer) {
      if (editingMarkerId === data._id) {
        reactContainer.classList.add('editing-marker')
      } else {
        reactContainer.classList.remove('editing-marker')
      }
    }
  })
}

// New function to handle clustering setup and management
const setupMarkerClustering = async (
  markers,
  city,
  map,
  highlightOption,
  currentInfoWindow,
  userData,
  infoWindowRef,
  setCurrentInfoWindow,
  onEditClick,
  editingMarkerId,
  onMarkerDragEnd,
) => {
  // Make sure Google Maps API is fully loaded
  if (!window.google || !window.google.maps || !map) {
    console.error("Google Maps API not loaded")
    return []
  }

  // Clean up previous resources first
  cleanupMapResources()

  // Load necessary libraries
  await window.google.maps.importLibrary("marker")
  await window.google.maps.importLibrary("core")

  // Implement marker batching for large datasets
  const batchSize = 1000
  let allMarkers = []

  // Process markers in batches to prevent UI freezing
  for (let i = 0; i < markers.length; i += batchSize) {
    const batch = markers.slice(i, i + batchSize)

    // Create a small delay between batches to allow UI to respond
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }

    // Create markers for this batch
    const batchResult = await createMarkers(
      batch,
      city,
      map,
      highlightOption,
      currentInfoWindow,
      userData,
      infoWindowRef,
      setCurrentInfoWindow,
      onEditClick,
      editingMarkerId,
      onMarkerDragEnd,
    )

    allMarkers = [...allMarkers, ...batchResult]
  }

  return allMarkers
}

// Function to filter markers and update clustering
const filterMarkers = (markers, filterType, map) => {
  if (!markers || markers.length === 0) return []

  // First, ensure all markers are removed from the map
  markers.forEach((marker) => {
    if (marker.ref) {
      marker.ref.map = null
    }
  })

  // Clean up previous clusterer if it exists
  cleanupMapResources()

  // Apply filter
  let filteredMarkers
  switch (filterType) {
    case "REPORTED":
      filteredMarkers = markers.filter(
        (marker) => marker.data.segnalazioni_in_corso && marker.data.segnalazioni_in_corso.length > 0,
      )
      break
    case "MARKER":
      filteredMarkers = markers.filter((marker) => marker.data.marker === "QE")
      break
    case "SELECT":
    default:
      filteredMarkers = [...markers]
      break
  }

  // Add filtered markers to the map and clusterer
  if (filteredMarkers.length > 0) {
    try {
      // Create new clusterer with filtered markers
      currentClusterer = new MarkerClusterer({
        map,
        markers: filteredMarkers.map((m) => m.ref),
        renderer: createCustomClusterRenderer(),
        algorithm: new GridAlgorithm({
          gridSize: 60,
          maxZoom: 15,
          minClusterSize: 3,
        }),
        onClusterClick: (event, cluster, map) => {
          // Get the current zoom level
          const currentZoom = map.getZoom()

          // If we're already at max zoom, expand the cluster
          if (currentZoom >= 15) {
            // Get the markers in this cluster
            const clusterMarkers = cluster.markers

            // Calculate bounds just for this cluster
            const bounds = new window.google.maps.LatLngBounds()
            clusterMarkers.forEach((marker) => {
              bounds.extend(marker.position)
            })

            // Fit the map to these bounds with padding
            map.fitBounds(bounds, { padding: 50 })

            // Only show markers in this specific cluster
            // First hide all markers
            filteredMarkers.forEach((marker) => {
              if (marker.ref) {
                marker.ref.map = null
              }
            })

            // Then only show markers in this cluster
            clusterMarkers.forEach((clusterMarker) => {
              // Find the corresponding marker in our filteredMarkers array
              const markerToShow = filteredMarkers.find(
                (m) => m.ref && m.ref.position && m.ref.position.equals(clusterMarker.position),
              )
              


              if (markerToShow && markerToShow.ref) {
                markerToShow.ref.map = map
              }
            })
          } else {
            // If not at max zoom, just zoom in by a fixed amount
            const newZoom = Math.min(currentZoom + 2, 15)
            map.setZoom(newZoom)
            map.setCenter(cluster.position)
          }
        },
      })

      // Implement efficient viewport-based marker rendering
      const updateVisibleMarkers = () => {
        if (!map.getBounds()) return

        const bounds = map.getBounds()
        const zoom = map.getZoom()

        // At lower zoom levels, let the clusterer handle visibility
        if (zoom < 10) {
          // Add a limited number of markers to the map for clustering
          // This prevents too many markers from being rendered at once
          const maxMarkersAtLowZoom = 500
          const markersToShow = filteredMarkers.slice(0, maxMarkersAtLowZoom)

          markersToShow.forEach((marker) => {
            if (marker.ref) {
              marker.ref.map = map
            }
          })
        } else {
          // At higher zoom levels, only add markers in the current viewport
          filteredMarkers.forEach((marker) => {
            if (marker.ref && marker.ref.position) {
              // Only show markers within the current bounds
              const isInBounds = bounds.contains(marker.ref.position)
              marker.ref.map = isInBounds ? map : null
            }
          })
        }
      }

      // Initial update of visible markers
      updateVisibleMarkers()

      // Add event listeners for map movement and zoom changes
      const idleListener = map.addListener("idle", updateVisibleMarkers)

      // Store the listener reference for cleanup
      mapEventListeners.push(idleListener)
    } catch (error) {
      console.error("Error creating marker clusterer:", error)

      // Fallback: just add visible markers to the map without clustering
      if (map.getBounds()) {
        const bounds = map.getBounds()
        filteredMarkers.forEach((marker) => {
          if (marker.ref && marker.ref.position && bounds.contains(marker.ref.position)) {
            marker.ref.map = map
          }
        })
      } else {
        // If bounds aren't available yet, add a limited number of markers
        const limitedMarkers = filteredMarkers.slice(0, 200)
        limitedMarkers.forEach((marker) => {
          if (marker.ref) {
            marker.ref.map = map
          }
        })
      }
    }
  }

  return filteredMarkers
}

export { createMarkers, setupMarkerClustering, filterMarkers, currentClusterer, cleanupMapResources, updateMarkerColors }

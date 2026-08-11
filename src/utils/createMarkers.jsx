import { createRoot } from "react-dom/client"
import { MarkerClusterer, GridAlgorithm } from "@googlemaps/markerclusterer"
import { DEFAULT_COLOR, FC_QUADRO_COLOR, applyFcQuadroToLegendMap, getColorList, isFcQuadro } from "../utils/ColorGenerator"
import InfoWindow from "../components/InfoWindow"
import { isMobileInfoWindowViewport } from "./infoWindowActions"
import { isOlderThan, getTipoLampada, normalizeLightPointForDisplay, getReportBadgeInfo } from "./utils"
import { getEffectiveQuadro, toIdString } from "./topologyLines"

// Global variable to store the clusterer instance
let currentClusterer = null
// Global variable to store event listeners for cleanup
let mapEventListeners = []
// Global variable to store the last created markers (per cleanup dei React root)
let lastCreatedMarkers = []
let markerStylesInjected = false

const ensureMarkerStyles = () => {
  if (markerStylesInjected || typeof document === "undefined") return
  const style = document.createElement("style")
  style.setAttribute("data-lighting-map-markers", "true")
  style.textContent = `
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
      100% { opacity: 1; transform: scale(1); }
    }
    .animate-pulse {
      animation: pulse 1.5s ease-in-out infinite;
    }
    .map-marker-root {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      cursor: pointer;
      user-select: none;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45));
      transform-origin: 50% 100%;
      transition: transform 0.15s ease;
    }
    .map-marker-root:hover {
      transform: scale(1.08);
    }
    .map-marker-label {
      margin-top: 2px;
      padding: 1px 6px;
      border-radius: 999px;
      font-size: 10px;
      line-height: 1.3;
      font-weight: 600;
      color: #fff;
      background: rgba(0, 0, 0, 0.55);
      border: 1px solid rgba(255, 255, 255, 0.35);
      white-space: nowrap;
      max-width: 72px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .map-marker-group {
      margin-top: 2px;
      padding: 1px 6px;
      border-radius: 999px;
      font-size: 10px;
      line-height: 1.3;
      font-weight: 700;
      color: #fff;
      background: #2563eb;
      border: 1px solid rgba(147, 197, 253, 0.7);
    }
    .editing-marker {
      cursor: move !important;
      z-index: 1000 !important;
    }
    .editing-marker:hover {
      transform: scale(1.12);
    }
  `
  document.head.appendChild(style)
  markerStylesInjected = true
}

const parseCoord = (value) => {
  if (value == null || value === "") return 0
  const normalized =
    typeof value === "string" ? value.trim().replace(",", ".") : value
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

const ReportBadge = ({ type, dueUrgency = "ok" }) => {
  if (type === "ordinary") {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        style={{ position: "absolute", top: 0, right: 0, zIndex: 2, pointerEvents: "none" }}
        aria-hidden="true"
      >
        <polygon points="7,1 13,13 1,13" fill="#FFCC00" stroke="#ffffff" strokeWidth="1.2" />
      </svg>
    )
  }
  if (type === "extraordinary") {
    const fill =
      dueUrgency === "overdue" ? "#EF4444"
        : dueUrgency === "soon" ? "#F97316"
          : "#E11D48"
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 15 15"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          zIndex: 2,
          pointerEvents: "none",
          animation: dueUrgency === "overdue" ? "pulse 1.5s ease-in-out infinite" : undefined,
        }}
        aria-hidden="true"
      >
        <polygon
          points="7.5,1 14,5.5 11.5,13.5 3.5,13.5 1,5.5"
          fill={fill}
          stroke="#ffffff"
          strokeWidth="1.2"
        />
      </svg>
    )
  }
  return null
}

const StatusDot = ({ color }) => (
  <span
    aria-hidden="true"
    style={{
      position: "absolute",
      top: 1,
      right: 1,
      zIndex: 2,
      width: 9,
      height: 9,
      borderRadius: "50%",
      background: color,
      border: "1.5px solid #fff",
      boxShadow: "0 0 0 1px rgba(0,0,0,0.2)",
      animation: "pulse 1.5s ease-in-out infinite",
    }}
  />
)

/** Pin punto luce: testa lampada + stelo, bordo bianco per contrasto su satellitare */
const StreetLampPinSvg = ({ color, unlinked = false }) => {
  const stroke = unlinked ? "#f97316" : "#ffffff"
  const strokeWidth = unlinked ? 2.2 : 1.8
  return (
    <svg width="28" height="36" viewBox="0 0 28 36" aria-hidden="true">
      <path
        d="M14 1.5C7.65 1.5 2.5 6.65 2.5 13c0 4.6 2.55 8.55 6.25 10.55L14 34.5l5.25-10.95C23 21.55 25.5 17.6 25.5 13 25.5 6.65 20.35 1.5 14 1.5z"
        fill={color}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <ellipse cx="14" cy="11.2" rx="6.2" ry="4.4" fill="rgba(255,255,255,0.92)" />
      <path
        d="M9.2 12.4c1.1 2.4 2.7 3.6 4.8 3.6s3.7-1.2 4.8-3.6"
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <rect x="13.1" y="16" width="1.8" height="7.5" rx="0.6" fill={color} opacity="0.85" />
      <circle cx="14" cy="13" r="1.15" fill={color} />
    </svg>
  )
}

/** Pin quadro elettrico: corpo rettangolare tipico QE */
const ElectricPanelPinSvg = ({ color }) => (
  <svg width="30" height="38" viewBox="0 0 30 38" aria-hidden="true">
    <path
      d="M15 1.5C8.1 1.5 2.5 7.1 2.5 14c0 5.1 2.9 9.4 7.1 11.5L15 36.5l5.4-11C24.6 23.4 27.5 19.1 27.5 14 27.5 7.1 21.9 1.5 15 1.5z"
      fill={color}
      stroke="#ffffff"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <rect x="8.2" y="7.2" width="13.6" height="12.2" rx="1.6" fill="rgba(255,255,255,0.95)" />
    <rect x="10" y="9" width="10" height="2.2" rx="0.6" fill={color} opacity="0.9" />
    <rect x="10" y="12.4" width="10" height="1.5" rx="0.5" fill={color} opacity="0.45" />
    <rect x="10" y="15" width="10" height="1.5" rx="0.5" fill={color} opacity="0.45" />
    <circle cx="19.4" cy="17.6" r="1.1" fill={color} />
  </svg>
)

const MarkerStatusOverlays = ({
  reportBadgeType,
  dueUrgency,
  hasActiveNotifications,
  isOutOfLaw,
  isTopologyUnlinked = false,
}) => {
  if (reportBadgeType === "ordinary" || reportBadgeType === "extraordinary") {
    return <ReportBadge type={reportBadgeType} dueUrgency={dueUrgency} />
  }
  if (hasActiveNotifications) {
    return <StatusDot color={isOutOfLaw ? "#EF4444" : "#FFBF00"} />
  }
  if (isTopologyUnlinked) {
    return (
      <span
        title="Nessuna linea elettrica collegata"
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 1,
          right: 1,
          zIndex: 2,
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: "#f97316",
          border: "1.5px solid #fff",
        }}
      />
    )
  }
  return null
}

const ElectricPanelMarker = ({
  color,
  hasActiveNotifications,
  isOutOfLaw,
  nPanel,
  showPanelNumber,
  reportBadgeType,
  dueUrgency,
}) => (
  <div className="map-marker-root" style={{ width: 34, minHeight: 38 }}>
    <div style={{ position: "relative", width: 30, height: 38 }}>
      <ElectricPanelPinSvg color={color} />
      <MarkerStatusOverlays
        reportBadgeType={reportBadgeType}
        dueUrgency={dueUrgency}
        hasActiveNotifications={hasActiveNotifications}
        isOutOfLaw={isOutOfLaw}
      />
    </div>
    {showPanelNumber && nPanel ? <div className="map-marker-label">{nPanel}</div> : null}
  </div>
)

const StreetLampMarker = ({
  color,
  hasActiveNotifications,
  isOutOfLaw,
  nPanel,
  groupCount = 0,
  isTopologyUnlinked = false,
  reportBadgeType,
  dueUrgency,
}) => (
  <div className="map-marker-root" style={{ width: 32, minHeight: 36 }}>
    <div style={{ position: "relative", width: 28, height: 36 }}>
      <StreetLampPinSvg color={color} unlinked={isTopologyUnlinked} />
      <MarkerStatusOverlays
        reportBadgeType={reportBadgeType}
        dueUrgency={dueUrgency}
        hasActiveNotifications={hasActiveNotifications}
        isOutOfLaw={isOutOfLaw}
        isTopologyUnlinked={isTopologyUnlinked}
      />
    </div>
    {nPanel ? <div className="map-marker-label">{nPanel}</div> : null}
    {groupCount > 1 ? <div className="map-marker-group">x{groupCount}</div> : null}
  </div>
)

const groupDifferenteMarkers = (markers) => {
  const differenteRegex = /^differente/i
  const grouped = new Map()
  const passthrough = []

  markers.forEach((marker) => {
    const poleNumber = (marker.numero_palo || "").trim()
    const isDifferente = differenteRegex.test((marker.composizione_punto || "").trim())
    if (marker.marker === "PL" && isDifferente && poleNumber) {
      const key = poleNumber.toLowerCase()
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(marker)
      return
    }
    passthrough.push(marker)
  })

  const groupedMarkers = []
  grouped.forEach((group, key) => {
    if (group.length <= 1) {
      passthrough.push(group[0])
      return
    }

    const representative = { ...group[0] }
    representative.is_differente_group = true
    representative.differente_group_id = `differente-${key}`
    representative.differente_group_count = group.length
    representative.differente_group_members = group.map((member) => ({ ...member }))
    representative.segnalazioni_in_corso = group.flatMap((m) => m.segnalazioni_in_corso || [])
    representative.segnalazioni_risolte = group.flatMap((m) => m.segnalazioni_risolte || [])
    representative.operazioni_effettuate = group.flatMap((m) => m.operazioni_effettuate || [])
    groupedMarkers.push(representative)
  })

  return [...passthrough, ...groupedMarkers]
}

// Custom cluster renderer
const createCustomClusterRenderer = () => {
  return {
    render: ({ count, position }) => {
      const div = document.createElement("div")
      div.className = `flex items-center justify-center rounded-full border border-white/60 bg-white/20 text-blue-500 font-bold shadow-xl backdrop-blur-md hover:bg-white/40 hover:shadow-2xl transition-all duration-300 cursor-pointer select-none`;
      div.style.width = `${Math.min(60, Math.max(40, 40 + Math.log10(count) * 10))}px`;
      div.style.height = `${Math.min(60, Math.max(40, 40 + Math.log10(count) * 10))}px`;
      div.style.padding = "10px";
      div.style.border = "2px solid rgba(255,255,255,0.6)";
      div.style.backdropFilter = "blur(8px)";
      div.style.WebkitBackdropFilter = "blur(8px)";
      div.style.boxShadow = "0 6px 32px 0 rgba(59, 130, 246, 0.18)";
      div.innerHTML = `<div class='text-sm font-bold text-blue-500 drop-shadow'>${count}</div>`;

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
  onDeleteClick,
  onDuplicateClick,
  showPanelNumber,
  showStreetLampNumber,
  setSelectedMarkerForInfo,
  options = {},
) => {
  if (!window.google || !map) return []
  const {
    colorMappings: colorMappingsOverride = null,
    skipGrouping = false,
    onItemProgress = null,
    progressOffset = 0,
    progressTotal = null,
    progressEvery = 75,
    showTopologyLines = false,
    unlinkedIdSet = null,
    getIsTopologyEditMode = null,
    onTopologyPointPick = null,
    onSetParentClick = null,
    onClearParentClick = null,
    getTopologyPower = null,
  } = options
  const markersForRender = skipGrouping ? markers : groupDifferenteMarkers(markers)

  const markerById = new Map(
    markersForRender
      .map((marker) => [toIdString(marker?._id), marker])
      .filter(([id]) => Boolean(id)),
  )

  // Usa la mappa colori passata dal parent (dataset completo) oppure calcolala sul batch
  const colorMappings =
    colorMappingsOverride || generateLegendColorMap(markersForRender, highlightOption, markerById)
  
  const newMarkers = []

  // Create info window container and React root once (per batch)
  const infoWindowContainer = document.createElement("div")
  const reactRoot = createRoot(infoWindowContainer)

  ensureMarkerStyles()

  const totalForProgress = progressTotal ?? markersForRender.length
  const shouldMarkUnlinked = showTopologyLines && unlinkedIdSet instanceof Set

  for (let i = 0; i < markersForRender.length; i++) {
    const marker = markersForRender[i]
    const content = normalizeLightPointForDisplay(marker)
    delete content.lat
    delete content.lng
    const safeLat = parseCoord(marker.lat)
    const safeLng = parseCoord(marker.lng)
    const position = new window.google.maps.LatLng(safeLat, safeLng)
    const hasActiveNotifications = marker.segnalazioni_in_corso && marker.segnalazioni_in_corso.length > 0
    const badgeInfo = getReportBadgeInfo(marker.segnalazioni_in_corso)
    const reportBadgeType = badgeInfo.type
    const dueUrgency = badgeInfo.dueUrgency || "none"
    const isOutOfLaw =
      marker.segnalazioni_in_corso &&
      marker.segnalazioni_in_corso.some((report) => {
        return (
          (report.report_type === "LIGHT_POINT_OFF" && isOlderThan(report.report_date, 48)) ||
          (report.report_type === "PLANT_OFF" && isOlderThan(report.report_date, 4))
        )
      })
    const isTopologyUnlinked =
      shouldMarkUnlinked &&
      marker.marker === "PL" &&
      !marker.is_differente_group &&
      unlinkedIdSet.has(String(marker._id))

    let markerColor = DEFAULT_COLOR

    if (highlightOption === "") {
      markerColor = hasActiveNotifications ? "#FFCC00" : DEFAULT_COLOR
    } else if (highlightOption === "MARKER") {
      const quadro = getEffectiveQuadro(marker, markerById)
      if (quadro && colorMappings.quadro[quadro]) {
        markerColor = colorMappings.quadro[quadro]
      }
    } else if (highlightOption === "PROPRIETA") {
      const prop = marker.proprieta ? marker.proprieta.trim().toLowerCase() : ""
      if (prop === "comune" || prop === "municipale") {
        markerColor = "#3b82f6" // blu
      } else if (prop === "enelsole") {
        markerColor = "#ef4444" // rosso
      } else {
        markerColor = "#6b7280" // grigio
      }
    } else if (highlightOption === "LOTTO") {
      if (marker.lotto && colorMappings.lotto[marker.lotto]) {
        markerColor = colorMappings.lotto[marker.lotto]
      }
    } else if (highlightOption === "TIPO_LAMPADA") {
      if (marker.marker === "QE") {
        markerColor = "#3b82f6"; // Colore fisso per i quadri
      } else {
        const tipoLampada = getTipoLampada(marker);
        if (tipoLampada && colorMappings.tipo_lampada && colorMappings.tipo_lampada[tipoLampada]) {
          markerColor = colorMappings.tipo_lampada[tipoLampada];
        }
      }
    } else if (highlightOption === "TIPO_APPARECCHIO") {
      const tipoApparecchio = (marker.tipo_apparecchio || '').toLowerCase();
      if (tipoApparecchio && colorMappings.tipo_apparecchio && colorMappings.tipo_apparecchio[tipoApparecchio]) {
        markerColor = colorMappings.tipo_apparecchio[tipoApparecchio];
      }
    }
    if (isFcQuadro(marker.quadro) || isFcQuadro(getEffectiveQuadro(marker, markerById))) {
      markerColor = FC_QUADRO_COLOR
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
          nPanel={marker.numero_palo}
          showPanelNumber={showPanelNumber}
          reportBadgeType={reportBadgeType}
          dueUrgency={dueUrgency}
        />,
      )
    } else {
      customRoot.render(
        <StreetLampMarker
          color={markerColor}
          hasActiveNotifications={hasActiveNotifications}
          isOutOfLaw={isOutOfLaw}
          nPanel={showStreetLampNumber ? marker.numero_palo : undefined}
          groupCount={marker.differente_group_count || 0}
          isTopologyUnlinked={isTopologyUnlinked}
          reportBadgeType={reportBadgeType}
          dueUrgency={dueUrgency}
        />, 
      )
    }

    markerElement = customContainer

    // Add editing class if this marker is being edited
    if (isEditing) {
      customContainer.classList.add('editing-marker')
    }

      const mapMarker = new window.google.maps.marker.AdvancedMarkerElement({
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
        if (typeof getIsTopologyEditMode === "function" && getIsTopologyEditMode()) {
          if (typeof onTopologyPointPick === "function") {
            onTopologyPointPick(marker)
          }
          return
        }

        if (currentInfoWindow) {
          currentInfoWindow.close()
        }
        setCurrentInfoWindow(null)

        if (marker.is_differente_group) {
          if (typeof setSelectedMarkerForInfo === "function") {
            setSelectedMarkerForInfo(marker)
          }
          return
        }

        // Mobile: bottom sheet gestito da Dashboard, niente popup Google
        if (isMobileInfoWindowViewport()) {
          if (typeof setSelectedMarkerForInfo === "function") {
            setSelectedMarkerForInfo(marker)
          }
          return
        }

        const power =
          typeof getTopologyPower === "function" ? getTopologyPower(marker) : null

        // Update the React root rendering
        reactRoot.render(
          <InfoWindow 
            content={content} 
            marker={marker} 
            city={city} 
            userData={userData} 
            onEditClick={onEditClick}
            onDeleteClick={onDeleteClick}
            onDuplicateClick={onDuplicateClick}
            idMarker={ marker._id}
            variant="popup"
            onSetParentClick={onSetParentClick}
            onClearParentClick={onClearParentClick}
            topologyPower={power}
          />
        )

      // Use the React container as InfoWindow content
      infoWindowRef.current.setContent(infoWindowContainer)
      infoWindowRef.current.open(map, mapMarker)
      setCurrentInfoWindow(infoWindowRef.current)
      if (typeof setSelectedMarkerForInfo === "function") {
        setSelectedMarkerForInfo(marker);
      }
    })

    newMarkers.push({ data: marker, ref: mapMarker, reactRoot: customRoot, reactContainer: customContainer })

    // Yield + report ogni N marker così React può ridipingere il contatore
    const done = i + 1
    if (
      typeof onItemProgress === "function" &&
      (done % progressEvery === 0 || done === markersForRender.length)
    ) {
      await onItemProgress({
        processed: progressOffset + done,
        total: totalForProgress,
      })
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  // Salva i marker creati globalmente per cleanup
  lastCreatedMarkers = newMarkers

  return newMarkers

}

// Funzione per aggiornare i colori dei marker esistenti tramite rerender React
const updateMarkerColors = (
  markers,
  highlightOption,
  editingMarkerId,
  showPanelNumber,
  showStreetLampNumber,
  showTopologyLines = false,
  unlinkedIdSet = null,
) => {
  // Usa la mappa colori generata per evitare ripetizioni
  const legendColorMap = generateLegendColorMap(markers.map(m => m.data), highlightOption)
  const colorMappings = legendColorMap
  const shouldMarkUnlinked = showTopologyLines && unlinkedIdSet instanceof Set

  markers.forEach(({ data, reactRoot, reactContainer }) => {
    // Safe: esci se il root non è valido o già smontato
    if (!reactRoot || typeof reactRoot.render !== 'function') return

    let markerColor = DEFAULT_COLOR
    const hasActiveNotifications = data.segnalazioni_in_corso && data.segnalazioni_in_corso.length > 0
    const badgeInfo = getReportBadgeInfo(data.segnalazioni_in_corso)
    const reportBadgeType = badgeInfo.type
    const dueUrgency = badgeInfo.dueUrgency || "none"
    const isOutOfLaw =
      data.segnalazioni_in_corso &&
      data.segnalazioni_in_corso.some((report) => {
        return (
          (report.report_type === "LIGHT_POINT_OFF" && isOlderThan(report.report_date, 48)) ||
          (report.report_type === "PLANT_OFF" && isOlderThan(report.report_date, 4))
        )
      })
    const isTopologyUnlinked =
      shouldMarkUnlinked &&
      data.marker === "PL" &&
      !data.is_differente_group &&
      unlinkedIdSet.has(String(data._id))

    if (highlightOption === "") {
      markerColor = hasActiveNotifications ? "#FFCC00" : DEFAULT_COLOR
    } else if (highlightOption === "MARKER") {
      if (data.quadro && colorMappings.quadro[data.quadro]) {
        markerColor = colorMappings.quadro[data.quadro]
      }
    } else if (highlightOption === "PROPRIETA") {
      const prop = data.proprieta ? data.proprieta.trim().toLowerCase() : ""
      if (prop === "comune" || prop === "municipale") {
        markerColor = "#3b82f6" // blu
      } else if (prop === "enelsole") {
        markerColor = "#ef4444" // rosso
      } else {
        markerColor = "#6b7280" // grigio
      }
    } else if (highlightOption === "LOTTO") {
      if (data.lotto && colorMappings.lotto[data.lotto]) {
        markerColor = colorMappings.lotto[data.lotto]
      }
    } else if (highlightOption === "TIPO_LAMPADA") {
      if (data.marker === "QE") {
        markerColor = "#3b82f6"; // Colore fisso per i quadri
      } else {
        const tipoLampada = getTipoLampada(data);
        if (tipoLampada && colorMappings.tipo_lampada && colorMappings.tipo_lampada[tipoLampada]) {
          markerColor = colorMappings.tipo_lampada[tipoLampada];
        }
      }
    } else if (highlightOption === "TIPO_APPARECCHIO") {
      const tipoApparecchio = (data.tipo_apparecchio || '').toLowerCase();
      if (tipoApparecchio && colorMappings.tipo_apparecchio && colorMappings.tipo_apparecchio[tipoApparecchio]) {
        markerColor = colorMappings.tipo_apparecchio[tipoApparecchio];
      }
    }
    
    if (isFcQuadro(data.quadro)) {
      markerColor = FC_QUADRO_COLOR
    }
    // Rerender del componente React nel container esistente
    if (data.marker === "QE") {
      reactRoot.render(
        <ElectricPanelMarker
          color={markerColor}
          hasActiveNotifications={hasActiveNotifications}
          isOutOfLaw={isOutOfLaw}
          nPanel={data.numero_palo}
          showPanelNumber={showPanelNumber}
          reportBadgeType={reportBadgeType}
          dueUrgency={dueUrgency}
        />
      )
    } else {
      reactRoot.render(
        <StreetLampMarker
          color={markerColor}
          hasActiveNotifications={hasActiveNotifications}
          isOutOfLaw={isOutOfLaw}
          nPanel={showStreetLampNumber ? data.numero_palo : undefined}
          groupCount={data.differente_group_count || 0}
          isTopologyUnlinked={isTopologyUnlinked}
          reportBadgeType={reportBadgeType}
          dueUrgency={dueUrgency}
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
  onDeleteClick,
  onDuplicateClick,
  showPanelNumber,
  showStreetLampNumber,
  setSelectedMarkerForInfo,
  onProgress,
  topologyOptions = {},
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

  // Group + palette una sola volta sull'intero dataset (non per ogni batch)
  const markersForRender = groupDifferenteMarkers(markers)
  const legendColorMap = generateLegendColorMap(markersForRender, highlightOption)
  ensureMarkerStyles()

  const batchSize = 1000
  const allMarkers = []
  const total = markersForRender.length

  const emitProgress = async (processed) => {
    if (typeof onProgress !== "function" || total <= 0) return
    onProgress({ processed, total })
    // Doppio rAF: lascia che React committa e il browser dipinga il contatore
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    })
  }

  for (let i = 0; i < markersForRender.length; i += batchSize) {
    const batch = markersForRender.slice(i, i + batchSize)

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
      onDeleteClick,
      onDuplicateClick,
      showPanelNumber,
      showStreetLampNumber,
      setSelectedMarkerForInfo,
      {
        colorMappings: legendColorMap,
        skipGrouping: true,
        progressOffset: i,
        progressTotal: total,
        progressEvery: 75,
        onItemProgress: emitProgress,
        showTopologyLines: Boolean(topologyOptions.showTopologyLines),
        unlinkedIdSet: topologyOptions.unlinkedIdSet || null,
        getIsTopologyEditMode: topologyOptions.getIsTopologyEditMode || null,
        onTopologyPointPick: topologyOptions.onTopologyPointPick || null,
        onSetParentClick: topologyOptions.onSetParentClick || null,
        onClearParentClick: topologyOptions.onClearParentClick || null,
        getTopologyPower: topologyOptions.getTopologyPower || null,
      },
    )

    allMarkers.push(...batchResult)
  }

  return { markers: allMarkers, legendColorMap }
}

// New: funzione per generare la mappa colori coordinata
function generateLegendColorMap(markers, highlightOption, byIdInput = null) {
  let colorMappings = { quadro: {}, proprieta: {}, lotto: {}, tipo_lampada: {}, tipo_apparecchio: {} }
  let uniqueValues = []
  const byId =
    byIdInput ||
    new Map(
      (markers || [])
        .map((marker) => [toIdString(marker?._id), marker])
        .filter(([id]) => Boolean(id)),
    )
  
  if (highlightOption === "PROPRIETA") {
    uniqueValues = Array.from(new Set(markers.map(marker => marker.proprieta).filter(Boolean)))
    const colorList = getColorList(uniqueValues.length)

    uniqueValues.forEach((val, idx) => {
      colorMappings.proprieta[val] = colorList[idx]
    })
  } else if (highlightOption === "MARKER") {
    uniqueValues = Array.from(
      new Set(
        markers
          .map((marker) => getEffectiveQuadro(marker, byId))
          .filter(Boolean),
      ),
    )
    const colorList = getColorList(uniqueValues.length)
    uniqueValues.forEach((val, idx) => {
      colorMappings.quadro[val] = colorList[idx]
    })
  } else if (highlightOption === "LOTTO") {
    uniqueValues = Array.from(new Set(markers.map(marker => marker.lotto).filter(Boolean)))
    const colorList = getColorList(uniqueValues.length)
    uniqueValues.forEach((val, idx) => {
      colorMappings.lotto[val] = colorList[idx]
    })
  } else if (highlightOption === "TIPO_LAMPADA") {
    uniqueValues = Array.from(new Set(markers.map(marker => getTipoLampada(marker)).filter(Boolean)))
    const colorList = getColorList(uniqueValues.length)
    uniqueValues.forEach((val, idx) => {
      colorMappings.tipo_lampada[val] = colorList[idx]
    })
  } else if (highlightOption === "TIPO_APPARECCHIO") {
    uniqueValues = Array.from(new Set(markers.map(marker => (marker.tipo_apparecchio || '').toLowerCase()).filter(Boolean)))
    const colorList = getColorList(uniqueValues.length)
    uniqueValues.forEach((val, idx) => {
      colorMappings.tipo_apparecchio[val] = colorList[idx]
    })
  }

  applyFcQuadroToLegendMap(colorMappings)

  return colorMappings
}

// Function to filter markers and update clustering
const filterMarkers = (markers, filterType, map, selectedProprietaFilter) => {
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
    case "PROPRIETA":
      if (!selectedProprietaFilter) {
        filteredMarkers = [];
      } else {
        const selectedProprieta = selectedProprietaFilter.toLowerCase();
        filteredMarkers = markers.filter(marker => {
          const prop = (marker.data.proprieta || "").toLowerCase();
          if (selectedProprieta === "municipale") {
            return prop === "comune" || prop === "municipale";
          }
          if (selectedProprieta === "enelsole") {
            return prop === "enelsole";
          }
          return false;
        });
      }
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
          const maxMarkersAtLowZoom = 100
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

/**
 * Inizializza un MarkerClusterer vuoto (per caricamento a batch).
 * Pulisce risorse precedenti.
 */
const initEmptyClusterer = async (map) => {
  if (!window.google || !window.google.maps || !map) {
    console.error("Google Maps API not loaded")
    return null
  }

  cleanupMapResources()
  await window.google.maps.importLibrary("marker")
  await window.google.maps.importLibrary("core")
  ensureMarkerStyles()

  currentClusterer = new MarkerClusterer({
    map,
    markers: [],
    renderer: createCustomClusterRenderer(),
    algorithm: new GridAlgorithm({
      gridSize: 60,
      maxZoom: 15,
      minClusterSize: 3,
    }),
  })

  return currentClusterer
}

/**
 * Aggiunge marker già creati al clusterer corrente (caricamento progressivo).
 * @param {{ ref: google.maps.marker.AdvancedMarkerElement }[]} markerObjects
 */
const appendMarkersToClusterer = (markerObjects) => {
  if (!currentClusterer || !markerObjects?.length) return
  const refs = markerObjects.map((m) => m.ref).filter(Boolean)
  if (refs.length === 0) return
  currentClusterer.addMarkers(refs)
}

export {
  createMarkers,
  setupMarkerClustering,
  filterMarkers,
  currentClusterer,
  cleanupMapResources,
  updateMarkerColors,
  generateLegendColorMap,
  initEmptyClusterer,
  appendMarkersToClusterer,
  groupDifferenteMarkers,
}

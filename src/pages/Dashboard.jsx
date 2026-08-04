"use client"

import { useState, useEffect, useContext, useRef, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { api, UserContext } from "../context/UserContext"
import Header from "../components/Header"
import MapControls from "../components/MapControls"
import InfoPanel from "../components/InfoPanel"
import MapButton from "../components/MapButton"
import {  LocateFixed, Plus } from "lucide-react"
import ResultsBottomSheet from "../components/ResultsBottomSheet"
import { MapLoadOverlay } from "../components/MapLoader"
import EditLightPointModal from "../components/EditLightPointModal"
import AddLightPointModal from "../components/AddLightPointModal"

import LegendGlass from "../components/LegendGlass"
import SettingsMenu from "../components/SettingsMenu"
import AddMenu from "../components/AddMenu.jsx"; // Importa il nuovo componente
import MapLibreMap from "../components/MapLibreMap";
import ErrorBoundary from "../components/ErrorBoundary.jsx"
import InfoWindowMobileSheet from "../components/InfoWindowMobileSheet.jsx"
import DifferenteGroupSideWindow from "../components/DifferenteGroupSideWindow.jsx"
import { LassoToolbar } from "../components/LassoToolbar.jsx"
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx"
import { useMediaQuery } from "../hooks/useMediaQuery.js"

import { translateString, transformDateToIT } from "../utils/utils"
import { createMarkers, setupMarkerClustering, filterMarkers, cleanupMapResources, updateMarkerColors, initEmptyClusterer, appendMarkersToClusterer } from "../utils/createMarkers.jsx"
import useFilteredMarkers from '../hooks/useFilteredMarkers';
import { generateLegendColorMap } from '../hooks/useFilteredMarkers';
import {
  buildTopologyLineFeatures,
  getUnlinkedLightPoints,
  getUnlinkedIdSet,
  canSeeTopologyAnomalies,
  canEditTopology,
  EMPTY_TOPOLOGY_GEOJSON,
  toIdString,
  resolveTopologyPick,
} from "../utils/topologyLines"
import { drawTopologyPolylines, clearTopologyPolylines } from "../utils/createTopologyPolylines"
import {
  setTopologyParent,
  clearTopologyParent,
  fetchTopologyTree,
} from "../utils/topologyApi"

import toast, { Toaster } from "react-hot-toast"


const BASE_URL = import.meta.env.VITE_SERVER_URL
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API
const BATCH_PAGE_SIZE = 500
const BATCH_THRESHOLD = 500
const SURVEYOR_EDIT_ROLES = new Set(["SUPER_ADMIN", "SURVEYOR"])

const STORAGE_KEY_PREFIX = "lighting-map-"
const STORAGE_KEYS = {
  SELECTED_CITY: `${STORAGE_KEY_PREFIX}selected-city`,
  HIGHLIGHT_OPTION: `${STORAGE_KEY_PREFIX}highlight-option`,
  FILTER_OPTION: `${STORAGE_KEY_PREFIX}filter-option`,
  MAP_CENTER: `${STORAGE_KEY_PREFIX}map-center`,
  MAP_ZOOM: `${STORAGE_KEY_PREFIX}map-zoom`,
  VISUALIZATION_MODE: `${STORAGE_KEY_PREFIX}visualization-mode`,
}

function readStoredVisualizationMode() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.VISUALIZATION_MODE)
    if (stored === "semplice" || stored === "complessa") return stored
  } catch (_) {
    /* ignore */
  }
  return "semplice"
}

function readStoredSelectedCity() {
  try {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_CITY) || ""
  } catch (_) {
    return ""
  }
}

function Dashboard() {
  const {
    userData,
    loadSelectedTownhalls,
    downloadReport,
    updateLightPoint,
    updateLightPointsBatch,
    addLightPoint,
    deleteLightPoint,
    refreshToken,
    getTownhallGeojson,
    getTownhallLightpointsCount,
    getTownhallMeta,
    loadTownhallLightPointsPage,
    getTownhallGeojsonPage,
  } = useContext(UserContext)
  const navigate = useNavigate()
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const mapRef = useRef(null)
  const infoWindowRef = useRef(null)
  const userLocationRef = useRef(null)
  const userLocationCircleRef = useRef(null)
  const [map, setMap] = useState(null)
  const [activeMarkers, setActiveMarkers] = useState([])
  const [selectedCity, setSelectedCity] = useState(readStoredSelectedCity)
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
  // false finché tutti i batch non sono arrivati → UI ricerca/filtri/edit disabilitata
  const [isMapDataComplete, setIsMapDataComplete] = useState(false)
  const isMapDataCompleteRef = useRef(false)
  useEffect(() => {
    isMapDataCompleteRef.current = isMapDataComplete
  }, [isMapDataComplete])
  const [loaderVariant, setLoaderVariant] = useState("fullscreen")
  // Progresso loader isolato (aggiornato via ref → non re-renderizza il Dashboard)
  const mapLoadOverlayRef = useRef(null)
  // Abort token separati: semplice e complessa non devono invalidarsi a vicenda
  const simpleLoadAbortRef = useRef(0)
  const complexLoadAbortRef = useRef(0)
  const mapLoadAbortRef = complexLoadAbortRef // alias legacy per cleanupAndLoadMapData
  const getTownhallGeojsonRef = useRef(getTownhallGeojson)
  const getTownhallGeojsonPageRef = useRef(getTownhallGeojsonPage)
  const getTownhallMetaRef = useRef(getTownhallMeta)
  getTownhallGeojsonRef.current = getTownhallGeojson
  getTownhallGeojsonPageRef.current = getTownhallGeojsonPage
  getTownhallMetaRef.current = getTownhallMeta
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

  // Stato per la mappa città -> numero punti luce (usato anche dal loader)
  const [cityLightPointsMap, setCityLightPointsMap] = useState({})
  const [isLoadingCityLightPoints, setIsLoadingCityLightPoints] = useState(false)

  // Stato per mostrare/nascondere il numero quadro sui marker
  const [showPanelNumber, setShowPanelNumber] = useState(true)
  // Stato per mostrare/nascondere il numero palo sui punti luce
  const [showStreetLampNumber, setShowStreetLampNumber] = useState(false)
  // Toggle linee elettriche (topologia parent) a livello comune
  const [showTopologyLines, setShowTopologyLines] = useState(false)
  const topologyPolylinesRef = useRef([])
  const [isTopologyEditMode, setIsTopologyEditMode] = useState(false)
  const isTopologyEditModeRef = useRef(false)
  const [topologyEditFirst, setTopologyEditFirst] = useState(null)
  /** Se valorizzato (da InfoWindow): prossimo click = parent, questo = child */
  const [topologyPendingChild, setTopologyPendingChild] = useState(null)
  const topologyTreeCacheRef = useRef(new Map())
  const [topologyPowerById, setTopologyPowerById] = useState({})
  const handleTopologyPointPickRef = useRef(null)
  const handleSetParentFromInfoRef = useRef(null)
  const handleClearParentFromInfoRef = useRef(null)
  const getTopologyPowerRef = useRef(null)
  const topologyLinkInFlightRef = useRef(false)
  const [showUnlinkedChip, setShowUnlinkedChip] = useState(false)

  // Stato per la modalità di visualizzazione ("semplice" o "complessa")
  // Init da localStorage per evitare flash "complessa" → Google Maps che invalida il load semplice
  const [visualizationMode, setVisualizationMode] = useState(readStoredVisualizationMode)
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
  const [mapLibreInstance, setMapLibreInstance] = useState(null)
  const [selectedMarkerForInfo, setSelectedMarkerForInfo] = useState(null);
  const [electricPanels, setElectricPanels] = useState([]);
  // Strumento lazo (solo desktop + modalità semplice + SUPER_ADMIN)
  const [isLassoActive, setIsLassoActive] = useState(false)
  const [lassoSelectedIds, setLassoSelectedIds] = useState([])
  const [lassoOriginalPositions, setLassoOriginalPositions] = useState({})
  const [lassoHasMoved, setLassoHasMoved] = useState(false)
  const [isLassoSaving, setIsLassoSaving] = useState(false)
  const [lassoLinkParentMode, setLassoLinkParentMode] = useState(false)
  const [isLassoLinking, setIsLassoLinking] = useState(false)
  const [lassoScaleMode, setLassoScaleMode] = useState(false)
  const [lassoRotateMode, setLassoRotateMode] = useState(false)
  const [confirmDialogState, setConfirmDialogState] = useState({
    open: false,
    title: "",
    description: "",
    confirmLabel: "Conferma",
    cancelLabel: "Annulla",
    variant: "danger",
  })
  const confirmResolverRef = useRef(null)
  // Ref per gestire il poligono dei confini del comune su Google Maps
  const townhallBorderRef = useRef(null)
  const townhallBorderFeaturesRef = useRef([])

  useEffect(() => {
    if (visualizationMode !== "semplice" || !selectedCity) {
      setSimpleMarkers([])
      setActiveMarkers([])
      return undefined
    }

    let cancelled = false
    const loadId = ++simpleLoadAbortRef.current

    const toActiveFormat = (markers) =>
      markers.map((m) => {
        let lat = m.lat
        let lng = m.lng
        if (typeof lat === "string") lat = parseFloat(lat.replace(",", "."))
        if (typeof lng === "string") lng = parseFloat(lng.replace(",", "."))
        m.lat = typeof lat === "number" && !isNaN(lat) ? lat.toString() : ""
        m.lng = typeof lng === "number" && !isNaN(lng) ? lng.toString() : ""
        return { data: m, ref: "" }
      })

    async function loadSimpleBatched() {
      setIsMapDataComplete(false)
      setIsMapLoading(true)
      setLoaderVariant("fullscreen")
      setSimpleMarkers([])
      setActiveMarkers([])
      setAllMarkersData([])

      const expectedTotal = cityLightPointsMap[selectedCity] || 0
      mapLoadOverlayRef.current?.reset(expectedTotal)
      mapLoadOverlayRef.current?.update({
        progress: null,
        stage: "Caricamento punti luce...",
        processed: null,
        total: expectedTotal,
      })

      try {
        const metaRes = await getTownhallMetaRef.current(selectedCity)
        if (cancelled || loadId !== simpleLoadAbortRef.current) return

        const total = metaRes?.data?.total ?? expectedTotal
        mapLoadOverlayRef.current?.update({ total, processed: null })

        if (total <= BATCH_THRESHOLD) {
          const res = await getTownhallGeojsonRef.current(selectedCity)
          if (cancelled || loadId !== simpleLoadAbortRef.current) return
          if (res?.data?.features) {
            const features = res.data.features
            const nextSimpleMarkers = features.map((f) => {
              const props = f.properties || {}
              props.lat = f.geometry.coordinates[1]
              props.lng = f.geometry.coordinates[0]
              props.city = res.data.city
              return props
            })
            setSimpleMarkers(nextSimpleMarkers)
            const activeMarkersFormat = toActiveFormat(nextSimpleMarkers)
            setActiveMarkers(activeMarkersFormat)
            setAllMarkersData(activeMarkersFormat)
            setElectricPanels([
              ...new Set(
                activeMarkersFormat
                  .filter((marker) => marker.data.marker === "QE")
                  .map((marker) => marker.data.numero_palo)
                  .filter(Boolean),
              ),
            ])
          }
          setIsMapDataComplete(true)
          setIsMapLoading(false)
          return
        }

        // Batch: mappa subito (compact overlay)
        setLoaderVariant("compact")
        setIsMapLoading(false)
        mapLoadOverlayRef.current?.update({
          stage: "Download punti luce...",
          progress: 0,
          processed: 0,
          total,
        })

        const acc = []
        let offset = 0
        while (offset < total) {
          const pageRes = await getTownhallGeojsonPageRef.current(
            selectedCity,
            offset,
            BATCH_PAGE_SIZE,
          )
          if (cancelled || loadId !== simpleLoadAbortRef.current) return

          const features = pageRes?.data?.features || []
          const pageTotal = pageRes?.data?.total ?? total
          const city = pageRes?.data?.city || selectedCity

          for (const f of features) {
            const props = f.properties || {}
            props.lat = f.geometry.coordinates[1]
            props.lng = f.geometry.coordinates[0]
            props.city = city
            acc.push(props)
          }

          setSimpleMarkers([...acc])
          offset += BATCH_PAGE_SIZE
          const processed = Math.min(offset, pageTotal)
          mapLoadOverlayRef.current?.update({
            stage: "Download punti luce...",
            processed,
            total: pageTotal,
            progress: Math.round((processed / pageTotal) * 100),
          })
        }

        if (cancelled || loadId !== simpleLoadAbortRef.current) return

        const activeMarkersFormat = toActiveFormat(acc)
        setActiveMarkers(activeMarkersFormat)
        setAllMarkersData(activeMarkersFormat)
        setElectricPanels([
          ...new Set(
            activeMarkersFormat
              .filter((marker) => marker.data.marker === "QE")
              .map((marker) => marker.data.numero_palo)
              .filter(Boolean),
          ),
        ])
        setIsMapDataComplete(true)
      } catch (e) {
        console.error(e)
        if (!cancelled) {
          setSimpleMarkers([])
          setActiveMarkers([])
          setAllMarkersData([])
          setElectricPanels([])
          setIsMapDataComplete(true)
          setIsMapLoading(false)
        }
      }
    }

    loadSimpleBatched()
    return () => {
      cancelled = true
    }
  }, [visualizationMode, selectedCity])

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

  const seeTopologyAnomalies = canSeeTopologyAnomalies(userData)
  const canEditTopo = canEditTopology(userData)

  useEffect(() => {
    isTopologyEditModeRef.current = isTopologyEditMode
  }, [isTopologyEditMode])

  useEffect(() => {
    handleTopologyPointPickRef.current = handleTopologyPointPick
  })
  useEffect(() => {
    handleSetParentFromInfoRef.current = handleSetParentFromInfo
  })
  useEffect(() => {
    handleClearParentFromInfoRef.current = handleClearParentFromInfo
  })
  useEffect(() => {
    getTopologyPowerRef.current = getTopologyPower
  })

  const invalidateTopologyTreeCache = useCallback((quadro) => {
    if (!quadro) {
      topologyTreeCacheRef.current.clear()
      return
    }
    topologyTreeCacheRef.current.delete(String(quadro))
  }, [])

  /** Applica in locale parent/quadro restituiti da setParent (assorbimento linea). */
  const applyTopologyUpdates = useCallback((updates) => {
    if (!Array.isArray(updates) || updates.length === 0) return
    const byId = new Map(
      updates.map((u) => [
        String(u._id),
        {
          parent: u.parent == null || u.parent === "" ? null : String(u.parent),
          ...(u.quadro !== undefined ? { quadro: u.quadro } : {}),
        },
      ]),
    )

    const patch = (m) => {
      const upd = byId.get(String(m._id))
      return upd ? { ...m, ...upd } : m
    }

    setSimpleMarkers((prev) => prev.map(patch))
    setAllMarkersData((prev) =>
      prev.map((entry) =>
        entry.data && byId.has(String(entry.data._id))
          ? { ...entry, data: patch(entry.data) }
          : entry,
      ),
    )
    setSelectedMarkerForInfo((prev) => (prev ? patch(prev) : prev))
  }, [])

  const applyLocalParentUpdate = useCallback(
    (childId, parentId) => {
      applyTopologyUpdates([{ _id: childId, parent: parentId ?? null }])
    },
    [applyTopologyUpdates],
  )

  const ensureTopologyTree = useCallback(
    async (quadro) => {
      if (!quadro || !selectedCity) return null
      const key = String(quadro)
      if (topologyTreeCacheRef.current.has(key)) {
        return topologyTreeCacheRef.current.get(key)
      }
      try {
        const tree = await fetchTopologyTree({
          townHall: selectedCity,
          quadro: key,
        })
        topologyTreeCacheRef.current.set(key, tree)
        const powerMap = {}
        for (const node of tree?.nodes || []) {
          powerMap[String(node._id)] = {
            local: node.local_power ?? 0,
            subtree: node.subtree_power ?? 0,
          }
        }
        setTopologyPowerById((prev) => ({ ...prev, ...powerMap }))
        return tree
      } catch (err) {
        console.error("Errore fetch topology tree:", err)
        return null
      }
    },
    [selectedCity],
  )

  const getTopologyPower = useCallback(
    (marker) => {
      if (!marker?._id || !seeTopologyAnomalies) return null
      const power = topologyPowerById[String(marker._id)]
      return power || null
    },
    [topologyPowerById, seeTopologyAnomalies],
  )

  const linkTopologyParent = useCallback(
    async (childMarker, parentMarker, { continueChain = true } = {}) => {
      const childPick = resolveTopologyPick(childMarker)
      const parentPick = resolveTopologyPick(parentMarker)
      if (!childPick || !parentPick) {
        toast.error("Seleziona un punto luce o un quadro valido.", { id: "topology-link" })
        return
      }

      const parentRep = parentPick.representative
      const parentId = toIdString(parentRep._id)
      const childMembers = childPick.members.filter(
        (m) => m?.marker !== "QE" && toIdString(m._id) && toIdString(m._id) !== parentId,
      )

      if (!childMembers.length) {
        toast.error("Nessun punto luce valido da collegare.", { id: "topology-link" })
        return
      }
      if (childMembers.some((m) => toIdString(m._id) === parentId)) {
        toast.error("Non puoi collegare un punto a se stesso.", { id: "topology-link" })
        return
      }
      if (topologyLinkInFlightRef.current) return

      topologyLinkInFlightRef.current = true
      let success = false
      let lastResult = null
      const allUpdates = []
      try {
        for (const child of childMembers) {
          const result = await setTopologyParent(child._id, parentId)
          lastResult = result
          if (Array.isArray(result?.updates) && result.updates.length > 0) {
            allUpdates.push(...result.updates)
          } else {
            const valleId = result?.valle_id || child._id
            const monteId = result?.parent_id || parentId
            allUpdates.push({
              _id: valleId,
              parent: monteId,
              ...(result?.quadro != null ? { quadro: result.quadro } : {}),
            })
          }
        }

        if (allUpdates.length) applyTopologyUpdates(allUpdates)

        const quadroKey =
          lastResult?.quadro ||
          childMembers[0]?.quadro ||
          parentRep.quadro ||
          ""
        invalidateTopologyTreeCache(childMembers[0]?.quadro)
        invalidateTopologyTreeCache(parentRep.quadro)
        if (quadroKey) {
          invalidateTopologyTreeCache(quadroKey)
          await ensureTopologyTree(quadroKey)
        }

        const labelChild =
          childPick.groupLabel ||
          childMembers.map((m) => m.numero_palo).filter(Boolean).join("+") ||
          "a valle"
        const labelParent = parentPick.groupLabel || parentRep.numero_palo || "a monte"
        toast.success(
          childPick.isGroup
            ? `Linea creata: ${labelParent} → differente (${childMembers.length} punti)`
            : `Linea creata: ${labelParent} → ${labelChild}`,
          { id: "topology-link" },
        )
        success = true
      } catch (err) {
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err.message ||
          "Errore nel collegamento"
        toast.error(msg, { id: "topology-link" })
        if (allUpdates.length) applyTopologyUpdates(allUpdates)
      } finally {
        topologyLinkInFlightRef.current = false
        setTopologyPendingChild(null)
        if (success && continueChain) {
          // Per i differente il padre del prossimo anello è uno dei due (il rappresentante)
          const leaf = childPick.representative
          const monteId = toIdString(lastResult?.parent_id) || parentId
          const quadroKey =
            lastResult?.quadro || leaf.quadro || parentRep.quadro || ""
          const nextMonte = {
            ...leaf,
            parent: monteId,
            quadro: quadroKey || leaf.quadro || "",
          }
          setTopologyEditFirst(nextMonte)
          toast(
            `A monte: ${nextMonte.numero_palo || "…"}${
              childPick.isGroup ? " (differente)" : ""
            }. Seleziona il prossimo a valle.`,
            { id: "topology-pick" },
          )
        } else {
          setTopologyEditFirst(null)
        }
      }
    },
    [applyTopologyUpdates, invalidateTopologyTreeCache, ensureTopologyTree],
  )

  const handleTopologyPointPick = useCallback(
    async (marker) => {
      const pick = resolveTopologyPick(marker)
      if (!pick) {
        toast.error("Seleziona un punto luce o un quadro valido.", { id: "topology-pick" })
        return
      }

      // Flusso InfoWindow: child già scelto, questo click è il parent
      if (topologyPendingChild) {
        await linkTopologyParent(topologyPendingChild, marker, { continueChain: false })
        return
      }

      if (!topologyEditFirst) {
        setTopologyEditFirst(marker)
        const label = pick.groupLabel || pick.representative.numero_palo || pick.representative._id
        toast(
          `Punto a monte: ${label}${pick.isGroup ? " (differente)" : ""}. Seleziona ora il punto a valle.`,
          { id: "topology-pick" },
        )
        return
      }

      const firstPick = resolveTopologyPick(topologyEditFirst)
      const sameGroup =
        pick.isGroup &&
        firstPick?.isGroup &&
        String(marker.differente_group_id || "") ===
          String(topologyEditFirst.differente_group_id || "")
      const sameSingle =
        !pick.isGroup &&
        !firstPick?.isGroup &&
        String(pick.representative._id) === String(firstPick?.representative?._id)

      if (sameGroup || sameSingle) {
        setTopologyEditFirst(null)
        toast("Selezione annullata.", { id: "topology-pick" })
        return
      }

      await linkTopologyParent(marker, topologyEditFirst, { continueChain: true })
    },
    [topologyPendingChild, topologyEditFirst, linkTopologyParent],
  )

  const handleCancelTopologySelection = useCallback((event) => {
    event?.preventDefault?.()
    event?.stopPropagation?.()
    setTopologyEditFirst(null)
    setTopologyPendingChild(null)
    toast.dismiss("topology-pick")
    toast("Selezione annullata.", { id: "topology-cancel" })
  }, [])

  const exitTopologyEditMode = useCallback(() => {
    setIsTopologyEditMode(false)
    setTopologyEditFirst(null)
    setTopologyPendingChild(null)
    toast.dismiss("topology-pick")
    toast.dismiss("topology-mode")
  }, [])

  const handleToggleTopologyEdit = useCallback(() => {
    setIsTopologyEditMode((prev) => {
      const next = !prev
      if (next) {
        setShowTopologyLines(true)
        if (isLassoActive) {
          setIsLassoActive(false)
          setLassoSelectedIds([])
          setLassoLinkParentMode(false)
        }
        toast("Modalità linee attiva: seleziona a monte, poi a valle. ESC per uscire.", {
          id: "topology-mode",
        })
      } else {
        setTopologyEditFirst(null)
        setTopologyPendingChild(null)
        toast.dismiss("topology-pick")
      }
      return next
    })
  }, [isLassoActive])

  const handleSetParentFromInfo = useCallback(
    (marker) => {
      if (!canEditTopo || !marker) return
      setIsTopologyEditMode(true)
      setShowTopologyLines(true)
      setTopologyEditFirst(null)
      setTopologyPendingChild(marker)
      setSelectedMarkerForInfo(null)
      if (currentInfoWindow) {
        try {
          currentInfoWindow.close()
        } catch {
          /* ignore */
        }
        setCurrentInfoWindow(null)
      }
      toast("Seleziona sulla mappa il punto a monte (genitore).", {
        id: "topology-pick",
      })
    },
    [canEditTopo, currentInfoWindow],
  )

  const handleClearParentFromInfo = useCallback(
    async (marker) => {
      if (!canEditTopo || !marker?._id) return
      try {
        await clearTopologyParent(marker._id)
        applyLocalParentUpdate(marker._id, null)
        invalidateTopologyTreeCache(marker.quadro)
        toast.success("Linea scollegata.", { id: "topology-link" })
      } catch (err) {
        const msg =
          err?.response?.data?.error || err.message || "Errore nello scollegamento"
        toast.error(msg, { id: "topology-link" })
      }
    },
    [canEditTopo, applyLocalParentUpdate, invalidateTopologyTreeCache],
  )

  // Precarica potenze quando si apre un marker con quadro
  useEffect(() => {
    if (!seeTopologyAnomalies || !selectedMarkerForInfo?.quadro) return
    ensureTopologyTree(selectedMarkerForInfo.quadro)
  }, [selectedMarkerForInfo, seeTopologyAnomalies, ensureTopologyTree])

  // Reset edit mode al cambio città
  useEffect(() => {
    setIsTopologyEditMode(false)
    setTopologyEditFirst(null)
    setTopologyPendingChild(null)
    topologyTreeCacheRef.current.clear()
    setTopologyPowerById({})
    setShowUnlinkedChip(false)
  }, [selectedCity])

  // Chip "pali senza linea": 3s dopo caricamento completo città
  useEffect(() => {
    if (!isMapDataComplete || !selectedCity || !seeTopologyAnomalies) {
      setShowUnlinkedChip(false)
      return undefined
    }
    setShowUnlinkedChip(true)
    const timer = setTimeout(() => setShowUnlinkedChip(false), 3000)
    return () => clearTimeout(timer)
  }, [isMapDataComplete, selectedCity, seeTopologyAnomalies])

  const topologySourceMarkers = useMemo(() => {
    if (visualizationMode === "semplice") return simpleMarkers
    return allMarkersData.map((m) => m.data).filter(Boolean)
  }, [visualizationMode, simpleMarkers, allMarkersData])

  const existingPoleNumbers = useMemo(() => {
    return new Set(
      topologySourceMarkers
        .map((marker) => String(marker?.numero_palo || "").trim().toLowerCase())
        .filter(Boolean),
    )
  }, [topologySourceMarkers])

  const topologyGeojson = useMemo(
    () => buildTopologyLineFeatures(topologySourceMarkers),
    [topologySourceMarkers],
  )

  const unlinkedLightPoints = useMemo(
    () => (seeTopologyAnomalies ? getUnlinkedLightPoints(topologySourceMarkers) : []),
    [topologySourceMarkers, seeTopologyAnomalies],
  )

  const unlinkedIdSet = useMemo(
    () => (seeTopologyAnomalies ? getUnlinkedIdSet(topologySourceMarkers) : new Set()),
    [topologySourceMarkers, seeTopologyAnomalies],
  )

  const mapLibreGeojsonData = useMemo(() => {
    const base = simpleGeojsonData || EMPTY_TOPOLOGY_GEOJSON
    if (!showTopologyLines || !seeTopologyAnomalies || !base.features) return base
    return {
      ...base,
      features: base.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          topology_unlinked:
            f.properties?.marker === "PL" &&
            !f.properties?.is_differente_group &&
            !toIdString(f.properties?.parent),
        },
      })),
    }
  }, [simpleGeojsonData, showTopologyLines, seeTopologyAnomalies])

  // Google: disegna/rimuove Polyline topologiche
  useEffect(() => {
    if (visualizationMode !== "complessa" || !map || !showTopologyLines) {
      clearTopologyPolylines(topologyPolylinesRef)
      return undefined
    }
    drawTopologyPolylines(map, topologySourceMarkers, topologyPolylinesRef)
    return () => clearTopologyPolylines(topologyPolylinesRef)
  }, [visualizationMode, map, showTopologyLines, topologySourceMarkers])

  // Google: badge PL scollegati senza ricaricare tutto il clusterer
  // (gestito dall'effect updateMarkerColors più sotto, che include showTopologyLines)

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
    localStorage.setItem("lighting-map-show-topology-lines", JSON.stringify(showTopologyLines))
    localStorage.setItem(STORAGE_KEYS.VISUALIZATION_MODE, visualizationMode)
    // Save map position if available
    if (map) {
      const center = map.getCenter()
      if (center) {
        localStorage.setItem(STORAGE_KEYS.MAP_CENTER, JSON.stringify({ lat: center.lat(), lng: center.lng() }))
      }
      localStorage.setItem(STORAGE_KEYS.MAP_ZOOM, map.getZoom().toString())
    }
  }, [selectedCity, highlightOption, filterOption, map, showPanelNumber, showStreetLampNumber, showTopologyLines, visualizationMode])

  // Chiudi lo sheet marker al cambio città / modalità
  useEffect(() => {
    setSelectedMarkerForInfo(null)
  }, [selectedCity, visualizationMode])

  useEffect(() => {
    if (visualizationMode !== "semplice") {
      setMapLibreInstance(null)
    }
  }, [visualizationMode])


  // Add this function to restore state from localStorage
  const restoreStateFromStorage = useCallback(() => {
    const storedCity = localStorage.getItem(STORAGE_KEYS.SELECTED_CITY)
    const storedHighlight = localStorage.getItem(STORAGE_KEYS.HIGHLIGHT_OPTION)
    const storedFilter = localStorage.getItem(STORAGE_KEYS.FILTER_OPTION)
    const storedShowPanelNumber = localStorage.getItem("lighting-map-show-panel-number")
    const storedShowStreetLampNumber = localStorage.getItem("lighting-map-show-streetlamp-number")
    const storedShowTopologyLines = localStorage.getItem("lighting-map-show-topology-lines")
    const storedVisualizationMode = localStorage.getItem(STORAGE_KEYS.VISUALIZATION_MODE)

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
    if (storedShowTopologyLines !== null) {
      setShowTopologyLines(JSON.parse(storedShowTopologyLines))
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
    // Un solo init: restore da storage (o fallback al primo comune), evita Alba→stored che abortisce il load
    restoreStateFromStorage()
  }, [userData, navigate, restoreStateFromStorage])

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
      clearTopologyPolylines(topologyPolylinesRef)
      cleanupMapResources()
      setMap(null) // azzera lo stato mappa quando il componente viene smontato
    }
  }, [visualizationMode])

  // Effect to load map data when map is ready and city is selected (solo modalità complessa)
  useEffect(() => {
    if (visualizationMode !== "complessa") return
    if (map && selectedCity) {
      // Reset city data loaded flag
      setCityDataLoaded(false)

      // Clean up previous data and load new data
      cleanupAndLoadMapData()
    }
  }, [map, selectedCity, visualizationMode])

  // Effetto per caricare e mostrare i confini del comune in modalità "complessa"
  useEffect(() => {
    // Pulisce eventuale poligono esistente
    const cleanupBorder = () => {
      // Rimuovi eventuali Feature aggiunti in precedenza
      if (map && townhallBorderFeaturesRef.current && townhallBorderFeaturesRef.current.length) {
        townhallBorderFeaturesRef.current.forEach(f => {
          try { map.data.remove(f) } catch (_) {}
        })
        townhallBorderFeaturesRef.current = []
      }
    }

    if (!map || visualizationMode !== 'complessa' || !selectedCity) {
      cleanupBorder()
      return
    }

    const fetchAndRenderBorders = async () => {
      try {
        // Endpoint: restituisce GeoJSON con struttura fissa: Feature con geometry.type === 'Polygon'
        const res = await api.get(`/borders/townhall-name/${encodeURIComponent(selectedCity)}`)
        const geojson = res.data

        // Normalizza in array di poligoni. Struttura attesa: Feature con Polygon
        const polygons = []
        if (geojson?.type === 'Feature') {
          const g = geojson.geometry
          if (g?.type === 'Polygon') polygons.push(g.coordinates)
          if (g?.type === 'MultiPolygon') polygons.push(...g.coordinates)
        } else if (geojson?.type === 'Polygon') {
          polygons.push(geojson.coordinates)
        } else if (geojson?.type === 'FeatureCollection') {
          geojson.features?.forEach(f => {
            if (f.geometry?.type === 'Polygon') polygons.push(f.geometry.coordinates)
            if (f.geometry?.type === 'MultiPolygon') polygons.push(...f.geometry.coordinates)
          })
        } else if (geojson?.type === 'MultiPolygon') {
          polygons.push(...geojson.coordinates)
        }

        if (polygons.length === 0) {
          cleanupBorder()
          return
        }

        // Pulisci feature precedenti
        cleanupBorder()

        // Stile del Data Layer (si applica ai feature caricati)
        map.data.setStyle({
          strokeColor: '#60A5FA',
          strokeOpacity: 0.9,
          strokeWeight: 2,
          fillColor: '#93C5FD',
          fillOpacity: 0.08,
          clickable: false,
          zIndex: 5,
        })

        // Aggiungi GeoJSON direttamente al layer dati
        const added = map.data.addGeoJson(geojson)
        townhallBorderFeaturesRef.current = added
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Errore caricando i confini del comune:', err)
        }
        // In caso di errore, rimuove eventuali residui
        cleanupBorder()
      }
    }

    fetchAndRenderBorders()

    // Cleanup quando dipendenze cambiano o all'unmount
    return () => {
      cleanupBorder()
    }
  }, [map, selectedCity, visualizationMode])

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
      updateMarkerColors(
        allMarkersData,
        highlightOption,
        editingMarkerId,
        showPanelNumber,
        showStreetLampNumber,
        showTopologyLines && seeTopologyAnomalies,
        unlinkedIdSet,
      )
    }
  }, [highlightOption, editingMarkerId, allMarkersData, showPanelNumber, showStreetLampNumber, showTopologyLines, seeTopologyAnomalies, unlinkedIdSet])

  // Quando cambia showPanelNumber o showStreetLampNumber, forza il cleanup e il rerender dei marker
  useEffect(() => {
    if (visualizationMode !== "complessa") return
    if (map && selectedCity && cityDataLoaded) {
      cleanupMapResources();
      // Ricarica i marker con il nuovo stato showPanelNumber/showStreetLampNumber
      cleanupAndLoadMapData();
    }
  }, [showPanelNumber, showStreetLampNumber, visualizationMode]);

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
      // Cleanup finale confini dal Data Layer
      if (map && townhallBorderFeaturesRef.current && townhallBorderFeaturesRef.current.length) {
        townhallBorderFeaturesRef.current.forEach(f => {
          try { map.data.remove(f) } catch (_) {}
        })
        townhallBorderFeaturesRef.current = []
      }
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
        //mapLibreRef.current.off("moveend", handleMoveEnd);
      };
    }
  }, [map,mapLibreRef, visualizationMode]);

  // Function to clean up previous data and load new data
  const cleanupAndLoadMapData = async () => {
    if (visualizationMode !== "complessa" || !selectedCity || !map) return

    const loadId = ++complexLoadAbortRef.current

    try {
      setIsMapDataComplete(false)
      setIsMapLoading(true)
      setLoaderVariant("fullscreen")

      const expectedTotal = cityLightPointsMap[selectedCity] || 0
      mapLoadOverlayRef.current?.reset(expectedTotal)
      mapLoadOverlayRef.current?.update({
        progress: null,
        stage: "Inizializzazione mappa...",
        processed: null,
        total: expectedTotal,
      })

      cleanupPreviousData()

      mapLoadOverlayRef.current?.update({
        stage: "Caricamento punti luce...",
        progress: null,
        processed: null,
      })

      const metaRes = await getTownhallMeta(selectedCity)
      if (loadId !== mapLoadAbortRef.current) return

      const total = metaRes?.data?.total ?? expectedTotal
      const center = metaRes?.data?.center

      if (center?.lat != null && center?.lng != null) {
        map.setCenter(new window.google.maps.LatLng(center.lat, center.lng))
      }

      mapLoadOverlayRef.current?.update({ total, processed: null })

      if (total <= BATCH_THRESHOLD) {
        const response = await loadSelectedTownhalls(selectedCity)
        if (loadId !== mapLoadAbortRef.current) return

        const data = await response?.data
        const puntiLuce = data?.punti_luce || []

        mapLoadOverlayRef.current?.update({
          stage: "Creazione cluster...",
          progress: 5,
          processed: 0,
          total: puntiLuce.length,
        })

        const { markers: allMarkers } = await setupMarkerClustering(
          puntiLuce,
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
          handleDuplicateElement,
          showPanelNumber,
          showStreetLampNumber,
          setSelectedMarkerForInfo,
          ({ processed, total: batchTotal }) => {
            if (!batchTotal) return
            mapLoadOverlayRef.current?.update({
              progress: 5 + Math.round((processed / batchTotal) * 85),
              processed,
              total: batchTotal,
              stage: "Creazione cluster...",
            })
          },
          {
            showTopologyLines: showTopologyLines && canSeeTopologyAnomalies(userData),
            unlinkedIdSet: canSeeTopologyAnomalies(userData)
              ? getUnlinkedIdSet(puntiLuce)
              : null,
            getIsTopologyEditMode: () => isTopologyEditModeRef.current,
            onTopologyPointPick: (m) => handleTopologyPointPickRef.current?.(m),
            onSetParentClick: (m) => handleSetParentFromInfoRef.current?.(m),
            onClearParentClick: (m) => handleClearParentFromInfoRef.current?.(m),
            getTopologyPower: (m) => getTopologyPowerRef.current?.(m),
          },
        )

        if (loadId !== mapLoadAbortRef.current) return

        setAllMarkersData(allMarkers)
        const filteredMarkers = filterMarkers(
          allMarkers,
          filterOption,
          map,
          selectedProprietaFilter,
        )
        setActiveMarkers(filteredMarkers)
        setLegendColorMap(
          generateLegendColorMap(
            filteredMarkers.map((m) => m.data),
            highlightOption,
          ),
        )
        setElectricPanels([
          ...new Set(
            allMarkers
              .filter((marker) => marker.data.marker === "QE")
              .map((marker) => marker.data.numero_palo)
              .filter(Boolean),
          ),
        ])

        if (!center && puntiLuce.length > 0) {
          const first = puntiLuce[0]
          const lat =
            typeof first.lat === "string" ? first.lat.replace(",", ".") : first.lat
          const lng =
            typeof first.lng === "string" ? first.lng.replace(",", ".") : first.lng
          map.setCenter(
            new window.google.maps.LatLng(
              Number.parseFloat(lat),
              Number.parseFloat(lng),
            ),
          )
        }

        startGeolocation()
        setCityDataLoaded(true)
        setIsMapDataComplete(true)
        setIsMapLoading(false)
        return
      }

      await initEmptyClusterer(map)
      if (loadId !== mapLoadAbortRef.current) return

      setLoaderVariant("compact")
      setIsMapLoading(false)
      mapLoadOverlayRef.current?.update({
        stage: "Download punti luce...",
        progress: 0,
        processed: 0,
        total,
      })

      const allMarkersAcc = []
      let offset = 0
      let legendSeed = null

      while (offset < total) {
        const pageRes = await loadTownhallLightPointsPage(
          selectedCity,
          offset,
          BATCH_PAGE_SIZE,
        )
        if (loadId !== mapLoadAbortRef.current) return

        const items = pageRes?.data?.items || []
        const pageTotal = pageRes?.data?.total ?? total

        if (!legendSeed && items.length > 0) {
          legendSeed = generateLegendColorMap(items, highlightOption)
        }

        const batchMarkers = await createMarkers(
          items,
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
          {
            skipGrouping: true,
            colorMappings: legendSeed || undefined,
            showTopologyLines: false,
            unlinkedIdSet: null,
            getIsTopologyEditMode: () => isTopologyEditModeRef.current,
            onTopologyPointPick: (m) => handleTopologyPointPickRef.current?.(m),
            onSetParentClick: (m) => handleSetParentFromInfoRef.current?.(m),
            onClearParentClick: (m) => handleClearParentFromInfoRef.current?.(m),
            getTopologyPower: (m) => getTopologyPowerRef.current?.(m),
          },
        )

        if (loadId !== mapLoadAbortRef.current) return

        appendMarkersToClusterer(batchMarkers)
        allMarkersAcc.push(...batchMarkers)

        offset += BATCH_PAGE_SIZE
        const processed = Math.min(allMarkersAcc.length, pageTotal)
        mapLoadOverlayRef.current?.update({
          stage: "Download punti luce...",
          processed,
          total: pageTotal,
          progress: Math.round((processed / Math.max(pageTotal, 1)) * 100),
        })
      }

      if (loadId !== mapLoadAbortRef.current) return

      mapLoadOverlayRef.current?.update({
        stage: "Ottimizzazione visualizzazione...",
        progress: 95,
        processed: allMarkersAcc.length,
        total: allMarkersAcc.length,
      })

      setAllMarkersData(allMarkersAcc)
      const filteredMarkers = filterMarkers(
        allMarkersAcc,
        filterOption,
        map,
        selectedProprietaFilter,
      )
      setActiveMarkers(filteredMarkers)
      setLegendColorMap(
        generateLegendColorMap(
          filteredMarkers.map((m) => m.data),
          highlightOption,
        ),
      )
      updateMarkerColors(
        allMarkersAcc,
        highlightOption,
        editingMarkerId,
        showPanelNumber,
        showStreetLampNumber,
        showTopologyLines && canSeeTopologyAnomalies(userData),
        canSeeTopologyAnomalies(userData) ? getUnlinkedIdSet(allMarkersAcc.map((m) => m.data)) : null,
      )
      setElectricPanels([
        ...new Set(
          allMarkersAcc
            .filter((marker) => marker.data.marker === "QE")
            .map((marker) => marker.data.numero_palo)
            .filter(Boolean),
        ),
      ])

      startGeolocation()
      setCityDataLoaded(true)
      setIsMapDataComplete(true)
      setIsMapLoading(false)
    } catch (error) {
      console.error("Error loading map data:", error)
      if (loadId === mapLoadAbortRef.current) {
        setIsMapLoading(false)
        setCityDataLoaded(false)
        setIsMapDataComplete(true)
        mapLoadOverlayRef.current?.reset()
      }
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
    // Rimuovi i confini aggiunti nel Data Layer
    if (map && townhallBorderFeaturesRef.current && townhallBorderFeaturesRef.current.length) {
      townhallBorderFeaturesRef.current.forEach(f => {
        try { map.data.remove(f) } catch (_) {}
      })
      townhallBorderFeaturesRef.current = []
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
            toast.error("Street View non disponibile in questa posizione")
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

  const requestConfirm = useCallback((config = {}) => {
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve
      setConfirmDialogState({
        open: true,
        title: config.title || "Conferma azione",
        description: config.description || "Sei sicuro di voler continuare?",
        confirmLabel: config.confirmLabel || "Conferma",
        cancelLabel: config.cancelLabel || "Annulla",
        variant: config.variant || "danger",
      })
    })
  }, [])

  const resolveConfirmDialog = useCallback((answer) => {
    setConfirmDialogState((prev) => ({ ...prev, open: false }))
    if (confirmResolverRef.current) {
      confirmResolverRef.current(answer)
      confirmResolverRef.current = null
    }
  }, [])

  const handleSearch = (query) => {
    if (!isMapDataCompleteRef.current) return
    if (!searchQuery && !query) {
      toast.error("Inserisci un valore di ricerca")
      return
    }

    let queryToSend = query || searchQuery

    let results = []

    if (visualizationMode === "semplice") {
      // Cerca tra le features del GeoJSON
      if (!simpleGeojsonData || !simpleGeojsonData.features) {
        toast.error("Nessun dato disponibile per la ricerca")
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
        toast("Nessun risultato trovato")
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
      toast("Nessun risultato trovato")
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

  const handleNavigateToPointFromPanel = (lat, lng, numeroPalo) => {
    const latNum = parseFloat(lat)
    const lngNum = parseFloat(lng)
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return

    setShowInfoPanel(false)

    if (visualizationMode === "semplice") {
      if (mapLibreRef.current?.flyTo) {
        mapLibreRef.current.flyTo({
          center: [lngNum, latNum],
          zoom: 30,
        })
      }
    } else if (map) {
      map.setCenter(new window.google.maps.LatLng(latNum, lngNum))
      const found = allMarkersData.find(
        (m) =>
          m.data.numero_palo === numeroPalo ||
          (parseFloat(m.data.lat) === latNum && parseFloat(m.data.lng) === lngNum),
      )
      if (found?.ref) {
        if (!infoWindowRef.current) {
          infoWindowRef.current = new window.google.maps.InfoWindow()
        }
        window.google.maps.event.trigger(found.ref, "gmp-click")
      }
    }

    const foundMarker = allMarkersData.find(
      (m) =>
        m.data.numero_palo === numeroPalo ||
        (parseFloat(m.data.lat) === latNum && parseFloat(m.data.lng) === lngNum),
    )
    if (foundMarker) {
      setSelectedMarkerForInfo(foundMarker.data)
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
      `/report?comune=${encodeURIComponent(city)}&id=${encodeURIComponent(id)}`,
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
  const handleEditClick = async (marker) => {
    if (!isMapDataCompleteRef.current) return
    if (SURVEYOR_EDIT_ROLES.has(userData?.user_type)) {

      
      // Se c'è già un marker in modifica, chiedi conferma
      if (editingMarkerRef.current && editingMarkerRef.current._id !== marker._id) {
        if (hasChangesInCurrentMarker()) {
          const shouldSave = await requestConfirm({
            title: "Modifiche non salvate",
            description: "Vuoi salvare prima di modificare un altro punto?",
            confirmLabel: "Salva e continua",
            cancelLabel: "Scarta e continua",
            variant: "default",
          })
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
    
    // Chiudi InfoWindow (popup / sheet) se aperto
    setSelectedMarkerForInfo(null)
    if (currentInfoWindow) {
      try {
        currentInfoWindow.close()
      } catch {
        /* ignore */
      }
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
    if (!isMapDataCompleteRef.current) return
    if (SURVEYOR_EDIT_ROLES.has(userData?.user_type)) {
      setIsAddModalOpen(true)
    }
  }
  const handleDuplicateElement = async (markerToDuplicate = null) => {
    if (!isMapDataCompleteRef.current) return
    if (!SURVEYOR_EDIT_ROLES.has(userData?.user_type)) return;
    const sourceMarker = markerToDuplicate || selectedMarkerForInfo
    if (sourceMarker) {
      setSelectedMarkerForInfo(sourceMarker)
    }

    if (!sourceMarker) {
      toast.error("Seleziona un punto luce o un quadro sulla mappa prima di duplicare.");
      return;
    }

    try {
      const originalData = sourceMarker;
      const duplicatedData = JSON.parse(JSON.stringify(originalData));

      // Rimuovo l'ID e suggerisco un nuovo nome
      delete duplicatedData._id;
      delete duplicatedData.id;
      delete duplicatedData.data_creazione
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
        
        // Centro la mappa sul nuovo punto
        if (visualizationMode === "complessa" && map) {
          handleEditClick(response.data);
          const latLng = new window.google.maps.LatLng(newLat, newLng)
          map.setCenter(latLng);
          map.setZoom(localStorage.getItem(STORAGE_KEYS.MAP_ZOOM) || 20);
        } else if (visualizationMode === "semplice" && mapLibreRef.current) {
          handleEditSimpleClick(response.data);
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
    const parseCoord = (value) => {
      if (typeof value === "number") return value
      if (value == null || value === "") return NaN
      return parseFloat(String(value).replace(",", "."))
    }

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
          const raw = response.data || {}
          const latNum = parseCoord(raw.lat ?? formData.lat)
          const lngNum = parseCoord(raw.lng ?? formData.lng)
          // Stesso shape dei marker caricati da geojson (lat/lng numerici)
          const newMarker = {
            ...raw,
            _id: raw._id != null ? String(raw._id) : raw._id,
            lat: Number.isFinite(latNum) ? latNum : raw.lat,
            lng: Number.isFinite(lngNum) ? lngNum : raw.lng,
            city: raw.city || selectedCity,
            segnalazioni_in_corso: raw.segnalazioni_in_corso || [],
            segnalazioni_risolte: raw.segnalazioni_risolte || [],
            operazioni_effettuate: raw.operazioni_effettuate || [],
          }

          setSimpleMarkers((prev) => [...prev, newMarker])

          return true
        }

        toast.error(response.data?.message || response.data || "Errore durante l'aggiunta dell'elemento");
        return false
      } catch (error) {
        console.error("Errore durante l'aggiunta dell'elemento:", error);
        toast.error(error.response?.data?.message || error.response?.data || "Errore durante l'aggiunta dell'elemento");
        return false
      }
    }

    // Modalità "complessa"
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
          const latNum = parseCoord(formData.lat);
          const lngNum = parseCoord(formData.lng);
          if (!isNaN(latNum) && !isNaN(lngNum)) {
            map.setCenter(new window.google.maps.LatLng(latNum, lngNum));
            map.setZoom(localStorage.getItem(STORAGE_KEYS.MAP_ZOOM) || 18);
          }
        }
        return true
      }

      toast.error(response.data?.message || response.data || "Errore durante l'aggiunta dell'elemento");
      return false
    } catch (error) {
      console.error('Errore durante l\'aggiunta dell\'elemento:', error);
      toast.error(error.response?.data?.message || error.response?.data || 'Errore durante l\'aggiunta dell\'elemento');
      return false
    }
  }

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false)
  }

  // Funzione per gestire l'eliminazione di un marker
  const handleDeleteMarker = async (marker) => {
    if (!SURVEYOR_EDIT_ROLES.has(userData?.user_type)) return
    const isConfirmed = await requestConfirm({
      title: "Conferma eliminazione",
      description: `Sei sicuro di voler eliminare il ${marker.marker === "QE" ? "quadro elettrico" : "punto luce"} "${marker.numero_palo}"? Questa azione non può essere annullata.`,
      confirmLabel: "Elimina",
      cancelLabel: "Annulla",
      variant: "danger",
    })

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
    if (!isMapDataCompleteRef.current) return
    if (!SURVEYOR_EDIT_ROLES.has(userData?.user_type)) return
    // Chiudi InfoWindow (popup desktop / sheet mobile) prima del FAB modifica
    setSelectedMarkerForInfo(null)
    if (currentInfoWindow) {
      try {
        currentInfoWindow.close()
      } catch {
        /* ignore */
      }
      setCurrentInfoWindow(null)
    }
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
    if (!SURVEYOR_EDIT_ROLES.has(userData?.user_type)) return
    const isConfirmed = await requestConfirm({
      title: "Conferma eliminazione",
      description: `Sei sicuro di voler eliminare il ${marker.marker === "QE" ? "quadro elettrico" : "punto luce"} "${marker.numero_palo}"? Questa azione non può essere annullata.`,
      confirmLabel: "Elimina",
      cancelLabel: "Annulla",
      variant: "danger",
    })
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

  const resetLassoSelection = useCallback(() => {
    setLassoSelectedIds([])
    setLassoOriginalPositions({})
    setLassoHasMoved(false)
    setLassoLinkParentMode(false)
    setLassoScaleMode(false)
    setLassoRotateMode(false)
  }, [])

  const deactivateLasso = useCallback(() => {
    setIsLassoActive(false)
    setLassoLinkParentMode(false)
    setLassoScaleMode(false)
    setLassoRotateMode(false)
    resetLassoSelection()
  }, [resetLassoSelection])

  useEffect(() => {
    if (visualizationMode !== "semplice" || !isDesktop) {
      deactivateLasso()
    }
  }, [visualizationMode, isDesktop, deactivateLasso])

  useEffect(() => {
    resetLassoSelection()
  }, [selectedCity, resetLassoSelection])

  // ESC: esci da lazo / modalità linee
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return
      if (event.target?.closest?.("input, textarea, select, [contenteditable='true']")) return

      if (lassoLinkParentMode) {
        event.preventDefault()
        setLassoLinkParentMode(false)
        toast("Collegamento annullato.", { id: "lasso-link" })
        return
      }

      if (lassoScaleMode) {
        event.preventDefault()
        setLassoScaleMode(false)
        toast("Scala distanze disattivata.", { id: "lasso-scale" })
        return
      }

      if (lassoRotateMode) {
        event.preventDefault()
        setLassoRotateMode(false)
        toast("Rotazione disattivata.", { id: "lasso-rotate" })
        return
      }

      if (isLassoActive) {
        event.preventDefault()
        if (lassoHasMoved && Object.keys(lassoOriginalPositions).length) {
          setSimpleMarkers((prev) =>
            prev.map((m) => {
              const original = lassoOriginalPositions[m._id]
              if (!original) return m
              return { ...m, lat: original.lat, lng: original.lng }
            }),
          )
        }
        deactivateLasso()
        toast.success("Strumento lazo disattivato", { id: "lasso-esc" })
        return
      }

      if (isTopologyEditMode || topologyPendingChild) {
        event.preventDefault()
        if (topologyEditFirst || topologyPendingChild) {
          setTopologyEditFirst(null)
          setTopologyPendingChild(null)
          toast.dismiss("topology-pick")
          toast("Selezione annullata.", { id: "topology-cancel" })
          return
        }
        exitTopologyEditMode()
        toast.success("Modalità linee disattivata", { id: "topology-esc" })
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    lassoLinkParentMode,
    lassoScaleMode,
    lassoRotateMode,
    isLassoActive,
    lassoHasMoved,
    lassoOriginalPositions,
    deactivateLasso,
    isTopologyEditMode,
    topologyPendingChild,
    topologyEditFirst,
    exitTopologyEditMode,
  ])

  const handleToggleLasso = () => {
    if (!isMapDataComplete) return
    if (visualizationMode !== "semplice") {
      toast.error("Lo strumento lazo è disponibile solo in modalità semplice")
      return
    }
    if (!isDesktop) {
      toast.error("Lo strumento lazo è disponibile solo da desktop")
      return
    }
    if (isLassoActive) {
      deactivateLasso()
      toast.success("Strumento lazo disattivato")
      return
    }
    setIsTopologyEditMode(false)
    setTopologyEditFirst(null)
    setTopologyPendingChild(null)
    setIsLassoActive(true)
    resetLassoSelection()
    setSelectedMarkerForInfo(null)
    toast.success("Lazo attivo: disegna un'area per selezionare i punti. ESC per uscire.")
  }

  const handleLassoSelect = useCallback((ids) => {
    if (!ids?.length) {
      toast.error("Nessun punto nell'area selezionata")
      return
    }
    const idSet = new Set(ids)
    const originals = {}
    simpleMarkers.forEach((m) => {
      if (!idSet.has(m._id)) return
      const lat = parseFloat(String(m.lat).replace(",", "."))
      const lng = parseFloat(String(m.lng).replace(",", "."))
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        originals[m._id] = { lat, lng }
      }
    })
    setLassoOriginalPositions(originals)
    setLassoSelectedIds(ids)
    setLassoHasMoved(false)
    toast.success(
      ids.length === 1
        ? "1 punto selezionato — trascina per spostarlo"
        : `${ids.length} punti selezionati — trascina per spostarli`
    )
  }, [simpleMarkers])

  const handleLassoGroupMove = useCallback((updates) => {
    if (!updates?.length) return
    const byId = new Map(updates.map((u) => [u._id, u]))
    setSimpleMarkers((prev) =>
      prev.map((m) => {
        const next = byId.get(m._id)
        if (!next) return m
        return { ...m, lat: next.lat, lng: next.lng }
      })
    )
    setLassoHasMoved(true)
  }, [])

  const handleLassoRevert = () => {
    if (!lassoHasMoved || !Object.keys(lassoOriginalPositions).length) {
      resetLassoSelection()
      return
    }
    setSimpleMarkers((prev) =>
      prev.map((m) => {
        const original = lassoOriginalPositions[m._id]
        if (!original) return m
        return { ...m, lat: original.lat, lng: original.lng }
      })
    )
    setLassoHasMoved(false)
    toast.success("Spostamento annullato")
  }

  const handleLassoClear = () => {
    if (lassoHasMoved) {
      handleLassoRevert()
    }
    resetLassoSelection()
  }

  const handleLassoSave = async () => {
    if (!lassoSelectedIds.length || !lassoHasMoved) return
    const idSet = new Set(lassoSelectedIds)
    const updates = simpleMarkers
      .filter((m) => idSet.has(m._id))
      .map((m) => ({
        _id: m._id,
        lat: m.lat,
        lng: m.lng,
      }))

    if (!updates.length) {
      toast.error("Nessun aggiornamento da salvare")
      return
    }

    setIsLassoSaving(true)
    try {
      const response = await updateLightPointsBatch(updates)
      const data = response?.data
      const updated = data?.updated ?? updates.length
      if (response?.status === 207) {
        toast.error(data?.message || "Aggiornamento parziale")
      } else {
        toast.success(data?.message || `${updated} punti aggiornati con successo`)
      }
      resetLassoSelection()
    } catch (error) {
      console.error("Errore salvataggio batch lazo:", error)
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Errore durante il salvataggio delle posizioni"
      toast.error(message)
    } finally {
      setIsLassoSaving(false)
    }
  };

  const handleStartLassoLinkToLine = useCallback(() => {
    if (!canEditTopo) {
      toast.error("Non hai i permessi per modificare le linee", { id: "lasso-link" })
      return
    }
    if (!lassoSelectedIds.length) return
    if (lassoHasMoved) {
      toast.error("Salva o annulla lo spostamento prima di collegare alla linea", {
        id: "lasso-link",
      })
      return
    }
    setLassoScaleMode(false)
    setLassoRotateMode(false)
    setLassoLinkParentMode(true)
    setShowTopologyLines(true)
    toast("Clicca il punto a monte (quadro o palo già in linea).", { id: "lasso-link" })
  }, [canEditTopo, lassoSelectedIds.length, lassoHasMoved])

  const handleCancelLassoLink = useCallback(() => {
    setLassoLinkParentMode(false)
    toast("Collegamento annullato.", { id: "lasso-link" })
  }, [])

  const handleToggleLassoScaleMode = useCallback(() => {
    setLassoScaleMode((prev) => {
      const next = !prev
      if (next) {
        setLassoRotateMode(false)
        setLassoLinkParentMode(false)
        toast("Scala attiva: usa la rotella per variare le distanze.", {
          id: "lasso-scale",
        })
      } else {
        toast("Scala distanze disattivata.", { id: "lasso-scale" })
      }
      return next
    })
  }, [])

  const handleToggleLassoRotateMode = useCallback(() => {
    setLassoRotateMode((prev) => {
      const next = !prev
      if (next) {
        setLassoScaleMode(false)
        setLassoLinkParentMode(false)
        toast("Rotazione attiva: usa la rotella per ruotare attorno al centro.", {
          id: "lasso-rotate",
        })
      } else {
        toast("Rotazione disattivata.", { id: "lasso-rotate" })
      }
      return next
    })
  }, [])

  /**
   * Attacca ogni componente connessa della selezione al parent scelto
   * (una chiamata setParent per componente → preserva linee interne già tracciate).
   */
  const handleLassoLinkParent = useCallback(
    async (parentMarker) => {
      if (!lassoLinkParentMode || !parentMarker || isLassoLinking) return
      const parentPick = resolveTopologyPick(parentMarker)
      if (!parentPick) {
        toast.error("Seleziona un punto luce o un quadro valido.", { id: "lasso-link" })
        return
      }

      const parentId = String(parentPick.representative._id)
      const selectedSet = new Set(lassoSelectedIds.map(String))
      const byId = new Map(simpleMarkers.map((m) => [String(m._id), m]))

      if (selectedSet.has(parentId) && selectedSet.size === 1) {
        toast.error("Seleziona anche i punti da collegare, non solo il genitore.", {
          id: "lasso-link",
        })
        return
      }

      // Adiacenza non orientata tra soli punti selezionati
      const adj = new Map([...selectedSet].map((id) => [id, new Set()]))
      for (const id of selectedSet) {
        const parentOf = byId.get(id)?.parent
        const p = parentOf == null || parentOf === "" ? null : String(parentOf)
        if (p && selectedSet.has(p)) {
          adj.get(id).add(p)
          adj.get(p).add(id)
        }
      }

      const visited = new Set()
      const attachments = []
      for (const start of selectedSet) {
        if (visited.has(start)) continue
        const component = []
        const queue = [start]
        visited.add(start)
        while (queue.length) {
          const u = queue.shift()
          component.push(u)
          for (const v of adj.get(u) || []) {
            if (visited.has(v)) continue
            visited.add(v)
            queue.push(v)
          }
        }
        if (component.includes(parentId)) continue
        const plNodes = component.filter((id) => byId.get(id)?.marker !== "QE")
        if (!plNodes.length) continue
        const root =
          plNodes.find((id) => {
            const p = byId.get(id)?.parent
            return p == null || p === "" || !selectedSet.has(String(p))
          }) || plNodes[0]
        attachments.push(root)
      }

      if (!attachments.length) {
        toast.error(
          "Nessun punto da collegare: la selezione è già sotto il genitore scelto oppure contiene solo quadri.",
          { id: "lasso-link" },
        )
        setLassoLinkParentMode(false)
        return
      }

      setIsLassoLinking(true)
      const allUpdates = []
      let okCount = 0
      let lastQuadro = parentPick.representative.quadro || null
      try {
        for (const childId of attachments) {
          const result = await setTopologyParent(childId, parentId)
          if (Array.isArray(result?.updates)) allUpdates.push(...result.updates)
          lastQuadro = result?.quadro || lastQuadro
          okCount += 1
        }
        if (allUpdates.length) applyTopologyUpdates(allUpdates)
        invalidateTopologyTreeCache(lastQuadro)
        invalidateTopologyTreeCache(parentPick.representative.quadro)
        if (lastQuadro) await ensureTopologyTree(lastQuadro)
        setLassoLinkParentMode(false)
        resetLassoSelection()
        toast.success(
          okCount === 1
            ? `Linea collegata a ${parentPick.groupLabel || parentPick.representative.numero_palo || "monte"}`
            : `${okCount} rami collegati a ${parentPick.groupLabel || parentPick.representative.numero_palo || "monte"}`,
          { id: "lasso-link" },
        )
      } catch (err) {
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err.message ||
          "Errore nel collegamento"
        toast.error(msg, { id: "lasso-link" })
        if (allUpdates.length) applyTopologyUpdates(allUpdates)
      } finally {
        setIsLassoLinking(false)
      }
    },
    [
      lassoLinkParentMode,
      isLassoLinking,
      lassoSelectedIds,
      simpleMarkers,
      applyTopologyUpdates,
      invalidateTopologyTreeCache,
      ensureTopologyTree,
      resetLassoSelection,
    ],
  )

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
        selectedCity={selectedCity}
        interactionsDisabled={!isMapDataComplete}
      />


      <MapLoadOverlay
        ref={mapLoadOverlayRef}
        visible={!isMapDataComplete && (!!selectedCity || isMapLoading)}
        variant={loaderVariant}
        expectedTotal={cityLightPointsMap[selectedCity] || 0}
      />

      <div className="relative flex-grow" ref={mapContainerRef} id="map-container">
        {/* Main map container - always present */}
        {visualizationMode === "semplice" ? (
          <ErrorBoundary>
            <MapLibreMap
              ref={mapLibreRef}
              onMapLoaded={setMapLibreInstance}
              geojsonData={mapLibreGeojsonData || { type: "FeatureCollection", features: [] }}
              showStreetLampNumber={showStreetLampNumber}
              showPanelNumber={showPanelNumber}
              showTopologyLines={showTopologyLines}
              topologyGeojson={topologyGeojson}
              onEditClick={handleEditSimpleClick}
              onDeleteClick={handleDeleteSimpleMarker}
              onDuplicateClick={handleDuplicateElement}
              editingMarkerId={editingSimpleMarker ? editingSimpleMarker._id : null}
              onMarkerPositionChange={handleSimpleMarkerPositionChange}
              selectedCity={selectedCity}
              onBeforeReport={handleBeforeReport}
              onBeforeReportCleanupTrigger={cleanupTrigger}
              onAfterCleanup={handleAfterCleanup}
              onMarkerSelect={setSelectedMarkerForInfo}
              isLassoActive={isLassoActive}
              selectedLassoIds={lassoSelectedIds}
              onLassoSelect={handleLassoSelect}
              onLassoGroupMove={handleLassoGroupMove}
              lassoLinkParentMode={lassoLinkParentMode}
              onLassoLinkParent={handleLassoLinkParent}
              lassoScaleMode={lassoScaleMode}
              lassoRotateMode={lassoRotateMode}
              isTopologyEditMode={isTopologyEditMode}
              onTopologyPointPick={handleTopologyPointPick}
              onSetParentClick={handleSetParentFromInfo}
              onClearParentClick={handleClearParentFromInfo}
              getTopologyPower={getTopologyPower}
            />
          </ErrorBoundary>
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
          <LegendGlass
            highlightOption={highlightOption}
            activeMarkers={activeMarkers}
            legendColorMap={legendColorMap}
          />
        </div>
        {showUnlinkedChip && seeTopologyAnomalies && unlinkedLightPoints.length > 0 && (
          <div className="pointer-events-none absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-orange-400/50 bg-black/80 px-3 py-1.5 text-sm text-orange-100 backdrop-blur-md">
            {unlinkedLightPoints.length} {unlinkedLightPoints.length === 1 ? "palo senza linea" : "pali senza linea"}
          </div>
        )}
        {(isTopologyEditMode || topologyPendingChild) && (
          <div
            className="pointer-events-auto absolute top-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-lg border border-blue-400/50 bg-black/85 px-3 py-2 text-sm text-blue-100 backdrop-blur-md"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <span>
              {topologyPendingChild
                ? `Seleziona il genitore per il palo ${topologyPendingChild.numero_palo || ""}`
                : topologyEditFirst
                  ? `A monte: ${topologyEditFirst.numero_palo || "…"} — seleziona il punto a valle`
                  : "Modalità linee: seleziona il punto a monte, poi quello a valle · ESC per uscire"}
            </span>
            {(topologyEditFirst || topologyPendingChild) && (
              <button
                type="button"
                className="rounded border border-blue-400/40 px-2 py-0.5 text-xs hover:bg-blue-700/40"
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onClick={handleCancelTopologySelection}
              >
                Annulla
              </button>
            )}
          </div>
        )}
        {/* Map controls - only visible when Street View is not active */}
        {!streetViewVisible && visualizationMode ==="complessa" && (
          <>
            {/* Pulsanti principali spostati nel menu impostazioni */}
            <div className="absolute top-1/4 right-4 z-10 flex flex-col gap-2">
              <MapButton icon={LocateFixed} onClick={goToUserLocation} title="Vai alla mia posizione" />
            </div>
            
          </>
        )}
        <Toaster position="top-right" />
      </div>

      {showInfoPanel && (
        <InfoPanel
          activeMarkers={allMarkersData}
          onClose={() => setShowInfoPanel(false)}
          townhallName={selectedCity}
          onNavigateToPoint={handleNavigateToPointFromPanel}
        />
      )}

      <MapControls
        selectedCity={selectedCity}
        setSelectedCity={(city) => {
          setSelectedCity(city)
          // Don't need to call saveStateToStorage here as it will be triggered by the useEffect
        }}
        highlightOption={highlightOption}
        setHighlightOption={(option) => {
          if (!isMapDataComplete) return
          setHighlightOption(option)
          // Don't need to call saveStateToStorage here as it will be triggered by the useEffect
        }}
        filterOption={filterOption}
        setFilterOption={(option) => {
          if (!isMapDataComplete) return
          setFilterOption(option)
          // Don't need to call saveStateToStorage here as it will be triggered by the useEffect
        }}
        cities={userData?.town_halls_list || []}
        selectedProprietaFilter={selectedProprietaFilter}
        setSelectedProprietaFilter={setSelectedProprietaFilter}
        interactionsDisabled={!isMapDataComplete}
      />
      {/* FAB rilievo: SUPER_ADMIN o SURVEYOR */}
      {(userData?.user_type === "SUPER_ADMIN" || userData?.user_type === "SURVEYOR") && (
        <AddMenu
          onAddPoint={handleAddNewElement}
          onDuplicatePoint={handleDuplicateElement}
          onToggleLasso={handleToggleLasso}
          isLassoActive={isLassoActive}
          showLasso={isDesktop && visualizationMode === "semplice"}
          showAddTools
          showTopologyEdit={canEditTopo}
          isTopologyEditActive={isTopologyEditMode}
          onToggleTopologyEdit={handleToggleTopologyEdit}
          interactionsDisabled={!isMapDataComplete}
        />
      )}
      {isLassoActive && (
        <LassoToolbar
          selectedCount={lassoSelectedIds.length}
          hasMoved={lassoHasMoved}
          isSaving={isLassoSaving}
          isLinking={isLassoLinking}
          linkParentMode={lassoLinkParentMode}
          scaleMode={lassoScaleMode}
          rotateMode={lassoRotateMode}
          canLinkToLine={canEditTopo}
          onSave={handleLassoSave}
          onRevert={handleLassoRevert}
          onClear={handleLassoClear}
          onLinkToLine={handleStartLassoLinkToLine}
          onCancelLink={handleCancelLassoLink}
          onToggleScaleMode={handleToggleLassoScaleMode}
          onToggleRotateMode={handleToggleLassoRotateMode}
        />
      )}
      {isLassoActive && lassoSelectedIds.length === 0 && !lassoLinkParentMode && (
        <div className="fixed top-20 left-1/2 z-40 -translate-x-1/2 px-4 py-2 rounded-lg bg-black/80 border border-blue-500/40 text-blue-100 text-sm backdrop-blur-xl pointer-events-none">
          Disegna un&apos;area sulla mappa · tasto destro per spostarti · ESC per uscire
        </div>
      )}
      <SettingsMenu
        showPanelNumber={showPanelNumber}
        onTogglePanelNumber={() => setShowPanelNumber((prev) => !prev)}
        showStreetLampNumber={showStreetLampNumber}
        onToggleStreetLampNumber={() => setShowStreetLampNumber((prev) => !prev)}
        showTopologyLines={showTopologyLines}
        onToggleTopologyLines={() => setShowTopologyLines((prev) => !prev)}
        onShowStats={() => setShowInfoPanel(true)}
        onDownloadReport={handleDownloadReport}
        visualizationMode={visualizationMode}
        onToggleVisualizationMode={handleToggleVisualizationMode}
        isComplexAllowed={isComplexAllowed}
        isLoadingCityLightPoints={isLoadingCityLightPoints}
        map={mapLibreInstance}
        selectedCity={selectedCity}
        interactionsDisabled={!isMapDataComplete}
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
      <InfoWindowMobileSheet
        marker={selectedMarkerForInfo?.is_differente_group ? null : selectedMarkerForInfo}
        city={selectedCity}
        userData={userData}
        onClose={() => setSelectedMarkerForInfo(null)}
        onEditClick={visualizationMode === "semplice" ? handleEditSimpleClick : handleEditClick}
        onDeleteClick={visualizationMode === "semplice" ? handleDeleteSimpleMarker : handleDeleteMarker}
        onDuplicateClick={handleDuplicateElement}
        onBeforeReport={visualizationMode === "semplice" ? handleBeforeReport : undefined}
        mapType={visualizationMode === "semplice" ? "maplibre" : undefined}
        onSetParentClick={handleSetParentFromInfo}
        onClearParentClick={handleClearParentFromInfo}
        topologyPower={getTopologyPower(selectedMarkerForInfo)}
      />
      <DifferenteGroupSideWindow
        marker={selectedMarkerForInfo}
        city={selectedCity}
        userData={userData}
        onClose={() => setSelectedMarkerForInfo(null)}
        onEditClick={visualizationMode === "semplice" ? handleEditSimpleClick : handleEditClick}
        onDeleteClick={visualizationMode === "semplice" ? handleDeleteSimpleMarker : handleDeleteMarker}
        onBeforeReport={visualizationMode === "semplice" ? handleBeforeReport : undefined}
        mapType={visualizationMode === "semplice" ? "maplibre" : undefined}
      />
      <EditLightPointModal
        isOpen={isEditModalOpen}
        marker={editingMarker}
        onClose={handleCloseEditModal}
        onSave={handleSaveMarker}
        map={map}
        allMarkersData={allMarkersData}
        electricPanels={electricPanels}
        onRequestConfirm={requestConfirm}
      />
      <AddLightPointModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSave={handleSaveNewElement}
        map={visualizationMode === "complessa" ? map : mapLibreInstance}
        selectedCity={selectedCity}
        userData={userData}
        visualizationMode={visualizationMode}
        electricPanels={electricPanels}
        existingPoleNumbers={existingPoleNumbers}
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
        onRequestConfirm={requestConfirm}
      />
      <ConfirmDialog
        isOpen={confirmDialogState.open}
        title={confirmDialogState.title}
        description={confirmDialogState.description}
        confirmLabel={confirmDialogState.confirmLabel}
        cancelLabel={confirmDialogState.cancelLabel}
        variant={confirmDialogState.variant}
        onConfirm={() => resolveConfirmDialog(true)}
        onCancel={() => resolveConfirmDialog(false)}
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
import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import process from "process";
import ReactDOM from "react-dom/client";
import InfoWindow from "./InfoWindow";
import { useContext } from "react";
import { UserContext, api } from "../context/UserContext"
import MapStyleSwitcher from "./MapStyleSwitcher";
import MapButton from "./MapButton";
import { LocateFixed, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import {
  isMobileInfoWindowViewport,
  getMapLibrePopupPlacement,
} from "../utils/infoWindowActions";
import { normalizeLightPointForDisplay } from "../utils/utils";
import { selectFeatureIdsInPolygon } from "../utils/pointInPolygon";

const COORD_COPY_ROLES = new Set(["SUPER_ADMIN", "SURVEYOR"]);

async function copyLatLngToClipboard(lat, lng) {
  const text = `${Number(lat)}\t${Number(lng)}`.replaceAll(".", ",");
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}



const DEFAULT_CENTER = [12.4964, 41.9028]; // Roma, [lng, lat]
const DEFAULT_ZOOM = 12;
const LASSO_SOURCE_ID = "lasso-draw";
const LASSO_LINE_LAYER_ID = "lasso-draw-line";
const LASSO_FILL_LAYER_ID = "lasso-draw-fill";
const LASSO_SELECTION_SOURCE_ID = "lasso-selection";
const LASSO_SELECTION_LAYER_ID = "lasso-selection-layer";
const LASSO_MAX_POINTS = 500;
const TOPOLOGY_SOURCE_ID = "topology-lines";
const TOPOLOGY_LAYER_ID = "topology-lines-line";
const TOPOLOGY_LAYER_DASHED_ID = "topology-lines-line-dashed";
const TOPOLOGY_ARROW_LAYER_ID = "topology-lines-arrow";
const TOPOLOGY_ARROW_IMAGE_ID = "topology-arrow";
const EMPTY_TOPOLOGY_FC = { type: "FeatureCollection", features: [] };

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API; 
const MAPTILER_STYLE = `https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_KEY}`;
const MAPTILER_STYLE_SATELLITE = `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`;

const STORAGE_KEY_PREFIX = "lighting-map-"
const STORAGE_KEYS = {
  SELECTED_CITY: `${STORAGE_KEY_PREFIX}selected-city`,
  HIGHLIGHT_OPTION: `${STORAGE_KEY_PREFIX}highlight-option`,
  FILTER_OPTION: `${STORAGE_KEY_PREFIX}filter-option`,
  MAP_CENTER: `${STORAGE_KEY_PREFIX}map-center`,
  MAP_ZOOM: `${STORAGE_KEY_PREFIX}map-zoom`,
}

const MapLibreMap = forwardRef(({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  styleUrl = MAPTILER_STYLE,
  onMapLoaded, // callback opzionale
  geojsonData, // nuova prop per i dati
  showStreetLampNumber, // nuova prop
  showPanelNumber, // nuova prop
  onEditClick, // callback per edit
  onDeleteClick, // callback per delete
  onDuplicateClick, // callback per duplica
  editingMarkerId, // id marker in editing
  onMarkerPositionChange, // callback per drag
  selectedCity,
  onBeforeReport,
  onBeforeReportCleanupTrigger,
  onAfterCleanup,
  onMarkerSelect, // Callback per notificare la selezione di un marker
  isLassoActive = false,
  selectedLassoIds = [],
  onLassoSelect,
  onLassoGroupMove,
  lassoLinkParentMode = false,
  onLassoLinkParent,
  lassoScaleMode = false,
  lassoRotateMode = false,
  showTopologyLines = false,
  topologyGeojson = EMPTY_TOPOLOGY_FC,
  isTopologyEditMode = false,
  onTopologyPointPick,
  onSetParentClick,
  onClearParentClick,
  getTopologyPower,
  onRefreshMap,
  isRefreshing = false,
}, ref) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { userData } = useContext(UserContext);
  const popupRef = useRef(null);
  // stato per sapere se è il primo caricamento
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  // Stato per modalità stile: false = streets, true = satellite
  const [isSatellite, setIsSatellite] = useState(false);
  const userLocationMarkerRef = useRef(null);
  const userLocationWatchIdRef = useRef(null);
  const userLocationCenteredOnceRef = useRef(false);

  //  ref per tracciare l'ultima città e il primo marker centrato per useeffect dello zoom al cambio di città
  const lastCityRef = useRef();
  const lastFirstMarkerRef = useRef(selectedCity);

  // Ref per lock asincrono delle icone SVG
  const svgLoadingMap = useRef(new Map());
  // Ref per sapere se la mappa è ancora attiva
  const isMapActive = useRef(true);
  const isLassoActiveRef = useRef(false);
  const lassoLinkParentModeRef = useRef(false);
  const lassoScaleModeRef = useRef(false);
  const lassoRotateModeRef = useRef(false);
  const isTopologyEditModeRef = useRef(false);
  const onTopologyPointPickRef = useRef(onTopologyPointPick);
  const onSetParentClickRef = useRef(onSetParentClick);
  const onClearParentClickRef = useRef(onClearParentClick);
  const getTopologyPowerRef = useRef(getTopologyPower);
  const selectedLassoIdsRef = useRef([]);
  const geojsonDataRef = useRef(geojsonData);
  const onLassoSelectRef = useRef(onLassoSelect);
  const onLassoGroupMoveRef = useRef(onLassoGroupMove);
  const onLassoLinkParentRef = useRef(onLassoLinkParent);
  const topologyGeojsonRef = useRef(topologyGeojson);
  const showTopologyLinesRef = useRef(showTopologyLines);

  useEffect(() => {
    isLassoActiveRef.current = isLassoActive;
  }, [isLassoActive]);

  useEffect(() => {
    lassoLinkParentModeRef.current = lassoLinkParentMode;
  }, [lassoLinkParentMode]);

  useEffect(() => {
    lassoScaleModeRef.current = lassoScaleMode;
  }, [lassoScaleMode]);

  useEffect(() => {
    lassoRotateModeRef.current = lassoRotateMode;
  }, [lassoRotateMode]);

  useEffect(() => {
    isTopologyEditModeRef.current = isTopologyEditMode;
  }, [isTopologyEditMode]);

  useEffect(() => {
    onTopologyPointPickRef.current = onTopologyPointPick;
  }, [onTopologyPointPick]);

  useEffect(() => {
    onSetParentClickRef.current = onSetParentClick;
  }, [onSetParentClick]);

  useEffect(() => {
    onClearParentClickRef.current = onClearParentClick;
  }, [onClearParentClick]);

  useEffect(() => {
    getTopologyPowerRef.current = getTopologyPower;
  }, [getTopologyPower]);

  useEffect(() => {
    selectedLassoIdsRef.current = selectedLassoIds;
  }, [selectedLassoIds]);

  useEffect(() => {
    geojsonDataRef.current = geojsonData;
  }, [geojsonData]);

  useEffect(() => {
    onLassoSelectRef.current = onLassoSelect;
  }, [onLassoSelect]);

  useEffect(() => {
    onLassoGroupMoveRef.current = onLassoGroupMove;
  }, [onLassoGroupMove]);

  useEffect(() => {
    onLassoLinkParentRef.current = onLassoLinkParent;
  }, [onLassoLinkParent]);

  useEffect(() => {
    topologyGeojsonRef.current = topologyGeojson || EMPTY_TOPOLOGY_FC;
  }, [topologyGeojson]);

  useEffect(() => {
    showTopologyLinesRef.current = showTopologyLines;
  }, [showTopologyLines]);
  

  useEffect(() => {
    isMapActive.current = true;
    mapRef.current = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center,
      zoom,
      preserveDrawingBuffer: true,
    });

    mapRef.current.addControl(new maplibregl.NavigationControl(), "top-right");

    mapRef.current.on("load", () => {
      setMapLoaded(true);
      if (onMapLoaded) onMapLoaded(mapRef.current);
    });

    return () => {
      isMapActive.current = false;
      if (mapRef.current) {
        mapRef.current.remove();
      }
      setMapLoaded(false);
      //mapRef.current = null;
    };
  }, []);

  // Utility per rimuovere un marker dalla geojson source
  function removeMarkerById(geojson, markerId) {
    return {
      ...geojson,
      features: geojson.features.filter(f => f.properties._id !== markerId)
    };
  }

  // Utility per trovare un marker by id
  function findMarkerById(geojson, markerId) {
    return geojson.features.find(f => f.properties._id === markerId);
  }

  // Carica/aggiorna i dati geojson sulla mappa SOLO quando la mappa è pronta
  useEffect(() => {
    const map = mapRef.current;

    if ( !map || !geojsonData || !mapLoaded) return;
    // Se siamo in edit, rimuovi il marker dalla source principale
    let geojsonDataForSource = geojsonData;
    if (editingMarkerId) {
      geojsonDataForSource = removeMarkerById(geojsonData, editingMarkerId);
    }

    // Rimuovi la source/layer se già presenti
    if (mapRef.current && typeof mapRef.current.getLayer === 'function' && mapRef.current.getLayer("clusters")) mapRef.current.removeLayer("clusters");
    if (mapRef.current && typeof mapRef.current.getLayer === 'function' && mapRef.current.getLayer("cluster-count")) mapRef.current.removeLayer("cluster-count");
    if (mapRef.current && typeof mapRef.current.getLayer === 'function' && mapRef.current.getLayer("unclustered-point")) mapRef.current.removeLayer("unclustered-point");
    if (mapRef.current && typeof mapRef.current.getLayer === 'function' && mapRef.current.getLayer("reported-symbol")) mapRef.current.removeLayer("reported-symbol");
    //if (mapRef.current && typeof mapRef.current.getSource === 'function' && mapRef.current.getSource("markers")) mapRef.current.removeSource("markers");
    if (!(mapRef.current && typeof mapRef.current.getSource === 'function' && mapRef.current.getSource("markers"))){
      mapRef.current.addSource("markers", {
      type: "geojson",
      data: geojsonDataForSource,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
      clusterProperties: {
        has_reported: [
          "any",
          [">=", ["get", "segnalazioni_in_corso_length"], 1]
        ]
      }
    });
  }else{
      map.getSource('markers').setData(geojsonDataForSource)
    }

    // --- GESTIONE MARKER IN EDITING ---
    // Se siamo in edit, crea una source/layer dedicata
    if (editingMarkerId) {
      // Rimuovi eventuale source/layer precedente
      if (map && typeof map.getLayer === 'function' && map.getLayer('editing-marker-layer')) map.removeLayer('editing-marker-layer');
      if (map && typeof map.getSource === 'function' && map.getSource('editing-marker')) map.removeSource('editing-marker');
      const editingFeature = findMarkerById(geojsonData, editingMarkerId);
      if (editingFeature) {
        if (map && typeof map.addSource === 'function') {
          map.addSource('editing-marker', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [editingFeature]
            }
          });
        }
        if (map && typeof map.addLayer === 'function') {
          map.addLayer({
            id: 'editing-marker-layer',
            type: 'circle',
            source: 'editing-marker',
            paint: {
              'circle-color': '#3b82f6',
              'circle-radius': 12,
              'circle-stroke-width': 3,
              'circle-stroke-color': '#fff',
              'circle-opacity': 0.8,
              'circle-blur': 0.2
            }
          });
        }
      }
    } else {
      // Se non siamo in edit, pulisci eventuale layer/source di editing
      if (map && typeof map.getLayer === 'function' && map.getLayer('editing-marker-layer')) map.removeLayer('editing-marker-layer');
      if (map && typeof map.getSource === 'function' && map.getSource('editing-marker')) map.removeSource('editing-marker');
    }

    // Pulsing triangle canvas (animato)
    const size = 140;
    const pulsingDot = {
      width: size,
      height: size,
      data: new Uint8Array(size * size * 4),
      onAdd: function () {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        this.context = canvas.getContext('2d');
      },
      render: function () {
        const duration = 1000;
        const t = (performance.now() % duration) / duration;
        const baseRadius = (size / 2) * 0.22;
        const outerRadius = (size / 2) * (0.6 * t + 0.4);
        const context = this.context;
        context.clearRect(0, 0, this.width, this.height);

        // Outer glowing triangle
        context.save();
        context.translate(this.width / 2, this.height / 2);
        context.beginPath();
        for (let i = 0; i < 3; i++) {
          const angle = (Math.PI / 2) + (i * (2 * Math.PI / 3));
          const x = Math.cos(angle) * outerRadius;
          const y = Math.sin(angle) * outerRadius;
          if (i === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
        context.globalAlpha = 0.35 * (1 - t) + 0.15;
        context.fillStyle = 'rgba(255, 80, 0, 1)'; // arancione acceso
        context.shadowColor = 'rgba(255, 80, 0, 0.7)';
        context.shadowBlur = 30;
        context.fill();
        context.shadowBlur = 0;
        context.globalAlpha = 1.0;
        context.restore();

        // Inner solid triangle
        context.save();
        context.translate(this.width / 2, this.height / 2);
        context.beginPath();
        const triangleSize = baseRadius * 1.5;
        for (let i = 0; i < 3; i++) {
          const angle = (Math.PI / 2) + (i * (2 * Math.PI / 3));
          const x = Math.cos(angle) * triangleSize;
          const y = Math.sin(angle) * triangleSize;
          if (i === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
        context.fillStyle = 'rgba(255, 255, 0, 1)'; // giallo vivo
        context.strokeStyle = '#fff';
        context.lineWidth = 6;
        context.fill();
        context.stroke();
        context.restore();

        this.data = context.getImageData(0, 0, this.width, this.height).data;
        map.triggerRepaint();
        return true;
      }
    };
    if (map && typeof map.hasImage === 'function' && !map.hasImage('pulsing-dot')) {
      map.addImage('pulsing-dot', pulsingDot, { pixelRatio: 2 });
    }
    if (mapRef.current && typeof mapRef.current.getLayer === 'function' && mapRef.current.getLayer("clusters")) mapRef.current.removeLayer("clusters");

    // Layer cluster: se has_reported true, mostra il triangolo pulsante, altrimenti cerchio statico
    mapRef.current.addLayer({
      id: "clusters",
      type: "symbol",
      source: "markers",
      filter: ["all", ["has", "point_count"], ["==", ["get", "has_reported"], true]],
      layout: {
        "icon-image": "pulsing-dot",
        "icon-size": 1.0, // Più grande per i cluster
        "icon-allow-overlap": true,
        "icon-ignore-placement": true
      }
    });
    if (mapRef.current && typeof mapRef.current.getLayer === 'function' && mapRef.current.getLayer("clusters-static")) mapRef.current.removeLayer("clusters-static");

    // Layer cluster statico (nessuna segnalazione)
    mapRef.current.addLayer({
      id: "clusters-static",
      type: "circle",
      source: "markers",
      filter: ["all", ["has", "point_count"], ["!=", ["get", "has_reported"], true]],
      paint: {
        "circle-color": [
          "step",
          ["get", "point_count"],
          "#51bbd6",
          100,
          "#f1f075",
          750,
          "#f28cb1"
        ],
        "circle-radius": [
          "step",
          ["get", "point_count"],
          20,
          100,
          30,
          750,
          40
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff"
      }
    });
    if (mapRef.current && typeof mapRef.current.getLayer === 'function' && mapRef.current.getLayer("clusters-count")) mapRef.current.removeLayer("clusters-count");

    // Layer cluster count sopra entrambi
    mapRef.current.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "markers",
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 14,
        "text-allow-overlap": true
      },
      paint: {
        "text-color": "#222",
        "text-halo-color": "#fff",
        "text-halo-width": 2
      }
    });
    if (mapRef.current && typeof mapRef.current.getLayer === 'function' && mapRef.current.getLayer("reported-symbol")) mapRef.current.removeLayer("reported-symbol");


    // Layer per marker segnalati (pulsing dot)
    mapRef.current.addLayer({
      id: "reported-symbol",
      type: "symbol",
      source: "markers",
      filter: ["all", ["!", ["has", "point_count"]], [">=", ["get", "segnalazioni_in_corso_length"], 1], ["!=", ["get", "has_ordinary_report"], true], ["!=", ["get", "has_extraordinary_report"], true]],
      layout: {
        "icon-image": "pulsing-dot",
        "icon-size": 0.5,
        "icon-allow-overlap": true
      }
    });

    if (mapRef.current.getLayer('reported-ordinary-triangle')) {
      mapRef.current.removeLayer('reported-ordinary-triangle');
    }
    // Triangolo ordinario: stesso canvas animato del pulsing-dot
    mapRef.current.addLayer({
      id: "reported-ordinary-triangle",
      type: "symbol",
      source: "markers",
      filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "has_ordinary_report"], true]],
      layout: {
        "icon-image": "pulsing-dot",
        "icon-size": 0.55,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      }
    });

    const pentagonColors = {
      overdue: '#EF4444',
      soon: '#F97316',
      ok: '#E11D48',
      none: '#E11D48',
    };
    Object.entries(pentagonColors).forEach(([key, color]) => {
      const imageId = `report-pentagon-pulse-${key}`;
      if (map && typeof map.hasImage === 'function' && !map.hasImage(imageId)) {
        map.addImage(imageId, createPulsingPentagon(color, map), { pixelRatio: 2 });
      }
    });
    if (mapRef.current.getLayer('reported-extraordinary-pentagon')) {
      mapRef.current.removeLayer('reported-extraordinary-pentagon');
    }
    mapRef.current.addLayer({
      id: "reported-extraordinary-pentagon",
      type: "symbol",
      source: "markers",
      filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "has_extraordinary_report"], true]],
      layout: {
        "icon-image": [
          "match",
          ["get", "due_urgency"],
          "overdue", "report-pentagon-pulse-overdue",
          "soon", "report-pentagon-pulse-soon",
          "ok", "report-pentagon-pulse-ok",
          "report-pentagon-pulse-none",
        ],
        "icon-size": 0.55,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      }
    });
    if (mapRef.current && typeof mapRef.current.getLayer === 'function' && mapRef.current.getLayer("clusters-pulse-bg")) mapRef.current.removeLayer("clusters-pulse-bg");

    // Layer cerchio di background per i cluster segnalati (sotto il triangolo pulsante)
    mapRef.current.addLayer({
      id: "clusters-pulse-bg",
      type: "circle",
      source: "markers",
      filter: ["all", ["has", "point_count"], ["==", ["get", "has_reported"], true]],
      paint: {
        "circle-color": [
          "step",
          ["get", "point_count"],
          "#51bbd6",
          100,
          "#f1f075",
          750,
          "#f28cb1"
        ],
        "circle-radius": [
          "step",
          ["get", "point_count"],
          20,
          100,
          30,
          750,
          40
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff"
      }
    }, "clusters"); // Inserito subito sotto il layer symbol animato

    // --- CALLBACK SICURI ---
    function safeHandleClusterClick(e) {
      try {
        if (!isMapActive.current || !mapRef.current) return;
        if (isLassoActiveRef.current) return;
        const features = mapRef.current.queryRenderedFeatures(e.point, { layers: ["clusters", "clusters-static"] });
        if (!features.length) return;
        const clusterId = features[0].properties.cluster_id;
        const source = mapRef.current.getSource("markers");
        source.getClusterExpansionZoom(clusterId)
          .then(zoom => {
            if (!isMapActive.current || !mapRef.current) return;
            const targetZoom = Math.min(zoom + 1, 18);
            mapRef.current.easeTo({
              center: features[0].geometry.coordinates,
              zoom: targetZoom,
              duration: 800,
              essential: true
            });
          })
          .catch(err => {
            if (!isMapActive.current) return;
          });
      } catch (err) {
        if (!isMapActive.current) return;
        console.error("Errore in handleClusterClick:", err);
      }
    }

    // Click su cluster: zooma
    mapRef.current.on("click", "clusters", safeHandleClusterClick);
    mapRef.current.on("click", "clusters-static", safeHandleClusterClick);



    function cleanAndNormalizeProps(props) {
      let content = normalizeLightPointForDisplay(props);
      [
        'color', 'lat', 'lng', '__v', '_id', 'segnalazioni_in_corso_length'
      ].forEach(key => delete content[key]);
      ['segnalazioni_in_corso', 'segnalazioni_risolte', 'operazioni_effettuate'].forEach(key => {
        if (typeof content[key] === 'string') {
          try { content[key] = JSON.parse(content[key]); }
          catch { content[key] = []; }
        }
      });
      return content;
    }
    function cleanAndNormalizeContent(props) {
      let content = normalizeLightPointForDisplay(props);
      [
        'color', , '__v', 'segnalazioni_in_corso_length'
      ].forEach(key => delete content[key]);
      ['segnalazioni_in_corso', 'segnalazioni_risolte', 'operazioni_effettuate'].forEach(key => {
        if (typeof content[key] === 'string') {
          try { content[key] = JSON.parse(content[key]); }
          catch { content[key] = []; }
        }
      });
      return content;
    }

    function parseDifferenteGroupMembers(rawValue) {
      if (Array.isArray(rawValue)) return rawValue;
      if (typeof rawValue !== "string") return [];
      try {
        const parsed = JSON.parse(rawValue);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    function safeHandleMarkerClick(e) {
      try {
        if (!isMapActive.current || !mapRef.current) return;
        if (isLassoActiveRef.current) return;
        const feature = e.features[0];
        if (!feature || !feature.properties) return;
        const coordinates = feature.geometry.coordinates.slice();
        let props = {
          ...feature.properties,
          lat: feature.geometry.coordinates[1],
          lng: feature.geometry.coordinates[0]
        };
        const content = cleanAndNormalizeProps(props);
        props = cleanAndNormalizeContent(props)

        if (isTopologyEditModeRef.current && typeof onTopologyPointPickRef.current === 'function') {
          onTopologyPointPickRef.current(props);
          return;
        }

        // Chiudi popup precedente se presente
        if (popupRef.current) {
          try { popupRef.current.remove(); } catch { /* ignore */ }
          popupRef.current = null;
        }

        const isDifferenteGroup =
          props.is_differente_group === true ||
          props.is_differente_group === "true";
        if (isDifferenteGroup) {
          const members = parseDifferenteGroupMembers(props.differente_group_members_json);
          if (onMarkerSelect) {
            onMarkerSelect({
              ...props,
              lat: coordinates[1],
              lng: coordinates[0],
              is_differente_group: true,
              differente_group_members: members,
            });
          }
          return;
        }

        // Mobile: bottom sheet gestito da Dashboard
        if (isMobileInfoWindowViewport()) {
          if (onMarkerSelect) {
            onMarkerSelect(props);
          }
          return;
        }

        const popupDiv = document.createElement('div');
        const { anchor, mapOffset, popupOffset } = getMapLibrePopupPlacement(mapRef.current);

        mapRef.current.easeTo({
          center: [props.lng, props.lat],
          offset: mapOffset,
          duration: 350,
          essential: true,
        });

        const power =
          typeof getTopologyPowerRef.current === 'function'
            ? getTopologyPowerRef.current(props)
            : null;

        ReactDOM.createRoot(popupDiv).render(
          <InfoWindow
            content={content}
            marker={props}
            city={selectedCity}
            userData={userData}
            mapType="maplibre"
            onEditClick={onEditClick}
            onDeleteClick={onDeleteClick}
            onDuplicateClick={onDuplicateClick}
            onBeforeReport={onBeforeReport}
            idMarker={props._id}
            variant="popup"
            onSetParentClick={(m) => onSetParentClickRef.current?.(m)}
            onClearParentClick={(m) => onClearParentClickRef.current?.(m)}
            topologyPower={power}
          />
        );
        if (mapRef.current && typeof maplibregl.Popup === 'function') {
          const popup = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true,
            maxWidth: 'none',
            anchor,
            offset: popupOffset,
          })
            .setLngLat(coordinates)
            .setDOMContent(popupDiv)
            .addTo(mapRef.current);
          popupRef.current = popup;
          
          if (onMarkerSelect) {
            onMarkerSelect(props);
          }

          popup.on('close', () => {
            if (onMarkerSelect) {
              onMarkerSelect(null);
            }
          });
        }
      } catch (err) {
        if (!isMapActive.current) return;
        console.error('Errore nella creazione della popup:', err);
      }
    }

    // Click su marker
    mapRef.current.on('click', 'unclustered-point-pl', safeHandleMarkerClick);
    mapRef.current.on('click', 'unclustered-point-pl-diff', safeHandleMarkerClick);
    mapRef.current.on('click', 'unclustered-point-qe', safeHandleMarkerClick);

    // Cambia il cursore sui marker
    const safeMouseEnterPL = () => {
      try {
        if (!isMapActive.current || !mapRef.current) return;
        mapRef.current.getCanvas().style.cursor = 'pointer';
      } catch (err) { if (!isMapActive.current) return; console.error(err); }
    };
    const safeMouseLeavePL = () => {
      try {
        if (!isMapActive.current || !mapRef.current) return;
        mapRef.current.getCanvas().style.cursor = '';
      } catch (err) { if (!isMapActive.current) return; console.error(err); }
    };
    const safeMouseEnterQE = () => {
      try {
        if (!isMapActive.current || !mapRef.current) return;
        mapRef.current.getCanvas().style.cursor = 'pointer';
      } catch (err) { if (!isMapActive.current) return; console.error(err); }
    };
    const safeMouseLeaveQE = () => {
      try {
        if (!isMapActive.current || !mapRef.current) return;
        mapRef.current.getCanvas().style.cursor = '';
      } catch (err) { if (!isMapActive.current) return; console.error(err); }
    };
    mapRef.current.on('mouseenter', 'unclustered-point-pl', safeMouseEnterPL);
    mapRef.current.on('mouseleave', 'unclustered-point-pl', safeMouseLeavePL);
    mapRef.current.on('mouseenter', 'unclustered-point-pl-diff', safeMouseEnterPL);
    mapRef.current.on('mouseleave', 'unclustered-point-pl-diff', safeMouseLeavePL);
    mapRef.current.on('mouseenter', 'unclustered-point-qe', safeMouseEnterQE);
    mapRef.current.on('mouseleave', 'unclustered-point-qe', safeMouseLeaveQE);

    // Cleanup obbligatorio: altrimenti i listener si accumulano a ogni update geojson
    return () => {
      const map = mapRef.current;
      if (!map) return;
      try {
        map.off('click', 'unclustered-point-pl', safeHandleMarkerClick);
        map.off('click', 'unclustered-point-pl-diff', safeHandleMarkerClick);
        map.off('click', 'unclustered-point-qe', safeHandleMarkerClick);
        map.off('mouseenter', 'unclustered-point-pl', safeMouseEnterPL);
        map.off('mouseleave', 'unclustered-point-pl', safeMouseLeavePL);
        map.off('mouseenter', 'unclustered-point-pl-diff', safeMouseEnterPL);
        map.off('mouseleave', 'unclustered-point-pl-diff', safeMouseLeavePL);
        map.off('mouseenter', 'unclustered-point-qe', safeMouseEnterQE);
        map.off('mouseleave', 'unclustered-point-qe', safeMouseLeaveQE);
      } catch {
        // ignore
      }
    };
    
  }, [geojsonData, mapLoaded, userData, editingMarkerId, isSatellite]);

  //  useEffect(()=>{
  //   if (!isMapActive.current) return;
  //   console.log("mapLoaded")
  // }, [mapLoaded])
  // useEffect(()=>{
  //   if (!isMapActive.current) return;
  //   console.log("selectedCity")
  // }, [selectedCity])
  // useEffect(()=>{

  //   console.log(geojsonData)
  // }, [geojsonData])



  // AGGIUNTA: mostra label numero_palo sotto ogni marker se showStreetLampNumber true
  useEffect(() => {
    const map = mapRef.current;
    if (!isMapActive.current || !map || !geojsonData || !mapLoaded) return;
    // Rimuovi i layer label se già presenti
    if (map && typeof map.getLayer === 'function' && map.getLayer('marker-label-pl')) map.removeLayer('marker-label-pl');
    if (map && typeof map.getLayer === 'function' && map.getLayer('marker-label-qe')) map.removeLayer('marker-label-qe');
    // Label per PL
    if (showStreetLampNumber) {
      map.addLayer({
        id: 'marker-label-pl',
        type: 'symbol',
        source: 'markers',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'marker'], 'PL']],
        layout: {
          'text-field': ['get', 'numero_palo'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 13,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-allow-overlap': false
        },
        paint: {
          'text-color': '#222',
          'text-halo-color': '#fff',
          'text-halo-width': 2
        }
      });
    }
    // Label per QE
    if (showPanelNumber) {
      map.addLayer({
        id: 'marker-label-qe',
        type: 'symbol',
        source: 'markers',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'marker'], 'QE']],
        layout: {
          'text-field': ['get', 'numero_palo'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 13,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-allow-overlap': false
        },
        paint: {
          'text-color': '#222',
          'text-halo-color': '#fff',
          'text-halo-width': 2
        }
      });
    }
    return () => {
      const map = mapRef.current;
      if (!isMapActive.current || !map || !map.style) return;
      // CLEANUP ROBUSTO: rimuovi i layer label
      const layersToRemove = [
        'marker-label-pl',
        'marker-label-qe'
      ];
      layersToRemove.forEach(layerId => {
        if (map && typeof map.getLayer === 'function' && map.getLayer(layerId)) map.removeLayer(layerId);
      });
    };
  }, [geojsonData, mapLoaded, showStreetLampNumber, showPanelNumber, isSatellite]);

  // Funzione per generare un quadrato colorato come ImageData per MapLibre
  function createSquareImage(color, size = 32) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);
    return ctx.getImageData(0, 0, size, size);
  }

  function createTriangleImage(color, size = 36) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    const pad = 3;
    ctx.beginPath();
    ctx.moveTo(size / 2, pad);
    ctx.lineTo(size - pad, size - pad);
    ctx.lineTo(pad, size - pad);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    return ctx.getImageData(0, 0, size, size);
  }

  function createPentagonImage(color, size = 36) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 3;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    return ctx.getImageData(0, 0, size, size);
  }

  /** Pentagono animato (stesso pattern del triangolo pulsing-dot). */
  function createPulsingPentagon(color, mapInstance, size = 140) {
    const hexToRgba = (hex, alpha) => {
      const raw = String(hex || '#E11D48').replace('#', '');
      const full = raw.length === 3
        ? raw.split('').map((c) => c + c).join('')
        : raw.padEnd(6, '0').slice(0, 6);
      const n = Number.parseInt(full, 16);
      const r = (n >> 16) & 255;
      const g = (n >> 8) & 255;
      const b = n & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const drawPentagonPath = (ctx, radius) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    return {
      width: size,
      height: size,
      data: new Uint8Array(size * size * 4),
      onAdd() {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        this.context = canvas.getContext('2d');
      },
      render() {
        const duration = 1000;
        const t = (performance.now() % duration) / duration;
        const baseRadius = (size / 2) * 0.22;
        const outerRadius = (size / 2) * (0.6 * t + 0.4);
        const context = this.context;
        context.clearRect(0, 0, this.width, this.height);

        context.save();
        context.translate(this.width / 2, this.height / 2);
        drawPentagonPath(context, outerRadius);
        context.globalAlpha = 0.35 * (1 - t) + 0.15;
        context.fillStyle = hexToRgba(color, 1);
        context.shadowColor = hexToRgba(color, 0.7);
        context.shadowBlur = 30;
        context.fill();
        context.shadowBlur = 0;
        context.globalAlpha = 1;
        context.restore();

        context.save();
        context.translate(this.width / 2, this.height / 2);
        drawPentagonPath(context, baseRadius * 1.5);
        context.fillStyle = color;
        context.strokeStyle = '#fff';
        context.lineWidth = 6;
        context.fill();
        context.stroke();
        context.restore();

        this.data = context.getImageData(0, 0, this.width, this.height).data;
        if (mapInstance && typeof mapInstance.triggerRepaint === 'function') {
          mapInstance.triggerRepaint();
        }
        return true;
      },
    };
  }

  const isDifferenteGroupFilter = [
    'any',
    ['==', ['get', 'is_differente_group'], true],
    ['==', ['get', 'is_differente_group'], 'true'],
  ];

  // Layer marker: PL = cerchio (esclusi gruppi differente)
  useEffect(() => {
    const map = mapRef.current;
    if (!isMapActive.current || !map || !geojsonData || !mapLoaded) return;

    if (map && typeof map.getLayer === 'function' && map.getLayer('unclustered-point-pl')) {
      map.removeLayer('unclustered-point-pl');
    }
    map.addLayer({
      id: 'unclustered-point-pl',
      type: 'circle',
      source: 'markers',
      filter: [
        'all',
        ['!', ['has', 'point_count']],
        ['==', ['get', 'marker'], 'PL'],
        ['!', isDifferenteGroupFilter],
      ],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': 6,
        'circle-stroke-width': [
          'case',
          ['==', ['get', 'topology_unlinked'], true],
          2.5,
          1
        ],
        'circle-stroke-color': [
          'case',
          ['==', ['get', 'topology_unlinked'], true],
          '#f97316',
          '#fff'
        ]
      }
    });
    return () => {
      if (!isMapActive.current || !map) return;
      if (map && typeof map.getLayer === 'function' && map.getLayer('unclustered-point-pl')) {
        map.removeLayer('unclustered-point-pl');
      }
    };
  }, [geojsonData, mapLoaded, editingMarkerId, isSatellite]);

  // Layer marker: gruppi "differente" = triangoli grandi
  useEffect(() => {
    const map = mapRef.current;
    if (!isMapActive.current || !map || !geojsonData || !mapLoaded) return;

    const diffColors = Array.from(new Set(
      (geojsonData.features || [])
        .filter((f) => {
          const props = f.properties || {};
          const isDiff = props.is_differente_group === true || props.is_differente_group === 'true';
          return isDiff && props.marker === 'PL' && typeof props.color === 'string';
        })
        .map((f) => f.properties.color)
    ));

    diffColors.forEach((color) => {
      const iconId = `triangle-diff-${color.replace('#', '')}`;
      if (!map || typeof map.hasImage !== 'function') return;
      if (map.hasImage(iconId)) {
        try { map.removeImage(iconId); } catch { /* ignore */ }
      }
      map.addImage(iconId, createTriangleImage(color), { pixelRatio: 2 });
    });

    if (map.getLayer('unclustered-point-pl-diff')) {
      map.removeLayer('unclustered-point-pl-diff');
    }

    map.addLayer({
      id: 'unclustered-point-pl-diff',
      type: 'symbol',
      source: 'markers',
      filter: [
        'all',
        ['!', ['has', 'point_count']],
        ['==', ['get', 'marker'], 'PL'],
        isDifferenteGroupFilter,
      ],
      layout: {
        'icon-image': [
          'concat',
          'triangle-diff-',
          ['slice', ['get', 'color'], 1],
        ],
        'icon-size': 1.00,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    });

    return () => {
      if (!isMapActive.current || !map) return;
      if (map.getLayer('unclustered-point-pl-diff')) {
        map.removeLayer('unclustered-point-pl-diff');
      }
    };
  }, [geojsonData, mapLoaded, editingMarkerId, isSatellite]);

  // Layer marker: QE = quadrato colorato (symbol)
  useEffect(() => {
    const map = mapRef.current;
    if (!isMapActive.current || !map || !geojsonData || !mapLoaded) return;

    // Trova tutti i colori unici dei QE
    const qeColors = Array.from(new Set(
      geojsonData.features
        .filter(f => f.properties.marker === 'QE' && typeof f.properties.color === 'string')
        .map(f => f.properties.color)
    ));

    // Aggiungi tutte le immagini PRIMA del layer
    qeColors.forEach(color => {
      const iconId = `square-marker-${color.replace('#', '')}`;
      if (!map || typeof map.hasImage !== 'function' || !map.hasImage(iconId)) {
        map.addImage(iconId, createSquareImage(color), { pixelRatio: 2 });
      }
    });

    // Rimuovi il layer se già esiste
    if (map && typeof map.getLayer === 'function' && map.getLayer('unclustered-point-qe')) {
      map.removeLayer('unclustered-point-qe');
    }

    // Aggiungi il layer symbol per i QE
    map.addLayer({
      id: 'unclustered-point-qe',
      type: 'symbol',
      source: 'markers',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'marker'], 'QE']],
      layout: {
        'icon-image': [
          'concat',
          'square-marker-',
          ['slice', ['get', 'color'], 1]
        ],
        'icon-size': 0.75,
        'icon-allow-overlap': true
      }
    });

    // Cleanup robusto: rimuovi layer e immagini
    return () => {
      if (!isMapActive.current || !map) return;
      
      if (map && typeof map.getLayer === 'function' && map.getLayer('marker-label-pl')) {
        map.removeLayer('marker-label-pl');
      }
      if (map && typeof map.getLayer === 'function' && map.getLayer('marker-label-qe')) {
        map.removeLayer('marker-label-qe');
      }
      if (map && typeof map.getLayer === 'function' && map.getLayer('unclustered-point-qe')) {
        map.removeLayer('unclustered-point-qe');
      }
      qeColors.forEach(color => {
        const iconId = `square-marker-${color.replace('#', '')}`;
        if (map && typeof map.hasImage === 'function' && map.hasImage(iconId)) {
          map.removeImage(iconId);
        }
      });
    };
  }, [geojsonData, mapLoaded, editingMarkerId, isSatellite]);

  // Badge segnalazioni sopra i marker (i layer PL/QE vengono creati dopo)
  useEffect(() => {
    const map = mapRef.current;
    if (!isMapActive.current || !map || !mapLoaded) return;
    if (typeof map.getLayer !== 'function' || typeof map.moveLayer !== 'function') return;

    const badgeLayers = [
      'reported-symbol',
      'reported-ordinary-triangle',
      'reported-extraordinary-pentagon',
    ];
    badgeLayers.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        try { map.moveLayer(layerId); } catch { /* ignore */ }
      }
    });
  }, [geojsonData, mapLoaded, editingMarkerId, isSatellite]);



  // Ricentra la mappa SOLO al primo caricamento dei dati
  useEffect(() => {
    if (!isMapActive.current || (!firstLoadDone && geojsonData && geojsonData.features && geojsonData.features.length > 0 && mapLoaded)) {
      const [lng, lat] = geojsonData.features[0].geometry.coordinates;
      if (mapRef.current && typeof mapRef.current.setCenter === 'function') {
        mapRef.current.setCenter([lng, lat]);
      }
      if (mapRef.current && typeof mapRef.current.setZoom === 'function') {
        mapRef.current.setZoom(14);
      }
      setFirstLoadDone(true);
    }
  }, [geojsonData, mapLoaded, firstLoadDone]);

  // GESTIONE DRAGGABLE MARKER IN EDITING (solo uno alla volta)
  useEffect(() => {
    // AGGIUNTA: chiudi la popup se esiste
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }
    if (!isMapActive.current || !mapLoaded || !editingMarkerId || !geojsonData) return;
    const map = mapRef.current;
    // Trova la feature del marker in editing
    const feature = geojsonData.features.find(f => f.properties._id === editingMarkerId);
    if (!feature) return;
    // Crea un marker custom draggable sopra la posizione
    let dragMarker = null;

    let markerEl = null;
    // Layer temporaneo per evidenziare il marker in editing
    const highlightLayerId = 'editing-marker-highlight';
    // Rimuovi layer precedente se esiste
    if (map && typeof map.getLayer === 'function' && map.getLayer(highlightLayerId)) map.removeLayer(highlightLayerId);
    if (map && typeof map.getSource === 'function' && map.getSource(highlightLayerId)) map.removeSource(highlightLayerId);
    // Aggiungi un layer cerchio glow sopra il marker
    if (map && typeof map.addSource === 'function') {
      map.addSource(highlightLayerId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [feature]
        }
      });
    }
    if (map && typeof map.addLayer === 'function') {
      map.addLayer({
        id: highlightLayerId,
        type: 'circle',
        source: highlightLayerId,
        paint: {
          'circle-color': '#fff',
          'circle-radius': 14,
          'circle-opacity': 0.5,
          'circle-stroke-width': 4,
          'circle-stroke-color': '#3b82f6',
          'circle-blur': 0.5
        }
      });
    }
    // Crea un marker HTML draggable sopra la mappa
    markerEl = document.createElement('div');
    markerEl.className = 'w-5 h-5 bg-blue-500/60 border-2 border-white rounded-full shadow-md cursor-grab z-2';
    dragMarker = new maplibregl.Marker({
      element: markerEl,
      draggable: true
    })
      .setLngLat(feature.geometry.coordinates)
      .addTo(map);
    // Gestione dragend
    dragMarker.on('dragend', () => {
      const lngLat = dragMarker.getLngLat();
      if (onMarkerPositionChange) {
        onMarkerPositionChange(editingMarkerId, lngLat.lat, lngLat.lng);
      }
      // Ricentra la mappa sul marker mantenendo lo zoom attuale
      if (map && typeof map.easeTo === 'function') {
        map.easeTo({
          center: [lngLat.lng, lngLat.lat],
          zoom: map.getZoom(),
          duration: 600
        });
      }
    });
    // Auto-pan durante il drag: su mobile bound ridotti (sheet FAB collassabile)
    function handleDrag() {
      const lngLat = dragMarker.getLngLat();
      if (map && typeof map.getContainer === 'function' && typeof map.project === 'function') {
        const container = map.getContainer();
        const rect = container.getBoundingClientRect();
        const point = map.project([lngLat.lng, lngLat.lat]);
        const isMobileEdit = isMobileInfoWindowViewport();
        const edgeThresholdLeft = isMobileEdit ? 40 : 60;
        const edgeThresholdRight = isMobileEdit ? 40 : 500; // desktop: spazio per pannello laterale
        const edgeThresholdTop = isMobileEdit ? 40 : 60;
        const edgeThresholdBottom = isMobileEdit ? 56 : 120;
        const panStep = isMobileEdit ? 18 : 30;

        let dx = 0, dy = 0;
        if (point.x < edgeThresholdLeft) dx = -panStep;
        else if (point.x > rect.width - edgeThresholdRight) dx = panStep;
        if (point.y < edgeThresholdTop) dy = -panStep;
        else if (point.y > rect.height - edgeThresholdBottom) dy = panStep;

        if ((dx !== 0 || dy !== 0) && map && typeof map.panBy === 'function') {
          map.panBy([dx, dy], { duration: 0 });
        }
      }
    }
    dragMarker.on('drag', handleDrag);
    // Pulizia
    return () => {
      if (dragMarker) dragMarker.remove();
      if (!isMapActive.current || !map) return;
      if (map && typeof map.getLayer === 'function' && map.getLayer(highlightLayerId)) map.removeLayer(highlightLayerId);
      if (map && typeof map.getSource === 'function' && map.getSource(highlightLayerId)) map.removeSource(highlightLayerId);
      // Rimuovi listener drag
      if (dragMarker) dragMarker.off('drag', handleDrag);
    };
  }, [editingMarkerId, geojsonData, mapLoaded, isSatellite]);

  // Centra la mappa sul primo marker della città quando selectedCity cambia
  useEffect(() => {
    if (
      !isMapActive.current ||
      !selectedCity ||
      !mapLoaded ||
      !geojsonData ||
      !geojsonData.features ||
      geojsonData.features.length === 0
    ) return;

    const firstFeature = geojsonData.features[0];
    // Controlla che il marker sia effettivamente della città selezionata
    if (firstFeature.properties.city !== selectedCity) {
      // I dati non sono ancora aggiornati, non faccio nulla
      return;
    }

    const newFirstMarker = firstFeature.geometry.coordinates;

    // Centra solo se la città è cambiata rispetto all'ultima volta
    if (lastCityRef.current !== selectedCity) {
      if (mapRef.current && typeof mapRef.current.easeTo === 'function') {
        mapRef.current.easeTo({
          center: newFirstMarker,
          zoom: 13,
          duration: 800
        });
      }
      lastCityRef.current = selectedCity;
      lastFirstMarkerRef.current = newFirstMarker;
    }
  }, [selectedCity, mapLoaded, geojsonData.features?.length]);
 

  // Cleanup for report trigger
  useEffect(() => {
    if (!isMapActive.current) return;

    if (onBeforeReportCleanupTrigger) {

      // Cleanup robusto della mappa
      if (mapRef.current) {
        // Rimuovi tutti i listener e layers
        try {
          const map = mapRef.current;
          if (typeof map.off === 'function') {
            map.off("click", "clusters");
            map.off("click", "clusters-static");
            map.off('click', 'unclustered-point-pl');
            map.off('click', 'unclustered-point-pl-diff');
            map.off('click', 'unclustered-point-qe');
            map.off('mouseenter', 'unclustered-point-pl');
            map.off('mouseleave', 'unclustered-point-pl');
            map.off('mouseenter', 'unclustered-point-pl-diff');
            map.off('mouseleave', 'unclustered-point-pl-diff');
            map.off('mouseenter', 'unclustered-point-qe');
            map.off('mouseleave', 'unclustered-point-qe');
          }
          // Rimuovi tutti i layers e sources
          const layersToRemove = [
            "cluster-count",
            "clusters",
            "clusters-static",
            "clusters-pulse-bg",
            "unclustered-point-qe",
            "unclustered-point-pl",
            "unclustered-point-pl-diff",
            "reported-symbol",
            "marker-label-qe",
            "marker-label-pl"
          ];
          layersToRemove.forEach(layerId => {
            if (map && typeof map.getLayer === 'function' && map.getLayer(layerId)) {
              map.removeLayer(layerId);
            }
          });
          if (map && typeof map.getSource === 'function' && map.getSource('markers')) {
            map.removeSource('markers');
          }
        } catch (err) {
          if (!isMapActive.current) return;
          console.error('Errore nel cleanup della mappa semplificata:', err);
        }
      }

      // Dopo cleanup, svuota la ref
      mapRef.current = null;
      if (onAfterCleanup) onAfterCleanup();
    }
  }, [onBeforeReportCleanupTrigger]);

  const getBorderLabelPoint = (geometry) => {
    if (!geometry?.coordinates) return null;

    // Polygon: coordinates[0] = anello esterno; MultiPolygon: coordinates[0][0]
    const outerRing =
      geometry.type === 'MultiPolygon'
        ? geometry.coordinates?.[0]?.[0]
        : geometry.coordinates?.[0];

    if (!Array.isArray(outerRing) || outerRing.length === 0) return null;

    let lngSum = 0;
    let latSum = 0;
    let count = 0;
    for (const point of outerRing) {
      if (!Array.isArray(point) || point.length < 2) continue;
      lngSum += point[0];
      latSum += point[1];
      count += 1;
    }
    if (count === 0) return null;
    return [lngSum / count, latSum / count];
  };

  const addBordersToMap = (borderData) => {
  const map = mapRef.current;
  if (!map || !borderData) return;

  const sourceId = 'municipality-borders';
  const labelSourceId = 'municipality-borders-label-point';
  const layerId = 'municipality-borders-layer';
  const labelLayerId = 'municipality-borders-label';
  const fillLayerId = 'municipality-borders-fill';

  // Rimuovi source e layer esistenti se presenti
  if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId);
  if (map.getLayer(layerId)) map.removeLayer(layerId);
  if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
  if (map.getSource(labelSourceId)) map.removeSource(labelSourceId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);


  // Aggiungi la source con i dati GeoJSON dei confini
  map.addSource(sourceId, {
    type: 'geojson',
    data: borderData 
  });

  // Layer per il contorno dei confini
  map.addLayer({
    id: layerId,
    type: 'line',
    source: sourceId,
    paint: {
      'line-color': '#000080', 
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        8, 2,  // zoom 8 = width 2
        15, 2  // zoom 15 = width 4
      ],
      'line-opacity': 0.8,

    }
  });

  // Layer opzionale per il riempimento (area del comune)
  map.addLayer({
    id: fillLayerId,
    type: 'fill',
    source: sourceId,
    paint: {
      'fill-color': '#FF6B35',
      'fill-opacity': 0.1 // Molto trasparente
    }
  }, layerId); // Inserito sotto il layer del contorno
  // Una sola etichetta sul centroide: etichettare il poligono ripete il testo su più tile
  const comuneName = borderData.properties?.comune;
  const labelPoint = comuneName ? getBorderLabelPoint(borderData.geometry) : null;
  if (comuneName && labelPoint) {
    map.addSource(labelSourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: { comune: comuneName },
        geometry: {
          type: 'Point',
          coordinates: labelPoint,
        },
      },
    });

    map.addLayer({
      id: labelLayerId,
      type: 'symbol',
      source: labelSourceId,
      layout: {
        'text-field': ['get', 'comune'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 12,  // zoom 8 = size 12
          15, 18  // zoom 15 = size 18
        ],
        'text-anchor': 'center',
        'text-allow-overlap': true,
        'text-ignore-placement': true,
        'symbol-placement': 'point'
      },
      paint: {
        'text-color': '#2D3748',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 2,
        'text-opacity': 0.8
      }
    });
  }
};

  useEffect(() => {
  let cancelled = false

  const removeBordersFromMap = () => {
    const map = mapRef.current;
    if (!map) return;
    const sourceId = 'municipality-borders';
    const labelSourceId = 'municipality-borders-label-point';
    const layerId = 'municipality-borders-layer';
    const labelLayerId = 'municipality-borders-label';
    const fillLayerId = 'municipality-borders-fill';
    try {
      if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId);
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getSource(labelSourceId)) map.removeSource(labelSourceId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    } catch {
      /* ignore */
    }
  };

  const fetchTownhallsBorders = async () => {
    if (!selectedCity || !mapLoaded) return;
    
    try {
      const response = await api.get(`/borders/townhall-name/${selectedCity}`);
      if (cancelled) return;

      if (response.data && response.data.geometry) {
        addBordersToMap(response.data);
      }
    } catch (error) {
      if (cancelled) return;
      console.error('Errore nel caricamento dei confini comunali:', error);
    }
  };

  fetchTownhallsBorders();

  return () => {
    cancelled = true;
    removeBordersFromMap();
  };
}, [selectedCity, mapLoaded, isSatellite]);

  // Linee topologiche (sempre tutte; niente filtro viewport/cluster)
  useEffect(() => {
    const map = mapRef.current;
    if (!isMapActive.current || !map || !mapLoaded) return undefined;

    const ensureArrowImage = () => {
      if (typeof map.hasImage === 'function' && map.hasImage(TOPOLOGY_ARROW_IMAGE_ID)) {
        try { map.removeImage(TOPOLOGY_ARROW_IMAGE_ID); } catch { /* ignore */ }
      }
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(size * 0.15, size * 0.2);
      ctx.lineTo(size * 0.85, size * 0.5);
      ctx.lineTo(size * 0.15, size * 0.8);
      ctx.closePath();
      ctx.fill();
      const imageData = ctx.getImageData(0, 0, size, size);
      map.addImage(TOPOLOGY_ARROW_IMAGE_ID, imageData, { pixelRatio: 2, sdf: true });
    };

    const lineWidthExpr = [
      'interpolate',
      ['linear'],
      ['zoom'],
      10, 1.2,
      14, 2.2,
      17, 3.5,
    ];
    const lineColorExpr = ['coalesce', ['get', 'color'], '#64748b'];

    const syncTopologyData = () => {
      const source = map.getSource(TOPOLOGY_SOURCE_ID);
      if (!source) return;
      const full = topologyGeojsonRef.current || EMPTY_TOPOLOGY_FC;
      source.setData(showTopologyLinesRef.current ? full : EMPTY_TOPOLOGY_FC);
    };

    const setLayerVisibility = (layerId, visibility) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visibility);
      }
    };

    try {
      ensureArrowImage();

      if (!map.getSource(TOPOLOGY_SOURCE_ID)) {
        map.addSource(TOPOLOGY_SOURCE_ID, {
          type: 'geojson',
          data: EMPTY_TOPOLOGY_FC,
        });
      }

      const beforeId = map.getLayer('clusters')
        ? 'clusters'
        : map.getLayer('unclustered-point-pl')
          ? 'unclustered-point-pl'
          : undefined;

      const visibility = showTopologyLines ? 'visible' : 'none';

      if (!map.getLayer(TOPOLOGY_LAYER_ID)) {
        map.addLayer({
          id: TOPOLOGY_LAYER_ID,
          type: 'line',
          source: TOPOLOGY_SOURCE_ID,
          filter: ['!=', ['get', 'dashed'], 1],
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
            visibility,
          },
          paint: {
            'line-color': lineColorExpr,
            'line-opacity': 0.85,
            'line-width': lineWidthExpr,
          },
        }, beforeId);
      } else {
        setLayerVisibility(TOPOLOGY_LAYER_ID, visibility);
        map.setFilter(TOPOLOGY_LAYER_ID, ['!=', ['get', 'dashed'], 1]);
        map.setPaintProperty(TOPOLOGY_LAYER_ID, 'line-color', lineColorExpr);
        map.setPaintProperty(TOPOLOGY_LAYER_ID, 'line-width', lineWidthExpr);
      }

      if (!map.getLayer(TOPOLOGY_LAYER_DASHED_ID)) {
        map.addLayer({
          id: TOPOLOGY_LAYER_DASHED_ID,
          type: 'line',
          source: TOPOLOGY_SOURCE_ID,
          filter: ['==', ['get', 'dashed'], 1],
          layout: {
            'line-cap': 'butt',
            'line-join': 'round',
            visibility,
          },
          paint: {
            'line-color': lineColorExpr,
            'line-opacity': 0.85,
            'line-width': lineWidthExpr,
            'line-dasharray': [2, 1.6],
          },
        }, beforeId);
      } else {
        setLayerVisibility(TOPOLOGY_LAYER_DASHED_ID, visibility);
        map.setFilter(TOPOLOGY_LAYER_DASHED_ID, ['==', ['get', 'dashed'], 1]);
        map.setPaintProperty(TOPOLOGY_LAYER_DASHED_ID, 'line-color', lineColorExpr);
        map.setPaintProperty(TOPOLOGY_LAYER_DASHED_ID, 'line-width', lineWidthExpr);
        map.setPaintProperty(TOPOLOGY_LAYER_DASHED_ID, 'line-dasharray', [2, 1.6]);
      }

      if (!map.getLayer(TOPOLOGY_ARROW_LAYER_ID)) {
        map.addLayer({
          id: TOPOLOGY_ARROW_LAYER_ID,
          type: 'symbol',
          source: TOPOLOGY_SOURCE_ID,
          layout: {
            'symbol-placement': 'line',
            'symbol-spacing': 56,
            'icon-image': TOPOLOGY_ARROW_IMAGE_ID,
            'icon-size': 0.45,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-rotation-alignment': 'map',
            'icon-pitch-alignment': 'map',
            visibility,
          },
          paint: {
            'icon-color': lineColorExpr,
            'icon-opacity': 0.9,
          },
        }, beforeId);
      } else {
        setLayerVisibility(TOPOLOGY_ARROW_LAYER_ID, visibility);
        map.setPaintProperty(TOPOLOGY_ARROW_LAYER_ID, 'icon-color', lineColorExpr);
      }

      syncTopologyData();
    } catch (err) {
      console.error('Errore layer topologia:', err);
    }

    return undefined;
  }, [mapLoaded, isSatellite, topologyGeojson, showTopologyLines]);

  // Cleanup topologia al cambio stile / unmount (isSatellite ricrea tutto)
  useEffect(() => {
    return () => {
      const map = mapRef.current;
      if (!map) return;
      try {
        if (map.getLayer(TOPOLOGY_ARROW_LAYER_ID)) map.removeLayer(TOPOLOGY_ARROW_LAYER_ID);
        if (map.getLayer(TOPOLOGY_LAYER_DASHED_ID)) map.removeLayer(TOPOLOGY_LAYER_DASHED_ID);
        if (map.getLayer(TOPOLOGY_LAYER_ID)) map.removeLayer(TOPOLOGY_LAYER_ID);
        if (map.getSource(TOPOLOGY_SOURCE_ID)) map.removeSource(TOPOLOGY_SOURCE_ID);
        if (typeof map.hasImage === 'function' && map.hasImage(TOPOLOGY_ARROW_IMAGE_ID)) {
          map.removeImage(TOPOLOGY_ARROW_IMAGE_ID);
        }
      } catch {
        // ignore
      }
    };
  }, [isSatellite]);
// Aggiungi questo useEffect dopo la creazione della mappa
useEffect(() => {
  const map = mapRef.current;
  if (!map) return;

  const handleStyleData = () => {
    if (!map.isStyleLoaded()) return;
    
    // Forza la ricreazione di tutti i layer dopo il cambio di stile
    // Questo triggererà tutti i useEffect che dipendono da mapLoaded
    setMapLoaded(false);
    setTimeout(() => setMapLoaded(true), 100);
  };

  map.on('styledata', handleStyleData);

  return () => {
    map.off('styledata', handleStyleData);
  };
}, []);


  


  // Espone l'istanza della mappa al padre
  useImperativeHandle(ref, () => mapRef.current);

  function goToUserLocation() {
    try {
      if (!isMapActive.current || !mapRef.current) return;
      if (!('geolocation' in navigator)) {
        console.warn('Geolocalizzazione non supportata dal browser.');
        return;
      }

      // resetta il flag di centraggio per questo ciclo
      userLocationCenteredOnceRef.current = false;

      const handlePosition = (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!isMapActive.current || !mapRef.current) return;
        // crea/aggiorna marker
        const el = document.createElement('div');
        el.className = 'w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-[0_0_0_6px_rgba(59,130,246,0.35)]';
        if (userLocationMarkerRef.current) {
          userLocationMarkerRef.current.setLngLat([longitude, latitude]);
        } else {
          userLocationMarkerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([longitude, latitude])
            .addTo(mapRef.current);
        }
        // centra solo al primo fix
        if (!userLocationCenteredOnceRef.current && typeof mapRef.current.easeTo === 'function') {
          userLocationCenteredOnceRef.current = true;
          mapRef.current.easeTo({
            center: [longitude, latitude],
            zoom: Math.max(15, mapRef.current.getZoom() || 12),
            duration: 800,
            essential: true
          });
        }
      };

      const handleError = (err) => {
        console.error('Errore geolocalizzazione:', err);
      };

      // interrompi eventuale watch precedente
      if (userLocationWatchIdRef.current) {
        try { navigator.geolocation.clearWatch(userLocationWatchIdRef.current); } catch {}
        userLocationWatchIdRef.current = null;
      }

      // posizione immediata
      navigator.geolocation.getCurrentPosition(handlePosition, handleError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
      // avvia watch realtime (senza auto-follow successivi)
      userLocationWatchIdRef.current = navigator.geolocation.watchPosition(
        handlePosition,
        handleError,
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
      );
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    return () => {
      if (userLocationMarkerRef.current) {
        try { userLocationMarkerRef.current.remove(); } catch {}
        userLocationMarkerRef.current = null;
      }
      if (userLocationWatchIdRef.current) {
        try { navigator.geolocation.clearWatch(userLocationWatchIdRef.current); } catch {}
        userLocationWatchIdRef.current = null;
      }
    };
  }, []);

  const ensureLassoLayers = (map) => {
    if (!map.getSource(LASSO_SOURCE_ID)) {
      map.addSource(LASSO_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }
    if (!map.getLayer(LASSO_FILL_LAYER_ID)) {
      map.addLayer({
        id: LASSO_FILL_LAYER_ID,
        type: "fill",
        source: LASSO_SOURCE_ID,
        paint: {
          "fill-color": "#3b82f6",
          "fill-opacity": 0.15,
        },
      });
    }
    if (!map.getLayer(LASSO_LINE_LAYER_ID)) {
      map.addLayer({
        id: LASSO_LINE_LAYER_ID,
        type: "line",
        source: LASSO_SOURCE_ID,
        paint: {
          "line-color": "#60a5fa",
          "line-width": 2,
          "line-dasharray": [2, 1],
        },
      });
    }
    if (!map.getSource(LASSO_SELECTION_SOURCE_ID)) {
      map.addSource(LASSO_SELECTION_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }
    if (!map.getLayer(LASSO_SELECTION_LAYER_ID)) {
      map.addLayer({
        id: LASSO_SELECTION_LAYER_ID,
        type: "circle",
        source: LASSO_SELECTION_SOURCE_ID,
        paint: {
          "circle-radius": 10,
          "circle-color": "#f59e0b",
          "circle-opacity": 0.35,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fbbf24",
        },
      });
    }
    // Mantieni i layer lazo sopra i marker
    try {
      if (map.getLayer(LASSO_FILL_LAYER_ID)) map.moveLayer(LASSO_FILL_LAYER_ID);
      if (map.getLayer(LASSO_LINE_LAYER_ID)) map.moveLayer(LASSO_LINE_LAYER_ID);
      if (map.getLayer(LASSO_SELECTION_LAYER_ID)) map.moveLayer(LASSO_SELECTION_LAYER_ID);
    } catch { /* ignore */ }
  };

  const clearLassoDraw = (map) => {
    const source = map.getSource(LASSO_SOURCE_ID);
    if (source) {
      source.setData({ type: "FeatureCollection", features: [] });
    }
  };

  const buildSelectionGeojson = (ids, sourceGeojson) => {
    const idSet = new Set(ids);
    const features = (sourceGeojson?.features || [])
      .filter((f) => idSet.has(f.properties?._id))
      .map((f) => ({
        type: "Feature",
        geometry: f.geometry,
        properties: { _id: f.properties._id },
      }));
    return { type: "FeatureCollection", features };
  };

  // Evidenzia i punti selezionati dal lazo
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    try {
      ensureLassoLayers(map);
      const selectionSource = map.getSource(LASSO_SELECTION_SOURCE_ID);
      if (selectionSource) {
        selectionSource.setData(buildSelectionGeojson(selectedLassoIds, geojsonData));
      }
    } catch (err) {
      console.error("Errore aggiornamento selezione lazo:", err);
    }
  }, [selectedLassoIds, geojsonData, mapLoaded, isSatellite]);

  // Tasto destro: SUPER_ADMIN / SURVEYOR → copia lat, lng (modalità semplice)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return undefined;
    if (!COORD_COPY_ROLES.has(userData?.user_type)) return undefined;

    const canvas = map.getCanvas();
    const onContextMenu = async (e) => {
      e.preventDefault();
      // In lazo il tasto destro serve al pan: non copiare
      if (isLassoActive) return;
      try {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const { lat, lng } = map.unproject([x, y]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        await copyLatLngToClipboard(lat, lng);
        toast.success("Coordinate copiate");
      } catch (_) {
        /* ignore */
      }
    };

    canvas.addEventListener("contextmenu", onContextMenu);
    return () => canvas.removeEventListener("contextmenu", onContextMenu);
  }, [mapLoaded, userData?.user_type, isLassoActive]);

  // Modalità lazo: disegno, drag, scala/ruota, pan tasto destro
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!isLassoActive) {
      try {
        map.dragPan.enable();
        try { map.dragRotate.enable(); } catch { /* ignore */ }
        try { map.touchZoomRotate?.enableRotation?.(); } catch { /* ignore */ }
        if (map.boxZoom) map.boxZoom.enable();
        map.scrollZoom.enable();
        map.getCanvas().style.cursor = "";
        clearLassoDraw(map);
      } catch { /* ignore */ }
      return undefined;
    }

    ensureLassoLayers(map);
    map.dragPan.disable();
    try { map.dragRotate.disable(); } catch { /* ignore */ }
    try { map.touchZoomRotate?.disableRotation?.(); } catch { /* ignore */ }
    if (map.boxZoom) map.boxZoom.disable();
    const transformMode = lassoScaleMode || lassoRotateMode;
    if (transformMode) {
      try { map.scrollZoom.disable(); } catch { /* ignore */ }
    } else {
      try { map.scrollZoom.enable(); } catch { /* ignore */ }
    }
    map.getCanvas().style.cursor = lassoLinkParentMode
      ? "pointer"
      : lassoScaleMode
        ? "ns-resize"
        : lassoRotateMode
          ? "grab"
          : selectedLassoIds.length > 0
            ? "move"
            : "crosshair";

    if (popupRef.current) {
      try { popupRef.current.remove(); } catch { /* ignore */ }
      popupRef.current = null;
    }

    let isDrawing = false;
    let drawPoints = [];
    let isGroupDragging = false;
    let dragStartLngLat = null;
    let dragBasePositions = null;
    let isRightPanning = false;
    let rightPanLastPoint = null;

    const MARKER_HIT_LAYERS = [
      "unclustered-point-pl",
      "unclustered-point-pl-diff",
      "unclustered-point-qe",
      "reported-symbol",
      "reported-ordinary-triangle",
      "reported-extraordinary-pentagon",
    ].filter((layerId) => map.getLayer(layerId));

    const pickMarkerAtPoint = (point) => {
      if (!MARKER_HIT_LAYERS.length) return null;
      const features = map.queryRenderedFeatures(point, { layers: MARKER_HIT_LAYERS });
      const feature = features.find((f) => f?.properties?._id);
      if (!feature) return null;
      return {
        ...feature.properties,
        lat: feature.geometry?.coordinates?.[1],
        lng: feature.geometry?.coordinates?.[0],
      };
    };

    const setDrawGeojson = (points, closed = false) => {
      const source = map.getSource(LASSO_SOURCE_ID);
      if (!source) return;
      if (!points.length) {
        source.setData({ type: "FeatureCollection", features: [] });
        return;
      }
      const ring = closed && points.length >= 3 ? [...points, points[0]] : points;
      const features = [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: points.length >= 3 && closed ? "Polygon" : "LineString",
            coordinates: points.length >= 3 && closed ? [ring] : ring,
          },
        },
      ];
      source.setData({ type: "FeatureCollection", features });
    };

    const applyPreviewPositions = (positionMap) => {
      const base = geojsonDataRef.current;
      if (!base?.features || !map.getSource("markers")) return;

      const updatedFeatures = base.features.map((f) => {
        const id = f.properties?._id;
        if (!positionMap.has(id)) return f;
        const pos = positionMap.get(id);
        return {
          ...f,
          geometry: {
            ...f.geometry,
            coordinates: [pos.lng, pos.lat],
          },
          properties: {
            ...f.properties,
            lat: pos.lat,
            lng: pos.lng,
          },
        };
      });
      const updated = { type: "FeatureCollection", features: updatedFeatures };
      map.getSource("markers").setData(
        editingMarkerId ? removeMarkerById(updated, editingMarkerId) : updated
      );

      const selectionSource = map.getSource(LASSO_SELECTION_SOURCE_ID);
      if (selectionSource) {
        selectionSource.setData(buildSelectionGeojson([...positionMap.keys()], updated));
      }
    };

    const commitPositionUpdates = (updates) => {
      const rounded = (updates || []).map((u) => ({
        _id: u._id,
        lat: Number(Number(u.lat).toFixed(7)),
        lng: Number(Number(u.lng).toFixed(7)),
      }));
      const preview = new Map(rounded.map((u) => [u._id, { lat: u.lat, lng: u.lng }]));
      applyPreviewPositions(preview);

      const baseFeatures = geojsonDataRef.current?.features || [];
      if (baseFeatures.length) {
        const byId = new Map(rounded.map((u) => [String(u._id), u]));
        geojsonDataRef.current = {
          ...geojsonDataRef.current,
          features: baseFeatures.map((f) => {
            const u = byId.get(String(f.properties?._id));
            if (!u) return f;
            return {
              ...f,
              geometry: { ...f.geometry, coordinates: [u.lng, u.lat] },
              properties: { ...f.properties, lat: u.lat, lng: u.lng },
            };
          }),
        };
      }

      if (onLassoGroupMoveRef.current) {
        onLassoGroupMoveRef.current(rounded);
      }
    };

    const collectSelectedPositions = () => {
      const selected = selectedLassoIdsRef.current;
      if (!selected?.length) return [];
      const idSet = new Set(selected.map(String));
      const positions = [];
      for (const f of geojsonDataRef.current?.features || []) {
        const id = f.properties?._id;
        if (!idSet.has(String(id))) continue;
        const lng = Number(f.geometry?.coordinates?.[0]);
        const lat = Number(f.geometry?.coordinates?.[1]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          positions.push({ id, lat, lng });
        }
      }
      return positions;
    };

    const onMouseDown = (e) => {
      if (!isLassoActiveRef.current) return;
      if (e.originalEvent?.target?.closest?.(".maplibregl-ctrl, button, a")) return;

      // Tasto destro: pan mappa
      if (e.originalEvent?.button === 2) {
        isRightPanning = true;
        rightPanLastPoint = e.point;
        isDrawing = false;
        isGroupDragging = false;
        map.getCanvas().style.cursor = "grabbing";
        return;
      }

      if (e.originalEvent?.button !== 0) return;

      if (lassoLinkParentModeRef.current) {
        const marker = pickMarkerAtPoint(e.point);
        if (marker && onLassoLinkParentRef.current) {
          onLassoLinkParentRef.current(marker);
        }
        return;
      }

      if (lassoScaleModeRef.current || lassoRotateModeRef.current) return;

      const selected = selectedLassoIdsRef.current;
      if (selected.length > 0) {
        isGroupDragging = true;
        dragStartLngLat = e.lngLat;
        dragBasePositions = new Map();
        const base = geojsonDataRef.current;
        const idSet = new Set(selected);
        for (const f of base?.features || []) {
          const id = f.properties?._id;
          if (!idSet.has(id)) continue;
          const lng = Number(f.geometry?.coordinates?.[0]);
          const lat = Number(f.geometry?.coordinates?.[1]);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            dragBasePositions.set(id, { lat, lng });
          }
        }
        map.getCanvas().style.cursor = "grabbing";
        return;
      }

      isDrawing = true;
      drawPoints = [[e.lngLat.lng, e.lngLat.lat]];
      setDrawGeojson(drawPoints, false);
    };

    const onMouseMove = (e) => {
      if (isRightPanning && rightPanLastPoint) {
        const dx = e.point.x - rightPanLastPoint.x;
        const dy = e.point.y - rightPanLastPoint.y;
        map.panBy([-dx, -dy], { animate: false });
        rightPanLastPoint = e.point;
        return;
      }

      if (lassoLinkParentModeRef.current || lassoScaleModeRef.current || lassoRotateModeRef.current) return;

      if (isGroupDragging && dragStartLngLat && dragBasePositions) {
        const dLng = e.lngLat.lng - dragStartLngLat.lng;
        const dLat = e.lngLat.lat - dragStartLngLat.lat;
        const next = new Map();
        for (const [id, pos] of dragBasePositions.entries()) {
          next.set(id, { lat: pos.lat + dLat, lng: pos.lng + dLng });
        }
        applyPreviewPositions(next);
        return;
      }

      if (!isDrawing) return;
      drawPoints.push([e.lngLat.lng, e.lngLat.lat]);
      if (drawPoints.length > 2) {
        const prev = drawPoints[drawPoints.length - 2];
        const curr = drawPoints[drawPoints.length - 1];
        const dx = curr[0] - prev[0];
        const dy = curr[1] - prev[1];
        if (dx * dx + dy * dy < 1e-10) {
          drawPoints.pop();
          return;
        }
      }
      setDrawGeojson(drawPoints, false);
    };

    const endRightPan = () => {
      if (!isRightPanning) return;
      isRightPanning = false;
      rightPanLastPoint = null;
      map.getCanvas().style.cursor = lassoLinkParentModeRef.current
        ? "pointer"
        : lassoScaleModeRef.current
          ? "ns-resize"
          : lassoRotateModeRef.current
            ? "grab"
            : selectedLassoIdsRef.current.length > 0
              ? "move"
              : "crosshair";
    };

    const onMouseUp = (e) => {
      if (e.originalEvent?.button === 2 || isRightPanning) {
        endRightPan();
        return;
      }

      if (lassoLinkParentModeRef.current || lassoScaleModeRef.current || lassoRotateModeRef.current) return;

      if (isGroupDragging && dragBasePositions && dragStartLngLat) {
        const dLng = e.lngLat.lng - dragStartLngLat.lng;
        const dLat = e.lngLat.lat - dragStartLngLat.lat;
        const updates = [];
        for (const [id, pos] of dragBasePositions.entries()) {
          updates.push({
            _id: id,
            lat: pos.lat + dLat,
            lng: pos.lng + dLng,
          });
        }
        isGroupDragging = false;
        dragStartLngLat = null;
        dragBasePositions = null;
        map.getCanvas().style.cursor = "move";
        if (updates.length) {
          commitPositionUpdates(updates);
        }
        return;
      }

      if (!isDrawing) return;
      isDrawing = false;
      drawPoints.push([e.lngLat.lng, e.lngLat.lat]);

      if (drawPoints.length < 3) {
        clearLassoDraw(map);
        drawPoints = [];
        return;
      }

      setDrawGeojson(drawPoints, true);
      const ids = selectFeatureIdsInPolygon(
        geojsonDataRef.current,
        drawPoints,
        { max: LASSO_MAX_POINTS }
      );

      window.setTimeout(() => {
        try { clearLassoDraw(map); } catch { /* ignore */ }
      }, 250);

      drawPoints = [];
      if (onLassoSelectRef.current) {
        onLassoSelectRef.current(ids);
      }
    };

    const onContextMenu = (e) => {
      e.preventDefault?.();
      if (e.originalEvent) e.originalEvent.preventDefault?.();
    };

    const onKeyDown = (ev) => {
      if (ev.key === "Escape" && isDrawing) {
        isDrawing = false;
        drawPoints = [];
        clearLassoDraw(map);
      }
    };

    const onWheel = (e) => {
      const scaleOn = lassoScaleModeRef.current;
      const rotateOn = lassoRotateModeRef.current;
      if ((!scaleOn && !rotateOn) || !isLassoActiveRef.current) return;

      const positions = collectSelectedPositions();
      if (positions.length < 2) return;

      e.preventDefault?.();
      if (e.originalEvent) {
        e.originalEvent.preventDefault?.();
        e.originalEvent.stopPropagation?.();
      }

      const delta = e.originalEvent?.deltaY ?? e.deltaY ?? 0;
      if (!delta) return;

      let sumLat = 0;
      let sumLng = 0;
      for (const p of positions) {
        sumLat += p.lat;
        sumLng += p.lng;
      }
      const cLat = sumLat / positions.length;
      const cLng = sumLng / positions.length;
      const cosLat = Math.cos((cLat * Math.PI) / 180) || 1;

      let updates;
      if (scaleOn) {
        const factor = delta < 0 ? 1.06 : 0.94;
        updates = positions.map((p) => ({
          _id: p.id,
          lat: cLat + (p.lat - cLat) * factor,
          lng: cLng + (p.lng - cLng) * factor,
        }));
      } else {
        // rotella su = antiorario, giù = orario (~4°)
        const angle = ((delta < 0 ? 4 : -4) * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        updates = positions.map((p) => {
          const dLat = p.lat - cLat;
          const dLngAdj = (p.lng - cLng) * cosLat;
          const newDLngAdj = dLngAdj * cos - dLat * sin;
          const newDLat = dLngAdj * sin + dLat * cos;
          return {
            _id: p.id,
            lat: cLat + newDLat,
            lng: cLng + newDLngAdj / cosLat,
          };
        });
      }

      commitPositionUpdates(updates);
    };

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", onMouseUp);
    map.on("wheel", onWheel);
    map.getCanvas().addEventListener("contextmenu", onContextMenu);
    window.addEventListener("mouseup", endRightPan);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", onMouseUp);
      map.off("wheel", onWheel);
      map.getCanvas().removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("mouseup", endRightPan);
      window.removeEventListener("keydown", onKeyDown);
      try {
        map.dragPan.enable();
        try { map.dragRotate.enable(); } catch { /* ignore */ }
        try { map.touchZoomRotate?.enableRotation?.(); } catch { /* ignore */ }
        if (map.boxZoom) map.boxZoom.enable();
        map.scrollZoom.enable();
        map.getCanvas().style.cursor = "";
        clearLassoDraw(map);
      } catch { /* ignore */ }
    };
  }, [isLassoActive, selectedLassoIds.length, lassoLinkParentMode, lassoScaleMode, lassoRotateMode, mapLoaded, isSatellite, editingMarkerId]);


  return (
    <div
      ref={mapContainerRef}
      style={{ width: "100%", height: "100vh" }}
      id="maplibre-map"
    >
      <MapStyleSwitcher
        map={mapRef}
        initialStyleUrl={MAPTILER_STYLE}
        satelliteStyleUrl={MAPTILER_STYLE_SATELLITE}
        isSatellite={isSatellite}
        onModeChange={(mode) => setIsSatellite(mode)}
      />
      <div className="absolute top-36 right-2 z-10 flex flex-col gap-2 sm:top-40 sm:right-3">
        <MapButton icon={LocateFixed} onClick={goToUserLocation} title="Vai alla mia posizione" />
        {typeof onRefreshMap === "function" && (
          <MapButton
            icon={RefreshCw}
            onClick={onRefreshMap}
            title="Aggiorna mappa"
            disabled={!selectedCity || isRefreshing}
            iconClassName={isRefreshing ? "animate-spin" : ""}
          />
        )}
      </div>
    </div>
  );
});

export default MapLibreMap; 
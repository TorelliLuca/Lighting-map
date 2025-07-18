import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import process from "process";
import ReactDOM from "react-dom/client";
import InfoWindow from "./InfoWindow";
import { useContext } from "react";
import { UserContext } from "../context/UserContext"



const DEFAULT_CENTER = [12.4964, 41.9028]; // Roma, [lng, lat]
const DEFAULT_ZOOM = 12;

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API; 
const MAPTILER_STYLE = `https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_KEY}`;

const STORAGE_KEY_PREFIX = "lighting-map-"
const STORAGE_KEYS = {
  SELECTED_CITY: `${STORAGE_KEY_PREFIX}selected-city`,
  HIGHLIGHT_OPTION: `${STORAGE_KEY_PREFIX}highlight-option`,
  FILTER_OPTION: `${STORAGE_KEY_PREFIX}filter-option`,
  MAP_CENTER: `${STORAGE_KEY_PREFIX}map-center`,
  MAP_ZOOM: `${STORAGE_KEY_PREFIX}map-zoom`,
}

const MapLibreMap = ({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  styleUrl = MAPTILER_STYLE,
  onMapLoaded, // callback opzionale
  geojsonData, // nuova prop per i dati
  showStreetLampNumber, // nuova prop
  showPanelNumber, // nuova prop
  onEditClick, // callback per edit
  onDeleteClick, // callback per delete
  editingMarkerId, // id marker in editing
  onMarkerPositionChange, // callback per drag
  selectedCity,
  onBeforeReport,
  onBeforeReportCleanupTrigger,
  onAfterCleanup
}) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { userData } = useContext(UserContext);
  const popupRef = useRef(null);
  // stato per sapere se è il primo caricamento
  const [firstLoadDone, setFirstLoadDone] = useState(false);

  //  ref per tracciare l'ultima città e il primo marker centrato per useeffect dello zoom al cambio di città
  const lastCityRef = useRef();
  const lastFirstMarkerRef = useRef(selectedCity);

  // Ref per lock asincrono delle icone SVG
  const svgLoadingMap = useRef(new Map());
  // Ref per sapere se la mappa è ancora attiva
  const isMapActive = useRef(true);
  

  useEffect(() => {
    isMapActive.current = true;
    mapRef.current = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center,
      zoom,
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
      filter: ["all", ["!", ["has", "point_count"]], [">=", ["get", "segnalazioni_in_corso_length"], 1]],
      layout: {
        "icon-image": "pulsing-dot",
        "icon-size": 0.5,
        "icon-allow-overlap": true
      }
    });

    // Layer per i punti singoli
    // mapRef.current.addLayer({
    //   id: "unclustered-point",
    //   type: "circle",
    //   source: "markers",
    //   filter: ["!", ["has", "point_count"]],
    //   paint: {
    //     "circle-color": ["get", "color"],
    //     "circle-radius": 6,
    //     "circle-stroke-width": 1,
    //     "circle-stroke-color": "#fff"
    //   }
    // });
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
            console.log("errore, esco", err);
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
      let content = { ...props };
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
      let content = { ...props };
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

    function safeHandleMarkerClick(e) {
      try {
        if (!isMapActive.current || !mapRef.current) return;
        const feature = e.features[0];
        if (!feature || !feature.properties) return;
        const coordinates = feature.geometry.coordinates.slice();
        let props = {
          ...feature.properties,
          lat: feature.geometry.coordinates[1],
          lng: feature.geometry.coordinates[0]
        };
        //const selectedCity = localStorage.getItem(STORAGE_KEYS.SELECTED_CITY)
        const popupDiv = document.createElement('div');
        const content = cleanAndNormalizeProps(props);
        props = cleanAndNormalizeContent(props)


        ReactDOM.createRoot(popupDiv).render(
          <InfoWindow
            content={content}
            marker={props}
            city={selectedCity}
            userData={userData}
            mapType="maplibre"
            style={{ maxWidth: '420px', minWidth: '220px' }}
            onEditClick={onEditClick}
            onDeleteClick={onDeleteClick}
            onBeforeReport={onBeforeReport}
          />
        );
        // AGGIUNTA: salva la popup nella ref
        if (mapRef.current && typeof maplibregl.Popup === 'function') {
          const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: 'none' })
            .setLngLat(coordinates)
            .setDOMContent(popupDiv)
            .addTo(mapRef.current);
          popupRef.current = popup;
        }
      } catch (err) {
        if (!isMapActive.current) return;
        console.error('Errore nella creazione della popup:', err);
      }
    }

    // Click su marker
    mapRef.current.on('click', 'unclustered-point-pl', safeHandleMarkerClick);
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
    mapRef.current.on('mouseenter', 'unclustered-point-qe', safeMouseEnterQE);
    mapRef.current.on('mouseleave', 'unclustered-point-qe', safeMouseLeaveQE);



// Logga l'ordine dei layer dopo la creazione
// if (mapRef.current) {
//   if (typeof mapRef.current.getLayersOrder === 'function') {
//     console.log('Ordine layer:', mapRef.current.getLayersOrder());
//   } else if (mapRef.current.getStyle && mapRef.current.getStyle().layers) {
//     console.log('Ordine layer:', mapRef.current.getStyle().layers.map(l => l.id));
//   }
// }



    // Cleanup
    return () => {
      // isMapActive.current = false;
      // const map = mapRef.current;
      // if (!map || !map.style) return;
      // // Rimuovi tutti i listener
      // if (typeof map.off === 'function') {
      //   map.off("click", "clusters", safeHandleClusterClick);
      //   map.off("click", "clusters-static", safeHandleClusterClick);
      //   map.off('click', 'unclustered-point-pl', safeHandleMarkerClick);
      //   map.off('click', 'unclustered-point-qe', safeHandleMarkerClick);
      //   map.off('mouseenter', 'unclustered-point-pl', safeMouseEnterPL);
      //   map.off('mouseleave', 'unclustered-point-pl', safeMouseLeavePL);
      //   map.off('mouseenter', 'unclustered-point-qe', safeMouseEnterQE);
      //   map.off('mouseleave', 'unclustered-point-qe', safeMouseLeaveQE);
      // }
      // // CLEANUP ROBUSTO: rimuovi tutti i layer che usano la source 'markers' prima di rimuovere la source
      // const layersToRemove = [
      //   "cluster-count",
      //   "clusters",
      //   "clusters-static",
      //   "clusters-pulse-bg",
      //   "unclustered-point-qe",
      //   "unclustered-point-pl",
      //   "reported-symbol",
      //   "marker-label-qe",
      //   "marker-label-pl"
      // ];
      // console.log("rimuovo cluster e marker")
      // layersToRemove.forEach(layerId => {
      //   if (map && typeof map.getLayer === 'function' && map.getLayer(layerId)) {
      //     map.removeLayer(layerId);
      //   }
      // });
      // if (map && typeof map.getSource === 'function' && map.getSource('markers')) {
      //   map.removeSource('markers');
      // }

    };
    
  }, [geojsonData, mapLoaded, userData, editingMarkerId]);

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
  }, [geojsonData, mapLoaded, showStreetLampNumber, showPanelNumber]);

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

  // Layer marker: PL = cerchio
  useEffect(() => {
    const map = mapRef.current;
    if (!isMapActive.current || !map || !geojsonData || !mapLoaded) return;

    // PL: cerchio
    if (map && typeof map.getLayer === 'function' && map.getLayer('unclustered-point-pl')) {
      map.removeLayer('unclustered-point-pl');
    }
    map.addLayer({
      id: 'unclustered-point-pl',
      type: 'circle',
      source: 'markers',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'marker'], 'PL']],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': 6,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });
    // Cleanup PL
    return () => {
      if (!isMapActive.current || !map) return;
      if (map && typeof map.getLayer === 'function' && map.getLayer('unclustered-point-pl')) {
        map.removeLayer('unclustered-point-pl');
      }
    };
  }, [geojsonData, mapLoaded, editingMarkerId]);

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
  }, [geojsonData, mapLoaded, editingMarkerId]);



  // Ricentra la mappa SOLO al primo caricamento dei dati
  useEffect(() => {
    if (!isMapActive.current || !firstLoadDone && geojsonData && geojsonData.features && geojsonData.features.length > 0 && mapLoaded) {
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
    // AGGIUNTA: auto-pan durante il drag
    function handleDrag() {
      const lngLat = dragMarker.getLngLat();
      if (map && typeof map.getContainer === 'function' && typeof map.project === 'function') {
        const container = map.getContainer();
        const rect = container.getBoundingClientRect();
        const point = map.project([lngLat.lng, lngLat.lat]);
        // Soglie personalizzate
        const edgeThresholdLeft = 60;
        const edgeThresholdRight = 500; // più largo per il modal
        const edgeThresholdTop = 60;
        const edgeThresholdBottom = 120; // puoi aumentare se hai elementi in basso

        let dx = 0, dy = 0;
        if (point.x < edgeThresholdLeft) dx = -30;
        else if (point.x > rect.width - edgeThresholdRight) dx = 30;
        if (point.y < edgeThresholdTop) dy = -30;
        else if (point.y > rect.height - edgeThresholdBottom) dy = 30;

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
  }, [editingMarkerId, geojsonData, mapLoaded]);

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
            map.off('click', 'unclustered-point-qe');
            map.off('mouseenter', 'unclustered-point-pl');
            map.off('mouseleave', 'unclustered-point-pl');
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

  // // Funzione per ottenere tutti gli id dei layer presenti nella mappa
  // function getAllLayerIds() {
  //   if (!mapRef.current || !mapRef.current.style) return [];
  //   try {
  //   return mapRef.current.getStyle().layers.map(layer => layer.id);
  //   }catch(e){
  //     return []
  //   }
  // }

  // // Espongo la funzione come metodo pubblico su mapRef.current
  // useEffect(() => {
  //   if (mapRef.current) {
  //     mapRef.current.getAllLayerIds = getAllLayerIds;
  //     console.log(mapRef.current.getAllLayerIds())
  //   }
  // }, [mapLoaded]);


  return (
    <div
      ref={mapContainerRef}
      style={{ width: "100%", height: "100vh" }}
      id="maplibre-map"
    />
  );
};

export default MapLibreMap; 
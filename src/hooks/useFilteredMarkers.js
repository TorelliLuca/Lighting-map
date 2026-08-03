import { useMemo } from 'react';
import { getColorList, DEFAULT_COLOR, FC_QUADRO_COLOR, applyFcQuadroToLegendMap, isFcQuadro } from '../utils/ColorGenerator';
import { getTipoLampada } from '../utils/utils';

// Genera la mappa colori coordinata come in createMarkers.jsx
export function generateLegendColorMap(markers, highlightOption) {
  let colorMappings = { quadro: {}, proprieta: {}, lotto: {}, tipo_lampada: {}, tipo_apparecchio: {} };
  let uniqueValues = [];
  if (highlightOption === 'PROPRIETA') {
    uniqueValues = Array.from(new Set(markers.map(marker => marker.proprieta).filter(Boolean)));
    const colorList = getColorList(uniqueValues.length);
    uniqueValues.forEach((val, idx) => {
      colorMappings.proprieta[val] = colorList[idx];
    });
  } else if (highlightOption === 'MARKER') {
    uniqueValues = Array.from(new Set(markers.map(marker => marker.quadro).filter(Boolean)));
    const colorList = getColorList(uniqueValues.length);
    uniqueValues.forEach((val, idx) => {
      colorMappings.quadro[val] = colorList[idx];
    });
  } else if (highlightOption === 'LOTTO') {
    uniqueValues = Array.from(new Set(markers.map(marker => marker.lotto).filter(Boolean)));
    const colorList = getColorList(uniqueValues.length);
    uniqueValues.forEach((val, idx) => {
      colorMappings.lotto[val] = colorList[idx];
    });
  } else if (highlightOption === 'TIPO_LAMPADA') {
    uniqueValues = Array.from(new Set(markers.map(marker => getTipoLampada(marker)).filter(Boolean)));
    const colorList = getColorList(uniqueValues.length);
    uniqueValues.forEach((val, idx) => {
      colorMappings.tipo_lampada[val] = colorList[idx];
    });
  } else if (highlightOption === 'TIPO_APPARECCHIO') {
    uniqueValues = Array.from(new Set(markers.map(marker => (marker.tipo_apparecchio || '').toLowerCase()).filter(Boolean)));
    const colorList = getColorList(uniqueValues.length);
    uniqueValues.forEach((val, idx) => {
      colorMappings.tipo_apparecchio[val] = colorList[idx];
    });
  }

  applyFcQuadroToLegendMap(colorMappings);
  return colorMappings;
}

// Funzione per determinare il colore del marker
function getMarkerColor(marker, highlightOption, colorMappings) {
 
  // Notifiche attive
  const hasActiveNotifications = marker.segnalazioni_in_corso && marker.segnalazioni_in_corso.length > 0;
  let markerColor = DEFAULT_COLOR;
  if (highlightOption === '' || !highlightOption) {
    markerColor = hasActiveNotifications ? '#FFCC00' : DEFAULT_COLOR;
  } else if (highlightOption === 'MARKER') {
    if (marker.quadro && colorMappings.quadro[marker.quadro]) {
      markerColor = colorMappings.quadro[marker.quadro];
    }
  } else if (highlightOption === 'PROPRIETA') {
    const prop = marker.proprieta ? marker.proprieta.trim().toLowerCase() : '';
    if (prop === 'comune' || prop === 'municipale') {
      markerColor = '#3b82f6'; // blu
    } else if (prop === 'enelsole') {
      markerColor = '#ef4444'; // rosso
    } else {
      markerColor = '#6b7280'; // grigio
    }
  } else if (highlightOption === 'LOTTO') {
    if (marker.lotto && colorMappings.lotto[marker.lotto]) {
      markerColor = colorMappings.lotto[marker.lotto];
    }
  } else if (highlightOption === 'TIPO_LAMPADA') {
    if (marker.marker === 'QE') {
      markerColor = '#3b82f6'; // Colore fisso per i quadri
    } else {
      const tipoLampada = getTipoLampada(marker);
      if (tipoLampada && colorMappings.tipo_lampada && colorMappings.tipo_lampada[tipoLampada]) {
        markerColor = colorMappings.tipo_lampada[tipoLampada];
      }
    }
  } else if (highlightOption === 'TIPO_APPARECCHIO') {
    const tipoApparecchio = (marker.tipo_apparecchio || '').toLowerCase();
    if (tipoApparecchio && colorMappings.tipo_apparecchio && colorMappings.tipo_apparecchio[tipoApparecchio]) {
      markerColor = colorMappings.tipo_apparecchio[tipoApparecchio];
    }
    
  }

  if (isFcQuadro(marker.quadro)) {
    markerColor = FC_QUADRO_COLOR;
  }

  return markerColor;
}

// Funzione di filtro marker lato client
function filterMarkers(markers, filterType, selectedProprietaFilter) {
  if (!markers || markers.length === 0) return [];

  let filteredMarkers;
  switch (filterType) {
    case 'REPORTED':
      filteredMarkers = markers.filter(
        (marker) => {

          return marker.segnalazioni_in_corso && marker.segnalazioni_in_corso.length > 0}
      );
      break;
    case 'MARKER':
      
      filteredMarkers = markers.filter((marker) => marker.marker === 'QE');
      break;
    case 'PROPRIETA':
      if (!selectedProprietaFilter) {
        filteredMarkers = [];
      } else {
        const selectedProprieta = selectedProprietaFilter.toLowerCase();
        filteredMarkers = markers.filter((marker) => {
          const prop = (marker.proprieta || '').toLowerCase();
          if (selectedProprieta === 'municipale') {
            return prop === 'comune' || prop === 'municipale';
          }
          if (selectedProprieta === 'enelsole') {
            return prop === 'enelsole';
          }
          return false;
        });
      }
      break;
    case 'SELECT':
    default:
      filteredMarkers = [...markers];
      break;
  }
  return filteredMarkers;
}

// Funzione per convertire marker in GeoJSON FeatureCollection (aggiunge color)
function markersToGeoJSON(markers, highlightOption) {
  const colorMappings = generateLegendColorMap(markers, highlightOption);
  const differenteRegex = /^differente/i;

  const groupedByPole = new Map();
  const passthroughMarkers = [];

  markers.forEach((marker) => {
    const isDifferente = differenteRegex.test((marker.composizione_punto || "").trim());
    const poleNumber = (marker.numero_palo || "").trim();

    if (marker.marker === "PL" && isDifferente && poleNumber) {
      const key = poleNumber.toLowerCase();
      if (!groupedByPole.has(key)) {
        groupedByPole.set(key, []);
      }
      groupedByPole.get(key).push(marker);
      return;
    }

    passthroughMarkers.push(marker);
  });

  const groupedMarkers = [];
  groupedByPole.forEach((group, key) => {
    if (group.length <= 1) {
      passthroughMarkers.push(group[0]);
      return;
    }

    const representative = { ...group[0] };
    representative.is_differente_group = true;
    representative.differente_group_id = `differente-${key}`;
    representative.differente_group_count = group.length;
    representative.differente_group_numero_palo = representative.numero_palo || "";
    representative.differente_group_members_json = JSON.stringify(group);
    representative.segnalazioni_in_corso = group.flatMap((m) => m.segnalazioni_in_corso || []);
    representative.segnalazioni_risolte = group.flatMap((m) => m.segnalazioni_risolte || []);
    representative.operazioni_effettuate = group.flatMap((m) => m.operazioni_effettuate || []);
    groupedMarkers.push(representative);
  });

  const markersForMap = [...passthroughMarkers, ...groupedMarkers];

  return {
    type: 'FeatureCollection',
    features: markersForMap.map((m) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(m.lng), parseFloat(m.lat)],
      },
      properties: { 
        ...m, 
        color: getMarkerColor(m, highlightOption, colorMappings),
        segnalazioni_in_corso_length: m.segnalazioni_in_corso ? m.segnalazioni_in_corso.length : 0,
        city: m.city // aggiungo city se presente
      },
    })),
  };
}

// Hook principale
export default function useFilteredMarkers({ markers, filterOption, selectedProprietaFilter, highlightOption }) {
  // Memoizza il risultato per performance
  const filteredMarkers = useMemo(
    () => filterMarkers(markers, filterOption, selectedProprietaFilter),
    [markers, filterOption, selectedProprietaFilter]
  );
  const geojsonData = useMemo(() => markersToGeoJSON(filteredMarkers, highlightOption), [filteredMarkers, highlightOption]);
  
  return { filteredMarkers, geojsonData };
} 
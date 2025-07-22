import { useMemo } from 'react';
import { getColorList, DEFAULT_COLOR } from '../utils/ColorGenerator';

// Genera la mappa colori coordinata come in createMarkers.jsx
function generateLegendColorMap(markers, highlightOption) {
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
    uniqueValues = Array.from(new Set(markers.map(marker => (marker.lampada_potenza || '').split(' ')[0]).filter(Boolean)));
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
    if (marker.marker === 'QE') {
      markerColor = '#3b82f6'; // Colore fisso per i quadri
    } else {
      const tipoLampada = (marker.lampada_potenza || '').split(' ')[0];
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
  return {
    type: 'FeatureCollection',
    features: markers.map((m) => ({
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
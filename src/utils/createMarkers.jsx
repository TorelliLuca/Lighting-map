import { createRoot } from 'react-dom/client';
import { GiStreetLight } from "rocketicons/gi";
import { IoPin } from "rocketicons/io5";
import { colorsBackground, DEFAULT_COLOR } from "../utils/ColorGenerator"
import InfoWindow from '../components/InfoWindow'
import { MdReportProblem } from "rocketicons/md";
import { HousePlug } from 'lucide-react';
import { report } from 'process';
import { isOlderThan } from './utils';
import { BsLightbulbFill } from "rocketicons/bs";

// Custom Electric Panel component with notification status indicator
const ElectricPanelMarker = ({ color, hasActiveNotifications, isOutOfLaw }) => {
  return (
    <div className="flex flex-col items-center justify-center" style={{ width: '55px', height: '65px' }}>
      {/* Main lamp icon */}
      <HousePlug  color={color} style={{ minWidth: '35px', minHeight: '35px' }} />
      
      {/* Notification indicator */}
      {hasActiveNotifications && !isOutOfLaw? (
        <MdReportProblem 
          size={10}
          color="#FFBF00" 
          style={{
            position: 'absolute',
            bottom: '40px',
            left: '35px',
            minWidth: '10px',
            minHeight: '10px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />
      ):(hasActiveNotifications && isOutOfLaw? <MdReportProblem 
          size={10}
          color="#FF4545"
          style={{
            position: 'absolute',
            bottom: '40px',
            left: '35px',
            minWidth: '10px',
            minHeight: '10px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />: <></>)}
    </div>
  );
};


const StreetLampMarker = ({ color, hasActiveNotifications, isOutOfLaw }) => {
  return (
    <div className="flex flex-col items-center justify-center" style={{ width: '45px', height: '55px', filter: 'drop-shadow(0px 0px 1px white)',
  display: 'inline-flex'  }}>
      {/* Main lamp icon */}
      <IoPin size={24} color={color} style={{ minWidth: '30px', minHeight: '30px' }} />
      
      {/* Notification indicator */}
      {hasActiveNotifications && !isOutOfLaw ? (
        <MdReportProblem 
          size={10}
          color="#FFBF00" 
          style={{
            position: 'absolute',
            top: '20px',
            right: '10px',
            left:'10px',
            minWidth: '10px',
            minHeight: '10px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />
      ):(hasActiveNotifications && isOutOfLaw ? <MdReportProblem 
          size={10}
          color="#FF4545" 
          style={{
            position: 'absolute',
            top: '20px',
            right: '10px',
            left:'10px',
            minWidth: '10px',
            minHeight: '10px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />: <></>)}
    </div>
  );
};


const createMarkers = async (markers, city, map, highlightOption, currentInfoWindow, userData, infoWindowRef, setCurrentInfoWindow) => {
  if (!window.google || !map) return [];

  // Create a mapping of unique values to colors for consistent coloring
  const colorMappings = {
    quadro: {},
    proprieta: {},
    lotto: {},
  };
  const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker");

  let NcolorToUse = colorsBackground.length - 1;
  const newMarkers = [];

  // Create info window container and React root once
  const infoWindowContainer = document.createElement("div");
  const reactRoot = createRoot(infoWindowContainer);

  // Add necessary CSS for animations to document head
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
      100% { opacity: 1; transform: scale(1); }
    }
    .animate-pulse {
      animation: pulse 1.5s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
  for (const marker of markers) {
    const content = { ...marker };
    delete content.lat;
    delete content.lng;

    const position = new window.google.maps.LatLng(marker.lat, marker.lng);
    const hasActiveNotifications = marker.segnalazioni_in_corso.length > 0;
    const isOutOfLaw = marker.segnalazioni_in_corso.some(report => {
      return (
          (report.report_type === "LIGHT_POINT_OFF" && isOlderThan(report.report_date, 48)) ||
          (report.report_type === "PLANT_OFF" && isOlderThan(report.report_date, 4))
        );
    });
    
    let markerColor = DEFAULT_COLOR;

    // Highlighting logic - prioritize normal color coding when highlight option is set
    if (highlightOption === "") {
      // No specific highlight mode - use default color but highlighting can change for active notifications
      markerColor = hasActiveNotifications ? "#FFCC00" : DEFAULT_COLOR;
    } else if (highlightOption === "MARKER") {
      // Highlight by cabinet (quadro)
      if (marker.quadro) {
        if (!colorMappings.quadro[marker.quadro]) {
          if (NcolorToUse < 0) NcolorToUse = colorsBackground.length - 1;
          colorMappings.quadro[marker.quadro] = colorsBackground[NcolorToUse--];
        }
        markerColor = colorMappings.quadro[marker.quadro];
      }
    } else if (highlightOption === "PROPRIETA") {
      // Highlight by property (proprieta)
      if (marker.proprieta) {
        if (!colorMappings.proprieta[marker.proprieta]) {
          if (NcolorToUse < 0) NcolorToUse = colorsBackground.length - 1;
          colorMappings.proprieta[marker.proprieta] = colorsBackground[NcolorToUse--];
        }
        markerColor = colorMappings.proprieta[marker.proprieta];
      }
    } else if (highlightOption === "LOTTO") {
      // Highlight by lot (lotto)
      if (marker.lotto) {
        if (!colorMappings.lotto[marker.lotto]) {
          if (NcolorToUse < 0) NcolorToUse = colorsBackground.length - 1;
            colorMappings.lotto[marker.lotto] = colorsBackground[NcolorToUse--];
        }
        markerColor = colorMappings.lotto[marker.lotto];
      }
    }

    let markerElement;
    const customContainer = document.createElement("div");
    const customRoot = createRoot(customContainer);

    if (marker.marker === "QE") {
      // For "QE" markers, use our electric panel component
      customRoot.render(
        <ElectricPanelMarker 
          color={markerColor} 
          hasActiveNotifications={hasActiveNotifications} 
          isOutOfLaw={isOutOfLaw}
        />
      );
    } else {
      customRoot.render(
        <StreetLampMarker 
          color={markerColor} 
          hasActiveNotifications={hasActiveNotifications} 
          isOutOfLaw={isOutOfLaw}
        />
      );
      
    }
    
    markerElement = customContainer;

    const mapMarker = new AdvancedMarkerElement({
      map,
      position,
      content: markerElement,
    });

    // Add click event
    mapMarker.addListener("gmp-click", () => {
      if (currentInfoWindow) {
        currentInfoWindow.close();
      }

      // Update the React root rendering
      reactRoot.render(
        <InfoWindow 
          content={content} 
          marker={marker} 
          city={city} 
          userData={userData} 
        />
      );

      // Use the React container as InfoWindow content
      infoWindowRef.current.setContent(infoWindowContainer);
      infoWindowRef.current.open(map, mapMarker);
      setCurrentInfoWindow(infoWindowRef.current);
    });

    newMarkers.push({ data: marker, ref: mapMarker });
  }

  return newMarkers;
};

export default createMarkers;
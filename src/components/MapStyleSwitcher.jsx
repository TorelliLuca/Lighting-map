import { Mountain, Satellite } from 'lucide-react';
import React from 'react';

const MapStyleSwitcher = ({ map, initialStyleUrl, satelliteStyleUrl, isSatellite, onModeChange }) => {

  const handleToggleStyle = () => {
    if (!map || !map.current) return;

    const nextIsSatellite = !isSatellite;
    const newStyle = nextIsSatellite ? satelliteStyleUrl : initialStyleUrl;
    map.current.setStyle(newStyle);
    if (typeof onModeChange === 'function') onModeChange(nextIsSatellite);
  };

  return (
    <div className="absolute top-3 left-3 z-2 select-none">
      <button
        type="button"
        onClick={() => handleToggleStyle()}
        className="flex items-center gap-2 rounded-md bg-white/85 hover:bg-white text-gray-800 shadow backdrop-blur px-3 py-2 transition-colors duration-200"
        aria-pressed={isSatellite}
        title={isSatellite ? 'Passa a mappa classica' : 'Passa a mappa satellitare'}
      >
        <span className="inline-flex h-5 w-5 items-center justify-center">
          {isSatellite ? (
            <Satellite className="h-5 w-5" />
          ) : (
            <Mountain
              className="h-5 w-5"
            />
          )}
        </span>
        <span className="text-sm font-medium">
          {isSatellite ? 'Satellite' : 'Classica'}
        </span>
        <span className="ml-1 inline-flex h-5 w-10 items-center rounded-full bg-gray-200">
          <span className={`h-4 w-4 rounded-full bg-gray-700 transition-transform duration-200 ${isSatellite ? 'translate-x-6' : 'translate-x-1'}`}></span>
        </span>
      </button>
    </div>
  );
};

export default MapStyleSwitcher;
"use client"
import {
  clearBlanket,
  translateString,
  transformDateToIT,
  listIgnoratedFieldsPL,
  listIgnoratedFieldsQE,
} from "../utils/utils"
import React from "react"

const InfoWindow = ({ content, marker, city, userData, onEditClick, onDeleteClick, mapType, onBeforeReport }) => {
  const handleToggleStreetView = () => {
    if (mapType === "maplibre"){
      window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${marker.lat},${marker.lng}`, "_blank")
    }
    if (typeof window.toggleStreetView === "function") {
      window.toggleStreetView(marker.lat, marker.lng)
    } else {
      console.error("Street View functionality not initialized")
    }
  }

  const handleNavigateToLocation = () => {
    window.navigateToLocation(marker.lat, marker.lng)
  }

  const handleStartOperation = () => {
    window.startOperation(city, clearBlanket(marker.numero_palo), marker.lat, marker.lng)
  }

  const handleReportPoint = () => {
    if (onBeforeReport) {
      onBeforeReport({
        city,
        numeroPalo: clearBlanket(marker.numero_palo),
        lat: marker.lat,
        lng: marker.lng,
        addr: clearBlanket(marker.indirizzo)
      });
    } else {
      window.reportPoint(city, clearBlanket(marker.numero_palo), marker.lat, marker.lng, clearBlanket(marker.indirizzo));
    }
  }

  const handleEditClick = () => {
    if (onEditClick) {
      onEditClick(marker)
    }
  }

  const handleDeleteClick = () => {
    if (onDeleteClick) {
      onDeleteClick(marker)
    }
  }

  // Calcolo i bottoni visibili
  const buttons = [
    {
      key: 'streetview',
      visible: true,
      onClick: handleToggleStreetView,
      className: 'bg-secondary text-secondary-foreground border border-secondary hover:bg-secondary/80',
      title: 'Visualizza in Street View',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="black" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      ),
      label: 'Street view',
    },
    {
      key: 'goto',
      visible: true,
      onClick: handleNavigateToLocation,
      className: 'bg-accent text-accent-foreground border border-accent hover:bg-accent/80',
      title: 'Naviga verso questo punto',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="black" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      label: 'Vai al punto',
    },
    {
      key: 'risolvi',
      visible: userData?.user_type !== 'DEFAULT_USER',
      onClick: handleStartOperation,
      className: 'bg-primary text-primary-foreground border border-primary hover:bg-primary/80',
      title: "Avvia un'operazione per risolvere la segnalazione",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.563 9.75a12.014 12.014 0 00-3.427 5.136L9 12.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'Risolvi',
    },
    {
      key: 'segnala',
      visible: true,
      onClick: handleReportPoint,
      className: 'bg-destructive text-destructive-foreground border border-destructive hover:bg-destructive/80',
      title: 'Segnala questo punto',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
      label: 'Segnala',
    },
    {
      key: 'modifica',
      visible: userData?.user_type === 'SUPER_ADMIN',
      onClick: handleEditClick,
      className: 'bg-secondary text-secondary-foreground border border-secondary hover:bg-secondary/80',
      title: 'Modifica questo punto luce',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="black" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      label: 'Modifica',
    },
    {
      key: 'elimina',
      visible: userData?.user_type === 'SUPER_ADMIN',
      onClick: handleDeleteClick,
      className: 'bg-destructive text-destructive-foreground border border-destructive hover:bg-destructive/80',
      title: 'Elimina questo punto luce',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="black" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      label: 'Elimina',
    },
  ];
  const visibleButtons = buttons.filter(b => b.visible);

  // Calcolo la larghezza minima in base al numero di bottoni (dimensione fissa 72px per bottone + gap)
  const minButtonCount = visibleButtons.length > 0 ? visibleButtons.length : 3;
  const minWidth = `${minButtonCount * 72 + (minButtonCount - 1) * 8}px`;
  const widthClass = marker.marker === "QE"
    ? `w-full min-w-[${minWidth}] max-w-lg`
    : `w-full min-w-[${minWidth}] max-w-md`;

  // Responsive: padding-bottom fisso per non sovrapporre mai il testo ai pulsanti
  const contentPaddingBottom = 90;

  // Se non ci sono dati, mostra un messaggio di fallback
  if (!content || Object.keys(content).length === 0) {
    return (
      <div className={`p-4 rounded-lg shadow-lg border border-black relative ${widthClass}`} style={{
        minWidth,
        background: '#fff',
        color: '#111'
      }}>
        <div className="text-center text-muted-foreground py-8">Nessun dato disponibile</div>
        <div className="sticky bottom-0 left-0 right-0 rounded-b-lg p-0 z-10" style={{
          background: '#fff',
          borderBottom: 'none'
        }}>
          <div className="flex w-full gap-2 justify-center">
            {visibleButtons.map(btn => (
              <button
                key={btn.key}
                onClick={btn.onClick}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border border-black text-xs font-medium transition-colors duration-200 min-w-[72px] min-h-[56px] bg-white text-black`}
                title={btn.title}
                style={{flex: `0 0 72px`}}
              >
                {btn.icon}
                <span className="mt-1 whitespace-nowrap">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-2 md:p-4 pb-0 rounded-lg shadow-lg border border-black relative w-full max-w-xs md:max-w-md`} style={{
      minWidth: '180px',
      background: '#fff',
      color: '#111',
      maxHeight: '80vh',
    }}>
      {/* Main content area */}
      <div
        className="overflow-y-auto mb-4 custom-scrollbar"
        style={{
          paddingBottom: contentPaddingBottom,
          maxHeight: '50vh',
        }}
      >
        {Object.entries(content)
          .filter(([_key, value]) => !Array.isArray(value) || value.length > 0)
          .map(([key, value]) => {
            if (Array.isArray(value)) {
              return (
                <div className="mb-4" key={key}>
                  <strong className="text-blue-900">{key.replace(/_/g, " ")}:</strong>
                  <ul className="mt-2 space-y-1">
                    {value.reverse().map((item, index) => {
                      if (item.report_type) {
                        const dateString = transformDateToIT(item.report_date)
                        return (
                          <details className="mb-2" key={`${key}-report-${index}`}>
                            <summary className="cursor-pointer p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200">
                              <span className="text-blue-600">{dateString}</span> -{" "}
                              {translateString(item.report_type).replace(/_/g, " ")}
                            </summary>
                            <div className="mt-2 pl-4 text-gray-700">{item.description}</div>
                          </details>
                        )
                      } else if (item.operation_type) {
                        const dateString = transformDateToIT(item.operation_date)
                        return (
                          <details className="mb-2" key={`${key}-op-${index}`}>
                            <summary className="cursor-pointer p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200">
                              <span className="text-blue-600">{dateString}</span> -{" "}
                              {translateString(item.operation_type).replace(/_/g, " ")}
                            </summary>
                            <div className="mt-2 pl-4 text-gray-700">{item.note}</div>
                          </details>
                        )
                      } else {
                        return (
                          <li className="p-2 bg-gray-100 rounded-lg mb-1" key={`${key}-item-${index}`}>
                            {translateString(item).replace(/_/g, " ")}
                          </li>
                        )
                      }
                    })}
                  </ul>
                </div>
              )
            } else {
              // Handling non-array fields
              if (marker.marker === "PL") {
                if (listIgnoratedFieldsPL.includes(key)) return null
                if (key === "marker"){
                  value = "Punto luce"
                  return (
                  <div className="mb-2" key={key}>
                    <strong className="text-blue-800 text-xl">{value}</strong>
                  </div>
                )}
                return (
                  <div className="mb-2" key={key}>
                    <strong className="text-blue-800">{key.replace(/_/g, " ")}:</strong> {value || "N.D."}
                  </div>
                )
              } else {
                if (listIgnoratedFieldsQE.includes(key)) return null
                if (key === "marker"){
                  value = "Quadro elettrico"
                  return (
                  <div className="mb-2" key={key}>
                    <strong className="text-blue-800 text-xl">{value}</strong>
                  </div>
                )}
                if (key === "numero_palo"){
                  key = "Numero quadro"
                  return (
                  <div className="mb-2" key={key}>
                    <strong className="text-blue-800">{key.replace(/_/g, " ")}:</strong> {value || "N.D."}
                  </div>
                )}else{
                return (
                  <div className="mb-2" key={key}>
                    <strong className="text-blue-800">{key.replace(/_/g, " ")}:</strong> {value || "N.D."}
                  </div>
                )}
              }
            }
          })}
      </div>

      {/* Button bar sticky in basso */}
      <div
        className="sticky bottom-0 left-0 right-0 rounded-b-lg p-0 z-10"
        style={{
          background: '#fff',
          borderBottom: 'none',
        }}
      >
        <div
          className="flex w-full gap-1 justify-center flex-nowrap px-1 md:px-4 overflow-x-auto md:overflow-x-visible"
          style={{minWidth: 0}}
        >
          {visibleButtons.map(btn => (
            <button
              key={btn.key}
              onClick={btn.onClick}
              className={`flex flex-col items-center justify-center rounded-lg border border-black font-medium transition-colors duration-200 bg-white text-black min-w-[36px] md:min-w-17.5 min-h-[36px] text-[10px] md:p-2 flex-none md:flex-1`}
              title={btn.title}
              style={{}}
            >
              {React.cloneElement(btn.icon, { className: 'w-5 h-5' })}
              <span className="mt-1 whitespace-nowrap leading-tight md:text-xs">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f9fafb;
          border-radius: 8px;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #e5e7eb #f9fafb;
        }
        @media (min-width: 768px) {
          .custom-scrollbar {
            max-height: 60vh !important;
          }
        }
        @media (max-width: 640px) {
          .custom-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .custom-scrollbar {
            scrollbar-width: none;
          }
        }
      `}</style>
    </div>
  )
}

export default InfoWindow
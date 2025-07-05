"use client"
import {
  clearBlanket,
  translateString,
  transformDateToIT,
  listIgnoratedFieldsPL,
  listIgnoratedFieldsQE,
} from "../utils/utils"

const InfoWindow = ({ content, marker, city, userData, onEditClick }) => {
  const handleToggleStreetView = () => {
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
    window.reportPoint(city, clearBlanket(marker.numero_palo), marker.lat, marker.lng, clearBlanket(marker.indirizzo))
  }

  const handleEditClick = () => {
    if (onEditClick) {
      onEditClick(marker)
    }
  }

  // Set a wider width for QE markers and ensure minimum width
  const widthClass = marker.marker === "QE" ? "w-full min-w-[16rem] max-w-lg" : "w-full min-w-[16rem] max-w-md"

  // Calcolo i bottoni visibili
  const buttons = [
    {
      key: 'streetview',
      visible: true,
      onClick: handleToggleStreetView,
      className: 'bg-gray-100 hover:bg-gray-200 text-blue-700 border-blue-200',
      title: 'Visualizza in Street View',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      className: 'bg-gray-100 hover:bg-gray-200 text-blue-700 border-blue-200',
      title: 'Naviga verso questo punto',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      label: 'Vai al punto',
    },
    {
      key: 'risolvi',
      visible: userData?.user_type !== 'DEFAULT_USER',
      onClick: handleStartOperation,
      className: 'bg-green-100 hover:bg-green-200 text-green-700 border-green-200',
      title: "Avvia un'operazione per risolvere la segnalazione",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.563 9.75a12.014 12.014 0 00-3.427 5.136L9 12.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'Risolvi',
    },
    {
      key: 'segnala',
      visible: true,
      onClick: handleReportPoint,
      className: 'bg-red-100 hover:bg-red-200 text-red-700 border-red-200',
      title: 'Segnala questo punto',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
      label: 'Segnala',
    },
    {
      key: 'modifica',
      visible: userData?.user_type === 'SUPER_ADMIN',
      onClick: handleEditClick,
      className: 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-200',
      title: 'Modifica questo punto luce',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      label: 'Modifica',
    },
  ];
  const visibleButtons = buttons.filter(b => b.visible);
  const gridCols = `grid-cols-${visibleButtons.length}`;

  return (
    <div className={`bg-white text-black p-4 pb-20 rounded-lg shadow-lg ${widthClass}`}>
      {/* Main content area */}
      <div className="max-h-80 overflow-y-auto mb-4">
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

      {/* Button bar fixed at the bottom */}
      <div className="fixed-bottom-bar border-t border-gray-200 pt-3 pb-1 bg-white rounded-b-lg p-0">
        <div className="flex w-full gap-2">
          {visibleButtons.map(btn => (
            <button
              key={btn.key}
              onClick={btn.onClick}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-colors duration-200 ${btn.className}`}
              title={btn.title}
            >
              {btn.icon}
              <span className="mt-1">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Add this CSS to your component for fixed bottom bar */}
      <style jsx="true">{`
        .fixed-bottom-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
        }
      `}</style>
    </div>
  )
}

export default InfoWindow
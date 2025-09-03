"use client"
import { useState, useEffect } from "react"
import { X, MapPin, Zap } from "lucide-react"
import AddLightPointForm from "./AddLightPointForm"
import AddElectricPanelForm from "./AddElectricPanelForm"
import maplibregl from "maplibre-gl"

const AddLightPointModal = ({
  isOpen,
  onClose,
  onSave,
  map,
  selectedCity,
  userData,
  visualizationMode, // <-- nuova prop
  electricPanels
}) => {
  const [step, setStep] = useState("select") // "select", "lightpoint", "panel"
  const [tempPosition, setTempPosition] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [tempMarker, setTempMarker] = useState(null)

  // Controllo se l'utente è SUPER_ADMIN
  if (userData?.user_type !== "SUPER_ADMIN") {
    return null
  }

  // Inizializza la posizione al centro della mappa quando si apre il modal
  useEffect(() => {
    if (isOpen) {
      setStep("select");

      // Google Maps
      if (visualizationMode === "complessa" && map && window.google) {
        const center = map.getCenter();
        if (center) {
          const position = { lat: center.lat(), lng: center.lng() };
          setTempPosition(position);
          createTempMarker(position, "google");
        }
      } else if (visualizationMode === "semplice" && map) {
        // MapLibre
        const center = map.getCenter();
        if (center) {
          const position = { lat: center.lat, lng: center.lng };
          setTempPosition(position);
          createTempMarker(position, "maplibre");
        }
      }else{
        console.log("non entro in nessun tipo")
      }
    }
    // Cleanup quando il modal si chiude
    return () => {
      if (tempMarker) {
        if (window.google && tempMarker.setMap) {
          tempMarker.setMap(null);
        } else if (tempMarker.remove) {
          tempMarker.remove();
        }
        setTempMarker(null);
      }
    };
  }, [isOpen, map, visualizationMode]);

  // Crea un marker temporaneo per il drag (Google o MapLibre)
  const createTempMarker = async (position, provider) => {
    // Cleanup precedente
    if (tempMarker) {
      if (window.google && tempMarker.setMap) {
        tempMarker.setMap(null);
      } else if (tempMarker.remove) {
        tempMarker.remove();
      }
    }
    if (provider === "google") {
      try {
        const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker")
        const marker = new AdvancedMarkerElement({
          position: new window.google.maps.LatLng(position.lat, position.lng),
          map: map,
          gmpDraggable: true,
          content: createTempMarkerContent()
        })
        marker.addListener("drag", (event) => {
          const newPos = event.latLng
          setTempPosition({ lat: newPos.lat(), lng: newPos.lng() })
          setIsDragging(true)
        })
        marker.addListener("dragend", (event) => {
          const newPos = event.latLng
          setTempPosition({ lat: newPos.lat(), lng: newPos.lng() })
          setIsDragging(false)
        })
        setTempMarker(marker)
      } catch (error) {
        console.error("Errore nella creazione del marker temporaneo:", error)
      }
    } else if (provider === "maplibre") {
      try {
        // Crea elemento HTML per il marker
        const el = createTempMarkerContent(true)

        const marker = new maplibregl.Marker({
          element: el,
          draggable: true
        })
          .setLngLat([position.lng, position.lat])
          .addTo(map)
          //console.log("el aggiunto alla mappa")
        marker.on("drag", () => {
          const lngLat = marker.getLngLat()
          setTempPosition({ lat: lngLat.lat, lng: lngLat.lng })
          setIsDragging(true)
        })
        marker.on("dragend", () => {
          const lngLat = marker.getLngLat()
          setTempPosition({ lat: lngLat.lat, lng: lngLat.lng })
          setIsDragging(false)
        })
        setTempMarker(marker)
      } catch (error) {
        console.error("Errore nella creazione del marker temporaneo MapLibre:", error)
      }
    }
  }

  // Crea il contenuto del marker temporaneo
  // Se isMapLibre è true, aggiungi classi Tailwind direttamente
  const createTempMarkerContent = (isMapLibre = false) => {
    const container = document.createElement("div")
    if (isMapLibre) {
      container.className = "w-11 h-11 flex items-center justify-center rounded-full border-2 border-dashed border-blue-500 bg-blue-500/10 shadow-lg animate-pulse cursor-move"
    } else {
      container.className = "temp-marker"
    }
    container.innerHTML = `
      <div style="
        width: 44px;
        height: 44px;
        background: rgba(59, 130, 246, 0.15);
        border: 3px dashed #3b82f6;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: move;
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
        animation: pulse 2s infinite;
      ">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <ellipse cx="12" cy="10" rx="6" ry="7" fill="#fffde4" stroke="#facc15" stroke-width="2"/>
          <rect x="9" y="16" width="6" height="3" rx="1.5" fill="#d1d5db" stroke="#3b82f6" stroke-width="1"/>
          <rect x="10" y="19" width="4" height="2" rx="1" fill="#3b82f6" />
          <line x1="12" y1="3" x2="12" y2="0.5" stroke="#facc15" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="7.5" y1="5" x2="5.5" y2="3.5" stroke="#facc15" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="16.5" y1="5" x2="18.5" y2="3.5" stroke="#facc15" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
    `
    return container
  }

  const handleTypeSelection = (type) => {
    setStep(type)
  }

  const handleBack = () => {
    setStep("select")
  }

  const handleSave = async (formData) => {
    if (!tempPosition) return

    try {
      const dataToSend = {
        ...formData,
        lat: tempPosition.lat.toString(),
        lng: tempPosition.lng.toString(),
        marker: step === "lightpoint" ? "PL" : "QE"
      }

      await onSave(dataToSend)
      
      // Pulisci il marker temporaneo
      if (tempMarker) {
        if (window.google && tempMarker.setMap) {
          tempMarker.setMap(null);
        } else if (tempMarker.remove) {
          tempMarker.remove();
        }
        setTempMarker(null);
      }
      
      // Reset del modal
      setStep("select")
      setTempPosition(null)
      setIsDragging(false)
      onClose()
    } catch (error) {
      console.error("Errore durante il salvataggio:", error)
    }
  }

  const handleCancel = () => {
    // Pulisci il marker temporaneo
    if (tempMarker) {
      if (window.google && tempMarker.setMap) {
        tempMarker.setMap(null);
      } else if (tempMarker.remove) {
        tempMarker.remove();
      }
      setTempMarker(null);
    }
    
    // Reset del modal
    setStep("select")
    setTempPosition(null)
    setIsDragging(false)
    onClose()
  }

  if (!isOpen || userData?.user_type !== "SUPER_ADMIN") return null

  return (
    <div className="fixed top-0 right-0 h-full w-96 bg-black/80 backdrop-blur-xl border-l border-blue-500/30 z-50 transform transition-transform duration-300 shadow-[0_0_25px_rgba(0,149,255,0.15)] translate-x-0">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-blue-500/30 bg-blue-900/50">
          <h2 className="text-lg font-semibold text-white">
            {step === "select" ? "Aggiungi Elemento" : 
             step === "lightpoint" ? "Nuovo Punto Luce" : "Nuovo Quadro Elettrico"}
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Pulsante Annulla */}
          <div className="flex justify-end mb-4">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-red-600/20 border border-red-500/30 hover:border-red-500/50 rounded-lg transition-colors"
              title="Annulla e chiudi"
            >
              <X className="h-4 w-4" />
              Annulla
            </button>
          </div>

          {step === "select" && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium text-white mb-2">
                  Cosa vuoi aggiungere?
                </h3>
                <p className="text-sm text-blue-300">
                  Seleziona il tipo di elemento da aggiungere alla mappa
                </p>
              </div>

              <button
                onClick={() => handleTypeSelection("lightpoint")}
                className="w-full p-4 bg-blue-900/40 border border-blue-500/40 rounded-lg hover:bg-blue-800/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                    <MapPin className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-white">Punto Luce</h4>
                    <p className="text-sm text-blue-300">Aggiungi un nuovo punto luce</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleTypeSelection("panel")}
                className="w-full p-4 bg-blue-900/40 border border-blue-500/40 rounded-lg hover:bg-blue-800/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                    <Zap className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-white">Quadro Elettrico</h4>
                    <p className="text-sm text-blue-300">Aggiungi un nuovo quadro elettrico</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Step 2: Form punto luce */}
          {step === "lightpoint" && (
            <AddLightPointForm
              onSave={handleSave}
              onBack={handleBack}
              tempPosition={tempPosition}
              selectedCity={selectedCity}
              electricPanels={electricPanels}
            />
          )}

          {/* Step 3: Form quadro elettrico */}
          {step === "panel" && (
            <AddElectricPanelForm
              onSave={handleSave}
              onBack={handleBack}
              tempPosition={tempPosition}
              selectedCity={selectedCity}
              electricPanels={electricPanels}
            />
          )}
        </div>
      </div>

      <style jsx="true">{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.8);
          }
          100% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
          }
        }
      `}</style>
    </div>
  )
}

export default AddLightPointModal 
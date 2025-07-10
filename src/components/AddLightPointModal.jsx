"use client"
import { useState, useEffect } from "react"
import { X, Plus, MapPin, Zap } from "lucide-react"
import AddLightPointForm from "./AddLightPointForm"
import AddElectricPanelForm from "./AddElectricPanelForm"

const AddLightPointModal = ({
  isOpen,
  onClose,
  onSave,
  map,
  selectedCity,
  userData
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
    if (isOpen && map && window.google) {
      const center = map.getCenter()
      if (center) {
        const position = { lat: center.lat(), lng: center.lng() }
        setTempPosition(position)
        createTempMarker(position)
      }
    }
    
    // Cleanup quando il modal si chiude
    return () => {
      if (tempMarker) {
        tempMarker.setMap(null)
        setTempMarker(null)
      }
    }
  }, [isOpen, map])

  // Crea un marker temporaneo per il drag
  const createTempMarker = async (position) => {
    if (!map || !window.google) return

    // Rimuovi il marker temporaneo precedente se esiste
    if (tempMarker) {
      tempMarker.setMap(null)
    }

    try {
      const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker")
      
      // Crea un marker temporaneo draggable
      const marker = new AdvancedMarkerElement({
        position: new window.google.maps.LatLng(position.lat, position.lng),
        map: map,
        gmpDraggable: true,
        content: createTempMarkerContent()
      })

      // Aggiungi listener per il drag
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
  }

  // Crea il contenuto del marker temporaneo
  const createTempMarkerContent = () => {
    const container = document.createElement("div")
    container.className = "temp-marker"
    container.innerHTML = `
      <div style="
        width: 40px;
        height: 40px;
        background: rgba(59, 130, 246, 0.8);
        border: 3px solid #3b82f6;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: move;
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
        animation: pulse 2s infinite;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
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
        tempMarker.setMap(null)
        setTempMarker(null)
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
      tempMarker.setMap(null)
      setTempMarker(null)
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

          {/* Avviso modalità drag */}
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
            />
          )}

          {/* Step 3: Form quadro elettrico */}
          {step === "panel" && (
            <AddElectricPanelForm
              onSave={handleSave}
              onBack={handleBack}
              tempPosition={tempPosition}
              selectedCity={selectedCity}
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
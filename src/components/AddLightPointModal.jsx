"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { X, MapPin, Zap } from "lucide-react"
import toast from "react-hot-toast"
import AddLightPointForm from "./AddLightPointForm"
import AddElectricPanelForm from "./AddElectricPanelForm"
import MapFabBottomSheet from "./ui/MapFabBottomSheet"
import { useMediaQuery } from "../hooks/useMediaQuery"
import { INFO_WINDOW_MOBILE_MQ } from "../utils/infoWindowActions"
import maplibregl from "maplibre-gl"

const AddLightPointModal = ({
  isOpen,
  onClose,
  onSave,
  map,
  selectedCity,
  userData,
  visualizationMode,
  electricPanels,
  existingPoleNumbers,
}) => {
  const isMobile = useMediaQuery(INFO_WINDOW_MOBILE_MQ)
  const [step, setStep] = useState("select")
  const [tempPosition, setTempPosition] = useState(null)
  const [tempMarker, setTempMarker] = useState(null)
  const [sheetCollapsed, setSheetCollapsed] = useState(false)
  const tempMarkerRef = useRef(null)
  const tempPositionRef = useRef(null)
  const stepRef = useRef("select")
  const wasOpenRef = useRef(false)
  const markerCreateIdRef = useRef(0)

  useEffect(() => {
    tempPositionRef.current = tempPosition
  }, [tempPosition])

  useEffect(() => {
    stepRef.current = step
  }, [step])

  const removeTempMarker = useCallback(() => {
    const marker = tempMarkerRef.current
    if (!marker) return
    try {
      if (typeof marker.remove === "function") {
        marker.remove()
      } else if (window.google && marker.setMap) {
        marker.setMap(null)
      }
    } catch (error) {
      console.error("Errore rimozione marker temporaneo:", error)
    }
    tempMarkerRef.current = null
    setTempMarker(null)
  }, [])

  const createTempMarkerContent = () => {
    const container = document.createElement("div")
    container.className =
      "w-11 h-11 flex items-center justify-center rounded-full border-2 border-dashed border-blue-500 bg-blue-500/10 shadow-lg animate-pulse cursor-move"
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

  const moveTempMarker = useCallback((position) => {
    const marker = tempMarkerRef.current
    if (!marker || !position) return

    if (typeof marker.setLngLat === "function") {
      marker.setLngLat([position.lng, position.lat])
      return
    }
    marker.position = { lat: position.lat, lng: position.lng }
  }, [])

  const createTempMarker = useCallback(
    async (position, provider) => {
      if (!map || !position) return

      const createId = ++markerCreateIdRef.current
      removeTempMarker()

      if (provider === "google") {
        try {
          const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker")
          if (createId !== markerCreateIdRef.current) return

          const marker = new AdvancedMarkerElement({
            position: new window.google.maps.LatLng(position.lat, position.lng),
            map: map,
            gmpDraggable: true,
            content: createTempMarkerContent(),
          })
          marker.addListener("drag", (event) => {
            const newPos = event.latLng
            const next = { lat: newPos.lat(), lng: newPos.lng() }
            tempPositionRef.current = next
            setTempPosition(next)
          })
          marker.addListener("dragend", (event) => {
            const newPos = event.latLng
            const next = { lat: newPos.lat(), lng: newPos.lng() }
            tempPositionRef.current = next
            setTempPosition(next)
          })
          if (createId !== markerCreateIdRef.current) {
            marker.setMap(null)
            return
          }
          tempMarkerRef.current = marker
          setTempMarker(marker)
        } catch (error) {
          console.error("Errore nella creazione del marker temporaneo:", error)
        }
        return
      }

      if (provider === "maplibre") {
        try {
          if (typeof map.addControl !== "function" || typeof map.getCenter !== "function") {
            console.error("Istanza MapLibre non valida per il marker temporaneo")
            return
          }
          const el = createTempMarkerContent()
          const marker = new maplibregl.Marker({
            element: el,
            draggable: true,
          })
            .setLngLat([position.lng, position.lat])
            .addTo(map)

          marker.on("drag", () => {
            const lngLat = marker.getLngLat()
            const next = { lat: lngLat.lat, lng: lngLat.lng }
            tempPositionRef.current = next
            setTempPosition(next)
          })
          marker.on("dragend", () => {
            const lngLat = marker.getLngLat()
            const next = { lat: lngLat.lat, lng: lngLat.lng }
            tempPositionRef.current = next
            setTempPosition(next)
          })

          if (createId !== markerCreateIdRef.current) {
            marker.remove()
            return
          }
          tempMarkerRef.current = marker
          setTempMarker(marker)
        } catch (error) {
          console.error("Errore nella creazione del marker temporaneo MapLibre:", error)
        }
      }
    },
    [map, removeTempMarker],
  )

  // Lifecycle marker: apertura / chiusura / mappa disponibile
  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        markerCreateIdRef.current += 1
        removeTempMarker()
        tempPositionRef.current = null
        setTempPosition(null)
        setStep("select")
        stepRef.current = "select"
        setSheetCollapsed(false)
      }
      wasOpenRef.current = false
      return undefined
    }

    const justOpened = !wasOpenRef.current
    wasOpenRef.current = true

    if (justOpened) {
      setStep("select")
      stepRef.current = "select"
      setSheetCollapsed(false)
    }

    if (!map || tempMarkerRef.current) return undefined

    if (visualizationMode === "complessa" && window.google) {
      const center = map.getCenter?.()
      if (!center) return undefined
      const position = { lat: center.lat(), lng: center.lng() }
      tempPositionRef.current = position
      setTempPosition(position)
      createTempMarker(position, "google")
    } else if (visualizationMode === "semplice") {
      const center = map.getCenter?.()
      if (!center) return undefined
      const position = { lat: center.lat, lng: center.lng }
      tempPositionRef.current = position
      setTempPosition(position)
      createTempMarker(position, "maplibre")
    }

    return undefined
  }, [isOpen, map, visualizationMode, createTempMarker, removeTempMarker])

  // Tap sulla mappa: collassa (mobile) e riposiziona il marker
  useEffect(() => {
    if (!isOpen || !map) return undefined

    const applyMapPosition = (position) => {
      tempPositionRef.current = position
      setTempPosition(position)
      moveTempMarker(position)
      if (isMobile) {
        setSheetCollapsed(true)
      }
    }

    if (visualizationMode === "complessa" && window.google) {
      const listener = map.addListener("click", (event) => {
        if (!event.latLng) return
        applyMapPosition({ lat: event.latLng.lat(), lng: event.latLng.lng() })
      })
      return () => {
        window.google.maps.event.removeListener(listener)
      }
    }

    if (visualizationMode === "semplice" && typeof map.on === "function") {
      const onClick = (event) => {
        if (!event?.lngLat) return
        applyMapPosition({ lat: event.lngLat.lat, lng: event.lngLat.lng })
      }
      map.on("click", onClick)
      return () => {
        map.off("click", onClick)
      }
    }

    return undefined
  }, [isOpen, map, visualizationMode, isMobile, moveTempMarker])

  const handleTypeSelection = (type) => {
    setStep(type)
    stepRef.current = type
  }

  const handleBack = () => {
    setStep("select")
    stepRef.current = "select"
  }

  const resetAndClose = () => {
    markerCreateIdRef.current += 1
    removeTempMarker()
    setStep("select")
    stepRef.current = "select"
    tempPositionRef.current = null
    setTempPosition(null)
    setSheetCollapsed(false)
    onClose()
  }

  const handleSave = async (formData) => {
    let position = tempPositionRef.current

    // Fallback: centro mappa se il marker temp non ha ancora aggiornato lo stato
    if ((position?.lat == null || position?.lng == null) && map) {
      try {
        if (visualizationMode === "semplice" && typeof map.getCenter === "function") {
          const center = map.getCenter()
          if (center) {
            position = { lat: center.lat, lng: center.lng }
            tempPositionRef.current = position
            setTempPosition(position)
          }
        } else if (visualizationMode === "complessa" && map.getCenter) {
          const center = map.getCenter()
          if (center) {
            position = { lat: center.lat(), lng: center.lng() }
            tempPositionRef.current = position
            setTempPosition(position)
          }
        }
      } catch (error) {
        console.error("Impossibile leggere il centro mappa:", error)
      }
    }

    if (position?.lat == null || position?.lng == null) {
      toast.error("Posizione non valida. Tocca la mappa per posizionare il punto.")
      throw new Error("Posizione mancante")
    }

    const currentStep = stepRef.current
    if (currentStep !== "lightpoint" && currentStep !== "panel") {
      toast.error("Seleziona il tipo di elemento da aggiungere.")
      throw new Error("Step non valido")
    }

    const dataToSend = {
      ...formData,
      lat: String(position.lat),
      lng: String(position.lng),
      marker: currentStep === "lightpoint" ? "PL" : "QE",
    }

    const saved = await onSave(dataToSend)
    if (saved === false) {
      throw new Error("Salvataggio non riuscito")
    }
    resetAndClose()
  }

  const handleCancel = () => {
    resetAndClose()
  }

  if (!isOpen || userData?.user_type !== "SUPER_ADMIN") return null

  const title =
    step === "select"
      ? "Aggiungi Elemento"
      : step === "lightpoint"
        ? "Nuovo Punto Luce"
        : "Nuovo Quadro Elettrico"

  const peekLabel =
    step === "select"
      ? "Aggiungi elemento · trascina il punto"
      : step === "lightpoint"
        ? "Nuovo punto luce · continua"
        : "Nuovo quadro · continua"

  const panelBody = (
    <>
      {!isMobile && (
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-red-600/20 border border-red-500/30 hover:border-red-500/50 rounded-lg transition-colors min-h-11"
            title="Annulla e chiudi"
          >
            <X className="h-4 w-4" />
            Annulla
          </button>
        </div>
      )}

      {isMobile && (
        <p className="mb-4 text-xs text-blue-300/90 leading-relaxed">
          Tocca la mappa o trascina il marker per spostare il punto. Lo sheet si
          collassa: riaprilo dal bordo in basso per completare.
        </p>
      )}

      {step === "select" && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h3 className="text-lg font-medium text-white mb-2">Cosa vuoi aggiungere?</h3>
            <p className="text-sm text-blue-300">
              Seleziona il tipo di elemento da aggiungere alla mappa
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleTypeSelection("lightpoint")}
            className="w-full p-4 bg-blue-900/40 border border-blue-500/40 rounded-lg hover:bg-blue-800/50 transition-colors group min-h-11"
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
            type="button"
            onClick={() => handleTypeSelection("panel")}
            className="w-full p-4 bg-blue-900/40 border border-blue-500/40 rounded-lg hover:bg-blue-800/50 transition-colors group min-h-11"
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

      {step === "lightpoint" && (
        <AddLightPointForm
          onSave={handleSave}
          onBack={handleBack}
          tempPosition={tempPosition}
          selectedCity={selectedCity}
          electricPanels={electricPanels}
          existingPoleNumbers={existingPoleNumbers}
        />
      )}

      {step === "panel" && (
        <AddElectricPanelForm
          onSave={handleSave}
          onBack={handleBack}
          tempPosition={tempPosition}
          selectedCity={selectedCity}
          electricPanels={electricPanels}
        />
      )}
    </>
  )

  return (
    <>
      {isMobile ? (
        <MapFabBottomSheet
          isOpen={isOpen}
          onClose={handleCancel}
          title={title}
          tall
          collapsible
          collapsed={sheetCollapsed}
          onCollapsedChange={setSheetCollapsed}
          peekLabel={peekLabel}
        >
          {panelBody}
        </MapFabBottomSheet>
      ) : (
        <div className="fixed top-0 right-0 h-full w-96 bg-black/80 backdrop-blur-xl border-l border-blue-500/30 z-50 transform transition-transform duration-300 shadow-[0_0_25px_rgba(0,149,255,0.15)] translate-x-0">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-blue-500/30 bg-blue-900/50">
              <h2 className="text-lg font-semibold text-white">{title}</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6">{panelBody}</div>
          </div>
        </div>
      )}

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
    </>
  )
}

export default AddLightPointModal

"use client"
import { useState, useEffect } from "react"
import { X, Save, MapPin, RotateCcw, Crosshair } from "lucide-react"
import toast from "react-hot-toast"

const EditLightPointModal = ({
  marker,
  isOpen,
  onClose,
  onSave,
  map,
  allMarkersData,
  electricPanels = [],
}) => {
  // Stato locale per la posizione temporanea
  const [tempPosition, setTempPosition] = useState(null)
  const [formData, setFormData] = useState({})
  const [originalData, setOriginalData] = useState({})
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isFetchingAddress, setIsFetchingAddress] = useState(false)

  // Opzioni per le select
  const selectOptions = {
    marker: [
      { value: "QE", label: "Quadro Elettrico" },
      { value: "PL", label: "Punto Luce" }
    ],
    composizione_punto: [
      { value: "Singolo", label: "Singolo" },
      { value: "Multiplo", label: "Multiplo" },
      {value: "Differente A", label: "Differente A"},
      {value: "Differente B", label: "Differente B"},
      {value: "Differente C", label: "Differente C"},
      {value: "Differente D", label: "Differente D"},
      {value: "Differente E", label: "Differente E"},

    ],
    proprieta: [
      { value: "EnelSole", label: "EnelSole" },
      { value: "Municipale", label: "Municipale" },
      { value: "Progetto", label: "Progetto" },
      {value: "Altro", label: "Altro"}
    ],
    tipo_apparecchio: [
      { value: "Integrato", label: "Integrato" },
      { value: "Lampara", label: "Lampara" },
      { value: "Lanterna", label: "Lanterna" },
      { value: "Ornamentale", label: "Ornamentale" },
      { value: "Proiettore", label: "Proiettore" },
      { value: "Sospensione", label: "Sospensione" },
      { value: "Stradale aperto", label: "Stradale aperto" },
      { value: "Stradale con vetro curvo", label: "Stradale con vetro curvo" },
      { value: "Stradale con vetro piano", label: "Stradale con vetro piano" },
      { value: "A soffitto", label: "A soffitto" },
      { value: "Applique", label: "Applique" },
      { value: "Bollard", label: "Bollard" },
      { value: "Decorativo", label: "Decorativo" },
      { value: "Decorativo architetturale", label: "Decorativo architetturale" },
      { value: "Faretto", label: "Faretto" },
      { value: "Globo", label: "Globo" },
      { value: "Incassato", label: "Incassato" },
      { value: "Kit Retrofit", label: "Kit Retrofit" },
      { value: "Piattello", label: "Piattello" },
      { value: "Plafoniera", label: "Plafoniera" },
      { value: "Stradale architetturale", label: "Stradale architetturale" },
      { value: "Tabella attraversamento pedonale", label: "Tabella attraversamento pedonale" },
      { value: "Mancante", label: "Mancante" },
      { value: "Altro", label: "Altro" }
    ],
    lampada: [
      { value: "FLUO", label: "FLUO" },
      { value: "HG", label: "HG" },
      { value: "LED", label: "LED" },
      { value: "JM", label: "JM" },
      { value: "SAP", label: "SAP" },
      { value: "SBP", label: "SBP" },
      {value: "INC", label: "INC"},
      {value: "ALT", label: "ALT"}
    ],
    tipo_sostegno: [
      { value: "A parete", label: "A parete" },
      { value: "A soffitto", label: "A soffitto" },
      { value: "Altro", label: "Altro" },
      { value: "Bollard", label: "Bollard" },
      { value: "Incassato", label: "Incassato" },
      { value: "Mancante", label: "Mancante" },
      { value: "Palina a parete con sbraccio riportato", label: "Palina a parete con sbraccio riportato" },
      { value: "Palina con sbraccio riportato", label: "Palina con sbraccio riportato" },
      { value: "Palo artistico per lanterna", label: "Palo artistico per lanterna" },
      { value: "Palo artistico per lanterna con sbraccio", label: "Palo artistico per lanterna con sbraccio" },
      { value: "Palo con sbraccio", label: "Palo con sbraccio" },
      { value: "Palo con sbraccio riportato", label: "Palo con sbraccio riportato" },
      { value: "Palo con sbraccio sezionabile", label: "Palo con sbraccio sezionabile" },
      { value: "Palo decorativo", label: "Palo decorativo" },
      { value: "Palo decorativo con sbraccio", label: "Palo decorativo con sbraccio" },
      { value: "Palo per attraversamento pedonale", label: "Palo per attraversamento pedonale" },
      { value: "Palo stradale", label: "Palo stradale" },
      { value: "Parete", label: "Parete" },
      { value: "Sbraccio", label: "Sbraccio" },
      { value: "Sbraccio artistico per lanterna", label: "Sbraccio artistico per lanterna" },
      { value: "Sbraccio decorativo", label: "Sbraccio decorativo" },
      { value: "Soffitto", label: "Soffitto" },
      { value: "Sospensione", label: "Sospensione" },
      { value: "Staffa", label: "Staffa" },
      { value: "Tesata aerea", label: "Tesata aerea" },
      { value: "Terra", label: "Terra" },
      { value: "Torre faro", label: "Torre faro" }
    ],
    tipo_linea: [
       { value: "Cavo interrato con pozzetti", label: "Cavo interrato con pozzetti" },
       { value: "Cavo interrato con risalita", label: "Cavo interrato con risalita" },
       { value: "Cavo interrato senza pozzetti", label: "Cavo interrato senza pozzetti" },
       { value: "Cavo su tesata", label: "Cavo su tesata" },
       { value: "Precordato", label: "Precordato" },
       { value: "Cavo su parete", label: "Cavo su parete" },
       { value: "Incassato a parete", label: "Incassato a parete" },
       { value: "Tubazione su parete", label: "Tubazione su parete" },
             { value: "Palo FV", label: "Palo FV" },
      { value: "Altro", label: "Altro" }
    ],
    promiscuita: [
      { value: "Nessuna", label: "Nessuna" },
      { value: "Elettrica", label: "Elettrica" },
      { value: "Meccanica", label: "Meccanica" },
      { value: "Elettrica e meccanica", label: "Elettrica e meccanica" }
    ]
  }

  // Definizione dei campi da mostrare per QE e PL
  const campiQE = [
    "marker",
    "numero_palo",
    "indirizzo",
    "lotto",
    "quadro",
    "proprieta",
    "lat",
    "lng",
    "pod",
    "numero_contatore",
    "alimentazione",
    "potenza_contratto",
    "potenza",
    "punti_luce"
  ];
  const campiPL = [
    "marker",
    "numero_palo",
    "composizione_punto",
    "indirizzo",
    "lotto",
    "quadro",
    "proprieta",
    "tipo_apparecchio",
    "modello_armatura",
    "numero_apparecchi",
    "lampada_e_potenza",
    "tipo_sostegno",
    "tipo_linea",
    "promiscuita",
    "note",
    "garanzia",
    "lat",
    "lng"
  ];

  // Inizializza i dati quando cambia il marker o si apre il modal
  useEffect(() => {
    if (isOpen && marker) {
      setTempPosition({ lat: marker.lat, lng: marker.lng })
      const editableData = { ...marker }

      // Gestione speciale per lampada_potenza - separa in lampada e potenza
      if (editableData.lampada_potenza) {
        const lampadaPotenza = editableData.lampada_potenza.toString()
        // Cerca di separare lampada e potenza (assumendo che la potenza sia un numero)
        const parts = lampadaPotenza.split(' ')
        const lampada = parts[0] || ''
        const potenza = parts.slice(1).join(' ') || ''
        
        editableData.lampada = lampada
        editableData.potenza = potenza
        // Mantieni anche il campo originale per compatibilità
        // delete editableData.lampada_potenza
      }

      setFormData(editableData)
      setOriginalData(editableData)
      setHasChanges(false)
    }
  }, [isOpen, marker])

  // Gestione drag marker sulla mappa
  useEffect(() => {
    if (!isOpen || !marker) return;
    // Se sono in modalità Google Maps
    if (map && allMarkersData && allMarkersData.length > 0) {
      const markerObj = allMarkersData.find(m => m.data._id === marker._id);
      if (!markerObj || !markerObj.ref) return;
      markerObj.ref.gmpDraggable = true;
      // Listener per aggiornare la posizione temporanea durante il drag
      const dragListener = markerObj.ref.addListener("drag", (event) => {
        setTempPosition({ lat: event.latLng.lat(), lng: event.latLng.lng() });
      });
      // Listener per aggiornare la posizione anche a fine drag (per sicurezza)
      const dragEndListener = markerObj.ref.addListener("dragend", (event) => {
        setTempPosition({ lat: event.latLng.lat(), lng: event.latLng.lng() });
      });
      // Evidenzia marker SOLO se il modal è aperto
      if (markerObj.ref.content?.classList) {
        markerObj.ref.content.classList.add('editing-marker', 'editing-marker-glow');
      }
      // Pulizia
      return () => {
        markerObj.ref.gmpDraggable = false;
        if (markerObj.ref.content?.classList) markerObj.ref.content.classList.remove('editing-marker', 'editing-marker-glow');
        if (dragListener && dragListener.remove) dragListener.remove();
        if (dragEndListener && dragEndListener.remove) dragEndListener.remove();
      };
    }
    // In modalità MapLibre il drag è gestito dal parent tramite callback e marker HTML
  }, [isOpen, map, marker, allMarkersData]);

  // In modalità MapLibre: aggiorna la posizione tramite callback se fornita
  useEffect(() => {
    if (!isOpen || !marker) return;
    if (!map && typeof window !== 'undefined' && marker._id && tempPosition) {
      // Se esiste una callback onMarkerPositionChange passata dal parent
      if (typeof window.onMarkerPositionChange === 'function') {
        window.onMarkerPositionChange(marker._id, tempPosition.lat, tempPosition.lng);
      }
    }
  }, [tempPosition, isOpen, map, marker]);

  // Gestione cambiamenti nei campi
  useEffect(() => {
    if (
      !tempPosition ||
      !marker
    ) {
      setHasChanges(false)
      return
    }

    if (
      JSON.stringify(formData) !== JSON.stringify(originalData) ||
      tempPosition.lat !== marker.lat ||
      tempPosition.lng !== marker.lng
    ) {
      setHasChanges(true)
    } else {
      //setHasChanges(false)
    }
  }, [formData, originalData, tempPosition, marker])

  const handleInputChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  // Funzione per ottenere l'indirizzo da lat/lng tramite Google Maps Geocoding API
  const fetchAddressFromLatLng = async () => {
    if (!tempPosition?.lat || !tempPosition?.lng) return;
    setIsFetchingAddress(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      const latlng = { lat: Number(tempPosition.lat), lng: Number(tempPosition.lng) };
      geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const routeComponent = results[0].address_components.find(comp => comp.types.includes("route"));
          const numberComponent = results[0].address_components.find(comp => comp.types.includes("street_number"));
          const street = [
            routeComponent ? routeComponent.long_name : "",
            numberComponent ? numberComponent.long_name : ""
          ].filter(Boolean).join(" ");
          handleInputChange("indirizzo", street);
        } else {
          toast.error("Impossibile trovare l'indirizzo per queste coordinate.");
        }
        setIsFetchingAddress(false);
      });
    } catch (error) {
      setIsFetchingAddress(false);
      toast.error("Errore durante la ricerca dell'indirizzo.");
    }
  };


  const handleSave = async () => {
    if (!hasChanges) return
    setIsSaving(true)
    try {
      // Prepara i dati da inviare
      const dataToSend = {
        ...formData,
        lat: tempPosition.lat,
        lng: tempPosition.lng,
      }

      // Gestione speciale per lampada_potenza - concatena lampada e potenza
      if (formData.lampada || formData.potenza) {
        const lampada = formData.lampada || ''
        const potenza = formData.potenza || ''
        dataToSend.lampada_potenza = `${lampada} ${potenza}`.trim()
        
        // Rimuovi i campi separati se esistono
        delete dataToSend.lampada
        delete dataToSend.potenza
      }

      // Gestione speciale per tipo_apparecchio con "Altro"
      if (formData.tipo_apparecchio === "Altro" && formData.tipo_apparecchio_altro) {
        dataToSend.tipo_apparecchio = formData.tipo_apparecchio_altro
        delete dataToSend.tipo_apparecchio_altro
      }

      // Gestione speciale per tipo_sostegno con "Altro"
      if (formData.tipo_sostegno === "Altro" && formData.tipo_sostegno_altro) {
        dataToSend.tipo_sostegno = formData.tipo_sostegno_altro
        delete dataToSend.tipo_sostegno_altro
      }

      // Gestione speciale per quadro
      if (formData.quadro === "unknown" || formData.quadro === "new") {
        dataToSend.quadro = formData.quadro_altro
      }
      delete dataToSend.quadro_altro

      
      await onSave(dataToSend)
      //onClose()
    } catch (error) {
      console.error("Errore durante il salvataggio:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm('Ci sono modifiche non salvate. Vuoi davvero annullare?')) {
        setFormData(originalData)
        setTempPosition({ lat: marker.lat, lng: marker.lng })
        setHasChanges(false)
        handleResetPosition()
        onClose()
      }
    } else {
      setFormData(originalData)
      setTempPosition({ lat: marker.lat, lng: marker.lng })
      setHasChanges(false)
      onClose()
    }
  }

  // Ripristina posizione originale
  const handleResetPosition = () => {
    setTempPosition({ lat: marker.lat, lng: marker.lng })
    // Google Maps
    if (map && allMarkersData && allMarkersData.length > 0) {
      const markerObj = allMarkersData.find(m => m.data._id  === marker._id)
      if (markerObj && markerObj.ref) {
        markerObj.ref.position = new window.google.maps.LatLng(marker.lat, marker.lng)
      }
      if (map) {
        map.setCenter(new window.google.maps.LatLng(marker.lat, marker.lng))
        map.setZoom(18)
      }
    }
    // MapLibre: aggiorna la posizione tramite callback se fornita
    if (!map && typeof window !== 'undefined' && marker._id) {
      if (typeof window.onMarkerPositionChange === 'function') {
        window.onMarkerPositionChange(marker._id, marker.lat, marker.lng);
      }
    }
  };

  // Centra la mappa sulla posizione temporanea
  const handleCenterMap = () => {
    if (map) {
      map.setCenter(new window.google.maps.LatLng(tempPosition.lat, tempPosition.lng))
      map.setZoom(18)
    }
  }

  // Funzione per renderizzare i campi del form
  const renderField = (key, value) => {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    
    // Campi da escludere
    if (["id", "_id", "__v", "created_at", "updated_at", "lat", "lng", "segnalazioni_in_corso", "segnalazioni_risolte", "operazioni_effettuate", "lampada_potenza"].includes(key)) {
      return null
    }

    // Gestione speciale per quadro (come in AddLightPointForm)
    if (key === "quadro") {
      return (
        <div key={key} className="space-y-2">
          <label className="block text-sm font-medium text-blue-300">
            Quadro
          </label>
          <select
            value={formData.quadro || ''}
            onChange={(e) => handleInputChange("quadro", e.target.value)}
            className="w-full px-3 py-2 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
          >
            <option value="">Seleziona un quadro</option>
            <option value="unknown">Quadro Ignoto</option>
            <option value="new">Quadro da Caricare</option>
            {electricPanels.map((panel) => (
              <option key={panel} value={panel}>
                {panel}
              </option>
            ))}
          </select>
          {(formData.quadro === "unknown" || formData.quadro === "new") && (
            <input
              type="text"
              value={formData.quadro_altro || ''}
              onChange={(e) => handleInputChange("quadro_altro", e.target.value)}
              className="w-full px-3 py-2 mt-2 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50"
              placeholder="Inserisci nome quadro"
            />
          )}
        </div>
      )
    }

    // Select per i campi specifici
    if (selectOptions[key]) {
      return (
        <div key={key} className="space-y-2">
          <label className="block text-sm font-medium text-blue-300">
            {label}
          </label>
          <select
            value={value || ''}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className="w-full px-3 py-2 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
          >
            <option value="">Seleziona {label.toLowerCase()}</option>
            {selectOptions[key].map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )
    }
    if (key === "tipo_apparecchio") {
      return (
        <div key={key} className="space-y-2">
          <label className="block text-sm font-medium text-blue-300">
            {label}
          </label>
          <select
            value={formData.tipo_apparecchio || ''}
            onChange={(e) => handleInputChange('tipo_apparecchio', e.target.value)}
            className="w-full px-3 py-2 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
          >
            <option value="">Seleziona tipo apparecchio</option>
            {selectOptions.tipo_apparecchio.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {formData.tipo_apparecchio === "Altro" && (
            <input
              type="text"
              value={formData.tipo_apparecchio_altro || ''}
              onChange={(e) => handleInputChange('tipo_apparecchio_altro', e.target.value)}
              className="w-full px-3 py-2 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50"
              placeholder="Specifica tipo apparecchio"
            />
          )}
        </div>
      )
    }

    // Input di testo per tutti gli altri campi
    // Bottone accanto a indirizzo per calcolo automatico
    if (key === "indirizzo") {
      return (
        <div key={key} className="space-y-2">
          <label className="block text-sm font-medium text-blue-300">
            {label}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleInputChange(key, e.target.value)}
              className="flex-1 px-3 py-2 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50"
              placeholder={`Inserisci ${label.toLowerCase()}`}
            />
            <button
              type="button"
              onClick={fetchAddressFromLatLng}
              disabled={isFetchingAddress}
              className="px-3 py-2 bg-blue-900/40 border border-blue-500/40 text-blue-300 rounded-lg hover:bg-blue-800/60 hover:text-blue-100 backdrop-blur-md shadow-md disabled:bg-gray-700 disabled:text-blue-500 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              title="Calcola indirizzo da coordinate"
            >
              {isFetchingAddress ? (
                <svg className="animate-spin h-4 w-4 text-blue-300" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
              ) : (
                <MapPin className="h-4 w-4 text-blue-300" />
              )}
            </button>
          </div>
        </div>
      )
    }

    return (
      <div key={key} className="space-y-2">
        <label className="block text-sm font-medium text-blue-300">
          {label}
        </label>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => handleInputChange(key, e.target.value)}
          className="w-full px-3 py-2 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50"
          placeholder={`Inserisci ${label.toLowerCase()}`}
        />
      </div>
    )
  }


  if (!isOpen || !marker || !tempPosition) return null

  return (
    <div className={`fixed top-0 right-0 h-full w-96 bg-black/80 backdrop-blur-xl border-l border-blue-500/30 z-50 transform transition-transform duration-300 shadow-[0_0_25px_rgba(0,149,255,0.15)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-blue-500/30 bg-blue-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <MapPin className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Modifica Punto Luce
              </h2>
              <p className="text-sm text-blue-300">
                {marker.marker === "QE" ? "Quadro Elettrico" : "Punto Luce"} - {marker.numero_palo}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-blue-800/50 rounded-lg transition-colors border border-blue-500/30"
          >
            <X className="h-4 w-4 text-blue-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Avviso modalità drag */}
          <div className="mb-4 p-3 bg-blue-900/50 border border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-blue-300">
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-medium">
                Modalità spostamento attiva - Trascina il marker sulla mappa
              </span>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            {Object.entries(formData).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-blue-300">Nessun campo modificabile trovato</p>
              </div>
            ) : (
              <>
                {/* Campo lampada e potenza - solo se marker PL e se esiste lampada_potenza */}
                {(marker.marker !== "QE" && (formData.lampada_potenza || formData.lampada || formData.potenza)) && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-blue-300">
                      Lampada e Potenza
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={formData.lampada || ''}
                        onChange={(e) => handleInputChange('lampada', e.target.value)}
                        className="px-3 py-2 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
                      >
                        <option value="">Seleziona lampada</option>
                        {selectOptions.lampada.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={formData.potenza || ''}
                        onChange={(e) => handleInputChange('potenza', e.target.value)}
                        className="px-3 py-2 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50"
                        placeholder="Potenza"
                      />
                    </div>
                  </div>
                )}
                {/* Altri campi filtrati per QE o PL */}
                {(marker.marker === "QE"
                  ? campiQE.filter(key => key in formData).map(key => renderField(key, formData[key]))
                  : campiPL.filter(key => key in formData).map(key => renderField(key, formData[key]))
                )}
              </>
            )}
          </div>

          {/* Position controls */}
          <div className="mt-6 p-4 bg-blue-900/40 rounded-lg border border-blue-500/30">
            <h3 className="text-lg font-medium text-white mb-3">Posizione</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-blue-300 mb-1">
                  Latitudine
                </label>
                <input
                  type="text"
                  value={Number(tempPosition?.lat).toFixed(5)}
                  readOnly
                  className="w-full px-3 py-2 bg-blue-900/60 text-blue-300 border border-blue-500/40 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-300 mb-1">
                  Longitudine
                </label>
                <input
                  type="text"
                  value={Number(tempPosition?.lng).toFixed(5)}
                  readOnly
                  className="w-full px-3 py-2 bg-blue-900/60 text-blue-300 border border-blue-500/40 rounded-lg"
                />
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <button
                onClick={handleResetPosition}
                className="flex items-center gap-2 px-4 py-2 text-sm text-blue-300 hover:text-blue-200 hover:bg-blue-800/50 rounded-lg transition-colors border border-blue-500/30 w-full"
              >
                <RotateCcw className="h-4 w-4" />
                Ripristina posizione originale
              </button>
              <button
                onClick={handleCenterMap}
                className="flex items-center gap-2 px-4 py-2 text-sm text-blue-300 hover:text-blue-200 hover:bg-blue-800/50 rounded-lg transition-colors border border-blue-500/30 w-full"
              >
                <Crosshair className="h-4 w-4" />
                Centra mappa sul marker
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-blue-500/30 bg-blue-900/50">
          <div className="text-sm text-blue-300 mb-4">
            {hasChanges ? (
              <span className="text-orange-400 font-medium">
                ⚠️ Modifiche non salvate
              </span>
            ) : (
              <span className="text-green-400 font-medium">
                ✓ Nessuna modifica
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 text-blue-300 bg-blue-900/40 border border-blue-500/40 rounded-lg hover:bg-blue-800/50 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salva'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditLightPointModal 
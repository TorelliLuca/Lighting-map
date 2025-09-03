"use client"
import { useState } from "react"
import { ChevronLeft, Save, MapPin, ChevronDown } from "lucide-react"
import toast from "react-hot-toast"

const AddLightPointForm = ({ onSave, onBack, tempPosition, selectedCity, electricPanels = [] }) => {
  const [formData, setFormData] = useState({
    numero_palo: "",
    indirizzo: "",
    composizione_punto: "",
    proprieta: "",
    tipo_apparecchio: "",
    tipo_apparecchio_altro: "",
    lampada: "",
    potenza: "",
    tipo_sostegno: "",
    tipo_sostegno_altro: "",
    tipo_linea: "",
    promiscuita: "",
    quadro: "",
    quadro_altro: "",
    lotto: "",
    note: "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isFetchingAddress, setIsFetchingAddress] = useState(false)

  // Detect mobile device
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768

  // Opzioni per le select
  const selectOptions = {
    composizione_punto: [
      { value: "Singolo", label: "Singolo" },
      { value: "Multiplo", label: "Multiplo" },
      { value: "Differente A", label: "Differente A" },
      { value: "Differente B", label: "Differente B" },
      { value: "Differente C", label: "Differente C" },
      { value: "Differente D", label: "Differente D" },
      { value: "Differente E", label: "Differente E" },
    ],
    proprieta: [
      { value: "EnelSole", label: "EnelSole" },
      { value: "Municipale", label: "Municipale" },
      { value: "Progetto", label: "Progetto" },
      { value: "Altro", label: "Altro" },
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
      { value: "Altro", label: "Altro" },
    ],
    lampada: [
      { value: "FLUO", label: "FLUO" },
      { value: "HG", label: "HG" },
      { value: "LED", label: "LED" },
      { value: "JM", label: "JM" },
      { value: "SAP", label: "SAP" },
      { value: "SBP", label: "SBP" },
      { value: "INC", label: "INC" },
      { value: "ALT", label: "ALT" },
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
      { value: "Torre faro", label: "Torre faro" },
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
      { value: "Altro", label: "Altro" },
    ],
    promiscuita: [
      { value: "Nessuna", label: "Nessuna" },
      { value: "Elettrica", label: "Elettrica" },
      { value: "Meccanica", label: "Meccanica" },
      { value: "Elettrica e meccanica", label: "Elettrica e meccanica" },
    ],
  }

  const handleInputChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  // Custom Select Component for better mobile support
  const CustomSelect = ({ value, onChange, options, placeholder, className = "" }) => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-3 py-3 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors text-left flex items-center justify-between min-h-[44px] ${className}`}
        >
          <span className={value ? "text-white" : "text-blue-400/70"}>
            {value ? options.find((opt) => opt.value === value)?.label || value : placeholder}
          </span>
          <ChevronDown className={`h-4 w-4 text-blue-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full left-0 right-0 mt-1 bg-blue-900/95 backdrop-blur-md border border-blue-500/40 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
              <div
                className="p-3 hover:bg-blue-800/50 cursor-pointer text-blue-400/70 border-b border-blue-500/20 min-h-[44px] flex items-center"
                onClick={() => {
                  onChange("")
                  setIsOpen(false)
                }}
              >
                {placeholder}
              </div>
              {options.map((option) => (
                <div
                  key={option.value}
                  className="p-3 hover:bg-blue-800/50 cursor-pointer text-white transition-colors min-h-[44px] flex items-center"
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                >
                  {option.label}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  const fetchAddressFromLatLng = async () => {
    if (!tempPosition?.lat || !tempPosition?.lng) return
    setIsFetchingAddress(true)
    try {
      const geocoder = new window.google.maps.Geocoder()
      const latlng = { lat: Number(tempPosition.lat), lng: Number(tempPosition.lng) }
      geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const routeComponent = results[0].address_components.find((comp) => comp.types.includes("route"))
          const numberComponent = results[0].address_components.find((comp) => comp.types.includes("street_number"))
          const street = [
            routeComponent ? routeComponent.long_name : "",
            numberComponent ? numberComponent.long_name : "",
          ]
            .filter(Boolean)
            .join(" ")
          handleInputChange("indirizzo", street)
          toast.success("Indirizzo trovato con successo!")
        } else {
          toast.error("Impossibile trovare l'indirizzo per queste coordinate.")
        }
        setIsFetchingAddress(false)
      })
    } catch (error) {
      setIsFetchingAddress(false)
      toast.error("Errore durante la ricerca dell'indirizzo.")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const dataToSend = { ...formData }

      if (formData.lampada || formData.potenza) {
        const lampada = formData.lampada || ""
        const potenza = formData.potenza || ""
        dataToSend.lampada_potenza = `${lampada} ${potenza}`.trim()

        delete dataToSend.lampada
        delete dataToSend.potenza
      }

      if (formData.tipo_apparecchio === "Altro" && formData.tipo_apparecchio_altro) {
        dataToSend.tipo_apparecchio = formData.tipo_apparecchio_altro
        delete dataToSend.tipo_apparecchio_altro
      }

      if (formData.tipo_sostegno === "Altro" && formData.tipo_sostegno_altro) {
        dataToSend.tipo_sostegno = formData.tipo_sostegno_altro
        delete dataToSend.tipo_sostegno_altro
      }

      if (formData.quadro === "unknown" || formData.quadro === "new") {
        dataToSend.quadro = formData.quadro_altro
      }
      delete dataToSend.quadro_altro

      await onSave(dataToSend)
    } catch (error) {
      console.error("Errore durante il salvataggio:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const renderField = (key, label, type = "text", required = false) => {
    if (selectOptions[key]) {
      return (
        <div key={key} className="space-y-2">
          <label className="block text-sm font-medium text-blue-300">
            {label} {required && <span className="text-red-400">*</span>}
          </label>
          <CustomSelect
            value={formData[key] || ""}
            onChange={(value) => handleInputChange(key, value)}
            options={selectOptions[key]}
            placeholder={`Seleziona ${label.toLowerCase()}`}
          />

          {/* Campo aggiuntivo per "Altro" */}
          {formData[key] === "Altro" && (
            <input
              type="text"
              value={formData[`${key}_altro`] || ""}
              onChange={(e) => handleInputChange(`${key}_altro`, e.target.value)}
              className="w-full px-3 py-3 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50 min-h-[44px]"
              placeholder={`Specifica ${label.toLowerCase()}`}
            />
          )}
        </div>
      )
    }

    return (
      <div key={key} className="space-y-2">
        <label className="block text-sm font-medium text-blue-300">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        {type === "textarea" ? (
          <textarea
            value={formData[key] || ""}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className="w-full px-3 py-3 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50 resize-none min-h-[88px]"
            placeholder={`Inserisci ${label.toLowerCase()}`}
            required={required}
            rows={3}
          />
        ) : (
          <input
            type={type}
            value={formData[key] || ""}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className="w-full px-3 py-3 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50 min-h-[44px]"
            placeholder={`Inserisci ${label.toLowerCase()}`}
            required={required}
          />
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Campi obbligatori */}
      <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <h4 className="text-sm font-medium text-blue-200 mb-3">Campi Obbligatori</h4>
        <div className="space-y-3">{renderField("numero_palo", "Numero Palo", "text", true)}</div>
      </div>

      {/* Lampada e Potenza */}
      <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <h4 className="text-sm font-medium text-blue-200 mb-3">Lampada e Potenza</h4>
        <div className={`grid ${isMobile ? "grid-cols-1 gap-3" : "grid-cols-2 gap-3"}`}>
          <div>
            <label className="block text-sm font-medium text-blue-300 mb-1">Lampada</label>
            <CustomSelect
              value={formData.lampada || ""}
              onChange={(value) => handleInputChange("lampada", value)}
              options={selectOptions.lampada}
              placeholder="Seleziona lampada"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-300 mb-1">Potenza</label>
            <input
              type="number"
              value={formData.potenza || ""}
              onChange={(e) => handleInputChange("potenza", e.target.value)}
              className="w-full px-3 py-3 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50 min-h-[44px]"
              placeholder="W"
            />
          </div>
        </div>
      </div>

      {/* Caratteristiche tecniche */}
      <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <h4 className="text-sm font-medium text-blue-200 mb-3">Caratteristiche Tecniche</h4>
        <div className="space-y-3">
          {renderField("composizione_punto", "Composizione Punto")}
          {renderField("tipo_apparecchio", "Tipo Apparecchio")}
          {renderField("tipo_sostegno", "Tipo Sostegno")}
          {renderField("tipo_linea", "Tipo Linea")}
        </div>
      </div>

      {/* Informazioni aggiuntive */}
      <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <h4 className="text-sm font-medium text-blue-200 mb-3">Informazioni Aggiuntive</h4>
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-blue-300">Indirizzo</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.indirizzo || ""}
                onChange={(e) => handleInputChange("indirizzo", e.target.value)}
                className="flex-1 px-3 py-3 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50 min-h-[44px]"
                placeholder="Inserisci indirizzo"
              />
              <button
                type="button"
                onClick={fetchAddressFromLatLng}
                disabled={isFetchingAddress || !tempPosition}
                className="px-3 py-3 bg-blue-900/40 border border-blue-500/40 text-blue-300 rounded-lg hover:bg-blue-800/60 hover:text-blue-100 backdrop-blur-md shadow-md disabled:bg-gray-700 disabled:text-blue-500 disabled:cursor-not-allowed transition-colors flex items-center gap-1 min-h-[44px] min-w-[44px]"
                title="Calcola indirizzo da coordinate"
              >
                {isFetchingAddress ? (
                  <svg className="animate-spin h-4 w-4 text-blue-300" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : (
                  <MapPin className="h-4 w-4 text-blue-300" />
                )}
              </button>
            </div>
          </div>
          {renderField("proprieta", "Proprietà")}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-blue-300">Quadro</label>
            <CustomSelect
              value={formData.quadro}
              onChange={(value) => handleInputChange("quadro", value)}
              options={[
                { value: "unknown", label: "Quadro Ignoto" },
                { value: "new", label: "Quadro da Caricare" },
                ...electricPanels.map((panel) => ({ value: panel, label: panel })),
              ]}
              placeholder="Seleziona un quadro"
            />
            {(formData.quadro === "unknown" || formData.quadro === "new") && (
              <input
                type="text"
                value={formData.quadro_altro}
                onChange={(e) => handleInputChange("quadro_altro", e.target.value)}
                className="w-full px-3 py-3 mt-2 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50 min-h-[44px]"
                placeholder="Inserisci nome quadro"
              />
            )}
          </div>
          {renderField("lotto", "Lotto")}
          {renderField("promiscuita", "Promiscuità")}
          {renderField("note", "Note", "textarea")}
        </div>
      </div>

      {/* Posizione */}
      {tempPosition && (
        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <h4 className="text-sm font-medium text-blue-200 mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Posizione
          </h4>
          <div className={`grid ${isMobile ? "grid-cols-1 gap-3" : "grid-cols-2 gap-3"}`}>
            <div>
              <label className="block text-sm font-medium text-blue-300 mb-1">Latitudine</label>
              <input
                type="text"
                value={Number(tempPosition.lat).toFixed(6)}
                readOnly
                className="w-full px-3 py-3 bg-blue-900/60 text-blue-300 border border-blue-500/40 rounded-lg min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-300 mb-1">Longitudine</label>
              <input
                type="text"
                value={Number(tempPosition.lng).toFixed(6)}
                readOnly
                className="w-full px-3 py-3 bg-blue-900/60 text-blue-300 border border-blue-500/40 rounded-lg min-h-[44px]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={`flex gap-3 pt-4 border-t border-blue-500/30 ${isMobile ? "flex-col" : ""}`}>
        <button
          type="button"
          onClick={onBack}
          className={`${isMobile ? "w-full" : ""} flex items-center justify-center gap-2 px-4 py-3 text-blue-300 bg-blue-900/40 border border-blue-500/40 rounded-lg hover:bg-blue-800/50 transition-colors min-h-[44px]`}
        >
          <ChevronLeft className="h-4 w-4" />
          Indietro
        </button>
        <button
          type="submit"
          disabled={isSaving || !formData.numero_palo}
          className={`${isMobile ? "w-full" : "flex-1"} flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors min-h-[44px]`}
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Salvando..." : "Salva Punto Luce"}
        </button>
      </div>
    </form>
  )
}

export default AddLightPointForm

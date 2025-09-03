"use client"
import { useState } from "react"
import { ChevronLeft, Save, MapPin, Zap, ChevronDown } from "lucide-react"
import toast from "react-hot-toast"

const AddElectricPanelForm = ({ onSave, onBack, tempPosition, selectedCity, electricPanels = [] }) => {
  const [formData, setFormData] = useState({
    numero_palo: "",
    indirizzo: "",
    numero_quadro: "",
    proprieta: "",
    alimentazione: "",
    potenza: "",
    potenza_contratto: "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isFetchingAddress, setIsFetchingAddress] = useState(false)
  const [pendingSave, setPendingSave] = useState(null)

  // Detect mobile device
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768

  // Opzioni per le select
  const selectOptions = {
    proprieta: [
      { value: "EnelSole", label: "EnelSole" },
      { value: "Municipale", label: "Municipale" },
      { value: "Progetto", label: "Progetto" },
      { value: "Altro", label: "Altro" },
    ],
    alimentazione: [
      { value: "Monofase", label: "Monofase" },
      { value: "Trifase", label: "Trifase" },
      { value: "Altro", label: "Altro" },
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
      // Controllo duplicato (case insensitive, senza spazi)
      const inputValue = (formData.numero_palo || "").replace(/\s+/g, "").toLowerCase()
      const alreadyExists = electricPanels.some(
        (panel) => (panel || "").replace(/\s+/g, "").toLowerCase() === inputValue,
      )
      if (alreadyExists) {
        // Mostra toast con azioni e grafica custom glassmorphism
        toast.custom(
          (t) => (
            <div
              className={`max-w-xs w-full p-4 rounded-2xl shadow-xl border border-blue-400/30 bg-blue-900/70 backdrop-blur-md flex flex-col items-center ${t.visible ? "animate-fade-in" : "animate-fade-out"}`}
              style={{ boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="h-6 w-6 text-blue-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
                  />
                </svg>
                <span className="text-blue-100 font-semibold text-base">Codice già presente</span>
              </div>
              <div className="text-blue-200 text-sm mb-4 text-center">
                Esiste già un quadro con questo codice.
                <br />
                Vuoi inserirlo comunque?
              </div>
              <div className="flex gap-3 w-full">
                <button
                  className="flex-1 px-4 py-2 rounded-full bg-blue-600/80 text-white font-medium hover:bg-blue-700/90 transition-colors shadow-md"
                  onClick={async () => {
                    toast.dismiss(t.id)
                    setIsSaving(true)
                    await proceedSave()
                  }}
                >
                  Procedi comunque
                </button>
                <button
                  className="flex-1 px-4 py-2 rounded-full bg-blue-900/60 text-blue-200 font-medium hover:bg-blue-800/80 border border-blue-400/30 transition-colors shadow-md"
                  onClick={() => {
                    toast.dismiss(t.id)
                    setIsSaving(false)
                  }}
                >
                  Annulla
                </button>
              </div>
            </div>
          ),
          { duration: 10000 },
        )
        setIsSaving(false)
        setPendingSave({ ...formData })
        return
      }
      await proceedSave()
    } catch (error) {
      console.error("Errore durante il salvataggio:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // Funzione che esegue effettivamente il salvataggio
  const proceedSave = async () => {
    const dataToSend = { ...(pendingSave || formData) }
    dataToSend.numero_palo = dataToSend.numero_palo
    dataToSend.quadro = dataToSend.numero_palo
    // Gestione speciale per proprieta con "Altro"
    if (dataToSend.proprieta === "Altro" && dataToSend.proprieta_altro) {
      dataToSend.proprieta = dataToSend.proprieta_altro
      delete dataToSend.proprieta_altro
    }
    // Gestione speciale per alimentazione con "Altro"
    if (dataToSend.alimentazione === "Altro" && dataToSend.alimentazione_altro) {
      dataToSend.alimentazione = dataToSend.alimentazione_altro
      delete dataToSend.alimentazione_altro
    }
    await onSave(dataToSend)
    setPendingSave(null)
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

    // Campo speciale per numero_palo (Numero Quadro con prefisso PC)
    if (key === "numero_palo") {
      return (
        <div key={key} className="space-y-2">
          <label className="block text-sm font-medium text-blue-300">
            {label} {required && <span className="text-red-400">*</span>}
          </label>
          <input
            type="text"
            value={formData[key] || "PC"}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className="w-full px-3 py-3 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50 min-h-[44px]"
            placeholder="Es: PC123"
            required={required}
          />
        </div>
      )
    }

    return (
      <div key={key} className="space-y-2">
        <label className="block text-sm font-medium text-blue-300">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        <input
          type={type}
          value={formData[key] || ""}
          onChange={(e) => handleInputChange(key, e.target.value)}
          className="w-full px-3 py-3 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50 min-h-[44px]"
          placeholder={`Inserisci ${label.toLowerCase()}`}
          required={required}
        />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Campi obbligatori */}
      <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <h4 className="text-sm font-medium text-blue-200 mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Campi Obbligatori
        </h4>
        <div className="space-y-3">{renderField("numero_palo", "Numero Quadro", "text", true)}</div>
      </div>

      {/* Caratteristiche tecniche */}
      <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <h4 className="text-sm font-medium text-blue-200 mb-3">Caratteristiche Tecniche</h4>
        <div className="space-y-3">
          {renderField("alimentazione", "Alimentazione")}
          <div className={`grid ${isMobile ? "grid-cols-1 gap-3" : "grid-cols-2 gap-3"}`}>
            <div>
              <label className="block text-sm font-medium text-blue-300 mb-1">Potenza</label>
              <input
                type="number"
                value={formData.potenza || ""}
                onChange={(e) => handleInputChange("potenza", e.target.value)}
                className="w-full px-3 py-3 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50 min-h-[44px]"
                placeholder="kW"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-300 mb-1">Potenza Contratto</label>
              <input
                type="number"
                value={formData.potenza_contratto || ""}
                onChange={(e) => handleInputChange("potenza_contratto", e.target.value)}
                className="w-full px-3 py-3 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50 min-h-[44px]"
                placeholder="kW"
              />
            </div>
          </div>
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
          {renderField("lotto", "Lotto")}
          {renderField("pod", "Pod")}
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
          {isSaving ? "Salvando..." : "Salva Quadro Elettrico"}
        </button>
      </div>
    </form>
  )
}

export default AddElectricPanelForm

"use client"
import { useState } from "react"
import { ChevronLeft, Save, MapPin, Zap } from "lucide-react"

const AddElectricPanelForm = ({
  onSave,
  onBack,
  tempPosition,
  selectedCity
}) => {
  const [formData, setFormData] = useState({
    numero_palo: "",
    indirizzo: "",
    numero_quadro: "",
    proprieta: "",
    alimentazione: "",
    potenza: "",
    potenza_contratto: ""
  })
  const [isSaving, setIsSaving] = useState(false)

  // Opzioni per le select
  const selectOptions = {
    proprieta: [
      { value: "EnelSole", label: "EnelSole" },
      { value: "Municipale", label: "Municipale" },
      { value: "Progetto", label: "Progetto" },
      { value: "Altro", label: "Altro" }
    ],
    alimentazione: [
      { value: "Monofase", label: "Monofase" },
      { value: "Trifase", label: "Trifase" },
      { value: "Altro", label: "Altro" }
    ]
  }

  const handleInputChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      // Prepara i dati per l'invio
      const dataToSend = { ...formData }

      // Gestione speciale per proprieta con "Altro"
      if (formData.proprieta === "Altro" && formData.proprieta_altro) {
        dataToSend.proprieta = formData.proprieta_altro
        delete dataToSend.proprieta_altro
      }

      // Gestione speciale per alimentazione con "Altro"
      if (formData.alimentazione === "Altro" && formData.alimentazione_altro) {
        dataToSend.alimentazione = formData.alimentazione_altro
        delete dataToSend.alimentazione_altro
      }

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
          <select
            value={formData[key] || ''}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className="w-full px-3 py-2 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
            required={required}
          >
            <option value="">Seleziona {label.toLowerCase()}</option>
            {selectOptions[key].map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Campo aggiuntivo per "Altro" */}
          {formData[key] === "Altro" && (
            <input
              type="text"
              value={formData[`${key}_altro`] || ''}
              onChange={(e) => handleInputChange(`${key}_altro`, e.target.value)}
              className="w-full px-3 py-2 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50"
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
        <input
          type={type}
          value={formData[key] || ''}
          onChange={(e) => handleInputChange(key, e.target.value)}
          className="w-full px-3 py-2 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50"
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
        <div className="space-y-3">
          {renderField("numero_palo", "Numero Palo", "text", true)}
          
          {renderField("numero_quadro", "Numero Quadro", "text", true)}
        </div>
      </div>

      {/* Caratteristiche tecniche */}
      <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <h4 className="text-sm font-medium text-blue-200 mb-3">Caratteristiche Tecniche</h4>
        <div className="space-y-3">
          {renderField("alimentazione", "Alimentazione")}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-blue-300 mb-1">
                Potenza
              </label>
              <input
                type="number"
                value={formData.potenza || ''}
                onChange={(e) => handleInputChange('potenza', e.target.value)}
                className="w-full px-3 py-2 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50"
                placeholder="kW"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-300 mb-1">
                Potenza Contratto
              </label>
              <input
                type="number"
                value={formData.potenza_contratto || ''}
                onChange={(e) => handleInputChange('potenza_contratto', e.target.value)}
                className="w-full px-3 py-2 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50"
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
        {renderField("indirizzo", "Indirizzo")}
          {renderField("proprieta", "Proprietà")}
        </div>
      </div>

      {/* Posizione */}
      {tempPosition && (
        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <h4 className="text-sm font-medium text-blue-200 mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Posizione
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-blue-300 mb-1">
                Latitudine
              </label>
              <input
                type="text"
                value={Number(tempPosition.lat).toFixed(6)}
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
                value={Number(tempPosition.lng).toFixed(6)}
                readOnly
                className="w-full px-3 py-2 bg-blue-900/60 text-blue-300 border border-blue-500/40 rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex gap-3 pt-4 border-t border-blue-500/30">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-blue-300 bg-blue-900/40 border border-blue-500/40 rounded-lg hover:bg-blue-800/50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Indietro
        </button>
        <button
          type="submit"
          disabled={isSaving || !formData.numero_palo ||  !formData.numero_quadro}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Salvando...' : 'Salva Quadro Elettrico'}
        </button>
      </div>
    </form>
  )
}

export default AddElectricPanelForm
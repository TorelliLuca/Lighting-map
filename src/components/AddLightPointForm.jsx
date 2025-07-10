"use client"
import { useState } from "react"
import { ChevronLeft, Save, MapPin } from "lucide-react"

const AddLightPointForm = ({
  onSave,
  onBack,
  tempPosition,
  selectedCity
}) => {
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
    lotto: "",
    note: ""
  })
  const [isSaving, setIsSaving] = useState(false)

  // Opzioni per le select
  const selectOptions = {
    composizione_punto: [
      { value: "Singolo", label: "Singolo" },
      { value: "Multiplo", label: "Multiplo" },
      { value: "Differente A", label: "Differente A" },
      { value: "Differente B", label: "Differente B" },
      { value: "Differente C", label: "Differente C" },
      { value: "Differente D", label: "Differente D" },
      { value: "Differente E", label: "Differente E" }
    ],
    proprieta: [
      { value: "EnelSole", label: "EnelSole" },
      { value: "Municipale", label: "Municipale" },
      { value: "Progetto", label: "Progetto" },
      { value: "Altro", label: "Altro" }
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
      { value: "INC", label: "INC" },
      { value: "ALT", label: "ALT" }
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

  const handleInputChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      // Prepara i dati per l'invio
      const dataToSend = { ...formData }

      // Gestione speciale per lampada_potenza - concatena lampada e potenza
      if (formData.lampada || formData.potenza) {
        const lampada = formData.lampada || ''
        const potenza = formData.potenza || ''
        dataToSend.lampada_potenza = `${lampada} ${potenza}`.trim()
        
        // Rimuovi i campi separati
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
        {type === "textarea" ? (
          <textarea
            value={formData[key] || ''}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className="w-full px-3 py-2 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50 resize-none"
            placeholder={`Inserisci ${label.toLowerCase()}`}
            required={required}
            rows={3}
          />
        ) : (
          <input
            type={type}
            value={formData[key] || ''}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className="w-full px-3 py-2 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50"
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
        <div className="space-y-3">
          {renderField("numero_palo", "Numero Palo", "text", true)}
          
        </div>
      </div>

      {/* Lampada e Potenza */}
      <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <h4 className="text-sm font-medium text-blue-200 mb-3">Lampada e Potenza</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-blue-300 mb-1">
              Lampada
            </label>
            <select
              value={formData.lampada || ''}
              onChange={(e) => handleInputChange('lampada', e.target.value)}
              className="w-full px-3 py-2 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
            >
              <option value="">Seleziona lampada</option>
              {selectOptions.lampada.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-300 mb-1">
              Potenza
            </label>
            <input
              type="number"
              value={formData.potenza || ''}
              onChange={(e) => handleInputChange('potenza', e.target.value)}
              className="w-full px-3 py-2 bg-blue-900/40 text-white border border-blue-500/40 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors placeholder-blue-400/50"
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
        {renderField("indirizzo", "Indirizzo")}
          {renderField("proprieta", "Proprietà")}
          {renderField("quadro", "Quadro")}
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
          disabled={isSaving || !formData.numero_palo}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Salvando...' : 'Salva Punto Luce'}
        </button>
      </div>
    </form>
  )
}

export default AddLightPointForm 
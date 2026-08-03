/**
 * Utility functions and constants for Google Maps InfoWindow components
 */

// Utility functions for text/date manipulation
export const clearBlanket = (str) => {
    return str ? str.replace(/[\s'"]+/g, "") : "";
  };
  
  export const translateString = (englishString) => {
    return translation_report_type[englishString] || englishString;
  };
  
  export const transformDateToIT = (dateToConvert) => {
    if (!dateToConvert) return "";
    
    const date = new Date(dateToConvert);
    const options = {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return date.toLocaleString("it-IT", options);
  };
  
  // Constants for field filtering
  export const listIgnoratedFieldsPL = [
    "_id",
    "pod",
    "numero_contatore",
    "alimentazione",
    "potenza_contratto",
    "potenza",
    "punti_luce",
    "tipo",
    "__v",
    "city",
    "parent",
    // Campi legacy sostituiti dallo schema aggiornato
    "lampada_potenza",
    "lampada_e_potenza",
    "modello",
    "modello_armatura",
    "lampada",
  ];
  
  export const listIgnoratedFieldsQE = [
    "_id",
    "parent",
    "composizione_punto",
    "lotto",
    "quadro",
    "proprieta",
    "tipo_apparecchio",
    "armatura",
    "marca_apparecchio",
    "modello",
    "modello_apparecchio",
    "numero_apparecchi",
    "lampada_potenza",
    "tipo_lampada",
    "potenza_lampada",
    "tipo_sostegno",
    "altezza_sostegno",
    "tipo_linea",
    "promiscuita",
    "note",
    "garanzia",
    "__v",
    "city"
  ];

  /** Ordine di visualizzazione campi InfoWindow (allineato allo schema lightPoints). */
  export const INFO_WINDOW_FIELD_ORDER = [
    "marker",
    "numero_palo",
    "composizione_punto",
    "numero_apparecchi",
    "indirizzo",
    "lotto",
    "quadro",
    "proprieta",
    "tipo_apparecchio",
    "marca_apparecchio",
    "modello_apparecchio",
    "altezza_sostegno",
    "armatura",
    "tipo_lampada",
    "potenza_lampada",
    "tipo_sostegno",
    "tipo_linea",
    "promiscuita",
    "note",
    "garanzia",
    "pod",
    "numero_contatore",
    "alimentazione",
    "potenza_contratto",
    "potenza",
    "punti_luce",
    "tipo",
    "data_creazione",
    "segnalazioni_in_corso",
    "segnalazioni_risolte",
    "operazioni_effettuate",
  ];

  export const orderInfoWindowEntries = (content) => {
    if (!content || typeof content !== "object") return []
    const keys = Object.keys(content)
    const ordered = INFO_WINDOW_FIELD_ORDER.filter((key) => keys.includes(key))
    const rest = keys.filter((key) => !INFO_WINDOW_FIELD_ORDER.includes(key))
    return [...ordered, ...rest].map((key) => [key, content[key]])
  };

  /** Tipo lampada: campo dedicato o fallback da lampada_potenza legacy. */
  export const getTipoLampada = (data) => {
    if (!data) return ""
    if (data.tipo_lampada) return String(data.tipo_lampada).trim()
    return (data.lampada_potenza || "").split(/\s+/)[0] || ""
  }

  /** Potenza lampada: campo dedicato o fallback da lampada_potenza legacy. */
  export const getPotenzaLampada = (data) => {
    if (!data) return ""
    if (data.potenza_lampada != null && data.potenza_lampada !== "") {
      return String(data.potenza_lampada).trim()
    }
    const parts = (data.lampada_potenza || "").split(/\s+/)
    return parts.slice(1).join(" ") || ""
  }

  /** Campi legacy da non mostrare dopo la migrazione in visualizzazione. */
  export const LEGACY_LIGHT_POINT_FIELDS = [
    "lampada_potenza",
    "lampada_e_potenza",
    "modello",
    "modello_armatura",
    "lampada",
    "potenza",
  ]

  /** Migra campi legacy per form/modifica. */
  export const migrateLegacyLightPointFields = (data) => {
    const migrated = { ...data }
    if (!migrated.tipo_lampada && migrated.lampada_potenza) {
      const parts = String(migrated.lampada_potenza).trim().split(/\s+/)
      migrated.tipo_lampada = parts[0] || ""
      migrated.potenza_lampada = parts.slice(1).join(" ") || ""
    }
    if (!migrated.modello_apparecchio && migrated.modello) {
      migrated.modello_apparecchio = migrated.modello
    }
    if (!migrated.armatura && migrated.modello_armatura) {
      migrated.armatura = migrated.modello_armatura
    }
    return migrated
  }

  /**
   * Normalizza un punto luce per la visualizzazione:
   * copia i valori legacy nei campi nuovi (se vuoti) e rimuove i campi obsoleti.
   */
  export const normalizeLightPointForDisplay = (data) => {
    if (!data || typeof data !== "object") return {}
    const normalized = migrateLegacyLightPointFields({ ...data })
    for (const key of LEGACY_LIGHT_POINT_FIELDS) {
      delete normalized[key]
    }
    return normalized
  }

  /** Prepara payload salvataggio con i campi schema aggiornati. */
  export const prepareLightPointPayload = (formData) => {
    const dataToSend = { ...formData }
    if (dataToSend.lampada != null || dataToSend.potenza != null) {
      dataToSend.tipo_lampada = dataToSend.tipo_lampada || dataToSend.lampada || ""
      dataToSend.potenza_lampada = dataToSend.potenza_lampada ?? dataToSend.potenza ?? ""
      delete dataToSend.lampada
      delete dataToSend.potenza
    }
    delete dataToSend.lampada_potenza
    delete dataToSend.modello
    delete dataToSend.modello_armatura
    delete dataToSend.lampada_e_potenza
    return dataToSend
  }
  
  // Translation dictionary
  export const translation_report_type = {
    LIGHT_POINT_OFF: "Punto luce spento",
    PLANT_OFF: "Impianto spento",
    DAMAGED_COMPLEX: "Complesso danneggiato",
    DAMAGED_SUPPORT: "Morsettiera rotta",
    BROKEN_TERMINAL_BLOCK: "Sostegno danneggiato",
    BROKEN_PANEL: "Quadro danneggiato",
    OTHER: "Altro",
    MADE_SAFE_BUT_SYSTEM_NEEDS_RESTORING: "Messa in sicurezza ma da ripristinare impianto",
    FAULT_ELIMINATED_AND_SYSTEM_RESTORED: "Guasto eliminato e impianto ripristinato",
  };



export const  isOlderThan = (reportDate, n) =>  {
  const reportTime = new Date(reportDate).getTime();
  const now = new Date().getTime();
  const diffHours = (now - reportTime) / (1000 * 60 * 60);
  return diffHours >= n;
}

export const translateUserType = (userType) => {
  switch (userType) {
    case 'DEFAULT_USER':
      return 'Utente Standard';
    case 'MAINTAINER':
      return 'Manutentore';
    case 'ADMINISTRATOR':
      return 'Amministratore';
    case 'SUPER_ADMIN':
      return 'Super Amministratore';
    case 'SURVEYOR':
      return 'Rilevatore';
    default:
      return 'Utente';
  }
};

export const capitalizeString = (str) => {
  if (!str) {
    return '';
  }

  const lowerCaseStr = str.toLowerCase();

  const firstChar = lowerCaseStr.charAt(0).toUpperCase();

  const restOfStr = lowerCaseStr.slice(1);

  return firstChar + restOfStr;
}

export function validateName(name) {
  // Regex che accetta solo lettere (maiuscole e minuscole), spazi, apostrofi e accenti
  const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/;
  return nameRegex.test(name);
}

export function getContractStatus(endDate) {
  const threeMonthsInDays = 90;

  const end = new Date(endDate);
  const today = new Date();

  // Imposta l'ora, i minuti, i secondi e i millisecondi a zero per confrontare solo le date.
  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  // Calcola la differenza in giorni tra la data di fine e la data odierna.
  const timeDifference = end.getTime() - today.getTime();
  const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

  // Caso 1: La data di fine è nel futuro.
  if (daysDifference >= 0) {
    // Caso 1a: Mancano meno di 3 mesi.
    if (daysDifference <= threeMonthsInDays) {
      return 'In scadenza';
    }
    // Caso 1b: Mancano più di 3 mesi.
    return 'Attivo';
  }

  // Caso 2: La data di fine è nel passato (il contratto è scaduto).
  const daysSinceExpiration = Math.abs(daysDifference);
  return `Scaduto da ${daysSinceExpiration} giorni`;
}
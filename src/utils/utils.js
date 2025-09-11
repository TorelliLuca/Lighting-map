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
    "city"
  ];
  
  export const listIgnoratedFieldsQE = [
    "_id",
    "composizione_punto",
    "lotto",
    "quadro",
    "proprieta",
    "tipo_apparecchio",
    "modello",
    "numero_apparecchi",
    "lampada_potenza",
    "tipo_sostegno",
    "tipo_linea",
    "promiscuita",
    "note",
    "garanzia",
    "__v",
    "city"
  ];
  
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
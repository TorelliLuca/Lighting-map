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
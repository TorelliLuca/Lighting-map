/**
 * Utility functions and constants for Google Maps InfoWindow components
 */

/** Etichette capitolato (codice → descrizione UI). */
export const DEFAULT_FAULT_LABELS = {
  IMMEDIATE_DANGER: "Pericolo immediato per la pubblica incolumità",
  PLANT_OFF: "Strada al buio / intera cabina spenta",
  MULTIPLE_OFF: "Tre o più punti luce spenti nello stesso tratto",
  SINGLE_OFF: "Punto luce singolo spento",
  NON_URGENT: "Anomalia non urgente",
};

/** Dizionario legacy report/operazioni + capitolato. */
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
  IMMEDIATE_DANGER: "Pericolo immediato per la pubblica incolumità",
  MULTIPLE_OFF: "Tre o più punti luce spenti nello stesso tratto",
  SINGLE_OFF: "Punto luce singolo spento",
  NON_URGENT: "Anomalia non urgente",
};

export const clearBlanket = (str) => {
  return str ? str.replace(/[\s'"]+/g, "") : "";
};

export const translateString = (englishString) => {
  if (!englishString) return "";
  if (DEFAULT_FAULT_LABELS[englishString]) return DEFAULT_FAULT_LABELS[englishString];
  return translation_report_type[englishString] || String(englishString).replace(/_/g, " ");
};

/**
 * Descrizione leggibile di una segnalazione (mai il solo codice capitolato).
 * @param {object|string} reportOrCode - report o codice fault_label/report_type
 * @param {Array<{code:string,label:string}>} [faultLabels] - da maintenanceConfig
 */
export const formatReportFaultLabel = (reportOrCode, faultLabels = []) => {
  const code = typeof reportOrCode === "string"
    ? reportOrCode
    : (reportOrCode?.fault_label || reportOrCode?.report_type || "");
  if (!code) return "Guasto";
  const fromConfig = (faultLabels || []).find((f) => f.code === code);
  if (fromConfig?.label) return fromConfig.label;
  if (DEFAULT_FAULT_LABELS[code]) return DEFAULT_FAULT_LABELS[code];
  if (translation_report_type[code]) return translation_report_type[code];
  return String(code).replace(/_/g, " ");
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
    "armatura",
    "lampada",
    "report_badge_type",
    "has_ordinary_report",
    "has_extraordinary_report",
    "due_urgency",
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
    "modello_armatura",
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
    
    "quadro",
    
    "tipo_apparecchio",
    "marca_apparecchio",
    "modello_apparecchio",
    "tipo_lampada",
    "potenza_lampada",
    "tipo_sostegno",
    "altezza_sostegno",
    "tipo_linea",
    "promiscuita",
    "proprieta",
    "lotto",
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
    "armatura",
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
    delete dataToSend.armatura
    delete dataToSend.lampada_e_potenza
    return dataToSend
  }
  
export const  isOlderThan = (reportDate, n) =>  {
  const reportTime = new Date(reportDate).getTime();
  const now = new Date().getTime();
  const diffHours = (now - reportTime) / (1000 * 60 * 60);
  return diffHours >= n;
}

export const USER_SUBROLE_LABELS = {
  RUP: "RUP",
  DEC: "DEC",
  LEAD_MAINTAINER: "Titolare Manutentore",
  MAINTAINER: "Manutentore",
}

export const translateUserType = (userType, subRole = null) => {
  if (userType === "ADMINISTRATOR" && subRole && USER_SUBROLE_LABELS[subRole]) {
    return `Amministratore (${USER_SUBROLE_LABELS[subRole]})`
  }
  if (userType === "MAINTAINER" && subRole && USER_SUBROLE_LABELS[subRole]) {
    return USER_SUBROLE_LABELS[subRole]
  }
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

/** Stati in cui il sopralluogo è ancora pendente (una sola volta). */
const INSPECTABLE_STATUSES = new Set(['OPEN', 'CLASSIFICATION_PENDING']);

/** Stati post-sopralluogo in cui si possono fare operazioni (chiusura intervento). */
const OPERABLE_STATUSES = new Set(['SUSPENDED', 'SCHEDULED']);

/** Giorni residui sotto i quali la straordinaria è "in scadenza". */
export const EXTRAORDINARY_SOON_DAYS = 3;

export function getExtraordinaryDueUrgency(dueDate) {
  if (!dueDate) return 'none';
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return 'none';
  const days = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'overdue';
  if (days <= EXTRAORDINARY_SOON_DAYS) return 'soon';
  return 'ok';
}

export function getDaysRemaining(dueDate) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;
  return Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

/** Stati preventivo ancora "aperti" (intervento straordinario in corso). */
const OPEN_QUOTE_STATUSES = new Set([
  'DRAFT',
  'PENDING_APPROVAL',
  'NEEDS_REVISION',
  'APPROVED',
]);

/**
 * True se la segnalazione ha un preventivo IMS ancora attivo.
 * Accetta linked_quote_id popolato (oggetto) o solo ObjectId (presenza = collegato).
 */
export function hasOpenLinkedQuote(report) {
  const quote = report?.linked_quote_id;
  if (!quote) return false;
  if (typeof quote === 'object' && quote !== null) {
    if (quote.status && !OPEN_QUOTE_STATUSES.has(quote.status)) return false;
    return true;
  }
  return true;
}

/** Segnalazione straordinaria / con preventivo aperto (badge pentagono). */
export function isExtraordinaryReportInProgress(report) {
  if (!report || report.is_solved) return false;
  if (report.maintenance_category === 'EXTRAORDINARY') return true;
  if (report.workflow_status === 'PENDING_QUOTE') return true;
  return hasOpenLinkedQuote(report);
}

function getExtraordinaryDueDate(report) {
  if (!report) return null;
  if (report.due_date) return report.due_date;
  const quote = report.linked_quote_id;
  if (quote && typeof quote === 'object' && quote.dueDate) return quote.dueDate;
  return null;
}

export function getReportBadgeInfo(segnalazioni = []) {
  const active = (segnalazioni || []).filter((s) => !s?.is_solved);
  if (!active.length) {
    return { hasReport: false, type: null, count: 0, dueUrgency: 'none' };
  }

  const extraordinary = active.find((s) => isExtraordinaryReportInProgress(s));
  if (extraordinary) {
    const dueDate = getExtraordinaryDueDate(extraordinary);
    return {
      hasReport: true,
      type: 'extraordinary',
      count: active.length,
      dueUrgency: getExtraordinaryDueUrgency(dueDate),
      dueDate: dueDate || null,
    };
  }

  const hasOrdinary = active.some((s) => !s.maintenance_category || s.maintenance_category === 'ORDINARY');
  if (hasOrdinary) {
    return { hasReport: true, type: 'ordinary', count: active.length, dueUrgency: 'none' };
  }

  return { hasReport: true, type: 'legacy', count: active.length, dueUrgency: 'none' };
}

export function getInspectableOrdinaryReport(segnalazioni = []) {
  return (segnalazioni || []).find((s) => {
    if (s?.is_solved) return false;
    if (s?.maintenance_category === 'EXTRAORDINARY') return false;
    const status = s?.workflow_status || 'OPEN';
    return INSPECTABLE_STATUSES.has(status);
  }) || null;
}

export function getOperableOrdinaryReport(segnalazioni = []) {
  return (segnalazioni || []).find((s) => {
    if (s?.is_solved) return false;
    if (s?.maintenance_category === 'EXTRAORDINARY') return false;
    const status = s?.workflow_status || 'OPEN';
    return OPERABLE_STATUSES.has(status);
  }) || null;
}

export function getLinkedQuoteStatus(report) {
  const quote = report?.linked_quote_id
  if (!quote) return null
  if (typeof quote === 'object' && quote !== null) return quote.status || null
  return null
}

/** Straordinaria chiudibile solo con preventivo IMS approvato dal DEC. */
export function canResolveExtraordinaryReport(report) {
  if (!report || report.is_solved) return false
  if (report.maintenance_category !== 'EXTRAORDINARY') return false

  const quoteStatus = getLinkedQuoteStatus(report)
  if (quoteStatus === 'APPROVED') return true
  if (quoteStatus) return false

  return report.workflow_status !== 'PENDING_QUOTE'
}

export function getOperableExtraordinaryReport(segnalazioni = []) {
  return (segnalazioni || []).find((s) => canResolveExtraordinaryReport(s)) || null
}

/** Segnalazione con preventivo IMS da compilare (bozza / in attesa). */
export function getPendingQuoteReport(segnalazioni = []) {
  return (segnalazioni || []).find((s) => {
    if (s?.is_solved) return false;
    return s?.workflow_status === 'PENDING_QUOTE';
  }) || null;
}

export function canStartInspection(userRole, segnalazioni = []) {
  if (!['MAINTAINER', 'SUPER_ADMIN'].includes(userRole)) return false;
  return Boolean(getInspectableOrdinaryReport(segnalazioni));
}

export function canStartOperation(userRole, segnalazioni = []) {
  if (!['MAINTAINER', 'SUPER_ADMIN'].includes(userRole)) return false;
  return Boolean(
    getOperableOrdinaryReport(segnalazioni) || getOperableExtraordinaryReport(segnalazioni)
  );
}

export function canCompileQuote(userRole, segnalazioni = []) {
  if (!['MAINTAINER', 'SUPER_ADMIN'].includes(userRole)) return false;
  return Boolean(getPendingQuoteReport(segnalazioni));
}

export function canSubmitQuoteByRole(user) {
  if (!user) return false
  if (user.user_type === "SUPER_ADMIN") return true
  if (user.user_type === "MAINTAINER") return user.sub_role === "LEAD_MAINTAINER"
  return false
}

export function canApproveQuoteByRole(user) {
  if (!user) return false
  if (user.user_type === "SUPER_ADMIN") return true
  if (user.user_type !== "ADMINISTRATOR") return false
  return ["RUP", "DEC"].includes(user.sub_role || "")
}

/** Compilazione / gestione bozze preventivi IMS: solo manutentori (e super admin). */
export function canManageQuotesByRole(user) {
  if (!user) return false
  return ["MAINTAINER", "SUPER_ADMIN"].includes(user.user_type)
}

export const INSPECTION_OUTCOMES = {
  RESOLVED: 'Guasto risolto — chiusura segnalazione',
  SUSPENDED: 'Sospensione intervento (mancanza componente)',
  SCHEDULED: 'Risolvi in seguito (tempi capitolato)',
  SAFE_PENDING_RESTORATION: 'Messa in sicurezza + richiesta preventivo (escalation straordinaria)',
  REQUIRES_QUOTE: 'Serve preventivo IMS (senza escalation immediata)',
};

export const WORKFLOW_STATUS_LABELS = {
  OPEN: 'Aperta',
  CLASSIFICATION_PENDING: 'Classificazione da confermare',
  SURVEYED: 'Sopralluogo effettuato',
  SUSPENDED: 'Sospesa',
  SCHEDULED: 'Programmata',
  PENDING_QUOTE: 'In attesa preventivo',
  ESCALATED: 'Escalation straordinaria',
  RESOLVED: 'Risolta',
};

export const MAINTENANCE_CATEGORY_LABELS = {
  ORDINARY: 'Ordinaria',
  EXTRAORDINARY: 'Straordinaria',
};

export const CLASSIFICATION_STATUS_LABELS = {
  PROVISIONAL: 'Provvisoria',
  CONFIRMED: 'Confermata',
  MODIFIED: 'Modificata',
};

const formatPersonName = (user) => {
  if (!user || typeof user !== 'object') return '';
  return `${user.name || ''} ${user.surname || ''}`.trim();
};

const formatYesNo = (value) => (value ? 'Sì' : 'No');

const formatQuoteProtocol = (linkedQuote) => {
  if (!linkedQuote || typeof linkedQuote !== 'object') return '';
  return linkedQuote.protocolNumber || '';
};

/**
 * Riga Excel per una segnalazione (esclude ObjectId / __v / status_history).
 * @param {object} report
 * @param {{ comune: string, numeroPalo: string, indirizzo: string }} lightPointCtx
 */
export const mapReportForExcelExport = (report, { comune, numeroPalo, indirizzo }) => {
  const suspension = report?.suspension || {};
  const classification = report?.classification || {};
  const plantContext = report?.plant_context || {};

  return {
    COMUNE: comune,
    NUMERO_PALO: numeroPalo,
    INDIRIZZO: indirizzo,
    DATA_SEGNALAZIONE: transformDateToIT(report?.report_date),
    ORA_SEGNALAZIONE: report?.report_time || '',
    TIPO_DI_SEGNALAZIONE: translateString(report?.fault_label || report?.report_type),
    DESCRIZIONE: report?.description || '',
    CATEGORIA_MANUTENZIONE:
      MAINTENANCE_CATEGORY_LABELS[report?.maintenance_category] || report?.maintenance_category || '',
    STATO_WORKFLOW:
      WORKFLOW_STATUS_LABELS[report?.workflow_status] || report?.workflow_status || '',
    CLASSE_RISCHIO: report?.risk_class || '',
    STATO_CLASSIFICAZIONE:
      CLASSIFICATION_STATUS_LABELS[classification.status] || classification.status || '',
    DATA_SCADENZA: transformDateToIT(report?.due_date),
    DATA_RISOLUZIONE_PROGRAMMATA: transformDateToIT(report?.scheduled_resolution_date),
    QUADRO: plantContext.quadroLabel || '',
    MOTIVO_SOSPENSIONE: suspension.reason || '',
    GIORNI_SOSPENSIONE:
      suspension.days !== null && suspension.days !== undefined ? suspension.days : '',
    DATA_SOSPENSIONE: transformDateToIT(suspension.suspendedAt),
    NUMERO_PREVENTIVO: formatQuoteProtocol(report?.linked_quote_id),
    RISOLTA: formatYesNo(!!report?.is_solved),
    SEGNALATORE: formatPersonName(report?.user_creator_id),
    OPERATORE: formatPersonName(report?.user_responsible_id),
  };
};

/**
 * Riga Excel per un'operazione (esclude ObjectId / __v).
 * @param {object} operation
 * @param {{ comune: string, numeroPalo: string, indirizzo: string }} lightPointCtx
 */
export const mapOperationForExcelExport = (operation, { comune, numeroPalo, indirizzo }) => ({
  COMUNE: comune,
  NUMERO_PALO: numeroPalo,
  INDIRIZZO: indirizzo,
  DATA_OPERAZIONE: transformDateToIT(operation?.operation_date),
  TIPO_DI_OPERAZIONE: translateString(operation?.operation_type),
  TIPO_MANUTENZIONE:
    MAINTENANCE_CATEGORY_LABELS[operation?.maintenance_type] || operation?.maintenance_type || '',
  DESCRIZIONE: operation?.note || '',
  RISOLTA: formatYesNo(!!operation?.is_solved),
  RESPONSABILE_OPERAZIONE: formatPersonName(operation?.operation_responsible),
});

export const QUOTE_STATUS_LABELS = {
  DRAFT: 'Bozza',
  PENDING_APPROVAL: 'In approvazione',
  APPROVED: 'Approvato',
  REJECTED: 'Rifiutato',
  NEEDS_REVISION: 'Da revisionare',
};

/** Stati in cui il manutentore può modificare e reinviare il documento. */
export const QUOTE_EDITABLE_STATUSES = ['DRAFT', 'REJECTED', 'NEEDS_REVISION'];

/**
 * Totali preventivo IMS (allineati al backend).
 * Oneri sicurezza (default 2%): esclusi dalla base dello sconto.
 * Sconto % su (lordo − oneri); totale netto = lordo − sconto.
 */
export function computeQuoteTotalsClient(lineItems = [], safetyChargeRate = 0.02, discountPercent = 0) {
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100
  const subtotal = round2(
    (lineItems || []).reduce((sum, item) => {
      const qty = Number(item.quantity) || 0
      const price = Number(item.unitPrice) || 0
      return sum + qty * price
    }, 0)
  )
  const rate = Number.isFinite(Number(safetyChargeRate)) ? Number(safetyChargeRate) : 0.02
  const safetyAmount = round2(subtotal * rate)
  const discPct = Number(discountPercent) || 0
  const discountBase = round2(subtotal - safetyAmount)
  const discountAmount = round2(discountBase * (discPct / 100))
  const total = round2(subtotal - discountAmount)
  return { subtotal, safetyAmount, discountAmount, total }
}

/** Prezzo unitario NP = somma (qty × prezzo) delle sotto-voci BOM. */
export function sumBomUnitPrice(children = []) {
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100
  return round2(
    (children || []).reduce((sum, item) => {
      const qty = Number(item.quantity) || 0
      const price = Number(item.unitPrice) || 0
      return sum + qty * price
    }, 0)
  )
}
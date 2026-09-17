import { translateString } from "@/utils/utils"
import { PLANT_EVENT_TYPES, PRIORITY_SCORE } from "@/data/plantStatusMock"

const SOON_DAYS = 10

function formatEventTitle(baseTitle, poleNumber) {
  const title = (baseTitle || "Segnalazione").trim()
  const pole = String(poleNumber || "").trim()
  if (!pole) return title
  if (title.includes(`PL ${pole}`) || title.includes(pole)) return title
  return `${title} · PL ${pole}`
}

/** Fine sospensione: suspendedAt + giorni previsti. */
function suspensionEndDate(report) {
  const suspension = report?.suspension
  if (!suspension?.suspendedAt || !suspension?.days) return null
  const start = new Date(suspension.suspendedAt)
  if (Number.isNaN(start.getTime())) return null
  const days = Number(suspension.days)
  if (!Number.isFinite(days) || days < 1) return null
  const end = new Date(start)
  end.setHours(0, 0, 0, 0)
  end.setDate(end.getDate() + Math.floor(days))
  return end
}

/**
 * Scadenza effettiva: due_date (IMS), risoluzione programmata (ordinarie),
 * oppure fine periodo di sospensione.
 */
function effectiveReportDueDate(report) {
  return (
    report?.due_date ||
    report?.scheduled_resolution_date ||
    suspensionEndDate(report) ||
    null
  )
}

export function computeDueFields(dueDate, now = new Date()) {
  if (!dueDate) {
    return { dueStatus: "none", daysRemaining: null }
  }
  const due = new Date(dueDate)
  if (Number.isNaN(due.getTime())) {
    return { dueStatus: "none", daysRemaining: null }
  }
  const daysRemaining = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const soonLimit = new Date(now)
  soonLimit.setDate(soonLimit.getDate() + SOON_DAYS)
  let dueStatus = "ok"
  if (due < now) dueStatus = "overdue"
  else if (due <= soonLimit) dueStatus = "soon"
  return { dueStatus, daysRemaining }
}

export function priorityFromReport(report, dueStatus) {
  const risk = String(report?.risk_class || "").toUpperCase()
  if (risk === "A" || dueStatus === "overdue") return "critical"
  if (risk === "B" || dueStatus === "soon") return "high"
  if (risk === "C") return "medium"
  if (risk === "D") return "low"
  if (dueStatus === "ok") return "medium"
  return "low"
}

export function formatDueTimeLabel({
  dueStatus,
  daysRemaining,
  occurredAt,
  workflowStatus,
  suspensionDays,
}) {
  const isSuspended = workflowStatus === "SUSPENDED"

  if (isSuspended) {
    if (dueStatus === "overdue" && daysRemaining != null) {
      return {
        kind: "overdue",
        text: `sospensione scaduta · ${Math.abs(daysRemaining)}g di ritardo`,
      }
    }
    if (daysRemaining != null && daysRemaining >= 0) {
      return {
        kind: "expires",
        text: `in sospensione · restano ${daysRemaining}g`,
      }
    }
    const total = Number(suspensionDays)
    if (Number.isFinite(total) && total >= 1) {
      return { kind: "neutral", text: `in sospensione per ${Math.floor(total)}g` }
    }
    return { kind: "neutral", text: "in sospensione" }
  }

  if (dueStatus === "overdue" && daysRemaining != null) {
    const d = Math.abs(daysRemaining)
    return { kind: "overdue", text: `${d}g di ritardo` }
  }
  if ((dueStatus === "soon" || dueStatus === "ok") && daysRemaining != null && daysRemaining >= 0) {
    return { kind: "expires", text: `scade tra ${daysRemaining}g` }
  }
  if (occurredAt) {
    const days = Math.max(
      0,
      Math.floor((Date.now() - new Date(occurredAt).getTime()) / (1000 * 60 * 60 * 24))
    )
    if (days === 0) return { kind: "neutral", text: "oggi" }
    return { kind: "neutral", text: `aperta da ${days}g` }
  }
  return { kind: "neutral", text: "—" }
}

function townNameFromItem(item, fallback = "") {
  return (
    item.townHall?.name ||
    item.townHallName ||
    (typeof item.townHallId === "object" ? item.townHallId?.name : null) ||
    fallback ||
    ""
  )
}

/** Mappa item GET /api/reports/extraordinary → evento feed. */
export function mapExtraordinaryItem(item) {
  const report = item.report || {}
  const quote = report.linked_quote_id
  // Ricalcola sempre lato client (backend usa soglia 3gg; qui 10gg)
  const dueDate = effectiveReportDueDate(report)
  const { dueStatus, daysRemaining } = computeDueFields(dueDate)
  const occurredAt = report.report_date || report.createdAt || report.updatedAt
  const dueLabel = formatDueTimeLabel({
    dueStatus,
    daysRemaining,
    occurredAt,
    workflowStatus: report.workflow_status,
    suspensionDays: report.suspension?.days,
  })
  const title = formatEventTitle(
    translateString(report.fault_label || report.report_type) ||
      report.description ||
      "Intervento straordinario",
    item.lightPoint?.numero_palo
  )

  return {
    id: `report-${report._id}`,
    reportId: report._id,
    lightPointId: item.lightPoint?._id,
    type: "extraordinary",
    priority: priorityFromReport(report, dueStatus),
    title,
    townHall: townNameFromItem(item),
    poleNumber: item.lightPoint?.numero_palo || "",
    lotto: item.lightPoint?.marker || undefined,
    dueStatus,
    daysRemaining,
    dueDate: dueDate || null,
    riskClass: report.risk_class || null,
    workflowStatus: report.workflow_status || null,
    suspensionDays: report.suspension?.days ?? null,
    suspensionReason: report.suspension?.reason || null,
    quoteStatus: quote?.status || null,
    quoteId: quote?._id || quote || null,
    timeLabel: dueLabel.text,
    timeKind: dueLabel.kind,
    occurredAt: occurredAt || new Date().toISOString(),
    lat: item.lightPoint?.lat,
    lng: item.lightPoint?.lng,
  }
}

/** Mappa item GET /api/reports/active → evento (skip straordinarie già mappate). */
export function mapActiveReportItem(item, townHallName) {
  const report = item.report || {}
  if (report.maintenance_category === "EXTRAORDINARY") return null

  const fault = report.fault_label || report.report_type || ""
  const dueDate = effectiveReportDueDate(report)
  const { dueStatus, daysRemaining } = computeDueFields(dueDate)
  const occurredAt = report.report_date || report.createdAt || report.updatedAt
  const dueLabel = formatDueTimeLabel({
    dueStatus,
    daysRemaining,
    occurredAt,
    workflowStatus: report.workflow_status,
    suspensionDays: report.suspension?.days,
  })

  let type = "ordinary"
  if (fault === "LIGHT_POINT_OFF") type = "light_off"
  else if (
    report.workflow_status === "CLASSIFICATION_PENDING" ||
    report.workflow_status === "SURVEYED"
  ) {
    type = "inspection"
  }

  return {
    id: `report-${report._id}`,
    reportId: report._id,
    lightPointId: item.lightPoint?._id,
    type,
    priority: priorityFromReport(report, dueStatus),
    title: formatEventTitle(
      translateString(fault) || report.description || "Segnalazione",
      item.lightPoint?.numero_palo
    ),
    townHall: townHallName || "",
    poleNumber: item.lightPoint?.numero_palo || "",
    lotto: item.lightPoint?.marker || undefined,
    dueStatus,
    daysRemaining,
    dueDate: dueDate || null,
    riskClass: report.risk_class || null,
    workflowStatus: report.workflow_status || null,
    suspensionDays: report.suspension?.days ?? null,
    suspensionReason: report.suspension?.reason || null,
    quoteStatus: null,
    quoteId: null,
    timeLabel: dueLabel.text,
    timeKind: dueLabel.kind,
    occurredAt: occurredAt || new Date().toISOString(),
    lat: item.lightPoint?.lat,
    lng: item.lightPoint?.lng,
  }
}

/** Mappa preventivo GET /api/quotes → evento. */
export function mapQuoteItem(quote) {
  const status = quote.status
  const due = quote.dueDate || quote.due_date
  const { dueStatus, daysRemaining } = computeDueFields(due)
  const occurredAt = quote.updatedAt || quote.createdAt
  const dueLabel = formatDueTimeLabel({ dueStatus, daysRemaining, occurredAt })
  const townHall =
    (typeof quote.townHallId === "object" && quote.townHallId?.name) ||
    quote.townHallName ||
    ""
  const pole =
    (typeof quote.lightPointId === "object" && quote.lightPointId?.numero_palo) ||
    ""

  return {
    id: `quote-${quote._id}`,
    reportId: quote.reportId?._id || quote.reportId || null,
    lightPointId: quote.lightPointId?._id || quote.lightPointId || null,
    type: "quote",
    priority: priorityFromReport(
      { risk_class: quote.priorityClass || quote.reportId?.risk_class },
      dueStatus
    ),
    title: formatEventTitle(
      quote.protocolNumber
        ? `Preventivo ${quote.protocolNumber}`
        : "Preventivo IMS",
      pole
    ),
    townHall,
    poleNumber: pole,
    dueStatus,
    daysRemaining,
    dueDate: due || null,
    riskClass: quote.priorityClass || quote.reportId?.risk_class || null,
    workflowStatus: null,
    quoteStatus: status,
    quoteId: quote._id,
    timeLabel: dueLabel.kind === "neutral" && status
      ? status === "PENDING_APPROVAL"
        ? "in approvazione"
        : status === "NEEDS_REVISION"
          ? "da revisionare"
          : dueLabel.text
      : dueLabel.text,
    timeKind: dueLabel.kind === "expires" || dueLabel.kind === "overdue" ? dueLabel.kind : "neutral",
    occurredAt: occurredAt || new Date().toISOString(),
    lat: quote.lightPointId?.lat,
    lng: quote.lightPointId?.lng,
  }
}

/**
 * Score salute 0–100.
 * Parte da 100 e sottrae:
 * - priorità evento (critical 18, high 10, medium 5, low 2)
 * - scadenza overdue −8, soon −3
 * Poi clamp 0–100 e fascia label.
 */
export function computePlantHealthScore(events) {
  let score = 100
  let critical = 0
  let overdue = 0
  let soon = 0

  for (const event of events) {
    score -= PRIORITY_SCORE[event.priority] ?? 3
    if (event.dueStatus === "overdue") {
      score -= 8
      overdue += 1
    } else if (event.dueStatus === "soon") {
      score -= 3
      soon += 1
    }
    if (event.priority === "critical") critical += 1
  }

  score = Math.max(0, Math.min(100, Math.round(score)))

  let label = "Ottimo"
  let tone = "good"
  if (score < 40) {
    label = "Critico"
    tone = "critical"
  } else if (score < 65) {
    label = "Attenzione"
    tone = "warn"
  } else if (score < 85) {
    label = "Buono"
    tone = "ok"
  }

  return { score, label, tone, critical, overdue, soon, total: events.length }
}

/**
 * Timeline orizzontale per scadenze: posizione = data scadenza,
 * date sotto i pallini con spacing forzato anti-overlap.
 */
export function computeActivityTimeline(events, now = new Date(), minGapPercent = 12) {
  if (!events?.length) {
    return { activePercent: 0, signals: [], total: 0 }
  }

  const withDue = events
    .filter((e) => e.dueDate || e.daysRemaining != null)
    .map((event) => {
      const due = event.dueDate
        ? new Date(event.dueDate)
        : new Date(now.getTime() + (event.daysRemaining || 0) * 86400000)
      return { event, due }
    })
    .filter(({ due }) => !Number.isNaN(due.getTime()))
    .sort((a, b) => a.due.getTime() - b.due.getTime())

  if (!withDue.length) {
    return { activePercent: 0, signals: [], total: 0 }
  }

  const first = withDue[0].due
  const last = withDue[withDue.length - 1].due
  const startMs = first.getTime()
  const span = Math.max(last.getTime() - startMs, 1)

  const toPercent = (date) =>
    Math.max(0, Math.min(100, ((date.getTime() - startMs) / span) * 100))

  const formatDotDate = (date) =>
    date.toLocaleDateString("it-IT", { day: "2-digit", month: "short" })

  const raw = withDue.map(({ event, due }) => ({
    id: event.id,
    title: event.title,
    type: event.type,
    color: PLANT_EVENT_TYPES[event.type]?.timelineColor || "#f97316",
    naturalPercent: toPercent(due),
    percent: toPercent(due),
    dateLabel: formatDotDate(due),
    dueStatus: event.dueStatus,
    daysRemaining: event.daysRemaining,
  }))

  // Spacing uniforme se non entra il gap minimo per le etichette data
  const n = raw.length
  const needed = n <= 1 ? 0 : (n - 1) * minGapPercent
  if (n === 1) {
    raw[0].percent = 50
  } else if (needed >= 100) {
    const step = 100 / (n - 1)
    raw.forEach((s, i) => {
      s.percent = i * step
    })
  } else {
    for (let i = 1; i < n; i++) {
      const minPos = raw[i - 1].percent + minGapPercent
      if (raw[i].percent < minPos) raw[i].percent = minPos
    }
    if (raw[n - 1].percent > 100) {
      const step = 100 / (n - 1)
      raw.forEach((s, i) => {
        s.percent = i * step
      })
    }
  }

  // Stagger etichette su 2 righe se ancora troppo vicine (< minGap)
  for (let i = 0; i < raw.length; i++) {
    raw[i].labelRow = 0
  }
  for (let i = 1; i < raw.length; i++) {
    if (raw[i].percent - raw[i - 1].percent < minGapPercent * 0.85) {
      raw[i].labelRow = raw[i - 1].labelRow === 0 ? 1 : 0
    }
  }

  const lastPercent = raw[raw.length - 1]?.percent ?? 0

  return {
    activePercent: lastPercent,
    signals: raw.map((s) => ({
      id: s.id,
      percent: s.percent,
      color: s.color,
      title: s.title,
      dateLabel: s.dateLabel,
      labelRow: s.labelRow,
      dueStatus: s.dueStatus,
      count: 1,
    })),
    total: events.length,
  }
}

/** Ordina per tempo rimasto alla scadenza (più urgenti prima). */
export function sortEventsByDueRemaining(events) {
  return [...events].sort((a, b) => {
    const da = a.daysRemaining ?? Number.POSITIVE_INFINITY
    const db = b.daysRemaining ?? Number.POSITIVE_INFINITY
    if (da !== db) return da - db
    return String(a.title || "").localeCompare(String(b.title || ""), "it")
  })
}

export function isDueRelevant(event) {
  // Le sospese restano sempre visibili (anche oltre la soglia "soon"),
  // così non spariscono dalla timeline durante il periodo di attesa.
  if (event?.workflowStatus === "SUSPENDED") return true
  return event?.dueStatus === "overdue" || event?.dueStatus === "soon"
}

export function sortEventsByTimeline(events) {
  return sortEventsByDueRemaining(events)
}

export function formatTimelineTime(iso) {
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

const QUOTE_FEED_STATUSES = ["PENDING_APPROVAL", "NEEDS_REVISION"]

/**
 * Carica e unifica eventi impianto dalle API esistenti.
 */
export async function fetchPlantStatusEvents({
  api,
  townHallName = "",
  townHallNames = [],
}) {
  const towns =
    townHallName
      ? [townHallName]
      : (townHallNames || []).filter(Boolean)

  const extraordinaryParams = townHallName ? { townHallName } : {}
  const quotesParams = {
    status: QUOTE_FEED_STATUSES.join(","),
    ...(townHallName ? { townHallName } : {}),
  }

  const [extraRes, quotesRes, ...activeResults] = await Promise.all([
    api.get("/api/reports/extraordinary", { params: extraordinaryParams }),
    api.get("/api/quotes", { params: quotesParams }),
    ...towns.map((name) =>
      api
        .get("/api/reports/active", { params: { townHallName: name } })
        .then((res) => ({ name, data: res.data || [] }))
        .catch((err) => {
          console.error("active reports", name, err)
          return { name, data: [] }
        })
    ),
  ])

  const byId = new Map()

  for (const item of extraRes.data || []) {
    const event = mapExtraordinaryItem(item)
    byId.set(event.id, event)
  }

  for (const { name, data } of activeResults) {
    for (const item of data) {
      const event = mapActiveReportItem(item, name)
      if (!event) continue
      if (!byId.has(event.id)) byId.set(event.id, event)
    }
  }

  for (const quote of quotesRes.data || []) {
    if (!QUOTE_FEED_STATUSES.includes(quote.status)) continue
    const event = mapQuoteItem(quote)
    byId.set(event.id, event)
  }

  return [...byId.values()]
}

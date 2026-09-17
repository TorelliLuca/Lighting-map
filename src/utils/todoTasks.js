import {
  translateString,
  WORKFLOW_STATUS_LABELS,
  QUOTE_EDITABLE_STATUSES,
  canResolveExtraordinaryReport,
  MAINTENANCE_CATEGORY_LABELS,
} from "@/utils/utils"
import {
  computeDueFields,
  priorityFromReport,
  formatDueTimeLabel,
} from "@/utils/plantStatusEvents"

const INSPECTABLE = new Set(["OPEN", "CLASSIFICATION_PENDING"])
/** Stati post-sopralluogo su cui chiudere l'intervento ordinario. */
const OPERABLE_ORDINARY = new Set(["SUSPENDED", "SCHEDULED"])
const EDITABLE = new Set(QUOTE_EDITABLE_STATUSES)

export const TODO_CATEGORIES = {
  inspection: {
    id: "inspection",
    label: "Sopralluogo",
    plural: "Sopralluoghi",
    chipClass: "border-cyan-500/40 bg-cyan-500/15 text-cyan-100",
    accent: "cyan",
  },
  operation: {
    id: "operation",
    label: "Operazione",
    plural: "Operazioni",
    chipClass: "border-emerald-500/40 bg-emerald-500/15 text-emerald-100",
    accent: "emerald",
  },
  quote: {
    id: "quote",
    label: "Preventivo",
    plural: "Preventivi",
    chipClass: "border-violet-500/40 bg-violet-500/15 text-violet-100",
    accent: "violet",
  },
  consuntivo: {
    id: "consuntivo",
    label: "Consuntivo",
    plural: "Consuntivi",
    chipClass: "border-amber-500/40 bg-amber-500/15 text-amber-100",
    accent: "amber",
  },
}

export const SEVERITY_STYLES = {
  critical: "border-red-500/50 bg-red-500/20 text-red-100",
  high: "border-orange-500/50 bg-orange-500/20 text-orange-100",
  medium: "border-amber-500/40 bg-amber-500/15 text-amber-100",
  low: "border-slate-500/40 bg-slate-500/15 text-slate-200",
}

export const SEVERITY_LABELS = {
  critical: "Critica",
  high: "Alta",
  medium: "Media",
  low: "Bassa",
}

/** Colori cella calendario in base allo status scadenza più grave del giorno. */
export const CALENDAR_DAY_STYLES = {
  overdue: "bg-red-500/35 text-red-50 ring-1 ring-red-400/50",
  soon: "bg-amber-500/30 text-amber-50 ring-1 ring-amber-400/40",
  ok: "bg-emerald-500/25 text-emerald-50 ring-1 ring-emerald-400/35",
  start: "bg-sky-500/25 text-sky-50 ring-1 ring-sky-400/35",
  none: "bg-muted/40 text-muted-foreground",
}

const QUOTE_STATUS_LABELS = {
  DRAFT: "Bozza",
  REJECTED: "Respinto",
  NEEDS_REVISION: "Da revisionare",
}

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function toDateKey(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatEventTitle(baseTitle, poleNumber) {
  const title = (baseTitle || "Attività").trim()
  const pole = String(poleNumber || "").trim()
  if (!pole) return title
  if (title.includes(`PL ${pole}`) || title.includes(pole)) return title
  return `${title} · PL ${pole}`
}

function townNameFrom(item, fallback = "") {
  return (
    item.townHall?.name ||
    item.townHallName ||
    (typeof item.townHallId === "object" ? item.townHallId?.name : null) ||
    fallback ||
    ""
  )
}

function buildTaskBase({
  id,
  category,
  title,
  description,
  townHall,
  poleNumber,
  lightPointId,
  reportId,
  quoteId,
  riskClass,
  workflowStatus,
  quoteStatus,
  startDate,
  dueDate,
  lat,
  lng,
  meta = {},
}) {
  const { dueStatus, daysRemaining } = computeDueFields(dueDate)
  const severity = priorityFromReport({ risk_class: riskClass }, dueStatus)
  const dueLabel = formatDueTimeLabel({
    dueStatus,
    daysRemaining,
    occurredAt: startDate,
  })

  return {
    id,
    category,
    title,
    description: description || "",
    subtitle:
      meta.openLabel ||
      null,
    townHall,
    poleNumber: poleNumber || "",
    lightPointId: lightPointId || null,
    reportId: reportId || null,
    quoteId: quoteId || null,
    riskClass: riskClass || null,
    workflowStatus: workflowStatus || null,
    quoteStatus: quoteStatus || null,
    startDate: startDate || null,
    dueDate: dueDate || null,
    startKey: toDateKey(startDate),
    dueKey: toDateKey(dueDate),
    dueStatus,
    daysRemaining,
    severity,
    timeLabel: meta.openLabel || dueLabel.text,
    timeKind: dueLabel.kind,
    lat,
    lng,
    meta,
  }
}

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

function reportDueDate(report) {
  return (
    report?.due_date ||
    report?.scheduled_resolution_date ||
    suspensionEndDate(report) ||
    null
  )
}

function openDaysLabel(startDate) {
  if (!startDate) return { openDays: null, openLabel: null }
  const openDays = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    )
  )
  const openLabel =
    openDays === 0 ? "aperta oggi" : `aperta da ${openDays} gg`
  return { openDays, openLabel }
}

function isOperableReport(report) {
  if (!report || report.is_solved) return false
  if (report.maintenance_category === "EXTRAORDINARY") {
    return canResolveExtraordinaryReport(report)
  }
  return OPERABLE_ORDINARY.has(report.workflow_status || "OPEN")
}

function mapInspectionItem(item, townHallName) {
  const report = item.report || {}
  if (report.maintenance_category === "EXTRAORDINARY") return null
  const status = report.workflow_status || "OPEN"
  if (!INSPECTABLE.has(status)) return null

  const fault = report.fault_label || report.report_type || ""
  const startDate = report.report_date || report.createdAt
  const dueDate = reportDueDate(report)
  const pole = item.lightPoint?.numero_palo
  const poleLabel = pole ? `PL ${pole}` : "punto luce"
  const { openDays, openLabel } = openDaysLabel(startDate)

  return buildTaskBase({
    id: `inspection-${report._id}`,
    category: "inspection",
    title: `Sopralluogo da effettuare presso ${poleLabel}`,
    description: report.description || "",
    townHall: townHallName || townNameFrom(item),
    poleNumber: pole,
    lightPointId: item.lightPoint?._id,
    reportId: report._id,
    riskClass: report.risk_class,
    workflowStatus: status,
    startDate,
    dueDate,
    lat: item.lightPoint?.lat,
    lng: item.lightPoint?.lng,
    meta: {
      workflowLabel: WORKFLOW_STATUS_LABELS[status] || status,
      faultLabel: translateString(fault),
      address: item.lightPoint?.indirizzo || "",
      openDays,
      openLabel,
      highlight: true,
    },
  })
}

function mapOperationItem(item, townHallName) {
  const report = item.report || {}
  if (!isOperableReport(report)) return null

  const isExtraordinary = report.maintenance_category === "EXTRAORDINARY"
  const status = report.workflow_status || "OPEN"
  const fault = report.fault_label || report.report_type || ""
  const startDate = report.report_date || report.createdAt
  const dueDate = reportDueDate(report)
  const pole = item.lightPoint?.numero_palo
  const poleLabel = pole ? `PL ${pole}` : "punto luce"
  const { openDays, openLabel } = openDaysLabel(startDate)
  const categoryLabel = isExtraordinary ? "straordinario" : "ordinario"

  return buildTaskBase({
    id: `operation-${report._id}`,
    category: "operation",
    title: `Intervento ${categoryLabel} da effettuare presso ${poleLabel}`,
    description: report.description || report.suspension?.reason || "",
    townHall: townHallName || townNameFrom(item),
    poleNumber: pole,
    lightPointId: item.lightPoint?._id,
    reportId: report._id,
    riskClass: report.risk_class,
    workflowStatus: status,
    startDate,
    dueDate,
    lat: item.lightPoint?.lat,
    lng: item.lightPoint?.lng,
    meta: {
      workflowLabel: WORKFLOW_STATUS_LABELS[status] || status,
      faultLabel: translateString(fault),
      address: item.lightPoint?.indirizzo || "",
      openDays,
      openLabel,
      maintenanceCategory: isExtraordinary ? "EXTRAORDINARY" : "ORDINARY",
      maintenanceLabel:
        MAINTENANCE_CATEGORY_LABELS[
          isExtraordinary ? "EXTRAORDINARY" : "ORDINARY"
        ],
      suspensionReason: report.suspension?.reason || null,
      suspensionDays: report.suspension?.days ?? null,
    },
  })
}

function mapQuoteOrConsuntivo(doc, category) {
  if (!EDITABLE.has(doc.status)) return null

  const pole =
    (typeof doc.lightPointId === "object" && doc.lightPointId?.numero_palo) || ""
  const townHall =
    (typeof doc.townHallId === "object" && doc.townHallId?.name) ||
    doc.townHallName ||
    ""
  const report = typeof doc.reportId === "object" ? doc.reportId : null
  const startDate = doc.createdAt || doc.updatedAt
  const dueDate = doc.dueDate || doc.due_date || null
  const risk = doc.priorityClass || report?.risk_class || null
  const label =
    category === "consuntivo"
      ? doc.protocolNumber
        ? `Consuntivo ${doc.protocolNumber}`
        : "Consuntivo da compilare"
      : doc.protocolNumber
        ? `Preventivo ${doc.protocolNumber}`
        : "Preventivo da completare"

  return buildTaskBase({
    id: `${category}-${doc._id}`,
    category,
    title: formatEventTitle(label, pole),
    description:
      report?.description ||
      (QUOTE_STATUS_LABELS[doc.status]
        ? `Stato: ${QUOTE_STATUS_LABELS[doc.status]}`
        : ""),
    townHall,
    poleNumber: pole,
    lightPointId: doc.lightPointId?._id || doc.lightPointId,
    reportId: report?._id || doc.reportId,
    quoteId: doc._id,
    riskClass: risk,
    quoteStatus: doc.status,
    startDate,
    dueDate,
    lat: doc.lightPointId?.lat,
    lng: doc.lightPointId?.lng,
    meta: {
      statusLabel: QUOTE_STATUS_LABELS[doc.status] || doc.status,
      protocolNumber: doc.protocolNumber || null,
      totalNet: doc.totals?.totalNet ?? doc.totalNet ?? null,
      parentQuoteId: doc.parentQuoteId || null,
      address:
        (typeof doc.lightPointId === "object" && doc.lightPointId?.indirizzo) ||
        "",
      updatedAt: doc.updatedAt || null,
    },
  })
}

export function sortTodoTasks(tasks) {
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  return [...tasks].sort((a, b) => {
    const da = a.daysRemaining ?? Number.POSITIVE_INFINITY
    const db = b.daysRemaining ?? Number.POSITIVE_INFINITY
    if (da !== db) return da - db
    const sa = severityOrder[a.severity] ?? 9
    const sb = severityOrder[b.severity] ?? 9
    if (sa !== sb) return sa - sb
    return String(a.title || "").localeCompare(String(b.title || ""), "it")
  })
}

/**
 * Filtra per vista giorno / settimana / tutti.
 * Le scadenze overdue restano sempre visibili in "oggi" e "settimana".
 */
export function filterTasksByRange(tasks, range = "week", reference = new Date()) {
  if (range === "all") return tasks

  const today = startOfDay(reference)
  const todayKey = toDateKey(today)

  if (range === "day") {
    return tasks.filter((t) => {
      if (t.dueStatus === "overdue") return true
      if (t.dueKey === todayKey || t.startKey === todayKey) return true
      return false
    })
  }

  // week: lun–dom della settimana corrente
  const day = today.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() + mondayOffset)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  return tasks.filter((t) => {
    if (t.dueStatus === "overdue") return true
    const keys = [t.dueKey, t.startKey].filter(Boolean)
    return keys.some((key) => {
      const d = startOfDay(key)
      return d >= weekStart && d <= weekEnd
    })
  })
}

export function filterTasksByCategory(tasks, category) {
  if (!category || category === "all") return tasks
  return tasks.filter((t) => t.category === category)
}

export function filterTasksBySelectedDay(tasks, dayKey) {
  if (!dayKey) return tasks
  return tasks.filter((t) => t.dueKey === dayKey || t.startKey === dayKey)
}

/**
 * Aggrega per giorno: worst dueStatus + count.
 * Preferisce overdue > soon > ok; se solo startDate → "start".
 */
export function buildCalendarDayMap(tasks) {
  const map = new Map()
  const rank = { overdue: 0, soon: 1, ok: 2, start: 3, none: 4 }

  const bump = (key, status, isDue) => {
    if (!key) return
    const prev = map.get(key) || { count: 0, status: "none", dueCount: 0, startCount: 0 }
    prev.count += 1
    if (isDue) prev.dueCount += 1
    else prev.startCount += 1
    const nextStatus = isDue ? status : status === "none" ? "start" : status
    if ((rank[nextStatus] ?? 9) < (rank[prev.status] ?? 9)) {
      prev.status = nextStatus
    } else if (prev.status === "none" && nextStatus === "start") {
      prev.status = "start"
    }
    map.set(key, prev)
  }

  for (const task of tasks) {
    if (task.dueKey) bump(task.dueKey, task.dueStatus || "none", true)
    if (task.startKey && task.startKey !== task.dueKey) {
      bump(task.startKey, "start", false)
    }
  }

  return map
}

export function countByCategory(tasks) {
  const counts = {
    all: tasks.length,
    inspection: 0,
    operation: 0,
    quote: 0,
    consuntivo: 0,
  }
  for (const t of tasks) {
    if (counts[t.category] != null) counts[t.category] += 1
  }
  return counts
}

/**
 * Carica todo manutentore: sopralluoghi + operazioni chiudibili (anche ordinarie)
 * + preventivi editabili + consuntivi editabili.
 * Esclude PENDING_APPROVAL (coda DEC).
 */
export async function fetchTodoTasks({ api, townHallName }) {
  if (!townHallName) return []

  const [activeRes, quotesRes, consuntiviRes] = await Promise.all([
    api.get("/api/reports/active", { params: { townHallName } }),
    api.get("/api/quotes", {
      params: {
        townHallName,
        type: "QUOTE",
        status: QUOTE_EDITABLE_STATUSES.join(","),
      },
    }),
    api.get("/api/quotes", {
      params: {
        townHallName,
        type: "CONSUNTIVO",
        status: QUOTE_EDITABLE_STATUSES.join(","),
      },
    }),
  ])

  const tasks = []

  for (const item of activeRes.data || []) {
    const inspection = mapInspectionItem(item, townHallName)
    if (inspection) tasks.push(inspection)

    const operation = mapOperationItem(item, townHallName)
    if (operation) tasks.push(operation)
  }

  for (const doc of quotesRes.data || []) {
    const task = mapQuoteOrConsuntivo(doc, "quote")
    if (task) tasks.push(task)
  }

  for (const doc of consuntiviRes.data || []) {
    const task = mapQuoteOrConsuntivo(doc, "consuntivo")
    if (task) tasks.push(task)
  }

  return sortTodoTasks(tasks)
}

export { toDateKey, startOfDay }

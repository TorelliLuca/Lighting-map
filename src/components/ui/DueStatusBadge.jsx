"use client"

export const DUE_LABELS = {
  overdue: "Scaduta",
  soon: "In scadenza",
  ok: "Nei tempi",
  none: "Senza scadenza",
}

export const DUE_STATUS_CLASSES = {
  overdue: "bg-red-500/20 text-red-200 border-red-500/40",
  soon: "bg-amber-500/20 text-amber-200 border-amber-500/40",
  ok: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
  none: "bg-slate-500/20 text-slate-200 border-slate-500/40",
}

const DUE_SORT_ORDER = { overdue: 0, soon: 1, ok: 2, none: 3 }

export function compareDueUrgency(a, b) {
  const orderA = DUE_SORT_ORDER[a] ?? 3
  const orderB = DUE_SORT_ORDER[b] ?? 3
  if (orderA !== orderB) return orderA - orderB
  return 0
}

export const DueStatusBadge = ({
  dueStatus = "none",
  daysRemaining = null,
  showDate = false,
  dueDate = null,
  className = "",
}) => {
  const status = DUE_STATUS_CLASSES[dueStatus] ? dueStatus : "none"
  const label = DUE_LABELS[status] || "—"

  let text = label
  if (showDate && dueDate) {
    text = `${new Date(dueDate).toLocaleDateString("it-IT")}${
      daysRemaining != null ? ` (${daysRemaining} gg)` : ""
    }`
  } else if (daysRemaining != null) {
    text = `${daysRemaining} gg — ${label}`
  }

  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-md border text-xs ${DUE_STATUS_CLASSES[status]} ${className}`}
    >
      {text}
    </span>
  )
}

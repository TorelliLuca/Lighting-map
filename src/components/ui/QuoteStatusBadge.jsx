"use client"

import { QUOTE_STATUS_LABELS } from "../../utils/utils"

const QUOTE_STATUS_CLASSES = {
  DRAFT: "bg-slate-500/20 text-slate-200 border-slate-500/40",
  PENDING_APPROVAL: "bg-amber-500/20 text-amber-100 border-amber-500/30",
  APPROVED: "bg-emerald-500/20 text-emerald-100 border-emerald-500/30",
  REJECTED: "bg-red-500/20 text-red-200 border-red-500/40",
  NEEDS_REVISION: "bg-amber-500/20 text-amber-100 border-amber-500/40",
}

export const QuoteStatusBadge = ({ status, className = "" }) => {
  if (!status) return null

  const label = QUOTE_STATUS_LABELS[status] || status
  const styles = QUOTE_STATUS_CLASSES[status] || "bg-blue-500/20 text-blue-100 border-blue-500/30"

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md border text-xs ${styles} ${className}`}>
      {label}
    </span>
  )
}

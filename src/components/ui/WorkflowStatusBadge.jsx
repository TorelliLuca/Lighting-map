"use client"

import { WORKFLOW_STATUS_LABELS } from "../../utils/utils"

const WORKFLOW_STATUS_CLASSES = {
  OPEN: "bg-blue-500/20 text-blue-100 border-blue-500/30",
  CLASSIFICATION_PENDING: "bg-violet-500/20 text-violet-100 border-violet-500/30",
  SURVEYED: "bg-cyan-500/20 text-cyan-100 border-cyan-500/30",
  SUSPENDED: "bg-slate-500/20 text-slate-200 border-slate-500/40",
  SCHEDULED: "bg-indigo-500/20 text-indigo-100 border-indigo-500/30",
  PENDING_QUOTE: "bg-amber-500/20 text-amber-100 border-amber-500/30",
  ESCALATED: "bg-orange-500/20 text-orange-100 border-orange-500/30",
  RESOLVED: "bg-emerald-500/20 text-emerald-100 border-emerald-500/30",
}

export const WorkflowStatusBadge = ({ status, className = "" }) => {
  if (!status) return <span className="text-blue-100/60">—</span>

  const label = WORKFLOW_STATUS_LABELS[status] || status
  const styles = WORKFLOW_STATUS_CLASSES[status] || "bg-blue-500/20 text-blue-100 border-blue-500/30"

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md border text-xs ${styles} ${className}`}>
      {label}
    </span>
  )
}

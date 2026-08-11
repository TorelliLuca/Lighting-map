"use client"

/** Colori per urgenza capitolato: A massima → D bassa. */
export const RISK_CLASS_STYLES = {
  A: "bg-red-500/20 text-red-100 border-red-500/40",
  B: "bg-orange-500/20 text-orange-100 border-orange-500/40",
  C: "bg-amber-500/20 text-amber-100 border-amber-500/40",
  D: "bg-slate-500/20 text-slate-200 border-slate-500/40",
}

const FALLBACK = "bg-blue-500/20 text-blue-100 border-blue-500/30"

export const RiskClassBadge = ({
  riskClass,
  prefix = false,
  className = "",
}) => {
  const code = String(riskClass || "").trim().toUpperCase()
  if (!code) {
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-md border text-xs ${FALLBACK} ${className}`}>
        —
      </span>
    )
  }

  const styles = RISK_CLASS_STYLES[code] || FALLBACK
  const label = prefix ? `Classe ${code}` : code

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md border text-xs ${styles} ${className}`}>
      {label}
    </span>
  )
}

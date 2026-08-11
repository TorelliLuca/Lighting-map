"use client"

/**
 * Chip discreto per capitolato attivo in scadenza / scaduto.
 * Non espone storico versioni — solo avviso all'utente operativo.
 */
export const CapitolatoValidityChip = ({ validity, className = "" }) => {
  if (!validity || (!validity.isExpiringSoon && !validity.isExpired)) {
    return null
  }

  const expired = Boolean(validity.isExpired)
  const days = validity.daysRemaining
  const label = expired
    ? "Capitolato scaduto"
    : days != null
      ? `Capitolato in scadenza (${days} gg)`
      : "Capitolato in scadenza"

  const styles = expired
    ? "bg-red-500/20 text-red-200 border-red-500/40"
    : "bg-amber-500/20 text-amber-200 border-amber-500/40"

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs font-medium ${styles} ${className}`}
      title={
        validity.validTo
          ? `Scadenza: ${new Date(validity.validTo).toLocaleDateString("it-IT")}`
          : undefined
      }
    >
      {label}
    </span>
  )
}

export default CapitolatoValidityChip

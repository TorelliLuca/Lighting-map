"use client"

import { GlassSelect } from "./GlassSelect"
import { UDM_OPTIONS, formatUdmLabel, normalizeUdm } from "../../utils/udm"

/** Stile compatto allineato alle celle preventivo / BOM. */
const DEFAULT_COMPACT_CLASS =
  "w-auto bg-black/30 border-blue-500/20 rounded-lg px-2.5 py-1.5 text-xs min-h-9"

/**
 * Select U.M. basata su GlassSelect.
 * Valori canonici mq/mc; label UI con esponenti (m²/m³). Nessun truncate sul testo.
 */
export function UdmSelect({
  value,
  onChange,
  disabled = false,
  className = "",
  id,
  "aria-label": ariaLabel = "Unità di misura",
  openUpward = false,
  maxVisible = 6,
}) {
  const normalized = normalizeUdm(value) || "cad"

  return (
    <GlassSelect
      id={id}
      value={normalized}
      onChange={onChange}
      options={UDM_OPTIONS}
      disabled={disabled}
      aria-label={ariaLabel}
      placeholder="U.M."
      openUpward={openUpward}
      maxVisible={maxVisible}
      className={className || DEFAULT_COMPACT_CLASS}
      wrapperClassName="w-auto min-w-[5.75rem] inline-block"
      truncateLabel={false}
      title={formatUdmLabel(normalized)}
    />
  )
}

export default UdmSelect

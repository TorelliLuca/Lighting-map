import { GlassSelect } from "./GlassSelect"

/**
 * Select per i controlli mappa: apre verso l'alto, z-index sopra i layer mappa.
 * Stile e comportamento ereditati da GlassSelect.
 */
export function MapControlSelect({
  openUpward = true,
  maxVisible = 5,
  zIndex = 10060,
  ...props
}) {
  return (
    <GlassSelect
      openUpward={openUpward}
      maxVisible={maxVisible}
      zIndex={zIndex}
      {...props}
    />
  )
}

export default MapControlSelect

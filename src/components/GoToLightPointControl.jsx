import { MapPin } from "lucide-react"
import toast from "react-hot-toast"

/** Coordinate utilizzabili per focus mappa (come in Quote.jsx). */
export const lightPointHasCoords = (lightPoint) =>
  Boolean(
    lightPoint
    && lightPoint.lat != null
    && lightPoint.lat !== ""
    && lightPoint.lng != null
    && lightPoint.lng !== "",
  )

/**
 * Naviga alla dashboard centrando/aprendo il punto luce.
 * Stesso contratto di Quote.jsx: focusLat, focusLng, focusPalo.
 */
export const goToLightPointOnMap = (navigate, { comune, lightPoint }) => {
  if (!comune || !lightPointHasCoords(lightPoint)) {
    toast.error("Coordinate del punto luce non disponibili.")
    return false
  }
  navigate("/dashboard", {
    state: {
      comune,
      focusLat: String(lightPoint.lat),
      focusLng: String(lightPoint.lng),
      focusPalo: String(lightPoint.numero_palo || ""),
    },
  })
  return true
}

/** Numero PL cliccabile con icona mappa (pattern Quote.jsx). */
export const LightPointMapLink = ({
  lightPoint,
  comune,
  navigate,
  prefix = "",
  className = "",
}) => {
  const label = lightPoint?.numero_palo || "—"
  const canGo = Boolean(comune && lightPointHasCoords(lightPoint))

  if (!canGo) {
    return (
      <span className={className}>
        {prefix}{label}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => goToLightPointOnMap(navigate, { comune, lightPoint })}
      title="Centra la mappa sul punto luce"
      className={`inline-flex items-center gap-1 text-blue-300 hover:text-blue-100 underline underline-offset-2 cursor-pointer transition-colors duration-150 ${className}`}
    >
      <span>
        {prefix}{label}
      </span>
      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    </button>
  )
}

/** Pulsante azione esplicito "Vai al punto" (liste / card). */
export const GoToLightPointButton = ({
  lightPoint,
  comune,
  navigate,
  className = "",
}) => {
  const canGo = Boolean(comune && lightPointHasCoords(lightPoint))

  return (
    <button
      type="button"
      disabled={!canGo}
      onClick={() => goToLightPointOnMap(navigate, { comune, lightPoint })}
      title={canGo ? "Centra la mappa sul punto luce" : "Coordinate non disponibili"}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-100 border border-blue-500/30 min-h-11 text-sm cursor-pointer transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Vai al punto
    </button>
  )
}

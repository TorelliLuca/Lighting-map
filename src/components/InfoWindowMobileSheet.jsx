"use client"

import { createPortal } from "react-dom"
import InfoWindow from "./InfoWindow"
import {
  buildInfoWindowContent,
  INFO_WINDOW_MOBILE_MQ,
} from "../utils/infoWindowActions"
import { useMediaQuery } from "../hooks/useMediaQuery"

/**
 * Bottom sheet mobile per i dettagli marker.
 * Su viewport >= 640px non renderizza nulla (usa il popup nativo della mappa).
 */
export const InfoWindowMobileSheet = ({
  marker,
  city,
  userData,
  onClose,
  onEditClick,
  onDeleteClick,
  onBeforeReport,
  mapType,
  onSetParentClick,
  onClearParentClick,
  topologyPower = null,
}) => {
  const isMobile = useMediaQuery(INFO_WINDOW_MOBILE_MQ)

  if (!isMobile || !marker || typeof document === "undefined") {
    return null
  }

  const content = buildInfoWindowContent(marker)

  return createPortal(
    <div className="fixed inset-0 z-[10040] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Chiudi pannello"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <div
        className="relative z-10 animate-[slideUp_0.22s_ease-out] px-0"
        role="dialog"
        aria-modal="true"
        aria-label="Dettagli punto luce"
      >
        <InfoWindow
          variant="sheet"
          content={content}
          marker={marker}
          city={city}
          userData={userData}
          onEditClick={onEditClick}
          onDeleteClick={onDeleteClick}
          onBeforeReport={onBeforeReport}
          mapType={mapType}
          idMarker={marker._id}
          onClose={onClose}
          onSetParentClick={onSetParentClick}
          onClearParentClick={onClearParentClick}
          topologyPower={topologyPower}
        />
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0.6; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body,
  )
}

export default InfoWindowMobileSheet

"use client"
import { useRef, useState } from "react"
import {
  clearBlanket,
  translateString,
  transformDateToIT,
  listIgnoratedFieldsPL,
  listIgnoratedFieldsQE,
  orderInfoWindowEntries,
} from "../utils/utils"
import { canSeeTopologyAnomalies, toIdString } from "../utils/topologyLines"
import {
  MapPin,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  X,
  Trash,
  ArrowDown,
  Cable,
  Unplug,
  TriangleAlert,
  Copy,
} from "lucide-react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import {
  INFO_WINDOW_ACTIONS,
  getVisibleActions,
  getPrimaryAction,
  getSecondaryActions,
  getOverflowActions,
} from "../utils/infoWindowActions"
import { InfoWindowOverflowMenu } from "./InfoWindowOverflowMenu"

const cn = (...inputs) => twMerge(clsx(inputs))

const POPUP_SHELL =
  "content-container relative w-[min(calc(100vw-1.5rem),380px)] max-w-md  border border-transparent bg-white text-slate-900 "

/** Solo popup Google: altezza fissa sull’area scroll, barra azioni in flusso (no flex-1). */
const POPUP_SCROLL_CLASS =
  "max-h-[min(45vh,320px)] overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400"

const SHEET_SHELL =
  "content-container relative flex h-full w-full flex-col overflow-hidden rounded-t-2xl bg-white text-slate-900 shadow-2xl"

const SHEET_DISMISS_THRESHOLD = 110
const SHEET_EXPAND_THRESHOLD = -55
const SHEET_MAX_DRAG_UP = -100

const SHEET_SCROLL_CLASS =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400"

const LABEL_CLASS = "text-xs font-semibold uppercase tracking-wide text-slate-500"
const VALUE_CLASS = "text-sm text-slate-800"
const TITLE_CLASS = "text-base font-semibold text-blue-900 sm:text-lg uppercase"

const ACTION_STYLES = {
  operazione: "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800",
  segnala: "border-amber-700 bg-amber-600 text-white hover:bg-amber-700",
  streetview: "border-slate-300 bg-white text-slate-800 hover:bg-slate-100",
  goto: "border-blue-700 bg-blue-700 text-white hover:bg-blue-800",
  modifica: "border-slate-300 bg-white text-slate-800 hover:bg-slate-100",
  set_parent: "border-slate-300 bg-white text-slate-800 hover:bg-slate-100",
  clear_parent: "border-slate-300 bg-white text-slate-800 hover:bg-slate-100",
}

const SECONDARY_STYLE =
  "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"

const iconClass = "h-5 w-5 shrink-0"

const renderFieldRow = (key, label, value, isTitle = false) => (
  <div
    key={key}
    className={cn(
      "rounded-lg border border-white  px-1 py-1",
      isTitle,
    )}
  >
    {isTitle ? (
      <p className={TITLE_CLASS}>{value}</p>
    ) : (
      <>
        <p className={LABEL_CLASS}>{label}</p>
        <p className={cn(VALUE_CLASS, "mt-0.5 break-words")}>{value}</p>
      </>
    )}
  </div>
)

const renderHistoryDetails = (key, dateString, typeLabel, body) => (
  <details key={key} className="group overflow-hidden rounded-lg border border-slate-200 bg-white">
    <summary className="cursor-pointer list-none px-3 py-2 text-sm transition-colors hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="font-medium text-blue-700">{dateString}</span>
          <span className="text-slate-500"> · </span>
          <span className="text-slate-700">{typeLabel}</span>
        </div>
        <span className="shrink-0 text-xs text-slate-400 transition-transform group-open:rotate-180">
          <ArrowDown className="h-4 w-4" />
        </span>
      </div>
    </summary>
    <div className="border-t border-slate-100 px-3 py-2 text-sm leading-relaxed text-slate-600">
      {body}
    </div>
  </details>
)

const InfoWindow = ({
  content,
  marker,
  city,
  userData,
  onEditClick,
  onDeleteClick,
  onDuplicateClick,
  mapType,
  onBeforeReport,
  idMarker,
  variant = "popup",
  onClose,
  onSetParentClick,
  onClearParentClick,
  topologyPower = null,
}) => {
  // Prop mantenuta per compatibilità API caller; Elimina non è più in UI primaria
  void onDeleteClick
  const handleToggleStreetView = () => {
    if (mapType === "maplibre") {
      window.open(
        `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${marker.lat},${marker.lng}`,
        "_blank",
      )
    }
    if (typeof window.toggleStreetView === "function") {
      window.toggleStreetView(marker.lat, marker.lng)
    } else {
      console.error("Street View functionality not initialized")
    }
  }

  const handleNavigateToLocation = () => {
    window.navigateToLocation(marker.lat, marker.lng)
  }

  const handleStartOperation = () => {
    window.startOperation(city, clearBlanket(marker.numero_palo), marker.lat, marker.lng)
  }

  const handleReportPoint = () => {
    if (onBeforeReport) {
      onBeforeReport({
        city,
        id: idMarker,
      })
    } else {
      window.reportPoint(city, idMarker)
    }
  }

  const handleEditClick = () => {
    if (onEditClick) {
      onEditClick(marker)
    }
  }

  const handleDeleteClick = () => {
    if (onDeleteClick) {
      onDeleteClick(marker)
    }
  }

  const handleSetParent = () => {
    if (onSetParentClick) onSetParentClick(marker)
  }

  const handleDuplicateClick = () => {
    if (onDuplicateClick) {
      onDuplicateClick(marker)
    }
  }

  const handleClearParent = () => {
    if (onClearParentClick) onClearParentClick(marker)
  }

  const handlers = {
    operazione: handleStartOperation,
    segnala: handleReportPoint,
    streetview: handleToggleStreetView,
    goto: handleNavigateToLocation,
    modifica: handleEditClick,
    elimina: handleDeleteClick,
    duplica: handleDuplicateClick,
    set_parent: handleSetParent,
    clear_parent: handleClearParent,
  }

  const icons = {
    operazione: <CheckCircle2 className={iconClass} strokeWidth={2} aria-hidden="true" />,
    segnala: <AlertTriangle className={iconClass} strokeWidth={2} aria-hidden="true" />,
    streetview: <MapPin className={iconClass} strokeWidth={2} aria-hidden="true" />,
    goto: <Navigation className={iconClass} strokeWidth={2} aria-hidden="true" />,
    modifica: <Pencil className={iconClass} strokeWidth={2} aria-hidden="true" />,
    elimina: <Trash className={iconClass} strokeWidth={2} aria-hidden="true" />,
    duplica: <Copy className={iconClass} strokeWidth={2} aria-hidden="true" />,
    set_parent: <Cable className={iconClass} strokeWidth={2} aria-hidden="true" />,
    clear_parent: <Unplug className={iconClass} strokeWidth={2} aria-hidden="true" />,
  }

  const userRole = userData?.user_type
  const showUnlinkedNote =
    canSeeTopologyAnomalies(userData) &&
    marker?.marker === "PL" &&
    !marker?.is_differente_group &&
    !toIdString(marker?.parent ?? content?.parent)
  const visibleActions = getVisibleActions(INFO_WINDOW_ACTIONS, userRole, marker)
  const primaryAction = getPrimaryAction(visibleActions, userRole)
  const secondaryActions = getSecondaryActions(visibleActions, primaryAction)
  const overflowActions = getOverflowActions(
    visibleActions,
    primaryAction,
    secondaryActions,
  )

  const toRenderable = (action, styleOverride) => ({
    ...action,
    onClick: handlers[action.id],
    icon: icons[action.id],
    className: styleOverride || ACTION_STYLES[action.id],
  })

  const primaryBtn = primaryAction ? toRenderable(primaryAction) : null
  const secondaryBtns = secondaryActions.map((a) =>
    toRenderable(a, SECONDARY_STYLE),
  )
  const overflowItems = overflowActions.map((a) => toRenderable(a))

  const renderActionBar = () => (
    <div className="border-t border-slate-200 bg-white p-2 sm:p-2.5">
      <div className="flex items-stretch gap-2">
        {primaryBtn && (
          <button
            type="button"
            onClick={primaryBtn.onClick}
            title={primaryBtn.title}
            className={cn(
              "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              primaryBtn.className,
            )}
          >
            {primaryBtn.icon}
            <span>{primaryBtn.label}</span>
          </button>
        )}
        {secondaryBtns.map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={btn.onClick}
            title={btn.title}
            className={cn(
              "inline-flex min-h-11 min-w-11 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              btn.className,
            )}
          >
            {btn.icon}
            <span>{btn.label}</span>
          </button>
        ))}
        <InfoWindowOverflowMenu items={overflowItems} />
      </div>
    </div>
  )

  const renderContentFields = () =>
    orderInfoWindowEntries(content)
      .filter(([, value]) => !Array.isArray(value) || value.length > 0)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return (
            <div className="space-y-2" key={key}>
              <p className={LABEL_CLASS}>{key.replace(/_/g, " ")}</p>
              <ul className="space-y-2">
                {value.reverse().map((item, index) => {
                  if (item.report_type) {
                    const dateString = transformDateToIT(item.report_date)
                    return (
                      <li key={`${key}-report-${index}`}>
                        {renderHistoryDetails(
                          `${key}-report-${index}`,
                          dateString,
                          translateString(item.report_type).replace(/_/g, " "),
                          item.description,
                        )}
                      </li>
                    )
                  } else if (item.operation_type) {
                    const dateString = transformDateToIT(item.operation_date)
                    return (
                      <li key={`${key}-op-${index}`}>
                        {renderHistoryDetails(
                          `${key}-op-${index}`,
                          dateString,
                          translateString(item.operation_type).replace(/_/g, " "),
                          item.note,
                        )}
                      </li>
                    )
                  } else {
                    return (
                      <li
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                        key={`${key}-item-${index}`}
                      >
                        {translateString(item).replace(/_/g, " ")}
                      </li>
                    )
                  }
                })}
              </ul>
            </div>
          )
        } else {
          if (marker.marker === "PL") {
            if (listIgnoratedFieldsPL.includes(key)) return null
            if (key === "marker") {
              value = "Punto luce"
              return renderFieldRow(key, null, value, true)
            } else if (key === "data_creazione") {
              return renderFieldRow(
                key,
                key.replace(/_/g, " "),
                transformDateToIT(value) || "N.D.",
              )
            }
            return renderFieldRow(key, key.replace(/_/g, " "), value || "N.D.")
          } else {
            if (listIgnoratedFieldsQE.includes(key)) return null
            if (key === "marker") {
              value = "Quadro elettrico"
              return renderFieldRow(key, null, value, true)
            } else if (key === "data_creazione") {
              return renderFieldRow(
                key,
                key.replace(/_/g, " "),
                transformDateToIT(value) || "N.D.",
              )
            }
            if (key === "numero_palo") {
              key = "Numero quadro"
              return renderFieldRow(key, key.replace(/_/g, " "), value || "N.D.")
            } else {
              return renderFieldRow(key, key.replace(/_/g, " "), value || "N.D.")
            }
          }
        }
      })

  const isSheet = variant === "sheet"
  const [sheetOffsetY, setSheetOffsetY] = useState(0)
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [isDraggingSheet, setIsDraggingSheet] = useState(false)
  const isDraggingSheetRef = useRef(false)
  const sheetDragStartY = useRef(0)
  const sheetDragStartOffset = useRef(0)

  const handleSheetDragStart = (event) => {
    isDraggingSheetRef.current = true
    setIsDraggingSheet(true)
    sheetDragStartY.current = event.clientY
    sheetDragStartOffset.current = sheetOffsetY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleSheetDragMove = (event) => {
    if (!isDraggingSheetRef.current) return
    const delta = event.clientY - sheetDragStartY.current
    const maxUp = sheetExpanded ? -24 : SHEET_MAX_DRAG_UP
    const nextOffset = Math.max(maxUp, sheetDragStartOffset.current + delta)
    setSheetOffsetY(nextOffset)
  }

  const handleSheetDragEnd = () => {
    if (!isDraggingSheetRef.current) return
    isDraggingSheetRef.current = false
    setIsDraggingSheet(false)

    if (sheetOffsetY > SHEET_DISMISS_THRESHOLD) {
      setSheetOffsetY(window.innerHeight)
      window.setTimeout(() => onClose?.(), 220)
      return
    }

    if (sheetOffsetY < SHEET_EXPAND_THRESHOLD) {
      setSheetExpanded(true)
      setSheetOffsetY(0)
      return
    }

    setSheetExpanded(false)
    setSheetOffsetY(0)
  }

  const shellClass = isSheet
    ? cn(SHEET_SHELL, sheetExpanded ? "max-h-[94vh]" : "max-h-[85vh]")
    : POPUP_SHELL
  const scrollClass = isSheet ? SHEET_SCROLL_CLASS : POPUP_SCROLL_CLASS
  const hasContent = content && Object.keys(content).length > 0

  return (
    <div
      className={shellClass}
      style={
        isSheet
          ? {
              transform: `translateY(${sheetOffsetY}px)`,
              transition: isDraggingSheet
                ? "none"
                : "transform 0.25s ease-out, max-height 0.25s ease-out",
            }
          : undefined
      }
    >
      {isSheet && (
        <div
          className="relative flex shrink-0 touch-none cursor-grab items-center justify-center px-3 py-2 active:cursor-grabbing"
          onPointerDown={handleSheetDragStart}
          onPointerMove={handleSheetDragMove}
          onPointerUp={handleSheetDragEnd}
          onPointerCancel={handleSheetDragEnd}
          aria-label="Trascina per spostare il pannello"
        >
          <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300" aria-hidden="true" />
          {onClose && (
            <button
              type="button"
              aria-label="Chiudi dettagli"
              onClick={onClose}
              onPointerDown={(event) => event.stopPropagation()}
              className="absolute right-2 top-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
      <div
        className={cn(
          scrollClass,
          !hasContent && "flex items-center justify-center",
          hasContent && "space-y-2 sm:space-y-2.5",
        )}
      >
        {hasContent ? (
          <>
            {showUnlinkedNote && (
              <>
              
              <div
                className="rounded-lg border border-orange-300/70 bg-orange-50 px-3 py-2 text-sm text-orange-900 flex items-center gap-2"
                role="status"
              >
              <TriangleAlert className="h-5 w-5 text-orange-500 " />
                Nessuna linea elettrica collegata.
              </div>
              </>
            )}
            {canSeeTopologyAnomalies(userData) && topologyPower && !showUnlinkedNote && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 space-y-1">
                <p>
                  <span className={LABEL_CLASS}>Potenza locale</span>
                  <span className="ml-2 font-medium">{topologyPower.local ?? 0} W</span>
                </p>
                <p>
                  <span className={LABEL_CLASS}>Potenza totale</span>
                  <span className="ml-2 font-medium">{topologyPower.subtree ?? 0} W</span>
                </p>
              </div>
            )}
            {renderContentFields()}
          </>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">Nessun dato disponibile</p>
        )}
      </div>
      {renderActionBar()}
    </div>
  )
}

export default InfoWindow

import { useMemo, useState, useEffect } from "react"
import { X, ChevronDown, CheckCircle2, AlertTriangle, MapPin, Navigation, Pencil, Trash, FileSpreadsheet, Cable, Unplug } from "lucide-react"
import { clearBlanket, transformDateToIT, translateString, listIgnoratedFieldsPL, listIgnoratedFieldsQE, orderInfoWindowEntries, normalizeLightPointForDisplay } from "../utils/utils"
import {
  INFO_WINDOW_ACTIONS,
  getVisibleActions,
  getPrimaryAction,
  getSecondaryActions,
  getOverflowActions,
} from "../utils/infoWindowActions"

const parseMembers = (marker) => {
  if (!marker) return []

  if (Array.isArray(marker.differente_group_members)) {
    return marker.differente_group_members
  }

  if (typeof marker.differente_group_members_json === "string") {
    try {
      const parsed = JSON.parse(marker.differente_group_members_json)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

const getDifferenteOrder = (value) => {
  const match = /^differente\s+([a-z])/i.exec((value || "").trim())
  if (!match) return Number.POSITIVE_INFINITY
  return match[1].toUpperCase().charCodeAt(0)
}

export const DifferenteGroupSideWindow = ({
  marker,
  city,
  userData,
  onClose,
  onEditClick,
  onDeleteClick,
  onBeforeReport,
  onSetParentClick,
  onClearParentClick,
  mapType = "maplibre",
}) => {
  const members = useMemo(() => {
    const parsed = parseMembers(marker)
    return [...parsed].sort((a, b) => {
      const orderA = getDifferenteOrder(a?.composizione_punto)
      const orderB = getDifferenteOrder(b?.composizione_punto)
      if (orderA !== orderB) return orderA - orderB

      const compA = (a?.composizione_punto || "").toLowerCase()
      const compB = (b?.composizione_punto || "").toLowerCase()
      if (compA !== compB) return compA.localeCompare(compB, "it")

      const tipoA = (a?.tipo_apparecchio || "").toLowerCase()
      const tipoB = (b?.tipo_apparecchio || "").toLowerCase()
      if (tipoA !== tipoB) return tipoA.localeCompare(tipoB, "it")

      return (a?._id || "").localeCompare(b?._id || "")
    })
  }, [marker])
  const [selectedId, setSelectedId] = useState("")
  const [overflowOpen, setOverflowOpen] = useState(false)

  useEffect(() => {
    if (members.length === 0) {
      setSelectedId("")
      return
    }
    setSelectedId((prev) => {
      if (prev && members.some((m) => m._id === prev)) return prev
      return members[0]._id
    })
  }, [members])

  const selectedMember = useMemo(
    () => members.find((m) => m._id === selectedId) || members[0] || null,
    [members, selectedId],
  )

  const userRole = userData?.user_type
  const visibleActions = getVisibleActions(INFO_WINDOW_ACTIONS, userRole, selectedMember)
  const primaryAction = getPrimaryAction(visibleActions, userRole)
  const secondaryActions = getSecondaryActions(visibleActions, primaryAction)
  const overflowActions = getOverflowActions(visibleActions, primaryAction, secondaryActions)

  const runAction = (actionId) => {
    if (!selectedMember) return
    if (actionId === "operazione") {
      const operable =
        (selectedMember.segnalazioni_in_corso || []).find((s) =>
          !s?.is_solved
          && s?.maintenance_category === "EXTRAORDINARY"
          && s?.workflow_status !== "PENDING_QUOTE"
        )
        || (selectedMember.segnalazioni_in_corso || []).find((s) =>
          !s?.is_solved
          && s?.maintenance_category !== "EXTRAORDINARY"
          && ["SUSPENDED", "SCHEDULED"].includes(s?.workflow_status || "")
        )
      window.startOperation(
        city,
        clearBlanket(selectedMember.numero_palo),
        selectedMember.lat,
        selectedMember.lng,
        operable?._id,
      )
      return
    }
    if (actionId === "preventivo") {
      const pending = (selectedMember.segnalazioni_in_corso || []).find((s) =>
        !s?.is_solved && s?.workflow_status === "PENDING_QUOTE"
      )
      const quoteId = pending?.linked_quote_id?._id || pending?.linked_quote_id
      if (typeof window.startQuote === "function") {
        window.startQuote(city, selectedMember._id, pending?._id, quoteId)
      }
      return
    }
    if (actionId === "segnala") {
      if (onBeforeReport) {
        onClose?.()
        onBeforeReport({ city, id: selectedMember._id })
      } else {
        window.reportPoint(city, selectedMember._id)
      }
      return
    }
    if (actionId === "streetview") {
      if (mapType === "maplibre") {
        window.open(
          `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${selectedMember.lat},${selectedMember.lng}`,
          "_blank",
        )
      } else if (typeof window.toggleStreetView === "function") {
        window.toggleStreetView(selectedMember.lat, selectedMember.lng)
      }
      return
    }
    if (actionId === "goto") {
      window.navigateToLocation(selectedMember.lat, selectedMember.lng)
      return
    }
    if (actionId === "modifica" && onEditClick) {
      onClose?.()
      onEditClick(selectedMember)
      return
    }
    if (actionId === "elimina" && onDeleteClick) {
      onDeleteClick(selectedMember)
      return
    }
    if (actionId === "set_parent" && onSetParentClick) {
      onClose?.()
      onSetParentClick(selectedMember)
      return
    }
    if (actionId === "clear_parent" && onClearParentClick) {
      onClearParentClick(selectedMember)
    }
  }

  const actionIcon = (actionId) => {
    if (actionId === "operazione") return <CheckCircle2 className="h-4 w-4" />
    if (actionId === "preventivo") return <FileSpreadsheet className="h-4 w-4" />
    if (actionId === "segnala") return <AlertTriangle className="h-4 w-4" />
    if (actionId === "streetview") return <MapPin className="h-4 w-4" />
    if (actionId === "goto") return <Navigation className="h-4 w-4" />
    if (actionId === "modifica") return <Pencil className="h-4 w-4" />
    if (actionId === "set_parent") return <Cable className="h-4 w-4" />
    if (actionId === "clear_parent") return <Unplug className="h-4 w-4" />
    return <Trash className="h-4 w-4" />
  }

  const renderHistory = (title, list, dateKey, typeKey, bodyKey) => {
    if (!Array.isArray(list) || list.length === 0) return null
    return (
      <div className="rounded-lg border border-blue-500/30 bg-blue-900/25 p-3">
        <h5 className="text-sm font-semibold text-blue-200 mb-2">{title}</h5>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {[...list].reverse().map((item, index) => (
            <details key={`${title}-${index}`} className="rounded-md border border-blue-500/25 bg-blue-900/35 px-2 py-1">
              <summary className="cursor-pointer text-xs text-blue-100">
                {transformDateToIT(item[dateKey]) || "N.D."} · {translateString(item[typeKey] || "")}
              </summary>
              <p className="text-xs text-blue-200 mt-1 whitespace-pre-wrap">{item[bodyKey] || "N.D."}</p>
            </details>
          ))}
        </div>
      </div>
    )
  }

  const renderFullFields = (member) => {
    const ignoredFields = member.marker === "PL" ? listIgnoratedFieldsPL : listIgnoratedFieldsQE
    const ignored = new Set([
      ...ignoredFields,
      "lat",
      "lng",
      "differente_group_members",
      "differente_group_members_json",
      "is_differente_group",
      "differente_group_id",
      "differente_group_count",
      "differente_group_numero_palo",
      "segnalazioni_in_corso_length",
      "segnalazioni_in_corso",
      "segnalazioni_risolte",
      "operazioni_effettuate",
    ])

    return orderInfoWindowEntries(normalizeLightPointForDisplay(member))
      .filter(([key, value]) => !ignored.has(key) && value !== null && value !== undefined && value !== "")
      .map(([key, value]) => {
        let label = key.replace(/_/g, " ")
        if (key === "marker") label = "Tipologia"
        if (key === "numero_palo" && member.marker === "QE") label = "Numero quadro"
        if (key === "marker") value = member.marker === "QE" ? "Quadro elettrico" : "Punto luce"
        if (key === "data_creazione") value = transformDateToIT(value) || "N.D."
        return (
          <div key={key} className="rounded-md bg-blue-900/40 px-2 py-1 border border-blue-500/20">
            <span className="text-blue-300 text-xs uppercase tracking-wide">{label}</span>
            <p className="text-white break-words">{String(value)}</p>
          </div>
        )
      })
  }

  if (!marker?.is_differente_group) return null

  return (
    <div className="fixed inset-0 z-[10045] pointer-events-none">
      <button
        type="button"
        className="absolute inset-0 bg-black/20 pointer-events-auto"
        aria-label="Chiudi pannello palo raggruppato"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 h-full w-full max-w-[430px] bg-black/85 backdrop-blur-xl border-l border-blue-500/30 shadow-[0_0_25px_rgba(0,149,255,0.15)] pointer-events-auto flex flex-col">
        <div className="flex items-center justify-between border-b border-blue-500/30 bg-blue-900/50 px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-white">Palo con punti Differente</h3>
            <p className="text-sm text-blue-300 truncate">
              N. palo: {marker.numero_palo || marker.differente_group_numero_palo || "N.D."} ·{" "}
              {members.length} punti luce
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-blue-300 hover:bg-blue-800/50 border border-blue-500/30"
            aria-label="Chiudi"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pt-3 pb-2 border-b border-blue-500/30">
          <label htmlFor="differente-member-select" className="block text-sm font-medium text-blue-200 mb-2">
            Seleziona il punto luce
          </label>
          <select
            id="differente-member-select"
            className="w-full rounded-lg border border-blue-500/40 bg-blue-900/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedMember?._id || ""}
            onChange={(event) => {
              setSelectedId(event.target.value)
              setOverflowOpen(false)
            }}
          >
            {members.map((member) => (
              <option key={member._id} value={member._id}>
                {(member.composizione_punto || "Differente")} - {member.tipo_apparecchio || "N.D."}
              </option>
            ))}
          </select>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 bg-transparent space-y-3">
          {selectedMember ? (
            <>
              <div className="rounded-lg border border-blue-500/30 bg-blue-900/25 p-3">
                <h4 className="text-sm font-semibold text-white mb-2">
                  {selectedMember.composizione_punto || "Differente"} · {selectedMember.numero_palo || "N.D."}
                </h4>
                <div className="grid grid-cols-1 gap-2 text-sm">{renderFullFields(selectedMember)}</div>
              </div>

              {renderHistory(
                "Segnalazioni in corso",
                selectedMember.segnalazioni_in_corso,
                "report_date",
                "report_type",
                "description",
              )}
              {renderHistory(
                "Segnalazioni risolte",
                selectedMember.segnalazioni_risolte,
                "report_date",
                "report_type",
                "description",
              )}
              {renderHistory(
                "Operazioni effettuate",
                selectedMember.operazioni_effettuate,
                "operation_date",
                "operation_type",
                "note",
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-blue-300">
              Nessun punto luce disponibile nel gruppo.
            </div>
          )}
        </div>

        {selectedMember && (
          <div className="border-t border-blue-500/30 bg-blue-900/50 p-3">
            <div className="flex items-stretch gap-2">
              {primaryAction && (
                <button
                  type="button"
                  onClick={() => runAction(primaryAction.id)}
                  className="flex-1 min-h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold border border-blue-400/40 inline-flex items-center justify-center gap-2"
                >
                  {actionIcon(primaryAction.id)}
                  <span>{primaryAction.label}</span>
                </button>
              )}
              {secondaryActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => runAction(action.id)}
                  className="flex-1 min-h-11 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold border border-amber-400/40 inline-flex items-center justify-center gap-2"
                >
                  {actionIcon(action.id)}
                  <span>{action.label}</span>
                </button>
              ))}
              {overflowActions.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOverflowOpen((v) => !v)}
                    className="min-h-11 min-w-11 px-3 rounded-lg bg-blue-900/50 hover:bg-blue-800/60 text-blue-100 border border-blue-500/40 inline-flex items-center justify-center"
                    aria-label="Altre azioni"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${overflowOpen ? "rotate-180" : ""}`} />
                  </button>
                  {overflowOpen && (
                    <div className="absolute right-0 bottom-12 w-48 rounded-lg border border-blue-500/40 bg-blue-950/95 shadow-xl p-1">
                      {overflowActions.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => {
                            setOverflowOpen(false)
                            runAction(action.id)
                          }}
                          className="w-full text-left px-3 py-2 rounded-md text-sm text-blue-100 hover:bg-blue-800/60 inline-flex items-center gap-2"
                        >
                          {actionIcon(action.id)}
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

export default DifferenteGroupSideWindow

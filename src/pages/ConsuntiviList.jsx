"use client"

import { useState, useEffect, useContext, useMemo, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { UserContext, api } from "../context/UserContext"
import {
  AlertCircle,
  ClipboardCheck,
  Eye,
  FileSpreadsheet,
  Pencil,
  Trash2,
} from "lucide-react"
import toast from "react-hot-toast"
import { LightbulbLoader } from "../components/lightbulb-loader"
import { BackNavigationButton } from "../components/BackNavigationButton"
import {
  GoToLightPointButton,
  LightPointMapLink,
} from "../components/GoToLightPointControl"
import ConfirmDialog from "../components/ui/ConfirmDialog"
import InfoTooltip from "../components/ui/InfoTooltip"
import { QuoteStatusBadge } from "../components/ui/QuoteStatusBadge"
import { RiskClassBadge } from "../components/ui/RiskClassBadge"
import {
  formatReportFaultLabel,
  canManageQuotesByRole,
  canApproveQuoteByRole,
  QUOTE_EDITABLE_STATUSES,
} from "../utils/utils"
import { PAGE_SCROLL_SHELL, TABLE_SCROLL_X } from "../utils/pageScrollShell"

const EDITABLE = new Set(QUOTE_EDITABLE_STATUSES)

const STATUS_FILTERS = [
  { value: "DRAFT,REJECTED,NEEDS_REVISION", label: "Bozze / da revisionare", accent: true },
  { value: "PENDING_APPROVAL", label: "In approvazione", accent: false },
  { value: "APPROVED", label: "Approvati", accent: false },
  {
    value: "DRAFT,PENDING_APPROVAL,REJECTED,NEEDS_REVISION,APPROVED",
    label: "Tutti",
    accent: false,
  },
]

const ALL_STATUSES = "DRAFT,PENDING_APPROVAL,REJECTED,NEEDS_REVISION,APPROVED"
const DEFAULT_STATUS = "DRAFT,REJECTED,NEEDS_REVISION"

const INFO_TEXT =
  "Gestisci i consuntivi IMS del comune: completa le bozze dopo la chiusura di un intervento straordinario, correggi quelli da revisionare e monitora quelli in approvazione o già approvati."

const normalizeStatusFilter = (raw) => {
  const value = String(raw || "").trim()
  if (STATUS_FILTERS.some((f) => f.value === value)) return value
  return DEFAULT_STATUS
}

const matchesStatusFilter = (docStatus, filterValue) => {
  const allowed = String(filterValue)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  return allowed.includes(docStatus)
}

const reportLabel = (doc) => {
  const report = doc.reportId
  if (!report) return "—"
  const type = formatReportFaultLabel(report)
  const date = report.report_date
    ? new Date(report.report_date).toLocaleDateString("it-IT")
    : ""
  return [type, date].filter(Boolean).join(" · ")
}

const parentLabel = (doc) => {
  const parent = doc.parentQuoteId
  if (!parent) return "—"
  if (typeof parent === "object") {
    return parent.protocolNumber || parent._id || "—"
  }
  return String(parent)
}

const ConsuntivoListActions = ({
  doc,
  editable,
  reviewable,
  comune,
  navigate,
  onOpen,
  onDelete,
  compact = false,
}) => (
  <div className="flex flex-wrap items-center justify-end gap-2">
    <GoToLightPointButton
      lightPoint={doc.lightPointId}
      comune={comune}
      navigate={navigate}
      className={compact ? "min-h-0 py-1.5" : ""}
    />
    <button
      type="button"
      onClick={() => onOpen(doc)}
      className={`inline-flex items-center gap-1.5 px-3 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-100 border border-amber-500/30 text-sm cursor-pointer transition-colors duration-150 ${
        compact ? "min-h-0 py-1.5" : "py-2.5 min-h-11"
      }`}
      title={reviewable ? "Revisiona" : editable ? "Modifica" : "Apri"}
    >
      {reviewable ? (
        <ClipboardCheck className="h-3.5 w-3.5" />
      ) : editable ? (
        <Pencil className="h-3.5 w-3.5" />
      ) : (
        <Eye className="h-3.5 w-3.5" />
      )}
      {reviewable ? "Revisiona" : editable ? "Modifica" : "Apri"}
    </button>
    {editable && doc.status === "DRAFT" ? (
      <button
        type="button"
        onClick={() => onDelete(doc)}
        className={`inline-flex items-center gap-1.5 px-3 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-100 border border-red-500/30 text-sm cursor-pointer transition-colors duration-150 ${
          compact ? "min-h-0 py-1.5" : "py-2.5 min-h-11"
        }`}
        title="Elimina bozza"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Elimina
      </button>
    ) : null}
  </div>
)

const ConsuntivoMobileCard = ({
  doc,
  editable,
  reviewable,
  needsRevision,
  comune,
  navigate,
  onOpen,
  onDelete,
}) => (
  <article
    className={`p-4 rounded-xl border space-y-3 ${
      needsRevision
        ? "bg-amber-950/25 border-amber-500/30"
        : reviewable
          ? "bg-emerald-950/25 border-emerald-500/30"
          : editable
            ? "bg-amber-950/15 border-amber-500/25"
            : "bg-black/40 border-blue-500/20"
    }`}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-white font-semibold">
          <LightPointMapLink
            lightPoint={doc.lightPointId}
            comune={comune}
            navigate={navigate}
            prefix="PL "
            className="font-semibold text-white hover:text-blue-100"
          />
        </p>
        <p className="text-sm text-blue-200/90 mt-0.5">
          Preventivo {parentLabel(doc)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <QuoteStatusBadge status={doc.status} />
        <RiskClassBadge
          riskClass={doc.priorityClass || doc.parentQuoteId?.priorityClass}
        />
      </div>
    </div>

    <p className="text-sm text-blue-100 break-words">{reportLabel(doc)}</p>

    {doc.protocolNumber ? (
      <p className="text-xs text-amber-300/80 font-mono">{doc.protocolNumber}</p>
    ) : null}

    <div className="flex items-center justify-between gap-3 text-sm">
      <p className="text-white font-medium whitespace-nowrap">
        € {Number(doc.total || 0).toFixed(2)}
      </p>
      <p className="text-blue-200/80 text-xs text-right">
        {doc.updatedAt
          ? new Date(doc.updatedAt).toLocaleString("it-IT")
          : "—"}
      </p>
    </div>

    <div className="pt-1 border-t border-blue-500/15">
      <ConsuntivoListActions
        doc={doc}
        editable={editable}
        reviewable={reviewable}
        comune={comune}
        navigate={navigate}
        onOpen={onOpen}
        onDelete={onDelete}
      />
    </div>
  </article>
)

export default function ConsuntiviList() {
  const { userData } = useContext(UserContext)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const comune = searchParams.get("comune") || ""
  const statusFilter = normalizeStatusFilter(searchParams.get("stato"))

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [allItems, setAllItems] = useState([])

  const [confirmDelete, setConfirmDelete] = useState({ open: false, item: null })
  const [deleting, setDeleting] = useState(false)

  const canManage = useMemo(
    () => canManageQuotesByRole(userData),
    [userData]
  )
  const canApprove = useMemo(
    () => canApproveQuoteByRole(userData),
    [userData]
  )

  const setStatusFilter = useCallback(
    (nextStatus) => {
      const normalized = normalizeStatusFilter(nextStatus)
      const next = new URLSearchParams(searchParams)
      if (comune) next.set("comune", comune)
      next.set("stato", normalized)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams, comune]
  )

  const loadItems = useCallback(async () => {
    if (!comune) return
    try {
      setLoading(true)
      setError("")
      const res = await api.get("/api/quotes", {
        params: {
          townHallName: comune,
          type: "CONSUNTIVO",
          status: ALL_STATUSES,
        },
      })
      setAllItems(res.data || [])
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || "Impossibile caricare i consuntivi.")
    } finally {
      setLoading(false)
    }
  }, [comune])

  useEffect(() => {
    if (!userData) {
      navigate("/")
      return
    }
    if (!canManage && canApprove) {
      const qs = comune
        ? `?comune=${encodeURIComponent(comune)}&tipo=consuntivi`
        : "?tipo=consuntivi"
      navigate(`/quotes/approval${qs}`, { replace: true })
      return
    }
    if (!canManage && !canApprove) {
      navigate("/dashboard")
      return
    }
    if (!comune) {
      setError("Seleziona un comune dalla dashboard.")
      setLoading(false)
      return
    }
    loadItems()
  }, [userData, canManage, canApprove, comune, navigate, loadItems])

  // Normalizza URL se manca/è invalido lo stato
  useEffect(() => {
    const raw = searchParams.get("stato")
    const normalized = normalizeStatusFilter(raw)
    if (raw === normalized) return
    const next = new URLSearchParams(searchParams)
    if (comune) next.set("comune", comune)
    next.set("stato", normalized)
    setSearchParams(next, { replace: true })
  }, [searchParams, comune, setSearchParams])

  const statusCounts = useMemo(() => {
    const counts = {}
    for (const filter of STATUS_FILTERS) {
      counts[filter.value] = allItems.filter((doc) =>
        matchesStatusFilter(doc.status, filter.value)
      ).length
    }
    return counts
  }, [allItems])

  const items = useMemo(
    () => allItems.filter((doc) => matchesStatusFilter(doc.status, statusFilter)),
    [allItems, statusFilter]
  )

  const actionableCount = statusCounts[DEFAULT_STATUS] || 0

  const goToDashboard = useCallback(() => {
    if (comune) {
      navigate("/dashboard", { state: { comune } })
      return
    }
    navigate("/dashboard")
  }, [navigate, comune])

  const handleDelete = async () => {
    if (!confirmDelete.item?._id) return
    setDeleting(true)
    try {
      await api.delete(`/api/quotes/${confirmDelete.item._id}`)
      toast.success("Consuntivo eliminato")
      setConfirmDelete({ open: false, item: null })
      await loadItems()
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.error || "Errore eliminazione")
    } finally {
      setDeleting(false)
    }
  }

  const openDoc = (doc) => {
    if (canApprove && doc.status === "PENDING_APPROVAL") {
      navigate(`/consuntivo/${doc._id}/review`)
      return
    }
    navigate(`/consuntivo/${doc._id}`)
  }

  return (
    <div className={`${PAGE_SCROLL_SHELL} bg-gradient-to-br from-black via-blue-950 to-black p-4 sm:p-6`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6" data-tour="page-consuntivi-title">
          <BackNavigationButton onClick={goToDashboard} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="h-6 w-6 text-amber-400 shrink-0" />
                <span className="truncate">Consuntivi IMS</span>
              </h1>
              <InfoTooltip text={INFO_TEXT} />
            </div>
            <p className="text-sm text-blue-300/80 truncate">{comune || "Nessun comune"}</p>
          </div>
        </div>

        <div
          className="mb-5 grid grid-cols-2 lg:grid-cols-4 gap-2"
          data-tour="page-consuntivi-filters"
          role="group"
          aria-label="Filtro stato"
        >
          {STATUS_FILTERS.map((filter) => {
            const active = statusFilter === filter.value
            const count = statusCounts[filter.value] ?? 0
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                aria-pressed={active}
                className={`text-left rounded-xl border px-3 py-3 min-h-11 cursor-pointer transition-colors duration-150 ${
                  active
                    ? filter.accent
                      ? "bg-amber-600/30 border-amber-400/50 text-amber-50"
                      : "bg-blue-600/30 border-blue-400/50 text-blue-50"
                    : "bg-black/30 border-blue-500/20 text-blue-200 hover:bg-blue-900/30"
                }`}
              >
                <span className="block text-xs sm:text-sm text-blue-300/90 truncate">
                  {filter.label}
                </span>
                <span className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-semibold tabular-nums text-white">
                    {loading ? "—" : count}
                  </span>
                  {filter.accent && !loading && count > 0 ? (
                    <span className="text-[11px] uppercase tracking-wide text-amber-300/90">
                      da fare
                    </span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>

        {!loading && !error && allItems.length > 0 ? (
          <div className="mb-3 flex items-center justify-between gap-2 text-sm text-blue-300/80">
            <p>
              {items.length === 1
                ? "1 consuntivo"
                : `${items.length} consuntivi`}
              {statusFilter === DEFAULT_STATUS && actionableCount > 0
                ? " da lavorare"
                : ""}
            </p>
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <LightbulbLoader />
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-200 flex gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 rounded-xl bg-black/40 border border-blue-500/20 text-center text-blue-200/80">
            {statusFilter === DEFAULT_STATUS
              ? "Nessuna bozza o consuntivo da revisionare."
              : "Nessun consuntivo con i filtri selezionati."}
            <p className="mt-2 text-sm text-blue-300/70">
              I consuntivi si creano dopo la chiusura di un intervento straordinario.
            </p>
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {items.map((doc) => {
                const editable = canManage && EDITABLE.has(doc.status)
                const reviewable = canApprove && doc.status === "PENDING_APPROVAL"
                const needsRevision = doc.status === "NEEDS_REVISION" || doc.status === "REJECTED"
                return (
                  <ConsuntivoMobileCard
                    key={doc._id}
                    doc={doc}
                    editable={editable}
                    reviewable={reviewable}
                    needsRevision={needsRevision}
                    comune={comune}
                    navigate={navigate}
                    onOpen={openDoc}
                    onDelete={(item) => setConfirmDelete({ open: true, item })}
                  />
                )
              })}
            </div>

            <div className={`hidden md:block ${TABLE_SCROLL_X} rounded-xl border border-blue-500/20 bg-black/40`}>
              <table className="w-full text-sm text-left">
                <thead className="text-blue-300 border-b border-blue-500/20 bg-blue-950/80 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="px-4 py-3 font-medium">Punto luce</th>
                    <th className="px-4 py-3 font-medium">Preventivo</th>
                    <th className="px-4 py-3 font-medium">Segnalazione</th>
                    <th className="px-4 py-3 font-medium">Classe</th>
                    <th className="px-4 py-3 font-medium">Totale</th>
                    <th className="px-4 py-3 font-medium">Stato</th>
                    <th className="px-4 py-3 font-medium">Aggiornato</th>
                    <th className="px-4 py-3 font-medium text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((doc) => {
                    const editable = canManage && EDITABLE.has(doc.status)
                    const reviewable = canApprove && doc.status === "PENDING_APPROVAL"
                    const needsRevision = doc.status === "NEEDS_REVISION" || doc.status === "REJECTED"
                    return (
                      <tr
                        key={doc._id}
                        className={`border-b border-blue-500/10 transition-colors duration-150 ${
                          needsRevision
                            ? "bg-amber-950/20 hover:bg-amber-900/30"
                            : reviewable
                              ? "bg-emerald-950/15 hover:bg-emerald-900/25"
                              : editable
                                ? "bg-amber-950/10 hover:bg-amber-900/20"
                                : "hover:bg-blue-900/20"
                        }`}
                      >
                        <td className="px-4 py-3 text-white font-medium">
                          <LightPointMapLink
                            lightPoint={doc.lightPointId}
                            comune={comune}
                            navigate={navigate}
                            className="font-medium"
                          />
                        </td>
                        <td className="px-4 py-3 text-blue-100">{parentLabel(doc)}</td>
                        <td className="px-4 py-3 text-blue-100">{reportLabel(doc)}</td>
                        <td className="px-4 py-3">
                          <RiskClassBadge
                            riskClass={doc.priorityClass || doc.parentQuoteId?.priorityClass}
                          />
                        </td>
                        <td className="px-4 py-3 text-blue-100">
                          € {Number(doc.total || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <QuoteStatusBadge status={doc.status} />
                          {doc.protocolNumber ? (
                            <span className="block text-xs text-amber-300/80 mt-0.5 font-mono">
                              {doc.protocolNumber}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-blue-200/80">
                          {doc.updatedAt
                            ? new Date(doc.updatedAt).toLocaleString("it-IT")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <ConsuntivoListActions
                            doc={doc}
                            editable={editable}
                            reviewable={reviewable}
                            comune={comune}
                            navigate={navigate}
                            compact
                            onOpen={openDoc}
                            onDelete={(item) => setConfirmDelete({ open: true, item })}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDelete.open}
        title="Eliminare la bozza consuntivo?"
        description="L'operazione non è reversibile. Potrai creare di nuovo il consuntivo dal preventivo collegato."
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant="danger"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ open: false, item: null })}
      />
    </div>
  )
}

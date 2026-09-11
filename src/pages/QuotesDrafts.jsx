"use client"

import { useState, useEffect, useContext, useMemo, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { UserContext, api } from "../context/UserContext"
import {
  AlertCircle,
  FileSpreadsheet,
  Pencil,
  Plus,
  Send,
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
import { GlassSelect } from "../components/ui/GlassSelect"
import InfoTooltip from "../components/ui/InfoTooltip"
import { QuoteStatusBadge } from "../components/ui/QuoteStatusBadge"
import { RiskClassBadge } from "../components/ui/RiskClassBadge"
import { formatReportFaultLabel, canManageQuotesByRole, QUOTE_EDITABLE_STATUSES } from "../utils/utils"
import { PAGE_SCROLL_SHELL, TABLE_SCROLL_X } from "../utils/pageScrollShell"

const EDITABLE = new Set(QUOTE_EDITABLE_STATUSES)

const STATUS_FILTERS = [
  { value: "DRAFT,REJECTED,NEEDS_REVISION", label: "Bozze / da revisionare", accent: true },
  { value: "PENDING_APPROVAL", label: "In approvazione", accent: false },
  { value: "APPROVED", label: "Approvati", accent: false },
  {
    value: "DRAFT,REJECTED,NEEDS_REVISION,PENDING_APPROVAL",
    label: "In lavorazione",
    accent: false,
  },
]

const ALL_STATUSES = "DRAFT,REJECTED,NEEDS_REVISION,PENDING_APPROVAL,APPROVED"
const DEFAULT_STATUS = "DRAFT,REJECTED,NEEDS_REVISION"

const INFO_TEXT =
  "Gestisci le bozze preventivo IMS del comune: crea nuove bozze da segnalazioni risolte, modifica quelle da revisionare e monitora quelle in approvazione o già approvate."

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

const reportLabel = (quote) => {
  const report = quote.reportId
  if (!report) return "—"
  const type = formatReportFaultLabel(report)
  const date = report.report_date
    ? new Date(report.report_date).toLocaleDateString("it-IT")
    : ""
  return [type, date].filter(Boolean).join(" · ")
}

const DraftListActions = ({
  quote,
  editable,
  needsRevision,
  comune,
  navigate,
  onOpen,
  onDelete,
  compact = false,
}) => (
  <div className="flex flex-wrap items-center justify-end gap-2">
    <GoToLightPointButton
      lightPoint={quote.lightPointId}
      comune={comune}
      navigate={navigate}
      className={compact ? "min-h-0 py-1.5" : ""}
    />
    <button
      type="button"
      onClick={() => onOpen(quote)}
      className={`inline-flex items-center gap-1.5 px-3 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 text-violet-100 border border-violet-500/30 text-sm cursor-pointer transition-colors duration-150 ${
        compact ? "min-h-0 py-1.5" : "py-2.5 min-h-11"
      }`}
      title={needsRevision ? "Revisiona e reinvia" : editable ? "Modifica e invia" : "Apri"}
    >
      {editable ? <Pencil className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
      {needsRevision ? "Revisiona" : editable ? "Modifica" : "Apri"}
    </button>
    {editable ? (
      <button
        type="button"
        onClick={() => onDelete(quote)}
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

const DraftMobileCard = ({
  quote,
  editable,
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
        : editable
          ? "bg-violet-950/25 border-violet-500/30"
          : "bg-black/40 border-blue-500/20"
    }`}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-white font-semibold">
          <LightPointMapLink
            lightPoint={quote.lightPointId}
            comune={comune}
            navigate={navigate}
            prefix="PL "
            className="font-semibold text-white hover:text-blue-100"
          />
        </p>
        <p className="text-sm text-blue-100 mt-1 break-words">{reportLabel(quote)}</p>
      </div>
      <RiskClassBadge riskClass={quote.priorityClass} className="shrink-0" />
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <QuoteStatusBadge status={quote.status} />
      {quote.protocolNumber ? (
        <span className="text-xs text-violet-300/80 font-mono">{quote.protocolNumber}</span>
      ) : null}
    </div>

    <p className="text-blue-200/80 text-xs">
      {quote.updatedAt
        ? new Date(quote.updatedAt).toLocaleString("it-IT")
        : "—"}
    </p>

    <div className="pt-1 border-t border-blue-500/15">
      <DraftListActions
        quote={quote}
        editable={editable}
        needsRevision={needsRevision}
        comune={comune}
        navigate={navigate}
        onOpen={onOpen}
        onDelete={onDelete}
      />
    </div>
  </article>
)

export default function QuotesDrafts() {
  const { userData } = useContext(UserContext)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const comune = searchParams.get("comune") || ""
  const statusFilter = normalizeStatusFilter(searchParams.get("stato"))

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [allQuotes, setAllQuotes] = useState([])

  const [createOpen, setCreateOpen] = useState(false)
  const [resolvedLoading, setResolvedLoading] = useState(false)
  const [resolvedOptions, setResolvedOptions] = useState([])
  const [selectedResolvedId, setSelectedResolvedId] = useState("")
  const [creating, setCreating] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState({ open: false, quote: null })
  const [deleting, setDeleting] = useState(false)

  const canManage = useMemo(
    () => canManageQuotesByRole(userData),
    [userData]
  )

  const resolvedSelectOptions = useMemo(
    () => resolvedOptions.map((item) => {
      const r = item.report
      const label = [
        `PL ${item.lightPoint?.numero_palo}`,
        formatReportFaultLabel(r),
        r.report_date ? new Date(r.report_date).toLocaleDateString("it-IT") : "",
        r.risk_class ? `Classe ${r.risk_class}` : "",
      ].filter(Boolean).join(" — ")
      return { value: r._id, label }
    }),
    [resolvedOptions]
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

  const loadQuotes = useCallback(async () => {
    if (!comune) return
    try {
      setLoading(true)
      setError("")
      const res = await api.get("/api/quotes", {
        params: {
          townHallName: comune,
          type: "QUOTE",
          status: ALL_STATUSES,
        },
      })
      setAllQuotes(res.data || [])
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || "Impossibile caricare i preventivi.")
    } finally {
      setLoading(false)
    }
  }, [comune])

  useEffect(() => {
    if (!userData) {
      navigate("/")
      return
    }
    if (!canManage) {
      navigate("/dashboard")
      return
    }
    if (!comune) {
      setError("Seleziona un comune dalla dashboard.")
      setLoading(false)
      return
    }
    loadQuotes()
  }, [userData, canManage, comune, navigate, loadQuotes])

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
      counts[filter.value] = allQuotes.filter((quote) =>
        matchesStatusFilter(quote.status, filter.value)
      ).length
    }
    return counts
  }, [allQuotes])

  const quotes = useMemo(
    () => allQuotes.filter((quote) => matchesStatusFilter(quote.status, statusFilter)),
    [allQuotes, statusFilter]
  )

  const actionableCount = statusCounts[DEFAULT_STATUS] || 0

  const openCreateModal = async () => {
    setCreateOpen(true)
    setSelectedResolvedId("")
    setResolvedLoading(true)
    try {
      const res = await api.get("/api/reports/resolved-for-quote", {
        params: { townHallName: comune },
      })
      const options = (res.data || []).filter((item) => !item.hasActiveQuote)
      setResolvedOptions(options)
      if (!options.length) {
        toast.error("Nessuna segnalazione risolta disponibile senza preventivo attivo.")
      }
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.error || "Errore caricamento segnalazioni risolte")
      setResolvedOptions([])
    } finally {
      setResolvedLoading(false)
    }
  }

  const handleCreate = async () => {
    const selected = resolvedOptions.find(
      (item) => String(item.report._id) === String(selectedResolvedId)
    )
    if (!selected) {
      toast.error("Seleziona una segnalazione risolta.")
      return
    }

    setCreating(true)
    try {
      const createRes = await api.post("/api/quotes", {
        townHallName: comune,
        lightPointId: selected.lightPoint._id,
        reportId: selected.report._id,
        priorityClass: selected.report.risk_class || "C",
        faultDescription: selected.report.description || "",
        lineItems: [],
      })
      toast.success("Bozza preventivo creata")
      setCreateOpen(false)
      navigate(`/quote/${createRes.data._id}`)
    } catch (err) {
      console.error(err)
      if (err.response?.status === 409 && err.response?.data?.quoteId) {
        toast.error("Esiste già un preventivo: apertura bozza esistente.")
        navigate(`/quote/${err.response.data.quoteId}`)
        return
      }
      toast.error(err.response?.data?.error || "Errore creazione bozza")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete.quote?._id) return
    setDeleting(true)
    try {
      await api.delete(`/api/quotes/${confirmDelete.quote._id}`)
      toast.success("Preventivo eliminato")
      setConfirmDelete({ open: false, quote: null })
      await loadQuotes()
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.error || "Errore eliminazione")
    } finally {
      setDeleting(false)
    }
  }

  const goToDashboard = useCallback(() => {
    if (comune) {
      navigate("/dashboard", { state: { comune } })
      return
    }
    navigate("/dashboard")
  }, [navigate, comune])

  return (
    <div className={`${PAGE_SCROLL_SHELL} bg-gradient-to-br from-black via-blue-950 to-black p-4 sm:p-6`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6" data-tour="page-quotes-title">
          <div className="flex items-center gap-3 min-w-0">
            <BackNavigationButton onClick={goToDashboard} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2 min-w-0">
                  <FileSpreadsheet className="h-6 w-6 text-violet-400 shrink-0" />
                  <span className="truncate">Bozze preventivi IMS</span>
                </h1>
                <InfoTooltip text={INFO_TEXT} />
              </div>
              <p className="text-sm text-blue-300/80 truncate">{comune || "Nessun comune"}</p>
            </div>
          </div>
          <button
            type="button"
            data-tour="page-quotes-create"
            onClick={openCreateModal}
            disabled={!comune}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium disabled:opacity-50 cursor-pointer transition-colors duration-150 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuova bozza</span>
            <span className="sm:hidden">Nuova</span>
          </button>
        </div>

        <div
          className="mb-5 grid grid-cols-2 lg:grid-cols-4 gap-2"
          data-tour="page-quotes-filters"
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
                      ? "bg-violet-600/30 border-violet-400/50 text-violet-50"
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
                    <span className="text-[11px] uppercase tracking-wide text-violet-300/90">
                      da fare
                    </span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>

        {!loading && !error && allQuotes.length > 0 ? (
          <div className="mb-3 flex items-center justify-between gap-2 text-sm text-blue-300/80">
            <p>
              {quotes.length === 1
                ? "1 preventivo"
                : `${quotes.length} preventivi`}
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
        ) : quotes.length === 0 ? (
          <div className="p-8 rounded-xl bg-black/40 border border-blue-500/20 text-center text-blue-200/80">
            {statusFilter === DEFAULT_STATUS
              ? "Nessuna bozza o preventivo da revisionare."
              : "Nessun preventivo con i filtri selezionati."}
            {(statusFilter === DEFAULT_STATUS || allQuotes.length === 0) ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white cursor-pointer transition-colors duration-150"
                >
                  <Plus className="h-4 w-4" />
                  {allQuotes.length === 0 ? "Crea la prima bozza" : "Nuova bozza"}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {quotes.map((quote) => {
                const editable = EDITABLE.has(quote.status)
                const needsRevision = quote.status === "NEEDS_REVISION" || quote.status === "REJECTED"
                return (
                  <DraftMobileCard
                    key={quote._id}
                    quote={quote}
                    editable={editable}
                    needsRevision={needsRevision}
                    comune={comune}
                    navigate={navigate}
                    onOpen={(q) => navigate(`/quote/${q._id}`)}
                    onDelete={(q) => setConfirmDelete({ open: true, quote: q })}
                  />
                )
              })}
            </div>

            <div className={`hidden md:block ${TABLE_SCROLL_X} rounded-xl border border-blue-500/20 bg-black/40`}>
              <table className="w-full text-sm text-left">
                <thead className="text-blue-300 border-b border-blue-500/20 bg-blue-950/80 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="px-4 py-3 font-medium">Punto luce</th>
                    <th className="px-4 py-3 font-medium">Segnalazione</th>
                    <th className="px-4 py-3 font-medium">Classe</th>
                    <th className="px-4 py-3 font-medium">Stato</th>
                    <th className="px-4 py-3 font-medium">Aggiornato</th>
                    <th className="px-4 py-3 font-medium text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => {
                    const editable = EDITABLE.has(quote.status)
                    const needsRevision = quote.status === "NEEDS_REVISION" || quote.status === "REJECTED"
                    return (
                      <tr
                        key={quote._id}
                        className={`border-b border-blue-500/10 transition-colors duration-150 ${
                          needsRevision
                            ? "bg-amber-950/20 hover:bg-amber-900/30"
                            : editable
                              ? "bg-violet-950/15 hover:bg-violet-900/25"
                              : "hover:bg-blue-900/20"
                        }`}
                      >
                        <td className="px-4 py-3 text-white font-medium">
                          <LightPointMapLink
                            lightPoint={quote.lightPointId}
                            comune={comune}
                            navigate={navigate}
                            className="font-medium"
                          />
                        </td>
                        <td className="px-4 py-3 text-blue-100">{reportLabel(quote)}</td>
                        <td className="px-4 py-3">
                          <RiskClassBadge riskClass={quote.priorityClass} />
                        </td>
                        <td className="px-4 py-3">
                          <QuoteStatusBadge status={quote.status} />
                          {quote.protocolNumber ? (
                            <span className="block text-xs text-violet-300/80 mt-0.5 font-mono">
                              {quote.protocolNumber}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-blue-200/80">
                          {quote.updatedAt
                            ? new Date(quote.updatedAt).toLocaleString("it-IT")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <DraftListActions
                            quote={quote}
                            editable={editable}
                            needsRevision={needsRevision}
                            comune={comune}
                            navigate={navigate}
                            compact
                            onOpen={(q) => navigate(`/quote/${q._id}`)}
                            onDelete={(q) => setConfirmDelete({ open: true, quote: q })}
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

      {createOpen && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Chiudi"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !creating && setCreateOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900/95 p-5 text-slate-100 shadow-2xl">
            <h3 className="text-lg font-semibold">Nuova bozza preventivo</h3>
            <p className="mt-1 text-sm text-slate-300">
              Seleziona la segnalazione risolta da associare al preventivo IMS.
            </p>

            {resolvedLoading ? (
              <div className="flex justify-center py-8">
                <LightbulbLoader />
              </div>
            ) : (
              <div className="mt-4">
                <GlassSelect
                  id="quotes-drafts-resolved"
                  value={selectedResolvedId}
                  onChange={setSelectedResolvedId}
                  options={resolvedSelectOptions}
                  placeholder="Seleziona segnalazione…"
                  openUpward={false}
                  maxVisible={6}
                  zIndex={12000}
                  aria-label="Segnalazione risolta"
                  className="bg-blue-950/40 border-blue-500/30"
                  disabled={creating || resolvedSelectOptions.length === 0}
                />
                {resolvedSelectOptions.length === 0 && (
                  <p className="mt-2 text-xs text-slate-400">
                    Nessuna segnalazione risolta disponibile per questo comune.
                  </p>
                )}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={creating}
                onClick={() => setCreateOpen(false)}
                className="min-h-11 rounded-lg border border-slate-600 px-4 text-sm font-medium hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={creating || !selectedResolvedId}
                onClick={handleCreate}
                className="min-h-11 rounded-lg bg-violet-600 hover:bg-violet-500 px-4 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
              >
                {creating ? "Creazione…" : "Crea e apri"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelete.open}
        title="Eliminare la bozza?"
        description="L'operazione non è reversibile. Potrai creare un nuovo preventivo associato alla stessa segnalazione."
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant="danger"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ open: false, quote: null })}
      />
    </div>
  )
}

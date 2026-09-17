"use client"

import { useState, useEffect, useContext, useMemo, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { UserContext, api } from "../context/UserContext"
import {
  AlertCircle,
  FileSpreadsheet,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react"
import toast from "react-hot-toast"
import { BackNavigationButton } from "../components/BackNavigationButton"
import {
  GoToLightPointButton,
  LightPointMapLink,
} from "../components/GoToLightPointControl"
import ConfirmDialog from "../components/ui/ConfirmDialog"
import InfoTooltip from "../components/ui/InfoTooltip"
import { QuoteStatusBadge } from "../components/ui/QuoteStatusBadge"
import { RiskClassBadge } from "../components/ui/RiskClassBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ViewportModal,
  ViewportModalBody,
  ViewportModalFooter,
  ViewportModalHeader,
} from "@/components/ui/ViewportModal"
import { ChartSection } from "@/components/infoPanel/DistributionChart"
import { ExtraordinaryBudgetBar } from "@/components/ui/ExtraordinaryBudgetBar"
import { cn } from "@/lib/utils"
import {
  formatReportFaultLabel,
  canManageQuotesByRole,
  QUOTE_EDITABLE_STATUSES,
} from "../utils/utils"
import { fetchExtraordinaryBudgetUsage } from "../utils/extraordinaryBudget"
import { PAGE_SCROLL_SHELL, TABLE_SCROLL_X } from "../utils/pageScrollShell"
import {
  denyUnauthorizedComuneAccess,
  guardComuneAccess,
  isTownHallAccessDeniedError,
} from "../utils/townHallAccess"

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
  "Gestisci le bozze preventivo IMS del comune: crea nuove bozze da segnalazioni aperte che richiedono preventivo, modifica quelle da revisionare e monitora quelle in approvazione o già approvate."

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

const poleNumber = (quote) =>
  String(quote.lightPointId?.numero_palo || quote.lightPointId?.numeroPalo || "")

function QuotesDraftsSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Caricamento bozze preventivi">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-border/50 bg-card/40 p-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-10" />
          </div>
        ))}
      </div>
      <ChartSection className="space-y-3">
        <div className="flex justify-between gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-48 rounded-lg" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-border/40 p-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-8 w-28" />
          </div>
        ))}
      </ChartSection>
    </div>
  )
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
    <Button
      type="button"
      size={compact ? "sm" : "default"}
      variant="secondary"
      className={cn(
        "border border-violet-500/30 bg-violet-600/30 text-violet-100 hover:bg-violet-600/50",
        !compact && "min-h-11",
      )}
      onClick={() => onOpen(quote)}
      title={needsRevision ? "Revisiona e reinvia" : editable ? "Modifica e invia" : "Apri"}
    >
      {editable ? <Pencil className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
      {needsRevision ? "Revisiona" : editable ? "Modifica" : "Apri"}
    </Button>
    {editable ? (
      <Button
        type="button"
        size={compact ? "sm" : "default"}
        variant="outline"
        className={cn(
          "border-red-500/30 bg-red-600/20 text-red-100 hover:bg-red-600/40 hover:text-red-50",
          !compact && "min-h-11",
        )}
        onClick={() => onDelete(quote)}
        title="Elimina bozza"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Elimina
      </Button>
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
  index = 0,
  reduceMotion,
}) => (
  <motion.article
    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: Math.min(index * 0.03, 0.28), duration: 0.22 }}
    className={cn(
      "space-y-3 rounded-xl border p-4 backdrop-blur-xl",
      needsRevision
        ? "border-amber-500/30 bg-amber-950/25"
        : editable
          ? "border-violet-500/30 bg-violet-950/25"
          : "border-border/60 bg-card/60",
    )}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="font-semibold text-foreground">
          <LightPointMapLink
            lightPoint={quote.lightPointId}
            comune={comune}
            navigate={navigate}
            prefix="PL "
            className="font-semibold text-foreground hover:text-blue-200"
          />
        </p>
        <p className="mt-1 break-words text-sm text-muted-foreground">{reportLabel(quote)}</p>
      </div>
      <RiskClassBadge riskClass={quote.priorityClass} className="shrink-0" />
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <QuoteStatusBadge status={quote.status} />
      {quote.protocolNumber ? (
        <Badge variant="outline" className="font-mono text-[11px] text-violet-200">
          {quote.protocolNumber}
        </Badge>
      ) : null}
    </div>

    <p className="text-xs text-muted-foreground">
      {quote.updatedAt ? new Date(quote.updatedAt).toLocaleString("it-IT") : "—"}
    </p>

    <Separator className="bg-border/40" />

    <DraftListActions
      quote={quote}
      editable={editable}
      needsRevision={needsRevision}
      comune={comune}
      navigate={navigate}
      onOpen={onOpen}
      onDelete={onDelete}
    />
  </motion.article>
)

export default function QuotesDrafts() {
  const { userData } = useContext(UserContext)
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [searchParams, setSearchParams] = useSearchParams()
  const comune = searchParams.get("comune") || ""
  const statusFilter = normalizeStatusFilter(searchParams.get("stato"))

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [allQuotes, setAllQuotes] = useState([])
  const [query, setQuery] = useState("")
  const [budgetLimit, setBudgetLimit] = useState(null)
  const [approvedSpent, setApprovedSpent] = useState(0)

  const [createOpen, setCreateOpen] = useState(false)
  const [resolvedLoading, setResolvedLoading] = useState(false)
  const [resolvedOptions, setResolvedOptions] = useState([])
  const [selectedResolvedId, setSelectedResolvedId] = useState("")
  const [creating, setCreating] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState({ open: false, quote: null })
  const [deleting, setDeleting] = useState(false)

  const canManage = useMemo(() => canManageQuotesByRole(userData), [userData])

  const resolvedSelectOptions = useMemo(
    () =>
      resolvedOptions.map((item) => {
        const r = item.report
        return {
          value: String(r._id),
          pole: item.lightPoint?.numero_palo || "—",
          fault: formatReportFaultLabel(r) || "Segnalazione",
          date: r.report_date
            ? new Date(r.report_date).toLocaleDateString("it-IT")
            : "",
          riskClass: r.risk_class || "",
        }
      }),
    [resolvedOptions],
  )

  const setStatusFilter = useCallback(
    (nextStatus) => {
      const normalized = normalizeStatusFilter(nextStatus)
      const next = new URLSearchParams(searchParams)
      if (comune) next.set("comune", comune)
      next.set("stato", normalized)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams, comune],
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
      if (isTownHallAccessDeniedError(err)) {
        denyUnauthorizedComuneAccess(navigate)
        return
      }
      setError(err.response?.data?.error || "Impossibile caricare i preventivi.")
    } finally {
      setLoading(false)
    }
  }, [comune, navigate])

  const loadBudgetUsage = useCallback(async () => {
    if (!comune) {
      setBudgetLimit(null)
      setApprovedSpent(0)
      return
    }
    try {
      const { limit, approvedSpent: spent } = await fetchExtraordinaryBudgetUsage(api, comune)
      setBudgetLimit(limit)
      setApprovedSpent(spent)
    } catch (err) {
      console.error(err)
      setBudgetLimit(null)
      setApprovedSpent(0)
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
      setBudgetLimit(null)
      setApprovedSpent(0)
      return
    }
    if (!guardComuneAccess({ userData, comune, navigate })) return
    loadQuotes()
    loadBudgetUsage()
  }, [userData, canManage, comune, navigate, loadQuotes, loadBudgetUsage])

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
        matchesStatusFilter(quote.status, filter.value),
      ).length
    }
    return counts
  }, [allQuotes])

  const quotesByStatus = useMemo(
    () => allQuotes.filter((quote) => matchesStatusFilter(quote.status, statusFilter)),
    [allQuotes, statusFilter],
  )

  const filterText = query.trim().toLowerCase()
  const quotes = useMemo(() => {
    if (!filterText) return quotesByStatus
    return quotesByStatus.filter((quote) => {
      const pole = poleNumber(quote).toLowerCase()
      const protocol = String(quote.protocolNumber || "").toLowerCase()
      const report = reportLabel(quote).toLowerCase()
      return (
        pole.includes(filterText) ||
        protocol.includes(filterText) ||
        report.includes(filterText)
      )
    })
  }, [quotesByStatus, filterText])

  const actionableCount = statusCounts[DEFAULT_STATUS] || 0

  const openCreateModal = async () => {
    setCreateOpen(true)
    setSelectedResolvedId("")
    setResolvedLoading(true)
    try {
      const res = await api.get("/api/reports/resolved-for-quote", {
        params: { townHallName: comune },
      })
      const options = (res.data || []).filter(
        (item) =>
          !item.hasActiveQuote &&
          !item.report?.linked_quote_id &&
          !item.report?.is_solved &&
          item.report?.workflow_status === "PENDING_QUOTE",
      )
      setResolvedOptions(options)
      if (!options.length) {
        toast.error(
          "Nessuna segnalazione aperta che richieda un preventivo senza bozza già associata.",
        )
      }
    } catch (err) {
      console.error(err)
      toast.error(
        err.response?.data?.error || "Errore caricamento segnalazioni per preventivo",
      )
      setResolvedOptions([])
    } finally {
      setResolvedLoading(false)
    }
  }

  const handleCreate = async () => {
    const selected = resolvedOptions.find(
      (item) => String(item.report._id) === String(selectedResolvedId),
    )
    if (!selected) {
      toast.error("Seleziona una segnalazione.")
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

  const openQuote = (q) => navigate(`/quote/${q._id}`)
  const askDelete = (q) => setConfirmDelete({ open: true, quote: q })

  return (
    <div className={`${PAGE_SCROLL_SHELL} bg-gradient-to-br from-black via-blue-950 to-black p-4 sm:p-6`}>
      <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
        <div className="flex items-center justify-between gap-3" data-tour="page-quotes-title">
          <div className="flex min-w-0 items-center gap-3">
            <BackNavigationButton onClick={goToDashboard} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="flex min-w-0 items-center gap-2 text-2xl font-bold text-foreground">
                  <FileSpreadsheet className="h-6 w-6 shrink-0 text-violet-400" />
                  <span className="truncate">Bozze preventivi IMS</span>
                </h1>
                <InfoTooltip text={INFO_TEXT} />
              </div>
              <p className="truncate text-sm text-muted-foreground">{comune || "Nessun comune"}</p>
            </div>
          </div>
          <Button
            type="button"
            data-tour="page-quotes-create"
            onClick={openCreateModal}
            disabled={!comune}
            className="min-h-11 shrink-0 bg-violet-600 text-white hover:bg-violet-500"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuova bozza</span>
            <span className="sm:hidden">Nuova</span>
          </Button>
        </div>

        {budgetLimit != null ? (
          <div className="flex justify-end">
            <ExtraordinaryBudgetBar spent={approvedSpent} limit={budgetLimit} />
          </div>
        ) : null}

        <div
          className="grid grid-cols-2 gap-2 lg:grid-cols-4"
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
                className={cn(
                  "min-h-11 cursor-pointer rounded-xl border px-3 py-3 text-left transition-all duration-150",
                  active
                    ? filter.accent
                      ? "border-violet-400/50 bg-violet-600/30 text-violet-50 ring-2 ring-violet-400/40"
                      : "border-blue-400/50 bg-blue-600/30 text-blue-50 ring-2 ring-blue-400/40"
                    : "border-border/50 bg-card/50 text-muted-foreground hover:border-primary/40 hover:bg-card/80",
                )}
              >
                <span className="block truncate text-xs sm:text-sm opacity-90">{filter.label}</span>
                <span className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
                    {loading ? "—" : count}
                  </span>
                  {filter.accent && !loading && count > 0 ? (
                    <Badge
                      variant="secondary"
                      className="h-5 border-transparent bg-violet-500/30 px-1.5 text-[10px] uppercase tracking-wide text-violet-100"
                    >
                      da fare
                    </Badge>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>

        {loading ? (
          <QuotesDraftsSkeleton />
        ) : error ? (
          <ChartSection className="flex gap-2 border-red-500/30 bg-red-950/20 text-red-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </ChartSection>
        ) : (
          <ChartSection className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Elenco preventivi</h2>
                <p className="text-xs text-muted-foreground">
                  {quotes.length === 1 ? "1 risultato" : `${quotes.length} risultati`}
                  {filterText ? ` per “${query.trim()}”` : ""}
                  {!filterText && statusFilter === DEFAULT_STATUS && actionableCount > 0
                    ? " · da lavorare"
                    : ""}
                </p>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cerca PL, protocollo o segnalazione…"
                  className="h-10 w-full rounded-lg border border-border/70 bg-background/60 pl-9 pr-3 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Cerca preventivi"
                />
              </div>
            </div>

            <Separator className="bg-border/50" />

            <AnimatePresence mode="wait">
              {quotes.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  className="py-10 text-center"
                >
                  <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-muted-foreground/70" />
                  <p className="text-sm text-muted-foreground">
                    {filterText
                      ? "Nessun preventivo corrisponde alla ricerca."
                      : statusFilter === DEFAULT_STATUS
                        ? "Nessuna bozza o preventivo da revisionare."
                        : "Nessun preventivo con i filtri selezionati."}
                  </p>
                  {(statusFilter === DEFAULT_STATUS || allQuotes.length === 0) && !filterText ? (
                    <Button
                      type="button"
                      onClick={openCreateModal}
                      className="mt-4 bg-violet-600 text-white hover:bg-violet-500"
                    >
                      <Plus className="h-4 w-4" />
                      {allQuotes.length === 0 ? "Crea la prima bozza" : "Nuova bozza"}
                    </Button>
                  ) : null}
                </motion.div>
              ) : (
                <motion.div
                  key={`${statusFilter}-${filterText}`}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="space-y-3 md:hidden">
                    {quotes.map((quote, index) => {
                      const editable = EDITABLE.has(quote.status)
                      const needsRevision =
                        quote.status === "NEEDS_REVISION" || quote.status === "REJECTED"
                      return (
                        <DraftMobileCard
                          key={quote._id}
                          quote={quote}
                          editable={editable}
                          needsRevision={needsRevision}
                          comune={comune}
                          navigate={navigate}
                          onOpen={openQuote}
                          onDelete={askDelete}
                          index={index}
                          reduceMotion={reduceMotion}
                        />
                      )
                    })}
                  </div>

                  <div
                    className={cn(
                      "hidden overflow-hidden rounded-xl border border-border/60 bg-black/30 md:block",
                      TABLE_SCROLL_X,
                    )}
                  >
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 z-10 border-b border-border/50 bg-card/90 text-muted-foreground backdrop-blur-sm">
                        <tr>
                          <th className="px-4 py-3 font-medium">Punto luce</th>
                          <th className="px-4 py-3 font-medium">Segnalazione</th>
                          <th className="px-4 py-3 font-medium">Classe</th>
                          <th className="px-4 py-3 font-medium">Stato</th>
                          <th className="px-4 py-3 font-medium">Aggiornato</th>
                          <th className="px-4 py-3 text-right font-medium">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotes.map((quote, index) => {
                          const editable = EDITABLE.has(quote.status)
                          const needsRevision =
                            quote.status === "NEEDS_REVISION" || quote.status === "REJECTED"
                          return (
                            <motion.tr
                              key={quote._id}
                              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: Math.min(index * 0.02, 0.25), duration: 0.2 }}
                              className={cn(
                                "border-b border-border/30 transition-colors duration-150",
                                needsRevision
                                  ? "bg-amber-950/20 hover:bg-amber-900/30"
                                  : editable
                                    ? "bg-violet-950/15 hover:bg-violet-900/25"
                                    : "hover:bg-secondary/40",
                              )}
                            >
                              <td className="px-4 py-3 font-medium text-foreground">
                                <LightPointMapLink
                                  lightPoint={quote.lightPointId}
                                  comune={comune}
                                  navigate={navigate}
                                  className="font-medium"
                                />
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{reportLabel(quote)}</td>
                              <td className="px-4 py-3">
                                <RiskClassBadge riskClass={quote.priorityClass} />
                              </td>
                              <td className="px-4 py-3">
                                <QuoteStatusBadge status={quote.status} />
                                {quote.protocolNumber ? (
                                  <span className="mt-0.5 block font-mono text-xs text-violet-300/80">
                                    {quote.protocolNumber}
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {quote.updatedAt
                                  ? new Date(quote.updatedAt).toLocaleString("it-IT")
                                  : "—"}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right">
                                <DraftListActions
                                  quote={quote}
                                  editable={editable}
                                  needsRevision={needsRevision}
                                  comune={comune}
                                  navigate={navigate}
                                  compact
                                  onOpen={openQuote}
                                  onDelete={askDelete}
                                />
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </ChartSection>
        )}
      </div>

      <ViewportModal
        isOpen={createOpen}
        onClose={() => {
          if (!creating) setCreateOpen(false)
        }}
        size="md"
        labelledBy="quotes-drafts-create-title"
        describedBy="quotes-drafts-create-desc"
      >
        <ViewportModalHeader>
          <h3 id="quotes-drafts-create-title" className="text-lg font-semibold text-foreground">
            Nuova bozza preventivo
          </h3>
          <p id="quotes-drafts-create-desc" className="mt-1 text-sm text-muted-foreground">
            Seleziona una segnalazione aperta che richiede preventivo IMS e non ha ancora una
            bozza associata.
          </p>
        </ViewportModalHeader>
        <ViewportModalBody>
          {resolvedLoading ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-3 w-56" />
            </div>
          ) : resolvedSelectOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessuna segnalazione aperta in attesa di preventivo per questo comune.
            </p>
          ) : (
            <div
              role="listbox"
              aria-label="Segnalazioni che richiedono preventivo"
              className="space-y-2"
            >
              {resolvedSelectOptions.map((option) => {
                const selected = selectedResolvedId === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={creating}
                    onClick={() => setSelectedResolvedId(option.value)}
                    className={cn(
                      "w-full rounded-xl border px-3.5 py-3 text-left transition-colors duration-150",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                      selected
                        ? "border-violet-400/50 bg-violet-600/25 text-foreground ring-1 ring-violet-400/30"
                        : "border-border/60 bg-background/40 text-foreground hover:border-violet-400/40 hover:bg-violet-950/20",
                    )}
                  >
                    <span className="block text-sm font-medium leading-snug">
                      <span className="font-mono text-violet-200">PL {option.pole}</span>
                      <span className="text-muted-foreground"> · </span>
                      <span className="whitespace-normal break-words">{option.fault}</span>
                    </span>
                    {(option.date || option.riskClass) && (
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground whitespace-normal">
                        {[option.date, option.riskClass ? `Classe ${option.riskClass}` : ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </ViewportModalBody>
        <ViewportModalFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={creating}
            className="min-h-11"
            onClick={() => setCreateOpen(false)}
          >
            Annulla
          </Button>
          <Button
            type="button"
            disabled={creating || !selectedResolvedId}
            className="min-h-11 bg-violet-600 text-white hover:bg-violet-500"
            onClick={handleCreate}
          >
            {creating ? "Creazione…" : "Crea e apri"}
          </Button>
        </ViewportModalFooter>
      </ViewportModal>

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

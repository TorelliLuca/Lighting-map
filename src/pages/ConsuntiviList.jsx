"use client"

import { useState, useEffect, useContext, useMemo, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { UserContext, api } from "../context/UserContext"
import {
  AlertCircle,
  ClipboardCheck,
  Eye,
  FileSpreadsheet,
  Pencil,
  Search,
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
import { ChartSection } from "@/components/infoPanel/DistributionChart"
import { ExtraordinaryBudgetBar } from "@/components/ui/ExtraordinaryBudgetBar"
import { cn } from "@/lib/utils"
import {
  formatReportFaultLabel,
  canManageQuotesByRole,
  canApproveQuoteByRole,
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

const poleNumber = (doc) =>
  String(doc.lightPointId?.numero_palo || doc.lightPointId?.numeroPalo || "")

function ConsuntiviListSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Caricamento consuntivi">
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
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-28" />
          </div>
        ))}
      </ChartSection>
    </div>
  )
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
    <Button
      type="button"
      size={compact ? "sm" : "default"}
      variant="secondary"
      className={cn(
        "border border-amber-500/30 bg-amber-600/30 text-amber-100 hover:bg-amber-600/50",
        !compact && "min-h-11",
      )}
      onClick={() => onOpen(doc)}
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
    </Button>
    {editable && doc.status === "DRAFT" ? (
      <Button
        type="button"
        size={compact ? "sm" : "default"}
        variant="outline"
        className={cn(
          "border-red-500/30 bg-red-600/20 text-red-100 hover:bg-red-600/40 hover:text-red-50",
          !compact && "min-h-11",
        )}
        onClick={() => onDelete(doc)}
        title="Elimina bozza"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Elimina
      </Button>
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
        : reviewable
          ? "border-emerald-500/30 bg-emerald-950/25"
          : editable
            ? "border-amber-500/25 bg-amber-950/15"
            : "border-border/60 bg-card/60",
    )}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="font-semibold text-foreground">
          <LightPointMapLink
            lightPoint={doc.lightPointId}
            comune={comune}
            navigate={navigate}
            prefix="PL "
            className="font-semibold text-foreground hover:text-blue-200"
          />
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">Preventivo {parentLabel(doc)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <QuoteStatusBadge status={doc.status} />
        <RiskClassBadge riskClass={doc.priorityClass || doc.parentQuoteId?.priorityClass} />
      </div>
    </div>

    <p className="break-words text-sm text-muted-foreground">{reportLabel(doc)}</p>

    {doc.protocolNumber ? (
      <Badge variant="outline" className="font-mono text-[11px] text-amber-200">
        {doc.protocolNumber}
      </Badge>
    ) : null}

    <div className="flex items-center justify-between gap-3 text-sm">
      <p className="whitespace-nowrap font-medium tabular-nums text-foreground">
        € {Number(doc.total || 0).toFixed(2)}
      </p>
      <p className="text-right text-xs text-muted-foreground">
        {doc.updatedAt ? new Date(doc.updatedAt).toLocaleString("it-IT") : "—"}
      </p>
    </div>

    <Separator className="bg-border/40" />

    <ConsuntivoListActions
      doc={doc}
      editable={editable}
      reviewable={reviewable}
      comune={comune}
      navigate={navigate}
      onOpen={onOpen}
      onDelete={onDelete}
    />
  </motion.article>
)

export default function ConsuntiviList() {
  const { userData } = useContext(UserContext)
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [searchParams, setSearchParams] = useSearchParams()
  const comune = searchParams.get("comune") || ""
  const statusFilter = normalizeStatusFilter(searchParams.get("stato"))

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [allItems, setAllItems] = useState([])
  const [query, setQuery] = useState("")
  const [budgetLimit, setBudgetLimit] = useState(null)
  const [approvedSpent, setApprovedSpent] = useState(0)

  const [confirmDelete, setConfirmDelete] = useState({ open: false, item: null })
  const [deleting, setDeleting] = useState(false)

  const canManage = useMemo(() => canManageQuotesByRole(userData), [userData])
  const canApprove = useMemo(() => canApproveQuoteByRole(userData), [userData])

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
      if (isTownHallAccessDeniedError(err)) {
        denyUnauthorizedComuneAccess(navigate)
        return
      }
      setError(err.response?.data?.error || "Impossibile caricare i consuntivi.")
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
    if (!comune) {
      setError("Seleziona un comune dalla dashboard.")
      setLoading(false)
      setBudgetLimit(null)
      setApprovedSpent(0)
      return
    }
    // Prima il controllo comune, poi i redirect di ruolo
    if (!guardComuneAccess({ userData, comune, navigate })) return
    if (!canManage && canApprove) {
      navigate(
        `/quotes/approval?comune=${encodeURIComponent(comune)}&tipo=consuntivi`,
        { replace: true },
      )
      return
    }
    if (!canManage && !canApprove) {
      navigate("/dashboard")
      return
    }
    loadItems()
    loadBudgetUsage()
  }, [userData, canManage, canApprove, comune, navigate, loadItems, loadBudgetUsage])

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
        matchesStatusFilter(doc.status, filter.value),
      ).length
    }
    return counts
  }, [allItems])

  const itemsByStatus = useMemo(
    () => allItems.filter((doc) => matchesStatusFilter(doc.status, statusFilter)),
    [allItems, statusFilter],
  )

  const filterText = query.trim().toLowerCase()
  const items = useMemo(() => {
    if (!filterText) return itemsByStatus
    return itemsByStatus.filter((doc) => {
      const pole = poleNumber(doc).toLowerCase()
      const protocol = String(doc.protocolNumber || "").toLowerCase()
      const parent = String(parentLabel(doc)).toLowerCase()
      const report = reportLabel(doc).toLowerCase()
      return (
        pole.includes(filterText) ||
        protocol.includes(filterText) ||
        parent.includes(filterText) ||
        report.includes(filterText)
      )
    })
  }, [itemsByStatus, filterText])

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

  const askDelete = (item) => setConfirmDelete({ open: true, item })

  return (
    <div className={`${PAGE_SCROLL_SHELL} bg-gradient-to-br from-black via-blue-950 to-black p-4 sm:p-6`}>
      <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
        <div className="flex items-center gap-3" data-tour="page-consuntivi-title">
          <BackNavigationButton onClick={goToDashboard} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="flex min-w-0 items-center gap-2 text-2xl font-bold text-foreground">
                <FileSpreadsheet className="h-6 w-6 shrink-0 text-amber-400" />
                <span className="truncate">Consuntivi IMS</span>
              </h1>
              <InfoTooltip text={INFO_TEXT} />
            </div>
            <p className="truncate text-sm text-muted-foreground">{comune || "Nessun comune"}</p>
          </div>
        </div>

        {budgetLimit != null ? (
          <div className="flex justify-end">
            <ExtraordinaryBudgetBar spent={approvedSpent} limit={budgetLimit} />
          </div>
        ) : null}

        <div
          className="grid grid-cols-2 gap-2 lg:grid-cols-4"
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
                className={cn(
                  "min-h-11 cursor-pointer rounded-xl border px-3 py-3 text-left transition-all duration-150",
                  active
                    ? filter.accent
                      ? "border-amber-400/50 bg-amber-600/30 text-amber-50 ring-2 ring-amber-400/40"
                      : "border-blue-400/50 bg-blue-600/30 text-blue-50 ring-2 ring-blue-400/40"
                    : "border-border/50 bg-card/50 text-muted-foreground hover:border-primary/40 hover:bg-card/80",
                )}
              >
                <span className="block truncate text-xs opacity-90 sm:text-sm">{filter.label}</span>
                <span className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
                    {loading ? "—" : count}
                  </span>
                  {filter.accent && !loading && count > 0 ? (
                    <Badge
                      variant="secondary"
                      className="h-5 border-transparent bg-amber-500/30 px-1.5 text-[10px] uppercase tracking-wide text-amber-100"
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
          <ConsuntiviListSkeleton />
        ) : error ? (
          <ChartSection className="flex gap-2 border-red-500/30 bg-red-950/20 text-red-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </ChartSection>
        ) : (
          <ChartSection className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Elenco consuntivi</h2>
                <p className="text-xs text-muted-foreground">
                  {items.length === 1 ? "1 risultato" : `${items.length} risultati`}
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
                  placeholder="Cerca PL, protocollo, preventivo…"
                  className="h-10 w-full rounded-lg border border-border/70 bg-background/60 pl-9 pr-3 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Cerca consuntivi"
                />
              </div>
            </div>

            <Separator className="bg-border/50" />

            <AnimatePresence mode="wait">
              {items.length === 0 ? (
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
                      ? "Nessun consuntivo corrisponde alla ricerca."
                      : statusFilter === DEFAULT_STATUS
                        ? "Nessuna bozza o consuntivo da revisionare."
                        : "Nessun consuntivo con i filtri selezionati."}
                  </p>
                  {!filterText ? (
                    <p className="mt-2 text-xs text-muted-foreground/80">
                      I consuntivi si creano dopo la chiusura di un intervento straordinario.
                    </p>
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
                    {items.map((doc, index) => {
                      const editable = canManage && EDITABLE.has(doc.status)
                      const reviewable = canApprove && doc.status === "PENDING_APPROVAL"
                      const needsRevision =
                        doc.status === "NEEDS_REVISION" || doc.status === "REJECTED"
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
                          <th className="px-4 py-3 font-medium">Preventivo</th>
                          <th className="px-4 py-3 font-medium">Segnalazione</th>
                          <th className="px-4 py-3 font-medium">Classe</th>
                          <th className="px-4 py-3 font-medium">Totale</th>
                          <th className="px-4 py-3 font-medium">Stato</th>
                          <th className="px-4 py-3 font-medium">Aggiornato</th>
                          <th className="px-4 py-3 text-right font-medium">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((doc, index) => {
                          const editable = canManage && EDITABLE.has(doc.status)
                          const reviewable = canApprove && doc.status === "PENDING_APPROVAL"
                          const needsRevision =
                            doc.status === "NEEDS_REVISION" || doc.status === "REJECTED"
                          return (
                            <motion.tr
                              key={doc._id}
                              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: Math.min(index * 0.02, 0.25), duration: 0.2 }}
                              className={cn(
                                "border-b border-border/30 transition-colors duration-150",
                                needsRevision
                                  ? "bg-amber-950/20 hover:bg-amber-900/30"
                                  : reviewable
                                    ? "bg-emerald-950/15 hover:bg-emerald-900/25"
                                    : editable
                                      ? "bg-amber-950/10 hover:bg-amber-900/20"
                                      : "hover:bg-secondary/40",
                              )}
                            >
                              <td className="px-4 py-3 font-medium text-foreground">
                                <LightPointMapLink
                                  lightPoint={doc.lightPointId}
                                  comune={comune}
                                  navigate={navigate}
                                  className="font-medium"
                                />
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{parentLabel(doc)}</td>
                              <td className="px-4 py-3 text-muted-foreground">{reportLabel(doc)}</td>
                              <td className="px-4 py-3">
                                <RiskClassBadge
                                  riskClass={doc.priorityClass || doc.parentQuoteId?.priorityClass}
                                />
                              </td>
                              <td className="px-4 py-3 tabular-nums text-foreground">
                                € {Number(doc.total || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3">
                                <QuoteStatusBadge status={doc.status} />
                                {doc.protocolNumber ? (
                                  <span className="mt-0.5 block font-mono text-xs text-amber-300/80">
                                    {doc.protocolNumber}
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {doc.updatedAt
                                  ? new Date(doc.updatedAt).toLocaleString("it-IT")
                                  : "—"}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right">
                                <ConsuntivoListActions
                                  doc={doc}
                                  editable={editable}
                                  reviewable={reviewable}
                                  comune={comune}
                                  navigate={navigate}
                                  compact
                                  onOpen={openDoc}
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

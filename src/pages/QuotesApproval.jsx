"use client"

import { useState, useEffect, useContext, useCallback, useMemo } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { UserContext, api } from "../context/UserContext"
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Search,
} from "lucide-react"
import { BackNavigationButton } from "../components/BackNavigationButton"
import {
  GoToLightPointButton,
  LightPointMapLink,
} from "../components/GoToLightPointControl"
import InfoTooltip from "../components/ui/InfoTooltip"
import { QuoteStatusBadge } from "../components/ui/QuoteStatusBadge"
import { RiskClassBadge } from "../components/ui/RiskClassBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartSection } from "@/components/infoPanel/DistributionChart"
import { ExtraordinaryBudgetBar } from "@/components/ui/ExtraordinaryBudgetBar"
import { cn } from "@/lib/utils"
import { canApproveQuoteByRole, formatReportFaultLabel } from "../utils/utils"
import { fetchExtraordinaryBudgetUsage } from "../utils/extraordinaryBudget"
import { PAGE_SCROLL_SHELL, TABLE_SCROLL_X } from "../utils/pageScrollShell"
import {
  denyUnauthorizedComuneAccess,
  guardComuneAccess,
  isTownHallAccessDeniedError,
} from "../utils/townHallAccess"

const TYPE_FILTERS = [
  { value: "QUOTE", label: "Preventivi" },
  { value: "CONSUNTIVO", label: "Consuntivi" },
]

const STATUS_FILTERS_QUOTE = [
  { value: "PENDING_APPROVAL", label: "In approvazione" },
  { value: "APPROVED", label: "Approvati" },
  { value: "PENDING_APPROVAL,APPROVED", label: "Tutti" },
]

const STATUS_FILTERS_CONSUNTIVO = [
  { value: "PENDING_APPROVAL", label: "In revisione" },
  { value: "APPROVED", label: "Approvati" },
  { value: "REJECTED,NEEDS_REVISION", label: "Da revisionare" },
  { value: "PENDING_APPROVAL,APPROVED,REJECTED,NEEDS_REVISION", label: "Tutti" },
]

const ALL_STATUS_BY_TYPE = {
  QUOTE: "PENDING_APPROVAL,APPROVED",
  CONSUNTIVO: "PENDING_APPROVAL,APPROVED,REJECTED,NEEDS_REVISION",
}

const DEFAULT_STATUS = "PENDING_APPROVAL"

const normalizeDocType = (raw) => {
  const value = String(raw || "").toUpperCase()
  if (value === "CONSUNTIVO" || value === "CONSUNTIVI") return "CONSUNTIVO"
  return "QUOTE"
}

const statusFiltersForType = (type) =>
  type === "CONSUNTIVO" ? STATUS_FILTERS_CONSUNTIVO : STATUS_FILTERS_QUOTE

const normalizeStatusFilter = (raw, type) => {
  const filters = statusFiltersForType(type)
  const value = String(raw || "").trim()
  if (filters.some((f) => f.value === value)) return value
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

const leadDays = (doc) =>
  (Number(doc.materialLeadDays) || 0) + (Number(doc.workLeadDays) || 0)

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

function QuotesApprovalSkeleton({ isConsuntivo }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Caricamento approvazioni">
      <Skeleton className="h-12 w-full max-w-sm rounded-xl" />
      <div className={`grid gap-2 ${isConsuntivo ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-3"}`}>
        {Array.from({ length: isConsuntivo ? 4 : 3 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-border/50 bg-card/40 p-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-10" />
          </div>
        ))}
      </div>
      <ChartSection className="space-y-3">
        <div className="flex justify-between gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-10 w-48 rounded-lg" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-border/40 p-3">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </ChartSection>
    </div>
  )
}

const ApprovalActionButton = ({ pending, onClick, compact = false }) => (
  <Button
    type="button"
    size={compact ? "sm" : "default"}
    variant="secondary"
    className={cn(
      pending
        ? "border border-emerald-500/30 bg-emerald-600/30 text-emerald-100 hover:bg-emerald-600/50"
        : "border border-blue-500/30 bg-blue-600/20 text-blue-100 hover:bg-blue-600/40",
      !compact && "min-h-11",
    )}
    onClick={onClick}
  >
    {pending ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
    {pending ? "Revisiona" : "Visualizza"}
  </Button>
)

const ApprovalMobileCard = ({
  doc,
  isConsuntivo,
  comune,
  navigate,
  onOpen,
  index = 0,
  reduceMotion,
}) => {
  const pending = doc.status === "PENDING_APPROVAL"
  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.28), duration: 0.22 }}
      className={cn(
        "space-y-3 rounded-xl border p-4 backdrop-blur-xl",
        pending
          ? "border-emerald-500/30 bg-emerald-950/30"
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
          {isConsuntivo ? (
            <p className="mt-0.5 text-sm text-muted-foreground">Preventivo {parentLabel(doc)}</p>
          ) : null}
          <p className="mt-1 break-words text-sm text-muted-foreground">{reportLabel(doc)}</p>
        </div>
        <RiskClassBadge
          riskClass={doc.priorityClass || doc.parentQuoteId?.priorityClass}
          className="shrink-0"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <QuoteStatusBadge status={doc.status} />
        {doc.protocolNumber ? (
          <Badge variant="outline" className="font-mono text-[11px] text-emerald-200">
            {doc.protocolNumber}
          </Badge>
        ) : null}
        {!isConsuntivo ? (
          <span className="text-sm text-foreground">
            {leadDays(doc)} gg
            <span className="text-xs text-muted-foreground">
              {" "}
              (Mat. {doc.materialLeadDays || 0} + Op. {doc.workLeadDays || 0})
            </span>
          </span>
        ) : null}
      </div>

      <Separator className="bg-border/40" />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="whitespace-nowrap font-medium tabular-nums text-foreground">
          € {Number(doc.total || 0).toFixed(2)}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <GoToLightPointButton
            lightPoint={doc.lightPointId}
            comune={comune}
            navigate={navigate}
          />
          <ApprovalActionButton pending={pending} onClick={() => onOpen(doc)} />
        </div>
      </div>
    </motion.article>
  )
}

export default function QuotesApproval() {
  const { userData } = useContext(UserContext)
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [searchParams, setSearchParams] = useSearchParams()
  const comune = searchParams.get("comune") || ""
  const typeFilter = normalizeDocType(searchParams.get("tipo") || searchParams.get("type"))
  const statusFilter = normalizeStatusFilter(searchParams.get("stato"), typeFilter)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [allItems, setAllItems] = useState([])
  const [query, setQuery] = useState("")
  const [budgetLimit, setBudgetLimit] = useState(null)
  const [approvedSpent, setApprovedSpent] = useState(0)

  const statusFilters = statusFiltersForType(typeFilter)
  const isConsuntivo = typeFilter === "CONSUNTIVO"

  const goToDashboard = useCallback(() => {
    if (comune) {
      navigate("/dashboard", { state: { comune } })
      return
    }
    navigate("/dashboard")
  }, [navigate, comune])

  const infoText = useMemo(() => {
    if (isConsuntivo) {
      return "Consuntivi in attesa di revisione RUP, già approvati o rifiutati. In caso di rifiuto puoi contestare voci specifiche e/o lasciare un motivo generale; il manutentore corregge e reinoltra."
    }
    return "Preventivi in attesa di decisione DEC/RUP e già approvati. All'approvazione verrà creata una segnalazione straordinaria sul punto luce con scadenza calcolata dai giorni materiale + opera."
  }, [isConsuntivo])

  const updateParams = useCallback(
    ({ tipo, stato } = {}) => {
      const next = new URLSearchParams(searchParams)
      if (comune) next.set("comune", comune)
      if (tipo != null) {
        next.set("tipo", tipo === "CONSUNTIVO" ? "consuntivi" : "preventivi")
      }
      if (stato != null) {
        next.set("stato", stato)
      }
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams, comune],
  )

  const setTypeFilter = (nextType) => {
    const normalized = normalizeDocType(nextType)
    setQuery("")
    updateParams({ tipo: normalized, stato: DEFAULT_STATUS })
  }

  const setStatusFilter = (nextStatus) => {
    updateParams({ stato: normalizeStatusFilter(nextStatus, typeFilter) })
  }

  const loadBudgetUsage = useCallback(async () => {
    if (!comune) {
      setBudgetLimit(null)
      setApprovedSpent(0)
      return
    }
    try {
      const { limit, approvedSpent } = await fetchExtraordinaryBudgetUsage(api, comune)
      setBudgetLimit(limit)
      setApprovedSpent(approvedSpent)
    } catch (err) {
      console.error(err)
      setBudgetLimit(null)
      setApprovedSpent(0)
    }
  }, [comune])

  const loadItems = useCallback(async () => {
    if (!comune) return
    try {
      setLoading(true)
      setError("")
      const res = await api.get("/api/quotes", {
        params: {
          townHallName: comune,
          type: typeFilter,
          status: ALL_STATUS_BY_TYPE[typeFilter],
        },
      })
      setAllItems(res.data || [])
    } catch (err) {
      console.error(err)
      if (isTownHallAccessDeniedError(err)) {
        denyUnauthorizedComuneAccess(navigate)
        return
      }
      setError(
        err.response?.data?.error ||
          (isConsuntivo
            ? "Impossibile caricare i consuntivi in approvazione."
            : "Impossibile caricare i preventivi in approvazione."),
      )
    } finally {
      setLoading(false)
    }
  }, [comune, typeFilter, isConsuntivo, navigate])

  useEffect(() => {
    if (!userData) {
      navigate("/")
      return
    }
    if (!canApproveQuoteByRole(userData)) {
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
    loadItems()
    loadBudgetUsage()
  }, [userData, comune, navigate, loadItems, loadBudgetUsage])

  useEffect(() => {
    const raw = searchParams.get("stato")
    const normalized = normalizeStatusFilter(raw, typeFilter)
    if (raw === normalized) return
    const next = new URLSearchParams(searchParams)
    if (comune) next.set("comune", comune)
    next.set("stato", normalized)
    setSearchParams(next, { replace: true })
  }, [searchParams, typeFilter, comune, setSearchParams])

  const statusCounts = useMemo(() => {
    const counts = {}
    for (const filter of statusFilters) {
      counts[filter.value] = allItems.filter((doc) =>
        matchesStatusFilter(doc.status, filter.value),
      ).length
    }
    return counts
  }, [allItems, statusFilters])

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

  const pendingCount = statusCounts[DEFAULT_STATUS] || 0

  const openDoc = (doc) => {
    const navState = comune ? { comune } : undefined
    if (doc.type === "CONSUNTIVO" || isConsuntivo) {
      if (doc.status === "PENDING_APPROVAL") {
        navigate(`/consuntivo/${doc._id}/review`, { state: navState })
        return
      }
      navigate(`/consuntivo/${doc._id}`, { state: navState })
      return
    }
    navigate(`/quote/${doc._id}/review`, { state: navState })
  }

  return (
    <div className={`${PAGE_SCROLL_SHELL} bg-gradient-to-br from-black via-blue-950 to-black p-4 sm:p-6`}>
      <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
        <div className="flex items-center gap-3" data-tour="page-approval-title">
          <BackNavigationButton onClick={goToDashboard} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="flex min-w-0 items-center gap-2 text-2xl font-bold text-foreground">
                <ClipboardCheck className="h-6 w-6 shrink-0 text-emerald-400" />
                <span className="truncate">Approvazione IMS</span>
              </h1>
              <InfoTooltip text={infoText} />
            </div>
            <p className="truncate text-sm text-muted-foreground">{comune || "Nessun comune"}</p>
          </div>
        </div>

        {loading ? (
          <QuotesApprovalSkeleton isConsuntivo={isConsuntivo} />
        ) : error ? (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Tabs value={typeFilter} onValueChange={setTypeFilter}>
                <TabsList
                  className="h-auto w-full justify-start gap-1 bg-muted/40 p-1 sm:w-auto"
                  data-tour="page-approval-type"
                >
                  {TYPE_FILTERS.map((filter) => (
                    <TabsTrigger key={filter.value} value={filter.value} className="min-h-11 flex-1 sm:flex-none">
                      {filter.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              {budgetLimit != null ? (
                <ExtraordinaryBudgetBar spent={approvedSpent} limit={budgetLimit} />
              ) : null}
            </div>
            <ChartSection className="flex gap-2 border-red-500/30 bg-red-950/20 text-red-200">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </ChartSection>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Tabs value={typeFilter} onValueChange={setTypeFilter}>
                <TabsList
                  className="h-auto w-full justify-start gap-1 bg-muted/40 p-1 sm:w-auto"
                  data-tour="page-approval-type"
                  aria-label="Tipo documento"
                >
                  {TYPE_FILTERS.map((filter) => (
                    <TabsTrigger key={filter.value} value={filter.value} className="min-h-11 flex-1 sm:flex-none">
                      {filter.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              {budgetLimit != null ? (
                <ExtraordinaryBudgetBar spent={approvedSpent} limit={budgetLimit} />
              ) : null}
            </div>

            <div
              className={cn(
                "grid gap-2",
                isConsuntivo ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-3",
              )}
              data-tour="page-approval-status"
              role="group"
              aria-label="Filtro stato"
            >
              {statusFilters.map((filter) => {
                const active = statusFilter === filter.value
                const count = statusCounts[filter.value] ?? 0
                const isPendingBucket = filter.value === DEFAULT_STATUS
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setStatusFilter(filter.value)}
                    aria-pressed={active}
                    className={cn(
                      "min-h-11 cursor-pointer rounded-xl border px-3 py-3 text-left transition-all duration-150",
                      active
                        ? isPendingBucket
                          ? "border-emerald-400/50 bg-emerald-600/25 text-emerald-50 ring-2 ring-emerald-400/40"
                          : "border-blue-400/50 bg-blue-600/30 text-blue-50 ring-2 ring-blue-400/40"
                        : "border-border/50 bg-card/50 text-muted-foreground hover:border-primary/40 hover:bg-card/80",
                    )}
                  >
                    <span className="block truncate text-xs opacity-90 sm:text-sm">{filter.label}</span>
                    <span className="mt-0.5 flex items-baseline gap-1.5">
                      <span className="text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
                        {count}
                      </span>
                      {isPendingBucket && count > 0 ? (
                        <Badge
                          variant="secondary"
                          className="h-5 border-transparent bg-emerald-500/30 px-1.5 text-[10px] uppercase tracking-wide text-emerald-100"
                        >
                          in coda
                        </Badge>
                      ) : null}
                    </span>
                  </button>
                )
              })}
            </div>

            <ChartSection className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    {isConsuntivo ? "Elenco consuntivi" : "Elenco preventivi"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {items.length === 1 ? "1 risultato" : `${items.length} risultati`}
                    {filterText ? ` per “${query.trim()}”` : ""}
                    {!filterText && statusFilter === DEFAULT_STATUS && pendingCount > 0
                      ? " · da esaminare"
                      : ""}
                  </p>
                </div>
                <div className="relative w-full sm:max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={
                      isConsuntivo
                        ? "Cerca PL, protocollo, preventivo…"
                        : "Cerca PL, protocollo o segnalazione…"
                    }
                    className="h-10 w-full rounded-lg border border-border/70 bg-background/60 pl-9 pr-3 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Cerca documenti"
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
                    <ClipboardCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/70" />
                    <p className="text-sm text-muted-foreground">
                      {filterText
                        ? "Nessun documento corrisponde alla ricerca."
                        : statusFilter === DEFAULT_STATUS
                          ? isConsuntivo
                            ? "Nessun consuntivo in attesa di revisione."
                            : "Nessun preventivo in attesa di approvazione."
                          : isConsuntivo
                            ? "Nessun consuntivo trovato per questo filtro."
                            : "Nessun preventivo trovato per questo filtro."}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`${typeFilter}-${statusFilter}-${filterText}`}
                    initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    className="space-y-3"
                  >
                    <div className="space-y-3 md:hidden">
                      {items.map((doc, index) => (
                        <ApprovalMobileCard
                          key={doc._id}
                          doc={doc}
                          isConsuntivo={isConsuntivo}
                          comune={comune}
                          navigate={navigate}
                          onOpen={openDoc}
                          index={index}
                          reduceMotion={reduceMotion}
                        />
                      ))}
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
                            {isConsuntivo ? (
                              <th className="px-4 py-3 font-medium">Preventivo</th>
                            ) : null}
                            <th className="px-4 py-3 font-medium">Segnalazione</th>
                            <th className="px-4 py-3 font-medium">Classe</th>
                            {!isConsuntivo ? (
                              <th className="px-4 py-3 font-medium">Tempistica</th>
                            ) : null}
                            <th className="px-4 py-3 font-medium">Totale</th>
                            <th className="px-4 py-3 font-medium">Stato</th>
                            <th className="px-4 py-3 text-right font-medium">Azioni</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((doc, index) => {
                            const pending = doc.status === "PENDING_APPROVAL"
                            return (
                              <motion.tr
                                key={doc._id}
                                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  delay: Math.min(index * 0.02, 0.25),
                                  duration: 0.2,
                                }}
                                className={cn(
                                  "border-b border-border/30 transition-colors duration-150",
                                  pending
                                    ? "bg-emerald-950/20 hover:bg-emerald-900/30"
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
                                {isConsuntivo ? (
                                  <td className="px-4 py-3 text-muted-foreground">
                                    {parentLabel(doc)}
                                  </td>
                                ) : null}
                                <td className="px-4 py-3 text-muted-foreground">
                                  {reportLabel(doc)}
                                </td>
                                <td className="px-4 py-3">
                                  <RiskClassBadge
                                    riskClass={
                                      doc.priorityClass || doc.parentQuoteId?.priorityClass
                                    }
                                  />
                                </td>
                                {!isConsuntivo ? (
                                  <td className="px-4 py-3 text-foreground">
                                    {leadDays(doc)} gg
                                    <span className="block text-xs text-muted-foreground">
                                      Mat. {doc.materialLeadDays || 0} + Op.{" "}
                                      {doc.workLeadDays || 0}
                                    </span>
                                  </td>
                                ) : null}
                                <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-foreground">
                                  € {Number(doc.total || 0).toFixed(2)}
                                </td>
                                <td className="px-4 py-3">
                                  <QuoteStatusBadge status={doc.status} />
                                  {doc.protocolNumber ? (
                                    <span className="mt-0.5 block font-mono text-xs text-emerald-300/80">
                                      {doc.protocolNumber}
                                    </span>
                                  ) : null}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-right">
                                  <div className="inline-flex flex-wrap items-center justify-end gap-2">
                                    <GoToLightPointButton
                                      lightPoint={doc.lightPointId}
                                      comune={comune}
                                      navigate={navigate}
                                      className="min-h-0 py-1.5"
                                    />
                                    <ApprovalActionButton
                                      pending={pending}
                                      compact
                                      onClick={() => openDoc(doc)}
                                    />
                                  </div>
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
          </>
        )}
      </div>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  MapPin,
  Search,
  User,
  Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatReportFaultLabel } from "@/utils/utils"
import { buildChartModel } from "@/utils/infoPanelCharts"
import { StatCard } from "@/components/ui/StatCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DistributionChart } from "@/components/infoPanel/DistributionChart"

const LIST_PREVIEW = 10

const OPERATION_TYPE_LABELS = {
  MADE_SAFE_BUT_SYSTEM_NEEDS_RESTORING: "Messo in sicurezza",
  FAULT_ELIMINATED_AND_SYSTEM_RESTORED: "Guasto eliminato",
  OTHER: "Altro",
}

const REPORT_TYPE_BADGE = {
  LIGHT_POINT_OFF: "border-yellow-500/40 bg-yellow-500/15 text-yellow-200",
  PLANT_OFF: "border-red-500/40 bg-red-500/15 text-red-200",
  DAMAGED_COMPLEX: "border-orange-500/40 bg-orange-500/15 text-orange-200",
  DAMAGED_SUPPORT: "border-purple-500/40 bg-purple-500/15 text-purple-200",
  BROKEN_TERMINAL_BLOCK: "border-pink-500/40 bg-pink-500/15 text-pink-200",
  BROKEN_PANEL: "border-indigo-500/40 bg-indigo-500/15 text-indigo-200",
  SINGLE_OFF: "border-yellow-500/40 bg-yellow-500/15 text-yellow-200",
  MULTIPLE_OFF: "border-orange-500/40 bg-orange-500/15 text-orange-200",
  IMMEDIATE_DANGER: "border-red-500/40 bg-red-500/15 text-red-200",
  PANEL_DAMAGE: "border-indigo-500/40 bg-indigo-500/15 text-indigo-200",
  PANEL_DOOR_UNSAFE: "border-red-500/40 bg-red-500/15 text-red-200",
  PANEL_PROTECTION_TRIP: "border-orange-500/40 bg-orange-500/15 text-orange-200",
  PANEL_SUPPLY_FAULT: "border-purple-500/40 bg-purple-500/15 text-purple-200",
  NON_URGENT: "border-slate-500/40 bg-slate-500/15 text-slate-200",
}

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A"
  return new Date(dateStr).toLocaleDateString("it-IT")
}

const SectionShell = ({ children, className }) => (
  <section
    className={cn(
      "rounded-xl border border-border/60 bg-card/70 p-4 backdrop-blur-xl sm:p-5",
      className,
    )}
  >
    {children}
  </section>
)

const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-10 text-center">
    <Icon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/70" />
    {title && <h3 className="mb-1 text-base font-semibold text-muted-foreground">{title}</h3>}
    <p className="text-sm text-muted-foreground/80">{description}</p>
  </div>
)

function SegnalazioniSkeleton() {
  return (
    <div className="space-y-5 sm:space-y-6" aria-busy="true" aria-label="Caricamento segnalazioni">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-14" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <SectionShell key={i} className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-[220px] w-full rounded-lg" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-14" />
            </div>
          </SectionShell>
        ))}
      </div>

      <SectionShell className="space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border border-border/40 p-3">
            <Skeleton className="mt-0.5 h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-3 w-16 shrink-0" />
          </div>
        ))}
      </SectionShell>
    </div>
  )
}

const GoToPole = ({ numeroPalo, lat, lng, onNavigate, className }) => {
  if (!numeroPalo) return null
  const canNavigate = lat != null && lng != null && onNavigate

  if (!canNavigate) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold text-blue-200", className)}>
        <MapPin className="h-3.5 w-3.5 text-primary" />
        PL {numeroPalo}
      </span>
    )
  }

  return (
    <Button
      type="button"
      variant="link"
      className={cn("h-auto gap-1.5 p-0 text-sm font-semibold text-blue-300 hover:text-blue-100", className)}
      onClick={(e) => {
        e.stopPropagation()
        onNavigate(lat, lng, numeroPalo)
      }}
      title="Vai al punto sulla mappa"
    >
      <MapPin className="h-3.5 w-3.5" />
      PL {numeroPalo}
    </Button>
  )
}

const ReportRow = ({ report, type, onNavigateToPoint, index = 0, reduceMotion }) => {
  const isResolved = type === "resolved"
  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.22 }}
      className={cn(
        "group flex gap-3 rounded-xl border p-3 transition-colors sm:p-3.5",
        isResolved
          ? "border-green-500/25 bg-green-950/20 hover:bg-green-950/35"
          : "border-red-500/25 bg-red-950/20 hover:bg-red-950/35",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
          isResolved
            ? "border-green-500/40 bg-green-500/15 text-green-300"
            : "border-red-500/40 bg-red-500/15 text-red-300",
        )}
      >
        {isResolved ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <GoToPole
            numeroPalo={report.numero_palo}
            lat={report.lat}
            lng={report.lng}
            onNavigate={onNavigateToPoint}
          />
          <Badge
            variant="outline"
            className={cn(
              "max-w-full whitespace-normal text-left font-normal",
              REPORT_TYPE_BADGE[report.report_type || report.fault_label] ||
                "border-border bg-muted/40 text-muted-foreground",
            )}
          >
            {formatReportFaultLabel(report)}
          </Badge>
        </div>

        {report.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {report.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {report.report_time && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {report.report_time}
            </span>
          )}
          {isResolved && report.user_responsible_id && (
            <span className="inline-flex items-center gap-1 text-green-300/90">
              <User className="h-3 w-3" />
              Responsabile assegnato
            </span>
          )}
        </div>
      </div>

      <time className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {formatDate(report.report_date)}
      </time>
    </motion.article>
  )
}

const OperationRow = ({ operation, onNavigateToPoint, index = 0, reduceMotion }) => {
  const maintenanceLabel =
    operation.maintenance_type === "ORDINARY"
      ? "Ordinaria"
      : operation.maintenance_type === "EXTRAORDINARY"
        ? "Straordinaria"
        : ""

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.22 }}
      className="group flex gap-3 rounded-xl border border-blue-500/25 bg-blue-950/20 p-3 transition-colors hover:bg-blue-950/35 sm:p-3.5"
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-500/40 bg-blue-500/15 text-blue-300">
        <Wrench className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <GoToPole
            numeroPalo={operation.numero_palo}
            lat={operation.lat}
            lng={operation.lng}
            onNavigate={onNavigateToPoint}
          />
          <span className="text-sm text-blue-200/90">
            {maintenanceLabel ? `Manutenzione ${maintenanceLabel}` : "Operazione"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-normal border-blue-500/30 bg-blue-500/10 text-blue-100">
            <FileText className="mr-1 h-3 w-3" />
            {OPERATION_TYPE_LABELS[operation.operation_type] || operation.operation_type}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "gap-1",
              operation.is_solved
                ? "border-green-500/40 bg-green-500/15 text-green-200"
                : "border-yellow-500/40 bg-yellow-500/15 text-yellow-200",
            )}
          >
            {operation.is_solved ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {operation.is_solved ? "Risolto" : "In attesa"}
          </Badge>
        </div>

        {operation.note && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{operation.note}</p>
        )}
      </div>

      <time className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {formatDate(operation.operation_date)}
      </time>
    </motion.article>
  )
}

function ActivityList({ items, expanded, onExpand, moreLabel, renderItem, empty }) {
  if (!items.length) return empty

  const visible = expanded ? items : items.slice(0, LIST_PREVIEW)

  return (
    <div className="space-y-2.5">
      <div className="max-h-[min(55vh,28rem)] space-y-2.5 overflow-y-auto overscroll-contain pr-0.5 scrollbar-thin">
        {visible.map(renderItem)}
      </div>
      {!expanded && items.length > LIST_PREVIEW && (
        <Button type="button" variant="ghost" className="h-11 w-full text-muted-foreground hover:text-foreground" onClick={onExpand}>
          Mostra altre {items.length - LIST_PREVIEW} {moreLabel}
        </Button>
      )}
    </div>
  )
}

/**
 * Tab Segnalazioni dell'InfoPanel: overview + chart shadcn + liste attività.
 */
export function InfoPanelSegnalazioni({
  reportsStats,
  reportTypePieData,
  operationTypePieData,
  onNavigateToPoint,
  isActive,
}) {
  const reduceMotion = useReducedMotion()
  const [ready, setReady] = useState(false)
  const [listTab, setListTab] = useState("in_corso")
  const [query, setQuery] = useState("")
  const [expanded, setExpanded] = useState({
    in_corso: false,
    risolte: false,
    operazioni: false,
  })

  useEffect(() => {
    if (!isActive || ready) return undefined
    const delay = reduceMotion ? 0 : 220
    const t = window.setTimeout(() => setReady(true), delay)
    return () => window.clearTimeout(t)
  }, [isActive, reduceMotion, ready])

  const reportChart = useMemo(() => buildChartModel(reportTypePieData || []), [reportTypePieData])
  const operationChart = useMemo(
    () => buildChartModel(operationTypePieData || []),
    [operationTypePieData],
  )

  const filterText = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    const matchPole = (item) =>
      !filterText || String(item.numero_palo || "").toLowerCase().includes(filterText)

    return {
      in_corso: (reportsStats.reportsInProgress || []).filter(matchPole),
      risolte: (reportsStats.reportsResolved || []).filter(matchPole),
      operazioni: (reportsStats.operations || []).filter(matchPole),
    }
  }, [reportsStats, filterText])

  const totals = {
    in_corso: reportsStats.totalReportsInProgress || 0,
    risolte: reportsStats.totalReportsResolved || 0,
    operazioni: reportsStats.totalOperations || 0,
  }

  const isEmpty = totals.in_corso === 0 && totals.risolte === 0 && totals.operazioni === 0

  if (!ready) return <SegnalazioniSkeleton />

  if (isEmpty) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Nessuna segnalazione"
        description="Non sono presenti segnalazioni o operazioni per l'area selezionata."
      />
    )
  }

  return (
    <div className="space-y-5 pb-8 sm:space-y-6 sm:pb-12">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3">
        <StatCard
          title="In corso"
          value={totals.in_corso}
          icon={AlertCircle}
          color="red"
          active={listTab === "in_corso"}
          onClick={() => setListTab("in_corso")}
        />
        <StatCard
          title="Risolte"
          value={totals.risolte}
          icon={CheckCircle}
          color="green"
          active={listTab === "risolte"}
          onClick={() => setListTab("risolte")}
        />
        <StatCard
          title="Operazioni"
          value={totals.operazioni}
          icon={Wrench}
          color="blue"
          active={listTab === "operazioni"}
          onClick={() => setListTab("operazioni")}
          className="col-span-2 md:col-span-1"
        />
      </div>

      {(reportChart.data.length > 0 || operationChart.data.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {reportChart.data.length > 0 && (
            <DistributionChart title="Segnalazioni per tipo" model={reportChart} />
          )}
          {operationChart.data.length > 0 && (
            <DistributionChart title="Operazioni per tipo" model={operationChart} />
          )}
        </div>
      )}

      <SectionShell className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Attività recenti</h3>
            <p className="text-xs text-muted-foreground">
              Tocca una statistica oppure usa i filtri qui sotto
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtra per n° punto luce…"
              className="h-10 w-full rounded-lg border border-border/70 bg-background/60 pl-9 pr-3 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Filtra per numero punto luce"
            />
          </div>
        </div>

        <Separator className="bg-border/50" />

        <Tabs value={listTab} onValueChange={setListTab} className="w-full">
          <TabsList className="mb-3 h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
            <TabsTrigger value="in_corso" className="min-h-10 flex-1 gap-1.5 sm:flex-none">
              In corso
              <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 tabular-nums">
                {filtered.in_corso.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="risolte" className="min-h-10 flex-1 gap-1.5 sm:flex-none">
              Risolte
              <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 tabular-nums">
                {filtered.risolte.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="operazioni" className="min-h-10 flex-1 gap-1.5 sm:flex-none">
              Operazioni
              <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 tabular-nums">
                {filtered.operazioni.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="in_corso" className="mt-0 focus-visible:ring-0">
              <motion.div
                key={`in_corso-${filterText}`}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ActivityList
                  items={filtered.in_corso}
                  expanded={expanded.in_corso}
                  onExpand={() => setExpanded((s) => ({ ...s, in_corso: true }))}
                  moreLabel="segnalazioni"
                  empty={
                    <EmptyState
                      icon={AlertCircle}
                      description={
                        filterText
                          ? "Nessuna segnalazione in corso corrisponde al filtro."
                          : "Nessuna segnalazione in corso."
                      }
                    />
                  }
                  renderItem={(report, idx) => (
                    <ReportRow
                      key={`progress-${report._id || idx}`}
                      report={report}
                      type="progress"
                      onNavigateToPoint={onNavigateToPoint}
                      index={idx}
                      reduceMotion={reduceMotion}
                    />
                  )}
                />
              </motion.div>
            </TabsContent>

            <TabsContent value="risolte" className="mt-0 focus-visible:ring-0">
              <motion.div
                key={`risolte-${filterText}`}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ActivityList
                  items={filtered.risolte}
                  expanded={expanded.risolte}
                  onExpand={() => setExpanded((s) => ({ ...s, risolte: true }))}
                  moreLabel="segnalazioni"
                  empty={
                    <EmptyState
                      icon={CheckCircle}
                      description={
                        filterText
                          ? "Nessuna segnalazione risolta corrisponde al filtro."
                          : "Nessuna segnalazione risolta."
                      }
                    />
                  }
                  renderItem={(report, idx) => (
                    <ReportRow
                      key={`resolved-${report._id || idx}`}
                      report={report}
                      type="resolved"
                      onNavigateToPoint={onNavigateToPoint}
                      index={idx}
                      reduceMotion={reduceMotion}
                    />
                  )}
                />
              </motion.div>
            </TabsContent>

            <TabsContent value="operazioni" className="mt-0 focus-visible:ring-0">
              <motion.div
                key={`operazioni-${filterText}`}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ActivityList
                  items={filtered.operazioni}
                  expanded={expanded.operazioni}
                  onExpand={() => setExpanded((s) => ({ ...s, operazioni: true }))}
                  moreLabel="operazioni"
                  empty={
                    <EmptyState
                      icon={Wrench}
                      description={
                        filterText
                          ? "Nessuna operazione corrisponde al filtro."
                          : "Nessuna operazione registrata."
                      }
                    />
                  }
                  renderItem={(operation, idx) => (
                    <OperationRow
                      key={`operation-${operation._id || idx}`}
                      operation={operation}
                      onNavigateToPoint={onNavigateToPoint}
                      index={idx}
                      reduceMotion={reduceMotion}
                    />
                  )}
                />
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </SectionShell>
    </div>
  )
}

export default InfoPanelSegnalazioni

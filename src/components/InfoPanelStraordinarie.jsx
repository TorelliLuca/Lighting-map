"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  AlertCircle,
  Clock,
  ExternalLink,
  Hexagon,
  MapPin,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { StatCard } from "@/components/ui/StatCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DueStatusBadge } from "@/components/ui/DueStatusBadge"
import { RiskClassBadge } from "@/components/ui/RiskClassBadge"
import { WorkflowStatusBadge } from "@/components/ui/WorkflowStatusBadge"
import { ChartSection } from "@/components/infoPanel/DistributionChart"

const FILTER_TABS = [
  { id: "all", label: "Tutte" },
  { id: "overdue", label: "Scadute" },
  { id: "soon", label: "In scadenza" },
  { id: "ok", label: "Nei tempi" },
  { id: "none", label: "Senza data" },
]

const LIST_PREVIEW = 12

function StraordinarieSkeleton() {
  return (
    <div className="space-y-5 sm:space-y-6" aria-busy="true" aria-label="Caricamento straordinarie">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-border/50 bg-card/40 p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ChartSection className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-6 w-20" />
        </ChartSection>
        <ChartSection className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-6 w-24" />
        </ChartSection>
      </div>

      <ChartSection className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-border/40 p-3">
            <Skeleton className="mt-0.5 h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-20 shrink-0" />
          </div>
        ))}
      </ChartSection>
    </div>
  )
}

const InsightChip = ({ label, value, hint }) => (
  <ChartSection className="space-y-1">
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="truncate text-xl font-bold tabular-nums text-foreground sm:text-2xl">{value}</p>
    {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
  </ChartSection>
)

const ExtraordinaryRow = ({
  report,
  index,
  reduceMotion,
  onNavigateToPoint,
  onOpenQuote,
}) => {
  const urgency = report.dueUrgency || "none"
  const borderClass =
    urgency === "overdue"
      ? "border-red-500/30 bg-red-950/20 hover:bg-red-950/35"
      : urgency === "soon"
        ? "border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/35"
        : "border-orange-500/25 bg-orange-950/15 hover:bg-orange-950/30"

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.22 }}
      className={cn("flex gap-3 rounded-xl border p-3 transition-colors sm:p-3.5", borderClass)}
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/15 text-orange-200">
        <Hexagon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Button
            type="button"
            variant="link"
            className="h-auto gap-1.5 p-0 text-sm font-semibold text-blue-300 hover:text-blue-100"
            onClick={() => onNavigateToPoint?.(report.lat, report.lng, report.numero_palo)}
            title="Vai al punto sulla mappa"
          >
            <MapPin className="h-3.5 w-3.5" />
            PL {report.numero_palo}
          </Button>
          <RiskClassBadge riskClass={report.risk_class} prefix />
          <WorkflowStatusBadge status={report.workflow_status} />
        </div>

        {report.linked_quote_id && (
          <Button
            type="button"
            variant="link"
            className="h-auto gap-1 p-0 text-xs text-blue-300 hover:text-white"
            onClick={() => onOpenQuote?.(report.linked_quote_id)}
          >
            Apri preventivo
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
      </div>

      <DueStatusBadge
        dueStatus={urgency}
        daysRemaining={report.daysRemaining}
        showDate={Boolean(report.due_date)}
        dueDate={report.due_date}
        className="shrink-0 self-start"
      />
    </motion.article>
  )
}

/**
 * Tab Straordinarie dell'InfoPanel.
 */
export function InfoPanelStraordinarie({
  isActive,
  extraordinary,
  townhallName,
  onNavigateToPoint,
  onClose,
  onOpenDashboard,
  onOpenQuote,
}) {
  const reduceMotion = useReducedMotion()
  const [ready, setReady] = useState(false)
  const [filterTab, setFilterTab] = useState("all")
  const [query, setQuery] = useState("")
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!isActive || ready) return undefined
    const delay = reduceMotion ? 0 : 220
    const t = window.setTimeout(() => setReady(true), delay)
    return () => window.clearTimeout(t)
  }, [isActive, reduceMotion, ready])

  const items = extraordinary?.items || []
  const counts = useMemo(() => {
    const base = { all: items.length, overdue: 0, soon: 0, ok: 0, none: 0 }
    items.forEach((item) => {
      const key = item.dueUrgency || "none"
      if (key in base) base[key] += 1
      else base.none += 1
    })
    return base
  }, [items])

  const withQuote = useMemo(
    () => items.filter((item) => item.linked_quote_id).length,
    [items],
  )

  const highRisk = useMemo(
    () =>
      items.filter((item) => {
        const code = String(item.risk_class || "").toUpperCase()
        return code === "A" || code === "B"
      }).length,
    [items],
  )

  const filterText = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const urgency = item.dueUrgency || "none"
      if (filterTab !== "all" && urgency !== filterTab) return false
      if (!filterText) return true
      return String(item.numero_palo || "").toLowerCase().includes(filterText)
    })
  }, [items, filterTab, filterText])

  const visible = expanded ? filtered : filtered.slice(0, LIST_PREVIEW)

  if (!ready) return <StraordinarieSkeleton />

  return (
    <div className="space-y-5 pb-8 sm:space-y-6 sm:pb-12">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-4">
        <StatCard
          title="Aperte"
          value={extraordinary?.open || 0}
          icon={Hexagon}
          active={filterTab === "all"}
          onClick={() => setFilterTab("all")}
        />
        <StatCard
          title="In scadenza"
          value={extraordinary?.soon || 0}
          icon={Clock}
          color="amber"
          active={filterTab === "soon"}
          onClick={() => setFilterTab("soon")}
        />
        <StatCard
          title="Scadute"
          value={extraordinary?.overdue || 0}
          icon={AlertCircle}
          color="red"
          active={filterTab === "overdue"}
          onClick={() => setFilterTab("overdue")}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InsightChip
          label="Classe A/B"
          value={highRisk}
          hint="Straordinarie a rischio elevato"
        />
        <InsightChip
          label="Con preventivo"
          value={withQuote}
          hint={townhallName ? `Sul comune ${townhallName}` : "Collegate a un preventivo"}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Anteprima locale · per gestire workflow e scadenze apri la dashboard
        </p>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 border border-orange-500/40 bg-orange-600/30 text-orange-100 hover:bg-orange-600/50"
          onClick={() => {
            onClose?.()
            onOpenDashboard?.()
          }}
        >
          <ExternalLink className="h-4 w-4" />
          Apri dashboard straordinarie
        </Button>
      </div>

      <ChartSection className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Attività straordinarie</h3>
            <p className="text-xs text-muted-foreground">
              Filtra per urgenza o cerca un punto luce
            </p>
          </div>
          <Tabs value={filterTab} onValueChange={setFilterTab}>
            <TabsList className="h-auto flex-wrap gap-1 bg-muted/40 p-1">
              {FILTER_TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="min-h-9 gap-1.5">
                  {tab.label}
                  <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 tabular-nums">
                    {counts[tab.id] || 0}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <Separator className="bg-border/50" />

        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtra per n° punto luce…"
            className="h-10 w-full rounded-lg border border-border/70 bg-background/60 pl-9 pr-3 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Filtra straordinarie per numero punto luce"
          />
        </div>

        {items.length === 0 ? (
          <div className="py-10 text-center">
            <Hexagon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/70" />
            <p className="text-sm text-muted-foreground">
              Nessuna straordinaria aperta sul comune corrente.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nessuna straordinaria corrisponde ai filtri selezionati.
          </p>
        ) : (
          <div className="space-y-2.5">
            <div className="max-h-[min(55vh,28rem)] space-y-2.5 overflow-y-auto overscroll-contain pr-0.5 scrollbar-thin">
              {visible.map((report, idx) => (
                <ExtraordinaryRow
                  key={report._id || idx}
                  report={report}
                  index={idx}
                  reduceMotion={reduceMotion}
                  onNavigateToPoint={onNavigateToPoint}
                  onOpenQuote={(quoteId) => {
                    onClose?.()
                    onOpenQuote?.(quoteId)
                  }}
                />
              ))}
            </div>
            {!expanded && filtered.length > LIST_PREVIEW && (
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full text-muted-foreground hover:text-foreground"
                onClick={() => setExpanded(true)}
              >
                Mostra altre {filtered.length - LIST_PREVIEW} straordinarie
              </Button>
            )}
          </div>
        )}
      </ChartSection>
    </div>
  )
}

export default InfoPanelStraordinarie

"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  AlertCircle,
  Box,
  Building2,
  Lightbulb,
  MapPin,
  Search,
  LayoutGrid,
  List,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { StatCard } from "@/components/ui/StatCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartSection } from "@/components/infoPanel/DistributionChart"

const BREAKDOWN_TABS = [
  { id: "proprieta", label: "Proprietà", icon: Building2 },
  { id: "apparecchi", label: "Apparecchi", icon: Lightbulb },
  { id: "lampade", label: "Lampade", icon: Lightbulb },
]

function toRankedEntries(counts) {
  return Object.entries(counts || {})
    .map(([name, value]) => ({ name, value: Number(value) || 0 }))
    .sort((a, b) => b.value - a.value)
}

function StatisticheSkeleton() {
  return (
    <div className="space-y-5 sm:space-y-6" aria-busy="true" aria-label="Caricamento statistiche">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-border/50 bg-card/40 p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-14" />
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <ChartSection key={i} className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-3 w-36" />
          </ChartSection>
        ))}
      </div>

      <ChartSection className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </ChartSection>
    </div>
  )
}

const InsightChip = ({ label, value, hint }) => (
  <ChartSection className="space-y-1">
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-xl font-bold tabular-nums text-foreground sm:text-2xl">{value}</p>
    {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
  </ChartSection>
)

const RankRow = ({ name, value, total, index, reduceMotion, accentClass }) => {
  const pct = total > 0 ? Math.round((value / total) * 1000) / 10 : 0
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.28), duration: 0.2 }}
      className="space-y-1.5 rounded-lg border border-border/40 bg-black/20 px-3 py-2.5 transition-colors hover:bg-black/35"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 tabular-nums text-[10px]">
            {index + 1}
          </Badge>
          <span className="truncate text-sm font-medium text-foreground" title={name}>
            {name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{value}</span>
          <span>{pct}%</span>
        </div>
      </div>
      <Progress value={pct} className="h-1.5" indicatorClassName={accentClass} />
    </motion.div>
  )
}

const TileGrid = ({ items, total, reduceMotion }) => (
  <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
    {items.map((item, index) => {
      const pct = total > 0 ? Math.round((item.value / total) * 1000) / 10 : 0
      return (
        <motion.div
          key={item.name}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: Math.min(index * 0.025, 0.25), duration: 0.2 }}
          className="min-w-0 rounded-xl border border-border/50 bg-secondary/40 p-3 text-center transition-colors hover:border-primary/40 hover:bg-secondary/70 sm:p-4"
        >
          <p className="truncate text-xs text-muted-foreground sm:text-sm" title={item.name}>
            {item.name}
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-foreground sm:text-xl">{item.value}</p>
          <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">{pct}%</p>
        </motion.div>
      )
    })}
  </div>
)

/**
 * Tab Statistiche dell'InfoPanel: KPI, insight e breakdown classificati.
 */
export function InfoPanelStatistiche({ isActive, stats, onOpenCharts, onOpenSegnalazioni }) {
  const reduceMotion = useReducedMotion()
  const [ready, setReady] = useState(false)
  const [breakdownTab, setBreakdownTab] = useState("proprieta")
  const [query, setQuery] = useState("")
  const [viewMode, setViewMode] = useState("list")

  useEffect(() => {
    if (!isActive || ready) return undefined
    const delay = reduceMotion ? 0 : 220
    const t = window.setTimeout(() => setReady(true), delay)
    return () => window.clearTimeout(t)
  }, [isActive, reduceMotion, ready])

  const ranked = useMemo(
    () => ({
      proprieta: toRankedEntries(stats.propertyCounts),
      apparecchi: toRankedEntries(stats.fixtureTypeCounts),
      lampade: toRankedEntries(stats.lampTypeCounts),
    }),
    [stats],
  )

  const insights = useMemo(() => {
    const points = stats.totalPoints || 0
    const fixtures = stats.totalLightFixtures || 0
    const active = stats.totalActiveReports || 0
    const activeRate = points > 0 ? `${((active / points) * 100).toFixed(1)}%` : "—"
    const topProperty = ranked.proprieta[0]
    const topLamp = ranked.lampade[0]
    return {
      activeRate,
      topPropertyLabel: topProperty?.name || "—",
      topPropertyValue: topProperty?.value ?? 0,
      topPropertyShare:
        topProperty && fixtures > 0
          ? `${Math.round((topProperty.value / fixtures) * 100)}%`
          : null,
      topLampLabel: topLamp?.name || "—",
      topLampValue: topLamp?.value ?? 0,
      topLampShare:
        topLamp && fixtures > 0 ? `${Math.round((topLamp.value / fixtures) * 100)}%` : null,
    }
  }, [stats, ranked.proprieta, ranked.lampade])

  const filterText = query.trim().toLowerCase()
  const activeItems = useMemo(() => {
    const list = ranked[breakdownTab] || []
    if (!filterText) return list
    return list.filter((item) => item.name.toLowerCase().includes(filterText))
  }, [ranked, breakdownTab, filterText])

  const activeTotal = useMemo(
    () => (ranked[breakdownTab] || []).reduce((sum, item) => sum + item.value, 0),
    [ranked, breakdownTab],
  )

  const accentByTab = {
    proprieta: "bg-blue-500",
    apparecchi: "bg-amber-500",
    lampade: "bg-violet-500",
  }

  if (!ready) return <StatisticheSkeleton />

  const hasBreakdown =
    ranked.proprieta.length > 0 || ranked.apparecchi.length > 0 || ranked.lampade.length > 0

  return (
    <div className="space-y-5 pb-8 sm:space-y-6 sm:pb-12">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4">
        <StatCard
          title="Punti luce"
          value={stats.totalPoints}
          icon={MapPin}
          active={breakdownTab === "proprieta"}
          onClick={() => setBreakdownTab("proprieta")}
        />
        <StatCard
          title="Apparecchi"
          value={stats.totalLightFixtures}
          icon={Lightbulb}
          active={breakdownTab === "apparecchi"}
          onClick={() => setBreakdownTab("apparecchi")}
        />
        <StatCard title="Quadri" value={stats.totalCabinets} icon={Box} />
        <StatCard
          title="Segnalazioni attive"
          value={stats.totalActiveReports}
          icon={AlertCircle}
          color="red"
          onClick={onOpenSegnalazioni}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <InsightChip
          label="Lampada più diffusa"
          value={insights.topLampLabel}
          hint={
            insights.topLampShare
              ? `${insights.topLampValue} apparecchi · ${insights.topLampShare}`
              : "Nessun dato lampada"
          }
        />
        <InsightChip
          label="Punti con segnalazione"
          value={insights.activeRate}
          hint="Quota punti luce con anomalia aperta"
        />
        <InsightChip
          label="Proprietà principale"
          value={insights.topPropertyLabel}
          hint={
            insights.topPropertyShare
              ? `${insights.topPropertyValue} apparecchi · ${insights.topPropertyShare}`
              : "Nessun dato proprietà"
          }
        />
      </div>

      {hasBreakdown ? (
        <ChartSection className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Dettaglio composizione</h3>
              <p className="text-xs text-muted-foreground">
                Classifica per categoria · tocca una KPI per cambiare vista
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Tabs value={breakdownTab} onValueChange={setBreakdownTab}>
                <TabsList className="h-auto flex-wrap gap-1 bg-muted/40 p-1">
                  {BREAKDOWN_TABS.map((tab) => {
                    const count = ranked[tab.id]?.length || 0
                    return (
                      <TabsTrigger key={tab.id} value={tab.id} className="min-h-9 gap-1.5" disabled={count === 0}>
                        {tab.label}
                        {count > 0 && (
                          <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 tabular-nums">
                            {count}
                          </Badge>
                        )}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </Tabs>
              <div className="flex rounded-lg border border-border/50 bg-muted/30 p-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  className="h-8 px-2.5"
                  onClick={() => setViewMode("list")}
                  aria-label="Vista elenco"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "tiles" ? "secondary" : "ghost"}
                  className="h-8 px-2.5"
                  onClick={() => setViewMode("tiles")}
                  aria-label="Vista griglia"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Separator className="bg-border/50" />

          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtra categoria…"
              className="h-10 w-full rounded-lg border border-border/70 bg-background/60 pl-9 pr-3 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Filtra categorie"
            />
          </div>

          {activeItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {filterText
                ? "Nessuna categoria corrisponde al filtro."
                : "Nessun dato disponibile per questa vista."}
            </p>
          ) : viewMode === "list" ? (
            <div className="max-h-[min(55vh,28rem)] space-y-2 overflow-y-auto overscroll-contain pr-0.5 scrollbar-thin">
              {activeItems.map((item, index) => (
                <RankRow
                  key={item.name}
                  name={item.name}
                  value={item.value}
                  total={activeTotal}
                  index={index}
                  reduceMotion={reduceMotion}
                  accentClass={accentByTab[breakdownTab]}
                />
              ))}
            </div>
          ) : (
            <TileGrid items={activeItems} total={activeTotal} reduceMotion={reduceMotion} />
          )}

          {typeof onOpenCharts === "function" && (
            <>
              <Separator className="bg-border/40" />
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" className="min-h-9" onClick={onOpenCharts}>
                  Vedi grafici correlati
                </Button>
              </div>
            </>
          )}
        </ChartSection>
      ) : (
        <ChartSection className="py-10 text-center">
          <MapPin className="mx-auto mb-3 h-10 w-10 text-muted-foreground/70" />
          <p className="text-sm text-muted-foreground">
            Nessuna statistica disponibile per i marker caricati.
          </p>
        </ChartSection>
      )}
    </div>
  )
}

export default InfoPanelStatistiche

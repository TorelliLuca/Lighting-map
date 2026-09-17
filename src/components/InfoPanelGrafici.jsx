"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  Activity,
  AlertCircle,
  Box,
  Clock,
  Lightbulb,
  MapPin,
  TrendingUp,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import { cn } from "@/lib/utils"
import {
  buildChartModel,
  formatMonthLabel,
  PROPERTY_CHART_COLORS,
  sliceLastMonths,
  summarizeBarSeries,
} from "@/utils/infoPanelCharts"
import { StatCard } from "@/components/ui/StatCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { ChartSection, DistributionChart } from "@/components/infoPanel/DistributionChart"

const MONTH_RANGE_OPTIONS = [
  { id: 6, label: "6 mesi" },
  { id: 12, label: "12 mesi" },
  { id: 0, label: "Tutto" },
]

const monthlyChartConfig = {
  Segnalazioni: { label: "Segnalazioni", color: "hsl(0 72% 55%)" },
  Operazioni: { label: "Operazioni", color: "hsl(217 91% 60%)" },
}

function GraficiSkeleton() {
  return (
    <div className="space-y-5 sm:space-y-6" aria-busy="true" aria-label="Caricamento grafici">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-border/50 bg-card/40 p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>

      <ChartSection className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
        <Skeleton className="mx-auto h-[220px] w-full max-w-sm rounded-full" />
      </ChartSection>

      <div className="grid gap-4 sm:grid-cols-2">
        <ChartSection className="space-y-3 text-center">
          <Skeleton className="mx-auto h-4 w-48" />
          <Skeleton className="mx-auto h-10 w-24" />
        </ChartSection>
        <ChartSection className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-32" />
        </ChartSection>
      </div>

      <ChartSection className="space-y-4">
        <div className="flex justify-between gap-2">
          <Skeleton className="h-5 w-52" />
          <div className="flex gap-1">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-[240px] w-full rounded-lg" />
      </ChartSection>
    </div>
  )
}

function ResponseTimeCard({ loading, error, value }) {
  return (
    <ChartSection title="Tempo di risposta medio">
      <div className="flex min-h-[88px] flex-col items-center justify-center text-center">
        {loading ? (
          <div className="w-full space-y-3 px-4">
            <Skeleton className="mx-auto h-9 w-28" />
            <Skeleton className="mx-auto h-3 w-40" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : value != null ? (
          <>
            <motion.p
              key={value}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-3xl font-bold tabular-nums text-blue-200"
            >
              {value}
            </motion.p>
            <p className="mt-1 text-xs text-muted-foreground">
              Media storica sulle segnalazioni del comune
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Nessun dato disponibile</p>
        )}
      </div>
    </ChartSection>
  )
}

/**
 * Tab Grafici dell'InfoPanel: KPI, distribuzioni shadcn, trend mensile.
 */
export function InfoPanelGrafici({
  isActive,
  stats,
  propertyPieData,
  fixturePieData,
  lampPieData,
  barData,
  avgResponseTime,
  loadingAvg,
  errorAvg,
}) {
  const reduceMotion = useReducedMotion()
  const [ready, setReady] = useState(false)
  const [distributionTab, setDistributionTab] = useState("proprieta")
  const [monthRange, setMonthRange] = useState(12)
  const [trendMode, setTrendMode] = useState("bars")

  useEffect(() => {
    if (!isActive || ready) return undefined
    const delay = reduceMotion ? 0 : 220
    const t = window.setTimeout(() => setReady(true), delay)
    return () => window.clearTimeout(t)
  }, [isActive, reduceMotion, ready])

  const propertyModel = useMemo(
    () =>
      buildChartModel(propertyPieData, {
        colorFor: (entry) =>
          PROPERTY_CHART_COLORS[entry.name] || PROPERTY_CHART_COLORS.default,
      }),
    [propertyPieData],
  )
  const fixtureModel = useMemo(() => buildChartModel(fixturePieData), [fixturePieData])
  const lampModel = useMemo(() => buildChartModel(lampPieData), [lampPieData])

  const filteredBarData = useMemo(
    () =>
      sliceLastMonths(barData, monthRange).map((row) => ({
        ...row,
        label: formatMonthLabel(row.mese),
      })),
    [barData, monthRange],
  )

  const summary = useMemo(() => summarizeBarSeries(filteredBarData), [filteredBarData])

  const distributionModels = {
    proprieta: { title: "Punti luce per proprietà", model: propertyModel },
    apparecchi: { title: "Punti luce per apparecchio", model: fixtureModel },
    lampade: { title: "Punti luce per lampada", model: lampModel },
  }

  const activeDistribution = distributionModels[distributionTab]

  if (!ready) return <GraficiSkeleton />

  const hasAnyDistribution =
    propertyModel.data.length > 0 || fixtureModel.data.length > 0 || lampModel.data.length > 0

  return (
    <div className="space-y-5 pb-8 sm:space-y-6 sm:pb-12">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4">
        <StatCard title="Punti luce" value={stats.totalPoints} icon={MapPin} />
        <StatCard title="Apparecchi" value={stats.totalLightFixtures} icon={Lightbulb} />
        <StatCard title="Quadri" value={stats.totalCabinets} icon={Box} />
        <StatCard
          title="Segnalazioni attive"
          value={stats.totalActiveReports}
          icon={AlertCircle}
          color="red"
        />
      </div>

      {hasAnyDistribution ? (
        <ChartSection className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Distribuzione impianto</h3>
              <p className="text-xs text-muted-foreground">
                Cambia vista per confrontare proprietà, apparecchi e lampade
              </p>
            </div>
            <Tabs value={distributionTab} onValueChange={setDistributionTab}>
              <TabsList className="h-auto flex-wrap gap-1 bg-muted/40 p-1">
                <TabsTrigger value="proprieta" className="min-h-9">
                  Proprietà
                  {propertyModel.data.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 tabular-nums">
                      {propertyModel.data.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="apparecchi" className="min-h-9">
                  Apparecchi
                </TabsTrigger>
                <TabsTrigger value="lampade" className="min-h-9">
                  Lampade
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Separator className="bg-border/50" />

          {activeDistribution.model.data.length > 0 ? (
            <DistributionChart
              title={activeDistribution.title}
              model={activeDistribution.model}
              className="border-0 bg-transparent p-0 shadow-none"
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nessun dato disponibile per questa vista.
            </p>
          )}
        </ChartSection>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <ResponseTimeCard loading={loadingAvg} error={errorAvg} value={avgResponseTime} />

        <ChartSection title="Sintesi periodo">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Segnalazioni</span>
              <span className="font-semibold tabular-nums text-red-300">
                {summary.totalSegnalazioni}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Operazioni</span>
              <span className="font-semibold tabular-nums text-blue-300">
                {summary.totalOperazioni}
              </span>
            </div>
            <Separator className="bg-border/40" />
            {summary.peak ? (
              <div className="flex items-start gap-2 rounded-lg border border-border/40 bg-secondary/30 p-3">
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-foreground">
                    Picco: {formatMonthLabel(summary.peak.mese)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {summary.peak.total} eventi ({summary.peak.segnalazioni} seg. ·{" "}
                    {summary.peak.operazioni} op.)
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nessun andamento mensile disponibile.</p>
            )}
          </div>
        </ChartSection>
      </div>

      <ChartSection>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-blue-300 sm:text-base">
              Segnalazioni e operazioni nel tempo
            </h3>
            <p className="text-xs text-muted-foreground">Confronto mensile sull&apos;area selezionata</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-border/50 bg-muted/30 p-0.5">
              {MONTH_RANGE_OPTIONS.map((opt) => (
                <Button
                  key={opt.id}
                  type="button"
                  size="sm"
                  variant={monthRange === opt.id ? "secondary" : "ghost"}
                  className={cn("h-8 px-2.5 text-xs", monthRange === opt.id && "shadow-sm")}
                  onClick={() => setMonthRange(opt.id)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <div className="flex rounded-lg border border-border/50 bg-muted/30 p-0.5">
              <Button
                type="button"
                size="sm"
                variant={trendMode === "bars" ? "secondary" : "ghost"}
                className="h-8 px-2.5 text-xs"
                onClick={() => setTrendMode("bars")}
              >
                Barre
              </Button>
              <Button
                type="button"
                size="sm"
                variant={trendMode === "area" ? "secondary" : "ghost"}
                className="h-8 px-2.5 text-xs"
                onClick={() => setTrendMode("area")}
              >
                Area
              </Button>
            </div>
          </div>
        </div>

        {filteredBarData.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Activity className="h-9 w-9 text-muted-foreground/70" />
            <p className="text-sm text-muted-foreground">
              Nessuna serie temporale da mostrare per il periodo scelto.
            </p>
          </div>
        ) : (
          <ChartContainer
            config={monthlyChartConfig}
            className="aspect-auto h-[260px] w-full sm:h-[300px]"
          >
            {trendMode === "area" ? (
              <AreaChart
                accessibilityLayer
                data={filteredBarData}
                margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={16}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  dataKey="Segnalazioni"
                  type="monotone"
                  fill="var(--color-Segnalazioni)"
                  fillOpacity={0.25}
                  stroke="var(--color-Segnalazioni)"
                  strokeWidth={2}
                />
                <Area
                  dataKey="Operazioni"
                  type="monotone"
                  fill="var(--color-Operazioni)"
                  fillOpacity={0.25}
                  stroke="var(--color-Operazioni)"
                  strokeWidth={2}
                />
              </AreaChart>
            ) : (
              <BarChart
                accessibilityLayer
                data={filteredBarData}
                margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={16}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="Segnalazioni" fill="var(--color-Segnalazioni)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Operazioni" fill="var(--color-Operazioni)" radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </ChartContainer>
        )}
      </ChartSection>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        I grafici riflettono i marker attualmente caricati sulla mappa.
      </p>
    </div>
  )
}

export default InfoPanelGrafici

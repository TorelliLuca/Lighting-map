"use client"

import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  X,
  Hexagon,
  BarChart3,
  PieChart as LucidePieChart,
  ClipboardList,
} from "lucide-react"
import { useUser } from "../context/UserContext"
import {
  getTipoLampada,
  getExtraordinaryDueUrgency,
  getDaysRemaining,
  formatReportFaultLabel,
  isExtraordinaryReportInProgress,
} from "../utils/utils"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { InfoPanelSegnalazioni } from "./InfoPanelSegnalazioni"
import { InfoPanelGrafici } from "./InfoPanelGrafici"
import { InfoPanelStatistiche } from "./InfoPanelStatistiche"
import { InfoPanelStraordinarie } from "./InfoPanelStraordinarie"

const REPORT_TYPE_LABELS = {
  LIGHT_POINT_OFF: "Punto luce spento",
  PLANT_OFF: "Impianto spento",
  DAMAGED_COMPLEX: "Complesso danneggiato",
  DAMAGED_SUPPORT: "Supporto danneggiato",
  BROKEN_TERMINAL_BLOCK: "Morsettiera rotta",
  BROKEN_PANEL: "Pannello rotto",
  OTHER: "Altro",
  IMMEDIATE_DANGER: "Pericolo immediato per la pubblica incolumità",
  MULTIPLE_OFF: "Tre o più punti luce spenti nello stesso tratto",
  SINGLE_OFF: "Punto luce singolo spento",
  NON_URGENT: "Anomalia non urgente",
}

const OPERATION_TYPE_LABELS = {
  MADE_SAFE_BUT_SYSTEM_NEEDS_RESTORING: "Messo in sicurezza",
  FAULT_ELIMINATED_AND_SYSTEM_RESTORED: "Guasto eliminato",
  OTHER: "Altro",
}

const calculateTotalLightFixtures = (markers) => {
  let total = 0
  markers.forEach((marker) => {
    const numFixtures = marker.data.numero_apparecchi
    if (numFixtures) {
      const num = Number(numFixtures)
      total += !isNaN(num) ? num : 1
    } else {
      total += 1
    }
  })
  return total
}

/** Raggruppa fette piccole in "Altro" per leggibilità dei pie chart. */
function groupSmallSlices(data, minPercent = 0.07) {
  if (!data.length) return []
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const sorted = [...data].sort((a, b) => b.value - a.value)
  const grouped = []
  let otherValue = 0
  const otherNames = []
  sorted.forEach((d) => {
    const perc = d.value / total
    if (perc < minPercent) {
      otherValue += d.value
      otherNames.push(d.name)
    } else {
      grouped.push(d)
    }
  })
  if (otherValue > 0) {
    grouped.push({ name: "Altro", value: otherValue, _isOther: true, _otherNames: otherNames })
  }
  return grouped
}

const tabContentMotion = (reduceMotion) =>
  reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
      }

function InfoPanel({ open = true, activeMarkers, onClose, townhallName, onNavigateToPoint }) {
  const { getAverageResponseTime } = useUser()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  const [activeTab, setActiveTab] = useState("stats")
  const [avgResponseTime, setAvgResponseTime] = useState(null)
  const [loadingAvg, setLoadingAvg] = useState(false)
  const [errorAvg, setErrorAvg] = useState(null)
  const [barData, setBarData] = useState([])

  const handleClose = () => {
    onClose?.()
  }

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) handleClose()
  }

  const { stats, reportsStats } = useMemo(() => {
    const emptyStats = {
      totalPoints: 0,
      totalLightFixtures: 0,
      totalCabinets: 0,
      totalActiveReports: 0,
      propertyCounts: {},
      fixtureTypeCounts: {},
      lampTypeCounts: {},
    }
    const emptyReports = {
      totalReportsInProgress: 0,
      totalReportsResolved: 0,
      totalOperations: 0,
      reportsByType: {},
      operationsByType: {},
      reportsInProgress: [],
      reportsResolved: [],
      operations: [],
      extraordinary: { open: 0, soon: 0, overdue: 0, items: [] },
    }

    if (!open || !activeMarkers?.length) {
      return { stats: emptyStats, reportsStats: emptyReports }
    }

    const pl = activeMarkers.filter((m) => m.data.marker === "PL")
    const qe = activeMarkers.filter((m) => m.data.marker === "QE")
    const activeReports = activeMarkers.filter(
      (m) => m.data.segnalazioni_in_corso && m.data.segnalazioni_in_corso.length > 0,
    )

    const properties = [...new Set(pl.map((p) => p.data.proprieta).filter(Boolean))]
    const fixtureTypes = [
      ...new Set(
        pl
          .map((p) => {
            const match = p.data.tipo_apparecchio?.match(/^\w+/g)
            return match ? match[0] : null
          })
          .filter(Boolean),
      ),
    ]
    const lampTypes = [...new Set(pl.map((p) => getTipoLampada(p.data)).filter(Boolean))]
    const totalLightFixtures = calculateTotalLightFixtures(pl)

    const propertyCounts = {}
    properties.forEach((prop) => {
      propertyCounts[prop] = calculateTotalLightFixtures(pl.filter((p) => p.data.proprieta === prop))
    })

    const fixtureTypeCounts = {}
    fixtureTypes.forEach((type) => {
      fixtureTypeCounts[type] = calculateTotalLightFixtures(
        pl.filter((p) => {
          const match = p.data.tipo_apparecchio?.match(/^\w+/g)
          return match && match[0] === type
        }),
      )
    })

    const lampTypeCounts = {}
    lampTypes.forEach((type) => {
      lampTypeCounts[type] = calculateTotalLightFixtures(
        pl.filter((p) => getTipoLampada(p.data) === type),
      )
    })

    let reportsInProgress = []
    let reportsResolved = []
    const operations = []
    const reportsByType = {}
    const operationsByType = {}

    activeMarkers.forEach((marker) => {
      if (marker.data.segnalazioni_in_corso) {
        marker.data.segnalazioni_in_corso.forEach((report) => {
          reportsInProgress.push({
            ...report,
            numero_palo: marker.data.numero_palo,
            lat: marker.data.lat,
            lng: marker.data.lng,
          })
          const type = report.fault_label || report.report_type || "OTHER"
          const label = formatReportFaultLabel(type)
          reportsByType[label] = (reportsByType[label] || 0) + 1
        })
      }
      if (marker.data.segnalazioni_risolte) {
        marker.data.segnalazioni_risolte.forEach((report) => {
          reportsResolved.push({
            ...report,
            numero_palo: marker.data.numero_palo,
            lat: marker.data.lat,
            lng: marker.data.lng,
          })
          const type = report.fault_label || report.report_type || "OTHER"
          const label = formatReportFaultLabel(type)
          reportsByType[label] = (reportsByType[label] || 0) + 1
        })
      }
      if (marker.data.operazioni_effettuate) {
        marker.data.operazioni_effettuate.forEach((operation) => {
          operations.push({
            ...operation,
            numero_palo: marker.data.numero_palo,
            lat: marker.data.lat,
            lng: marker.data.lng,
          })
          const type = operation.operation_type || "OTHER"
          operationsByType[type] = (operationsByType[type] || 0) + 1
        })
      }
    })

    reportsInProgress = reportsInProgress.sort(
      (a, b) => new Date(b.report_date) - new Date(a.report_date),
    )
    reportsResolved = reportsResolved.sort(
      (a, b) => new Date(b.report_date) - new Date(a.report_date),
    )
    operations.sort((a, b) => new Date(b.operation_date) - new Date(a.operation_date))

    const extraordinaryItems = reportsInProgress
      .filter((r) => isExtraordinaryReportInProgress(r))
      .map((r) => ({
        ...r,
        dueUrgency: getExtraordinaryDueUrgency(r.due_date),
        daysRemaining: getDaysRemaining(r.due_date),
      }))
      .sort((a, b) => {
        const da = a.due_date ? new Date(a.due_date).getTime() : Infinity
        const db = b.due_date ? new Date(b.due_date).getTime() : Infinity
        return da - db
      })

    return {
      stats: {
        totalPoints: pl.length,
        totalLightFixtures,
        totalCabinets: qe.length,
        totalActiveReports: activeReports.length,
        propertyCounts,
        fixtureTypeCounts,
        lampTypeCounts,
      },
      reportsStats: {
        totalReportsInProgress: reportsInProgress.length,
        totalReportsResolved: reportsResolved.length,
        totalOperations: operations.length,
        reportsByType,
        operationsByType,
        reportsInProgress,
        reportsResolved,
        operations,
        extraordinary: {
          open: extraordinaryItems.length,
          soon: extraordinaryItems.filter((r) => r.dueUrgency === "soon").length,
          overdue: extraordinaryItems.filter((r) => r.dueUrgency === "overdue").length,
          items: extraordinaryItems,
        },
      },
    }
  }, [activeMarkers, open])

  useEffect(() => {
    if (!open || !activeMarkers?.length) {
      setBarData([])
      return
    }
    const reports = []
    const operations = []
    activeMarkers.forEach((m) => {
      m.data.segnalazioni_in_corso?.forEach((r) => {
        if (r.report_date) reports.push(r.report_date)
      })
      m.data.segnalazioni_risolte?.forEach((r) => {
        if (r.report_date) reports.push(r.report_date)
      })
      m.data.operazioni_effettuate?.forEach((o) => {
        if (o.operation_date) operations.push(o.operation_date)
      })
    })

    const groupByMonth = (dates) => {
      const map = {}
      dates.forEach((dateStr) => {
        const d = new Date(dateStr)
        if (isNaN(d)) return
        const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`
        map[key] = (map[key] || 0) + 1
      })
      return map
    }

    const reportMap = groupByMonth(reports)
    const opMap = groupByMonth(operations)
    const allKeys = Array.from(new Set([...Object.keys(reportMap), ...Object.keys(opMap)])).sort()
    setBarData(
      allKeys.map((key) => ({
        mese: key,
        Segnalazioni: reportMap[key] || 0,
        Operazioni: opMap[key] || 0,
      })),
    )
  }, [activeMarkers, open])

  useEffect(() => {
    if (!open || activeTab !== "charts") return undefined

    let cancelled = false
    async function fetchAvgResponseTime() {
      setLoadingAvg(true)
      setErrorAvg(null)
      try {
        const res = await getAverageResponseTime(townhallName)
        if (cancelled) return
        const data = res.data
        if (data && typeof data.count === "number" && data.count > 0) {
          const hours = Number(data.avgTimeHours)
          let formatted = ""
          if (hours >= 24) {
            const giorni = Math.floor(hours / 24)
            const ore = Math.round(hours % 24)
            formatted = `${giorni}g${ore > 0 ? ` ${ore}h` : ""}`
          } else if (hours < 1) {
            formatted = `${Math.round(hours * 60)} min`
          } else {
            formatted = `${hours.toFixed(2)} ore`
          }
          setAvgResponseTime(formatted)
        } else {
          setAvgResponseTime(null)
        }
      } catch {
        if (!cancelled) setErrorAvg("Errore nel recupero del tempo di risposta medio")
      } finally {
        if (!cancelled) setLoadingAvg(false)
      }
    }
    fetchAvgResponseTime()
    return () => {
      cancelled = true
    }
  }, [activeTab, open, townhallName, getAverageResponseTime])

  const propertyPieData = useMemo(
    () =>
      groupSmallSlices(
        Object.entries(stats.propertyCounts).map(([name, value]) => ({ name, value })),
      ),
    [stats.propertyCounts],
  )
  const fixturePieData = useMemo(
    () =>
      groupSmallSlices(
        Object.entries(stats.fixtureTypeCounts).map(([name, value]) => ({ name, value })),
      ),
    [stats.fixtureTypeCounts],
  )
  const lampPieData = useMemo(
    () =>
      groupSmallSlices(
        Object.entries(stats.lampTypeCounts).map(([name, value]) => ({ name, value })),
      ),
    [stats.lampTypeCounts],
  )
  const reportTypePieData = useMemo(
    () =>
      groupSmallSlices(
        Object.entries(reportsStats.reportsByType).map(([name, value]) => ({
          name: REPORT_TYPE_LABELS[name] || name,
          value,
        })),
      ),
    [reportsStats.reportsByType],
  )
  const operationTypePieData = useMemo(
    () =>
      groupSmallSlices(
        Object.entries(reportsStats.operationsByType).map(([name, value]) => ({
          name: OPERATION_TYPE_LABELS[name] || name,
          value,
        })),
      ),
    [reportsStats.operationsByType],
  )

  const tabs = [
    {
      id: "stats",
      label: "Statistiche",
      icon: BarChart3,
      badge: stats.totalPoints || null,
    },
    { id: "charts", label: "Grafici", icon: LucidePieChart },
    {
      id: "segnalazioni",
      label: "Segnalazioni",
      icon: ClipboardList,
      badge: reportsStats.totalReportsInProgress || null,
      badgeTone: "destructive",
    },
    {
      id: "straordinarie",
      label: "Straordinarie",
      icon: Hexagon,
      badge: reportsStats.extraordinary?.open || null,
      badgeTone: "orange",
    },
  ]

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="full"
        hideClose
        overlayClassName="z-[10050]"
        className="z-[10051] flex flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-foreground touch-manipulation"
        aria-describedby={undefined}
      >
        <SheetHeader className="shrink-0 space-y-0 border-b border-border/40 bg-background/20 px-3 pb-0 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:px-6 pr-3">
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <SheetTitle className="truncate bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-lg font-bold text-transparent sm:text-2xl">
                Panoramica del Sistema
              </SheetTitle>
              <SheetDescription className="mt-0.5 truncate text-xs text-blue-300/80 sm:text-sm">
                {townhallName || "Comune corrente"}
              </SheetDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11 shrink-0 text-blue-400 hover:bg-blue-900/60 hover:text-blue-200"
              onClick={handleClose}
              aria-label="Chiudi pannello"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-2 h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:justify-center">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      "min-h-11 shrink-0 gap-1.5 rounded-lg px-3 text-sm font-semibold text-blue-400",
                      "data-[state=active]:bg-blue-700/80 data-[state=active]:text-blue-50 data-[state=active]:shadow",
                      "data-[state=inactive]:bg-blue-950/50 hover:bg-blue-900/50",
                    )}
                  >
                    <Icon className="hidden h-4 w-4 sm:block" />
                    {tab.label}
                    {tab.badge != null && tab.badge > 0 && (
                      <Badge
                        variant={tab.badgeTone === "destructive" ? "destructive" : "secondary"}
                        className={cn(
                          "ml-0.5 h-5 min-w-5 justify-center px-1.5 text-[10px] tabular-nums",
                          tab.badgeTone === "orange" &&
                            "border-transparent bg-orange-600/80 text-orange-50 hover:bg-orange-600/80",
                        )}
                      >
                        {tab.badge}
                      </Badge>
                    )}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))] scrollbar-thin scrollbar-thumb-blue-700/70 scrollbar-track-blue-950/40">
          <div className="mx-auto max-w-4xl space-y-5 px-3 py-4 text-foreground sm:space-y-8 sm:px-6 sm:py-6">
            <AnimatePresence mode="wait">
              {activeTab === "stats" && (
                <motion.div key="stats" {...tabContentMotion(reduceMotion)}>
                  <InfoPanelStatistiche
                    isActive={activeTab === "stats"}
                    stats={stats}
                    onOpenCharts={() => setActiveTab("charts")}
                    onOpenSegnalazioni={() => setActiveTab("segnalazioni")}
                  />
                </motion.div>
              )}

              {activeTab === "charts" && (
                <motion.div key="charts" {...tabContentMotion(reduceMotion)}>
                  <InfoPanelGrafici
                    isActive={activeTab === "charts"}
                    stats={stats}
                    propertyPieData={propertyPieData}
                    fixturePieData={fixturePieData}
                    lampPieData={lampPieData}
                    barData={barData}
                    avgResponseTime={avgResponseTime}
                    loadingAvg={loadingAvg}
                    errorAvg={errorAvg}
                  />
                </motion.div>
              )}

              {activeTab === "segnalazioni" && (
                <motion.div key="segnalazioni" {...tabContentMotion(reduceMotion)}>
                  <InfoPanelSegnalazioni
                    isActive={activeTab === "segnalazioni"}
                    reportsStats={reportsStats}
                    reportTypePieData={reportTypePieData}
                    operationTypePieData={operationTypePieData}
                    onNavigateToPoint={onNavigateToPoint}
                  />
                </motion.div>
              )}

              {activeTab === "straordinarie" && (
                <motion.div key="straordinarie" {...tabContentMotion(reduceMotion)}>
                  <InfoPanelStraordinarie
                    isActive={activeTab === "straordinarie"}
                    extraordinary={reportsStats.extraordinary}
                    townhallName={townhallName}
                    onNavigateToPoint={onNavigateToPoint}
                    onClose={handleClose}
                    onOpenDashboard={() => {
                      const qs = townhallName ? `?comune=${encodeURIComponent(townhallName)}` : ""
                      navigate(`/extraordinary${qs}`)
                    }}
                    onOpenQuote={(quoteId) => navigate(`/quote/${quoteId}`)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default InfoPanel

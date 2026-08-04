"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, MapPin, Lightbulb, Box, AlertCircle, Clock, CheckCircle, Wrench, User, FileText } from "lucide-react"
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { useMediaQuery } from "../hooks/useMediaQuery"
const COLORS = [
  "#60a5fa",
  "#818cf8",
  "#f472b6",
  "#facc15",
  "#34d399",
  "#f87171",
  "#a3e635",
  "#fbbf24",
  "#38bdf8",
  "#c084fc",
]
import { useUser } from "../context/UserContext"
import { getTipoLampada } from "../utils/utils"
const PROPERTY_COLORS = {
  EnelSole: "#ef4444", // rosso
  Municipale: "#2563eb", // blu
  default: "#64748b", // grigio per altri
}
const CONTRAST_COLORS = [
  "#ef4444", // rosso
  "#2563eb", // blu
  "#f59e42", // arancione
  "#10b981", // verde
  "#a21caf", // viola
  "#eab308", // giallo
  "#0ea5e9", // azzurro
  "#f43f5e", // rosa
  "#7c3aed", // indaco
  "#64748b", // grigio
]

const REPORT_TYPE_LABELS = {
  LIGHT_POINT_OFF: "Punto luce spento",
  PLANT_OFF: "Impianto spento",
  DAMAGED_COMPLEX: "Complesso danneggiato",
  DAMAGED_SUPPORT: "Supporto danneggiato",
  BROKEN_TERMINAL_BLOCK: "Morsettiera rotta",
  BROKEN_PANEL: "Pannello rotto",
  OTHER: "Altro",
}

const OPERATION_TYPE_LABELS = {
  MADE_SAFE_BUT_SYSTEM_NEEDS_RESTORING: "Messo in sicurezza",
  FAULT_ELIMINATED_AND_SYSTEM_RESTORED: "Guasto eliminato",
  OTHER: "Altro",
}

const ClickablePoleNumber = ({ numeroPalo, lat, lng, onNavigate }) => {
  if (!numeroPalo) return null

  const canNavigate = lat != null && lng != null && onNavigate

  const handleClick = (e) => {
    e.stopPropagation()
    if (canNavigate) onNavigate(lat, lng, numeroPalo)
  }

  const content = (
    <>
      <MapPin className="h-4 w-4 text-blue-400 shrink-0" />
      <span>Punto luce n° {numeroPalo}</span>
    </>
  )

  if (!canNavigate) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-blue-200">
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-2 text-sm font-medium text-blue-300 hover:text-blue-100 underline underline-offset-2 cursor-pointer transition-colors text-left"
      title="Vai al punto sulla mappa"
    >
      {content}
    </button>
  )
}

const STAT_CARD_STYLES = {
  blue: {
    card: "bg-blue-900/50 border-blue-500/30 hover:border-blue-400/50 hover:bg-blue-800/60",
    icon: "text-blue-400",
    title: "text-blue-200",
  },
  red: {
    card: "bg-red-900/50 border-red-500/30 hover:border-red-400/50 hover:bg-red-800/60",
    icon: "text-red-400",
    title: "text-red-200",
  },
  green: {
    card: "bg-green-900/50 border-green-500/30 hover:border-green-400/50 hover:bg-green-800/60",
    icon: "text-green-400",
    title: "text-green-200",
  },
}

const StatCard = ({ title, value, icon: Icon, color = "blue" }) => {
  const styles = STAT_CARD_STYLES[color] || STAT_CARD_STYLES.blue
  return (
    <div className={`p-3 sm:p-4 rounded-xl border transition-all duration-200 ${styles.card}`}>
      <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 min-w-0">
        <Icon className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 ${styles.icon}`} />
        <h4 className={`text-xs sm:text-sm font-medium truncate ${styles.title}`}>{title}</h4>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-white tabular-nums">{value}</p>
    </div>
  )
}

const ReportCard = ({ report, type, onNavigateToPoint }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A"
    const date = new Date(dateStr)
    return date.toLocaleDateString("it-IT")
  }

  const getTypeColor = (reportType) => {
    switch (reportType) {
      case "LIGHT_POINT_OFF":
        return "text-yellow-400"
      case "PLANT_OFF":
        return "text-red-400"
      case "DAMAGED_COMPLEX":
        return "text-orange-400"
      case "DAMAGED_SUPPORT":
        return "text-purple-400"
      case "BROKEN_TERMINAL_BLOCK":
        return "text-pink-400"
      case "BROKEN_PANEL":
        return "text-indigo-400"
      default:
        return "text-gray-400"
    }
  }

  return (
    <div
      className={`bg-black/40 p-4 rounded-lg border ${type === "resolved" ? "border-green-500/30" : "border-red-500/30"} hover:bg-black/60 transition-all duration-200`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          {type === "resolved" ? (
            <CheckCircle className="h-5 w-5 text-green-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400" />
          )}
          <span className={`text-sm font-medium ${type === "resolved" ? "text-green-200" : "text-red-200"}`}>
            {type === "resolved" ? "Risolta" : "In corso"}
          </span>
        </div>
        <span className="text-xs text-gray-400">{formatDate(report.report_date)}</span>
      </div>

      <div className="space-y-2">
        <ClickablePoleNumber
          numeroPalo={report.numero_palo}
          lat={report.lat}
          lng={report.lng}
          onNavigate={onNavigateToPoint}
        />

        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-400" />
          <span className={`text-sm ${getTypeColor(report.report_type)}`}>
            {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
          </span>
        </div>

        {report.report_time && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-gray-300">{report.report_time}</span>
          </div>
        )}

        {report.description && (
          <div className="mt-2">
            <p className="text-sm text-gray-300 italic">"{report.description}"</p>
          </div>
        )}

        {type === "resolved" && report.user_responsible_id && (
          <div className="flex items-center gap-2 mt-2">
            <User className="h-4 w-4 text-green-400" />
            <span className="text-sm text-green-200">Responsabile assegnato</span>
          </div>
        )}
      </div>
    </div>
  )
}

const OperationCard = ({ operation, onNavigateToPoint }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A"
    const date = new Date(dateStr)
    return date.toLocaleDateString("it-IT")
  }

  const getOperationColor = (opType) => {
    
    switch (opType) {
      case "FAULT_ELIMINATED_AND_SYSTEM_RESTORED":
        return "text-green-400"
      case "MADE_SAFE_BUT_SYSTEM_NEEDS_RESTORING":
        return "text-yellow-400"
      default:
        return "text-gray-400"
    }
  }

  const formatMaintenanceType = (type) => {
    switch (type) {
      case "ORDINARY":
        return "Ordinaria"
      case "EXTRAORDINARY":
        return "Straordinaria"
      default:
        return ""
    }
  }

  return (
    <div className="bg-black/40 p-4 rounded-lg border border-blue-500/30 hover:bg-black/60 transition-all duration-200">
      <div className="flex justify-between items-start mb-3 gap-2">
        <ClickablePoleNumber
          numeroPalo={operation.numero_palo}
          lat={operation.lat}
          lng={operation.lng}
          onNavigate={onNavigateToPoint}
        />
        <span className="text-xs text-gray-400 shrink-0">{formatDate(operation.operation_date)}</span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Wrench className="h-4 w-4 text-blue-400" />
        <span className="text-sm font-medium text-blue-200">
          Operazione {formatMaintenanceType(operation.maintenance_type)}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-400" />
          <span className={`text-sm ${getOperationColor(operation.operation_type)}`}>
            {OPERATION_TYPE_LABELS[operation.operation_type] || operation.operation_type}
          </span>
        </div>

        {operation.note && (
          <div className="mt-2">
            <p className="text-sm text-gray-300 italic">"{operation.note}"</p>
          </div>
        )}

        <div className="flex items-center gap-2 mt-2">
          {operation.is_solved ? (
            <CheckCircle className="h-4 w-4 text-green-400" />
          ) : (
            <Clock className="h-4 w-4 text-yellow-400" />
          )}
            <span className={`text-sm ${operation.is_solved ? "text-green-200" : "text-yellow-200"}`}>
            {operation.is_solved ? "Risolto" : "In attesa"}
          </span>
        </div>
      </div>
    </div>
  )
}

function InfoPanel({ activeMarkers, onClose, townhallName, onNavigateToPoint }) {
  const { getAverageResponseTime } = useUser()
  const isMobile = useMediaQuery("(max-width: 639px)")
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalLightFixtures: 0,
    totalCabinets: 0,
    totalActiveReports: 0,
    propertyCounts: {},
    fixtureTypeCounts: {},
    lampTypeCounts: {},
  })
  const [reportsStats, setReportsStats] = useState({
    totalReportsInProgress: 0,
    totalReportsResolved: 0,
    totalOperations: 0,
    reportsByType: {},
    operationsByType: {},
    reportsInProgress: [],
    reportsResolved: [],
    operations: [],
  })
  const [activeTab, setActiveTab] = useState("stats")
  const [avgResponseTime, setAvgResponseTime] = useState(null)
  const [loadingAvg, setLoadingAvg] = useState(false)
  const [errorAvg, setErrorAvg] = useState(null)
  const [showMoreReportsInProgress, setShowMoreReportsInProgress] = useState(false)
  const [showMoreReportsResolved, setShowMoreReportsResolved] = useState(false)
  const [showMoreOperations, setShowMoreOperations] = useState(false)

  const pieHeight = isMobile ? 260 : 420
  const pieOuterRadius = isMobile ? 95 : 180
  const pieInnerRadius = isMobile ? 38 : 70
  const reportPieHeight = isMobile ? 280 : 350
  const reportPieOuter = isMobile ? 90 : 120
  const reportPieInner = isMobile ? 36 : 50
  const barHeight = isMobile ? 240 : 340
  const labelFontSize = isMobile ? 11 : 15

  const handleClose = () => {
    setShowMoreOperations(false)
    setShowMoreReportsInProgress(false)
    setShowMoreReportsResolved(false)
    onClose()
  }

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowMoreOperations(false)
        setShowMoreReportsInProgress(false)
        setShowMoreReportsResolved(false)
        onClose()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [onClose])

  useEffect(() => {
    if (!activeMarkers || activeMarkers.length === 0) return

    // Filter markers by type
    const pl = activeMarkers.filter((m) => m.data.marker === "PL")
    const qe = activeMarkers.filter((m) => m.data.marker === "QE")
    const activeReports = activeMarkers.filter(
      (m) => m.data.segnalazioni_in_corso && m.data.segnalazioni_in_corso.length > 0,
    )

    // Get unique properties
    const properties = [...new Set(pl.map((p) => p.data.proprieta).filter(Boolean))]

    // Get unique fixture types (first word only)
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

    // Get unique lamp types (first word only)
    const lampTypes = [
      ...new Set(
        pl
          .map((p) => getTipoLampada(p.data))
          .filter(Boolean),
      ),
    ]

    // Calculate total light fixtures
    const totalLightFixtures = calculateTotalLightFixtures(pl)

    // Calculate counts by property
    const propertyCounts = {}
    properties.forEach((prop) => {
      const filteredByProp = pl.filter((p) => p.data.proprieta === prop)
      propertyCounts[prop] = calculateTotalLightFixtures(filteredByProp)
    })

    // Calculate counts by fixture type
    const fixtureTypeCounts = {}
    fixtureTypes.forEach((type) => {
      const filteredByType = pl.filter((p) => {
        const match = p.data.tipo_apparecchio?.match(/^\w+/g)
        return match && match[0] === type
      })
      fixtureTypeCounts[type] = calculateTotalLightFixtures(filteredByType)
    })

    // Calculate counts by lamp type
    const lampTypeCounts = {}
    lampTypes.forEach((type) => {
      const filteredByType = pl.filter((p) => getTipoLampada(p.data) === type)
      lampTypeCounts[type] = calculateTotalLightFixtures(filteredByType)
    })

    setStats({
      totalPoints: pl.length,
      totalLightFixtures,
      totalCabinets: qe.length,
      totalActiveReports: activeReports.length,
      propertyCounts,
      fixtureTypeCounts,
      lampTypeCounts,
    })

    // Calculate reports statistics
    let reportsInProgress = []
    let reportsResolved = []
    let operations = []
    const reportsByType = {}
    const operationsByType = {}

    activeMarkers.forEach((marker) => {
      // Segnalazioni in corso
      if (marker.data.segnalazioni_in_corso) {
        marker.data.segnalazioni_in_corso.forEach((report) => {
          reportsInProgress.push({
            ...report,
            numero_palo: marker.data.numero_palo,
            lat: marker.data.lat,
            lng: marker.data.lng,
          })
          const type = report.report_type || "OTHER"
          reportsByType[type] = (reportsByType[type] || 0) + 1
        })
      }

      // Segnalazioni risolte
      if (marker.data.segnalazioni_risolte) {
        marker.data.segnalazioni_risolte.forEach((report) => {
          reportsResolved.push({
            ...report,
            numero_palo: marker.data.numero_palo,
            lat: marker.data.lat,
            lng: marker.data.lng,
          })
          const type = report.report_type || "OTHER"
          reportsByType[type] = (reportsByType[type] || 0) + 1
        })
      }

      // Operazioni
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
    reportsInProgress = reportsInProgress.sort((a, b) => new Date(b.report_date) - new Date(a.report_date))
    reportsResolved = reportsResolved.sort((a, b) => new Date(b.report_date) - new Date(a.report_date))
    operations.sort((a, b) => new Date(b.operation_date) - new Date(a.operation_date))
    setReportsStats({
      totalReportsInProgress: reportsInProgress.length,
      totalReportsResolved: reportsResolved.length,
      totalOperations: operations.length,
      reportsByType,
      operationsByType,
      reportsInProgress,
      reportsResolved,
      operations,
    })
  }, [activeMarkers])

  useEffect(() => {
    async function fetchAvgResponseTime() {
      setLoadingAvg(true)
      setErrorAvg(null)
      try {
        const res = await getAverageResponseTime(townhallName)

        const data = res.data
        if (data && typeof data.count === "number" && data.count > 0) {
          const hours = Number(data.avgTimeHours)
          let formatted = ""
          if (hours >= 24) {
            const giorni = Math.floor(hours / 24)
            const ore = Math.round(hours % 24)
            formatted = `${giorni}g${ore > 0 ? ` ${ore}h` : ""}`
          } else if (hours < 1) {
            const minuti = Math.round(hours * 60)
            formatted = `${minuti} min`
          } else {
            formatted = `${hours.toFixed(2)} ore`
          }
          setAvgResponseTime(formatted)
        } else {
          setAvgResponseTime(null)
        }
        setLoadingAvg(false)
      } catch (err) {
        setErrorAvg("Errore nel recupero del tempo di risposta medio")
        setLoadingAvg(false)
      }
    }
    if (activeTab === "charts") fetchAvgResponseTime()
  }, [activeTab])

  const calculateTotalLightFixtures = (markers) => {
    let total = 0
    markers.forEach((marker) => {
      const numFixtures = marker.data.numero_apparecchi
      if (numFixtures) {
        const num = Number(numFixtures)
        if (!isNaN(num)) {
          total += num
        } else {
          total += 1
        }
      } else {
        total += 1
      }
    })
    return total
  }

  // Funzione per raggruppare le fette piccole e consecutive in "Altro"
  function groupSmallSlices(data, minPercent = 0.07) {
    if (!data.length) return []
    const total = data.reduce((sum, d) => sum + d.value, 0)
    // Ordina per valore decrescente
    const sorted = [...data].sort((a, b) => b.value - a.value)
    const grouped = []
    let otherValue = 0
    const otherNames = []
    sorted.forEach((d, idx) => {
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

  // Preparo i dati per i grafici
  const propertyPieData = groupSmallSlices(
    Object.entries(stats.propertyCounts).map(([name, value]) => ({ name, value })),
  )
  const fixturePieData = groupSmallSlices(
    Object.entries(stats.fixtureTypeCounts).map(([name, value]) => ({ name, value })),
  )
  const lampPieData = groupSmallSlices(Object.entries(stats.lampTypeCounts).map(([name, value]) => ({ name, value })))

  // Dati per grafici segnalazioni
  const reportTypePieData = groupSmallSlices(
    Object.entries(reportsStats.reportsByType).map(([name, value]) => ({
      name: REPORT_TYPE_LABELS[name] || name,
      value,
    })),
  )

  const operationTypePieData = groupSmallSlices(
    Object.entries(reportsStats.operationsByType).map(([name, value]) => ({
      name: OPERATION_TYPE_LABELS[name] || name,
      value,
    })),
  )

  // Calcolo dati per grafico a colonne (segnalazioni/operazioni per mese)
  const [barData, setBarData] = useState([])
  useEffect(() => {
    if (!activeMarkers || activeMarkers.length === 0) return
    // Raccogli tutte le segnalazioni e operazioni
    const reports = []
    const operations = []
    activeMarkers.forEach((m) => {
      if (m.data.segnalazioni_in_corso) {
        m.data.segnalazioni_in_corso.forEach((r) => {
          if (r.report_date) reports.push(r.report_date)
        })
      }
      if (m.data.segnalazioni_risolte) {
        m.data.segnalazioni_risolte.forEach((r) => {
          if (r.report_date) reports.push(r.report_date)
        })
      }
      if (m.data.operazioni_effettuate) {
        m.data.operazioni_effettuate.forEach((o) => {
          if (o.operation_date) operations.push(o.operation_date)
        })
      }
    })
    // Raggruppa per mese/anno
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
    // Unisci tutte le chiavi
    const allKeys = Array.from(new Set([...Object.keys(reportMap), ...Object.keys(opMap)])).sort()
    const data = allKeys.map((key) => ({
      mese: key,
      Segnalazioni: reportMap[key] || 0,
      Operazioni: opMap[key] || 0,
    }))
    setBarData(data)
  }, [activeMarkers])

  // Funzione label custom: sempre centrata nella fetta, mai label esterne
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    if (percent < (isMobile ? 0.1 : 0.07)) return null
    return (
      <text
        x={x}
        y={y}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={labelFontSize}
        fontWeight={600}
        pointerEvents="none"
      >
        {isMobile ? value : `${name} (${value})`}
      </text>
    )
  }

  // Custom Legend per mostrare valore accanto al nome solo per "fette piccole"
  const renderCustomLegend =
    (data, pieData) =>
    ({ payload }) => (
      <ul className="flex flex-wrap justify-center gap-x-3 sm:gap-x-6 gap-y-2 mt-2 px-1">
        {payload.map((entry) => {
          const d = pieData.find((p) => p.name === entry.value)
          const isOther = d && d._isOther
          const total = pieData.reduce((sum, p) => sum + p.value, 0)
          const perc = d ? d.value / total : 0
          return (
            <li key={entry.value} className="flex items-center gap-1.5 sm:gap-2 max-w-full">
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: entry.color,
                  flexShrink: 0,
                }}
              />
              <span className="text-white text-xs sm:text-sm font-medium truncate">
                {entry.value}
                {perc < 0.07 || isOther ? ` (${d.value})` : ""}
              </span>
            </li>
          )
        })}
      </ul>
    )

  const tabs = [
    { id: "stats", label: "Statistiche" },
    { id: "charts", label: "Grafici" },
    { id: "segnalazioni", label: "Segnalazioni" },
  ]

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex flex-col bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 touch-manipulation"
      style={{ height: "100dvh" }}
      role="dialog"
      aria-modal="true"
      aria-label="Panoramica del Sistema"
    >
      <header
        className="shrink-0  bg-gradient  from-slate-950 via-blue-950 to-slate-950 backdrop-blur-xl pt-[env(safe-area-inset-top)]"
      >
        <div className="flex items-center justify-between gap-3 px-3 sm:px-6 py-3">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold truncate bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
              Panoramica del Sistema
            </h2>
            {townhallName && (
              <p className="text-xs sm:text-sm text-blue-300/80 truncate mt-0.5">{townhallName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 flex items-center justify-center min-h-11 min-w-11 p-2.5 bg-transparent hover:bg-blue-900/60 text-blue-400 rounded-xl border border-transparent cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label="Chiudi pannello"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className="flex gap-1 px-3 sm:px-6 pb-2 overflow-x-auto items-center justify-center overscroll-contain scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Sezioni panoramica"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`shrink-0 min-h-11 px-4 rounded-lg text-sm font-semibold cursor-pointer transition-colors duration-150 touch-manipulation ${
                activeTab === tab.id
                  ? "bg-blue-700/80 text-blue-50"
                  : "bg-blue-950/50 text-blue-400 hover:bg-blue-900/50"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-blue-700/70 scrollbar-track-blue-950/40 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-4xl mx-auto space-y-5 sm:space-y-8 text-white px-3 sm:px-6 py-4 sm:py-6">

        {activeTab === "stats" && (
          <>
            {/* --- VISTA STATISTICHE CLASSICA --- */}
            <div className="bg-black/60 rounded-xl p-4 sm:p-6 backdrop-blur-xl border border-blue-500/30 shadow-[0_0_25px_rgba(0,149,255,0.15)]">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-center text-blue-400">Statistiche Generali</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
                <StatCard title="Punti Totali" value={stats.totalPoints} icon={MapPin} />
                <StatCard title="Apparecchi Totali" value={stats.totalLightFixtures} icon={Lightbulb} />
                <StatCard title="Quadri Totali" value={stats.totalCabinets} icon={Box} />
                <StatCard title="Segnalazioni Attive" value={stats.totalActiveReports} icon={AlertCircle} />
              </div>
            </div>

            {Object.keys(stats.propertyCounts).length > 0 && (
              <div className="bg-black/60 rounded-xl p-4 sm:p-6 backdrop-blur-xl border border-blue-500/30 shadow-[0_0_25px_rgba(0,149,255,0.15)]">
                <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-center text-blue-400">Punti Luce per Proprietà</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                  {Object.entries(stats.propertyCounts).map(([property, count]) => (
                    <div
                      key={property}
                      className="bg-blue-900/40 p-3 sm:p-4 rounded-lg text-center border border-blue-500/20 hover:border-blue-400/40 hover:bg-blue-800/50 transition-all duration-200 min-w-0"
                    >
                      <h4 className="text-blue-200 text-xs sm:text-sm truncate" title={property}>
                        {property}
                      </h4>
                      <p className="text-lg sm:text-xl font-bold text-white tabular-nums">{count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(stats.fixtureTypeCounts).length > 0 && (
              <div className="bg-black/60 rounded-xl p-4 sm:p-6 backdrop-blur-xl border border-blue-500/30 shadow-[0_0_25px_rgba(0,149,255,0.15)]">
                <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-center text-blue-400">
                  Punti Luce per Tipo di Apparecchio
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                  {Object.entries(stats.fixtureTypeCounts).map(([type, count]) => (
                    <div
                      key={type}
                      className="bg-blue-900/40 p-3 sm:p-4 rounded-lg text-center border border-blue-500/20 hover:border-blue-400/40 hover:bg-blue-800/50 transition-all duration-200 min-w-0"
                    >
                      <h4 className="text-blue-200 text-xs sm:text-sm truncate" title={type}>
                        {type}
                      </h4>
                      <p className="text-lg sm:text-xl font-bold text-white tabular-nums">{count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(stats.lampTypeCounts).length > 0 && (
              <div className="bg-black/60 rounded-xl p-4 sm:p-6 backdrop-blur-xl border border-blue-500/30 shadow-[0_0_25px_rgba(0,149,255,0.15)]">
                <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-center text-blue-400">Punti Luce per Tipo di Lampada</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                  {Object.entries(stats.lampTypeCounts).map(([type, count]) => (
                    <div
                      key={type}
                      className="bg-blue-900/40 p-3 sm:p-4 rounded-lg text-center border border-blue-500/20 hover:border-blue-400/40 hover:bg-blue-800/50 transition-all duration-200 min-w-0"
                    >
                      <h4 className="text-blue-200 text-xs sm:text-sm truncate" title={type}>
                        {type}
                      </h4>
                      <p className="text-lg sm:text-xl font-bold text-white tabular-nums">{count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "charts" && (
          <div className="space-y-5 sm:space-y-10">
            <div className="flex flex-col gap-4 sm:gap-8">
              {/* Torta Proprietà */}
              <div className="bg-black/60 rounded-xl p-3 sm:p-4 border border-blue-500/30 flex flex-col items-center w-full overflow-hidden">
                <h3 className="text-center text-blue-400 mb-2 text-base sm:text-lg font-semibold px-1">
                  Punti Luce per Proprietà
                </h3>
                <div className="relative w-full flex items-center justify-center" style={{ height: pieHeight }}>
                  <ResponsiveContainer width="100%" height={pieHeight} minWidth={0} minHeight={200}>
                    <PieChart style={{ background: "transparent" }}>
                      <Pie
                        data={propertyPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={pieOuterRadius}
                        innerRadius={pieInnerRadius}
                        label={renderCustomizedLabel}
                        isAnimationActive={!isMobile}
                        animationBegin={0}
                        animationDuration={2000}
                        animationEasing="ease-in-out"
                        labelLine={false}
                      >
                        {propertyPieData.map((entry, idx) => (
                          <Cell
                            key={`cell-prop-${idx}`}
                            fill={
                              entry.name === "EnelSole"
                                ? PROPERTY_COLORS["EnelSole"]
                                : entry.name === "Municipale"
                                  ? PROPERTY_COLORS["Municipale"]
                                  : PROPERTY_COLORS["default"]
                            }
                            stroke="none"
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        content={renderCustomLegend(null, propertyPieData)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Torta Apparecchio */}
              <div className="bg-black/60 rounded-xl p-3 sm:p-4 border border-blue-500/30 flex flex-col items-center w-full overflow-hidden">
                <h3 className="text-center text-blue-400 mb-2 text-base sm:text-lg font-semibold px-1">
                  Punti Luce per Tipo Apparecchio
                </h3>
                <div className="relative w-full flex items-center justify-center" style={{ height: pieHeight }}>
                  <ResponsiveContainer width="100%" height={pieHeight} minWidth={0} minHeight={200}>
                    <PieChart style={{ background: "transparent" }}>
                      <Pie
                        data={fixturePieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={pieOuterRadius}
                        innerRadius={pieInnerRadius}
                        label={renderCustomizedLabel}
                        isAnimationActive={!isMobile}
                        animationBegin={0}
                        animationDuration={2000}
                        animationEasing="ease-in-out"
                        labelLine={false}
                      >
                        {fixturePieData.map((entry, idx) => (
                          <Cell
                            key={`cell-fixture-${idx}`}
                            fill={CONTRAST_COLORS[idx % CONTRAST_COLORS.length]}
                            stroke="none"
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        content={renderCustomLegend(null, fixturePieData)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Torta Lampada */}
              <div className="bg-black/60 rounded-xl p-3 sm:p-4 border border-blue-500/30 flex flex-col items-center w-full overflow-hidden">
                <h3 className="text-center text-blue-400 mb-2 text-base sm:text-lg font-semibold px-1">
                  Punti Luce per Tipo Lampada
                </h3>
                <div className="relative w-full flex items-center justify-center" style={{ height: pieHeight }}>
                  <ResponsiveContainer width="100%" height={pieHeight} minWidth={0} minHeight={200}>
                    <PieChart style={{ background: "transparent" }}>
                      <Pie
                        data={lampPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={pieOuterRadius}
                        innerRadius={pieInnerRadius}
                        label={renderCustomizedLabel}
                        isAnimationActive={!isMobile}
                        animationBegin={0}
                        animationDuration={2000}
                        animationEasing="ease-in-out"
                        labelLine={false}
                      >
                        {lampPieData.map((entry, idx) => (
                          <Cell
                            key={`cell-lamp-${idx}`}
                            fill={CONTRAST_COLORS[idx % CONTRAST_COLORS.length]}
                            stroke="none"
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        content={renderCustomLegend(null, lampPieData)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            {/* Tempo di risposta medio */}
            <div className="bg-black/60 rounded-xl p-4 sm:p-6 border border-blue-500/30 flex flex-col items-center text-center">
              <h3 className="text-blue-400 text-base sm:text-lg font-semibold mb-2">
                Tempo di risposta medio alle segnalazioni
              </h3>
              {loadingAvg ? (
                <span className="text-blue-200">Caricamento...</span>
              ) : errorAvg ? (
                <span className="text-red-400">{errorAvg}</span>
              ) : avgResponseTime !== null ? (
                <span className="text-2xl sm:text-3xl font-bold text-blue-200">{avgResponseTime}</span>
              ) : (
                <span className="text-blue-200">Nessun dato disponibile</span>
              )}
            </div>
            {/* Grafico a colonne segnalazioni/operazioni */}
            <div className="bg-black/60 rounded-xl p-3 sm:p-6 border border-blue-500/30 overflow-hidden">
              <h3 className="text-blue-400 text-base sm:text-lg font-semibold mb-4 text-center">
                Segnalazioni e Operazioni per mese
              </h3>
              <ResponsiveContainer width="100%" height={barHeight} minWidth={0} minHeight={180}>
                <BarChart
                  data={barData}
                  margin={{ top: 10, right: isMobile ? 8 : 30, left: isMobile ? -18 : 0, bottom: 5 }}
                >
                  <XAxis dataKey="mese" stroke="#60a5fa" tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <YAxis stroke="#60a5fa" tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 32 : 40} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Segnalazioni" fill="#ef4444" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="Operazioni" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === "segnalazioni" && (
          <div className="space-y-5 sm:space-y-8 pb-8 sm:pb-12">
            {/* Statistiche Segnalazioni */}
            <div className="bg-black/60 rounded-xl p-4 sm:p-6 backdrop-blur-xl border border-blue-500/30 shadow-[0_0_25px_rgba(0,149,255,0.15)]">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-center text-blue-400">
                Statistiche Segnalazioni
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
                <StatCard
                  title="Segnalazioni in Corso"
                  value={reportsStats.totalReportsInProgress}
                  icon={AlertCircle}
                  color="red"
                />
                <StatCard
                  title="Segnalazioni Risolte"
                  value={reportsStats.totalReportsResolved}
                  icon={CheckCircle}
                  color="green"
                />
                <StatCard title="Operazioni Totali" value={reportsStats.totalOperations} icon={Wrench} color="blue" />
              </div>
            </div>

            {/* Grafici Segnalazioni */}
            <div className="grid md:grid-cols-2 gap-4 sm:gap-8">
              {/* Grafico Tipi di Segnalazione */}
              {reportTypePieData.length > 0 && (
                <div className="bg-black/60 rounded-xl p-3 sm:p-4 border border-blue-500/30 flex flex-col items-center overflow-hidden">
                  <h3 className="text-center text-blue-400 mb-2 text-base sm:text-lg font-semibold">
                    Segnalazioni per Tipo
                  </h3>
                  <ResponsiveContainer width="100%" height={reportPieHeight} minWidth={0}>
                    <PieChart>
                      <Pie
                        data={reportTypePieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={reportPieOuter}
                        innerRadius={reportPieInner}
                        label={renderCustomizedLabel}
                        isAnimationActive={!isMobile}
                        animationDuration={1500}
                        labelLine={false}
                      >
                        {reportTypePieData.map((entry, idx) => (
                          <Cell
                            key={`cell-report-${idx}`}
                            fill={CONTRAST_COLORS[idx % CONTRAST_COLORS.length]}
                            stroke="none"
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        content={renderCustomLegend(null, reportTypePieData)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Grafico Tipi di Operazione */}
              {operationTypePieData.length > 0 && (
                <div className="bg-black/60 rounded-xl p-3 sm:p-4 border border-blue-500/30 flex flex-col items-center overflow-hidden">
                  <h3 className="text-center text-blue-400 mb-2 text-base sm:text-lg font-semibold">
                    Operazioni per Tipo
                  </h3>
                  <ResponsiveContainer width="100%" height={reportPieHeight} minWidth={0}>
                    <PieChart>
                      <Pie
                        data={operationTypePieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={reportPieOuter}
                        innerRadius={reportPieInner}
                        label={renderCustomizedLabel}
                        isAnimationActive={!isMobile}
                        animationDuration={1500}
                        labelLine={false}
                      >
                        {operationTypePieData.map((entry, idx) => (
                          <Cell
                            key={`cell-operation-${idx}`}
                            fill={CONTRAST_COLORS[idx % CONTRAST_COLORS.length]}
                            stroke="none"
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        content={renderCustomLegend(null, operationTypePieData)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Lista Segnalazioni in Corso */}
            {reportsStats.reportsInProgress.length > 0 && (
              <div className="bg-black/60 rounded-xl p-4 sm:p-6 backdrop-blur-xl border border-red-500/30">
                <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-center text-red-400">
                  Segnalazioni in Corso
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-h-[min(60vh,24rem)] overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-red-700/70 scrollbar-track-red-950/40">
                  {showMoreReportsInProgress ? reportsStats.reportsInProgress.map((report, idx) => (
                    <ReportCard key={`progress-${idx}`} report={report} type="progress" onNavigateToPoint={onNavigateToPoint} />
                  )) : reportsStats.reportsInProgress.slice(0, 12).map((report, idx) => (
                    <ReportCard key={`progress-${idx}`} report={report} type="progress" onNavigateToPoint={onNavigateToPoint} />
                  ))}
                </div>
                {!showMoreReportsInProgress && reportsStats.reportsInProgress.length > 12 && (
                  <button
                    type="button"
                    className="w-full text-center text-red-300 mt-4 min-h-11 cursor-pointer hover:text-red-200 transition-colors"
                    onClick={() => setShowMoreReportsInProgress(true)}
                  >
                    ... e altre {reportsStats.reportsInProgress.length - 12} segnalazioni
                  </button>
                )}
              </div>
            )}

            {/* Lista Segnalazioni Risolte */}
            {reportsStats.reportsResolved.length > 0 && (
              <div className="bg-black/60 rounded-xl p-4 sm:p-6 backdrop-blur-xl border border-green-500/30">
                <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-center text-green-400">
                  Segnalazioni Risolte
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-h-[min(60vh,24rem)] overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-green-700/70 scrollbar-track-green-950/40">
                  {showMoreReportsResolved ? reportsStats.reportsResolved.map((report, idx) => (
                    <ReportCard key={`resolved-${idx}`} report={report} type="resolved" onNavigateToPoint={onNavigateToPoint} />
                  )) : reportsStats.reportsResolved.slice(0, 12).map((report, idx) => (
                    <ReportCard key={`resolved-${idx}`} report={report} type="resolved" onNavigateToPoint={onNavigateToPoint} />
                  ))}
                </div>
                {!showMoreReportsResolved && reportsStats.reportsResolved.length > 12 && (
                  <button
                    type="button"
                    className="w-full text-center text-green-300 mt-4 min-h-11 cursor-pointer hover:text-green-200 transition-colors"
                    onClick={() => setShowMoreReportsResolved(true)}
                  >
                    ... e altre {reportsStats.reportsResolved.length - 12} segnalazioni
                  </button>
                )}
              </div>
            )}

            {/* Lista Operazioni */}
            {reportsStats.operations.length > 0 && (
              <div className="bg-black/60 rounded-xl p-4 sm:p-6 backdrop-blur-xl border border-blue-500/30">
                <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-center text-blue-400">
                  Operazioni Effettuate
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-h-[min(60vh,24rem)] overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-blue-700/70 scrollbar-track-blue-950/40">
                  {showMoreOperations ? reportsStats.operations.map((operation, idx) => (
                    <OperationCard key={`operation-${idx}`} operation={operation} onNavigateToPoint={onNavigateToPoint} />
                  )) : reportsStats.operations.slice(0, 12).map((operation, idx) => (
                    <OperationCard key={`operation-${idx}`} operation={operation} onNavigateToPoint={onNavigateToPoint} />
                  ))}
                </div>
                {!showMoreOperations && reportsStats.operations.length > 12 && (
                  <button
                    type="button"
                    className="w-full text-center text-blue-300 mt-4 min-h-11 cursor-pointer hover:text-blue-200 transition-colors"
                    onClick={() => setShowMoreOperations(true)}
                  >
                    ... e altre {reportsStats.operations.length - 12} operazioni
                  </button>
                )}
              </div>
            )}

            {/* Messaggio se non ci sono segnalazioni */}
            {reportsStats.totalReportsInProgress === 0 &&
              reportsStats.totalReportsResolved === 0 &&
              reportsStats.totalOperations === 0 && (
                <div className="bg-black/60 rounded-xl p-6 sm:p-8 backdrop-blur-xl border border-gray-500/30 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">Nessuna Segnalazione</h3>
                  <p className="text-gray-500">Non sono presenti segnalazioni o operazioni per l'area selezionata.</p>
                </div>
              )}
          </div>
        )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default InfoPanel

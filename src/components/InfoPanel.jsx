"use client"

import { useState, useEffect } from "react"
import { X, MapPin, Lightbulb, Box, AlertCircle } from "lucide-react"
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Sector } from "recharts"
const COLORS = ["#60a5fa", "#818cf8", "#f472b6", "#facc15", "#34d399", "#f87171", "#a3e635", "#fbbf24", "#38bdf8", "#c084fc"]
import { useUser } from "../context/UserContext"
const PROPERTY_COLORS = {
  "EnelSole": "#ef4444", // rosso
  "Municipale": "#2563eb", // blu
  "default": "#64748b" // grigio per altri
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
  "#64748b" // grigio
]

const StatCard = ({ title, value, icon: Icon }) => (
  <div className="bg-blue-900/50 p-4 rounded-xl border border-blue-500/30 hover:border-blue-400/50 hover:bg-blue-800/60 transition-all duration-200">
    <div className="flex items-center gap-3 mb-2">
      <Icon className="h-5 w-5 text-blue-400" />
      <h4 className="text-blue-200 text-sm font-medium">{title}</h4>
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
  </div>
)

function InfoPanel({ activeMarkers, onClose, townhallName }) {
  const { getAverageResponseTime } = useUser()
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalLightFixtures: 0,
    totalCabinets: 0,
    totalActiveReports: 0,
    propertyCounts: {},
    fixtureTypeCounts: {},
    lampTypeCounts: {},
  })
  const [activeTab, setActiveTab] = useState("stats")
  const [avgResponseTime, setAvgResponseTime] = useState(null)
  const [loadingAvg, setLoadingAvg] = useState(false)
  const [errorAvg, setErrorAvg] = useState(null)

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
          .map((p) => {
            const match = p.data.lampada_potenza?.match(/^\w+/g)
            return match ? match[0] : null
          })
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
      const filteredByType = pl.filter((p) => {
        const match = p.data.lampada_potenza?.match(/^\w+/g)
        return match && match[0] === type
      })
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
  }, [activeMarkers])

  useEffect(() => {
    // Predisposizione chiamata API per tempo di risposta medio
    async function fetchAvgResponseTime() {
      setLoadingAvg(true)
      setErrorAvg(null)
      try {
        // Sostituisci con il vero endpoint quando disponibile
        const res = await getAverageResponseTime(townhallName)

        const data = res.data // se getAverageResponseTime restituisce già l'oggetto
        if (data && typeof data.count === 'number' && data.count > 0) {
          const hours = Number(data.avgTimeHours)
          let formatted = ''
          if (hours >= 24) {
            const giorni = Math.floor(hours / 24)
            const ore = Math.round(hours % 24)
            formatted = `${giorni}g${ore > 0 ? ` ${ore}h` : ''}`
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
    let grouped = []
    let otherValue = 0
    let otherNames = []
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
  const propertyPieData = groupSmallSlices(Object.entries(stats.propertyCounts).map(([name, value]) => ({ name, value })))
  const fixturePieData = groupSmallSlices(Object.entries(stats.fixtureTypeCounts).map(([name, value]) => ({ name, value })))
  const lampPieData = groupSmallSlices(Object.entries(stats.lampTypeCounts).map(([name, value]) => ({ name, value })))

  // Calcolo dati per grafico a colonne (segnalazioni/operazioni per mese)
  const [barData, setBarData] = useState([])
  useEffect(() => {
    if (!activeMarkers || activeMarkers.length === 0) return
    // Raccogli tutte le segnalazioni e operazioni
    const reports = []
    const operations = []
    activeMarkers.forEach(m => {
      if (m.data.segnalazioni_in_corso) {
        m.data.segnalazioni_in_corso.forEach(r => {
          if (r.report_date) reports.push(r.report_date)
        })
      }
      if (m.data.segnalazioni_risolte) {
        m.data.segnalazioni_risolte.forEach(r => {
          if (r.report_date) reports.push(r.report_date)
        })
      }
      if (m.data.operazioni_effettuate) {
        m.data.operazioni_effettuate.forEach(o => {
          if (o.operation_date) operations.push(o.operation_date)
        })
      }
    })
    // Raggruppa per mese/anno
    const groupByMonth = (dates) => {
      const map = {}
      dates.forEach(dateStr => {
        const d = new Date(dateStr)
        if (isNaN(d)) return
        const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}`
        map[key] = (map[key] || 0) + 1
      })
      return map
    }
    const reportMap = groupByMonth(reports)
    const opMap = groupByMonth(operations)
    // Unisci tutte le chiavi
    const allKeys = Array.from(new Set([...Object.keys(reportMap), ...Object.keys(opMap)])).sort()
    const data = allKeys.map(key => ({
      mese: key,
      Segnalazioni: reportMap[key] || 0,
      Operazioni: opMap[key] || 0
    }))
    setBarData(data)
  }, [activeMarkers])

  // Funzione label custom: sempre centrata nella fetta, mai label esterne
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }) => {
    const RADIAN = Math.PI / 180
    // Centro la label a metà tra inner e outer radius
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    // Mostra solo se la fetta è abbastanza grande
    if (percent < 0.07) return null
    return (
      <text
        x={x}
        y={y}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={15}
        fontWeight={600}
        pointerEvents="none"
      >
        {name} ({value})
      </text>
    )
  }

  // Custom Legend per mostrare valore accanto al nome solo per "fette piccole"
  const renderCustomLegend = (data, pieData) => ({ payload }) => (
    <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-2">
      {payload.map((entry, idx) => {
        const d = pieData.find(p => p.name === entry.value)
        const isOther = d && d._isOther
        // Mostra valore accanto al nome solo se la label non è interna (percentuale < 7%)
        const total = pieData.reduce((sum, p) => sum + p.value, 0)
        const perc = d ? d.value / total : 0
        return (
          <li key={entry.value} className="flex items-center gap-2">
            <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: entry.color, marginRight: 6 }}></span>
            <span className="text-white text-sm font-medium">
              {entry.value}
              {perc < 0.07 || isOther ? ` (${d.value})` : ''}
            </span>
          </li>
        )
      })}
    </ul>
  )

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-black/95 via-blue-950/95 to-black/95 backdrop-blur-xl z-20 overflow-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-blue-700/70 scrollbar-track-blue-950/40 scrollbar">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2.5 bg-black/60 hover:bg-blue-900/60 text-blue-400 rounded-lg backdrop-blur-xl border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-200"
        aria-label="Close panel"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="max-w-4xl mx-auto space-y-8 text-white">
        <h2 className="text-3xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
          Panoramica del Sistema
        </h2>
        {/* Tabs */}
        <div className="flex justify-center gap-4 my-6">
          <button
            className={`px-4 py-2 rounded-t-lg font-semibold transition-all duration-150 ${activeTab === "stats" ? "bg-blue-800/80 text-blue-200" : "bg-blue-950/40 text-blue-400 hover:bg-blue-900/40"}`}
            onClick={() => setActiveTab("stats")}
          >
            Statistiche
          </button>
          <button
            className={`px-4 py-2 rounded-t-lg font-semibold transition-all duration-150 ${activeTab === "charts" ? "bg-blue-800/80 text-blue-200" : "bg-blue-950/40 text-blue-400 hover:bg-blue-900/40"}`}
            onClick={() => setActiveTab("charts")}
          >
            Grafici
          </button>
        </div>

        {activeTab === "stats" && (
          <>
            {/* --- VISTA STATISTICHE CLASSICA --- */}
            <div className="bg-black/60 rounded-xl p-6 backdrop-blur-xl border border-blue-500/30 shadow-[0_0_25px_rgba(0,149,255,0.15)]">
              <h3 className="text-xl font-semibold mb-6 text-center text-blue-400">Statistiche Generali</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Punti Totali" value={stats.totalPoints} icon={MapPin} />
                <StatCard title="Apparecchi Totali" value={stats.totalLightFixtures} icon={Lightbulb} />
                <StatCard title="Quadri Totali" value={stats.totalCabinets} icon={Box} />
                <StatCard title="Segnalazioni Attive" value={stats.totalActiveReports} icon={AlertCircle} />
              </div>
            </div>

            {Object.keys(stats.propertyCounts).length > 0 && (
              <div className="bg-black/60 rounded-xl p-6 backdrop-blur-xl border border-blue-500/30 shadow-[0_0_25px_rgba(0,149,255,0.15)]">
                <h3 className="text-xl font-semibold mb-6 text-center text-blue-400">Punti Luce per Proprietà</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Object.entries(stats.propertyCounts).map(([property, count]) => (
                    <div
                      key={property}
                      className="bg-blue-900/40 p-4 rounded-lg text-center border border-blue-500/20 hover:border-blue-400/40 hover:bg-blue-800/50 transition-all duration-200"
                    >
                      <h4 className="text-blue-200 text-sm truncate" title={property}>
                        {property}
                      </h4>
                      <p className="text-xl font-bold text-white">{count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(stats.fixtureTypeCounts).length > 0 && (
              <div className="bg-black/60 rounded-xl p-6 backdrop-blur-xl border border-blue-500/30 shadow-[0_0_25px_rgba(0,149,255,0.15)]">
                <h3 className="text-xl font-semibold mb-6 text-center text-blue-400">Punti Luce per Tipo di Apparecchio</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Object.entries(stats.fixtureTypeCounts).map(([type, count]) => (
                    <div
                      key={type}
                      className="bg-blue-900/40 p-4 rounded-lg text-center border border-blue-500/20 hover:border-blue-400/40 hover:bg-blue-800/50 transition-all duration-200"
                    >
                      <h4 className="text-blue-200 text-sm truncate" title={type}>
                        {type}
                      </h4>
                      <p className="text-xl font-bold text-white">{count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(stats.lampTypeCounts).length > 0 && (
              <div className="bg-black/60 rounded-xl p-6 backdrop-blur-xl border border-blue-500/30 shadow-[0_0_25px_rgba(0,149,255,0.15)]">
                <h3 className="text-xl font-semibold mb-6 text-center text-blue-400">Punti Luce per Tipo di Lampada</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Object.entries(stats.lampTypeCounts).map(([type, count]) => (
                    <div
                      key={type}
                      className="bg-blue-900/40 p-4 rounded-lg text-center border border-blue-500/20 hover:border-blue-400/40 hover:bg-blue-800/50 transition-all duration-200"
                    >
                      <h4 className="text-blue-200 text-sm truncate" title={type}>
                        {type}
                      </h4>
                      <p className="text-xl font-bold text-white">{count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "charts" && (
          <div className="space-y-10">
            <div className="flex flex-col gap-8">
              {/* Torta Proprietà */}
              <div className="bg-black/60 rounded-xl p-4 border border-blue-500/30 flex flex-col items-center w-full" style={{boxShadow:'none'}}>
                <h3 className="text-center text-blue-400 mb-2 text-lg font-semibold">Punti Luce per Proprietà</h3>
                <div className="relative w-full h-[420px] flex items-center justify-center">
                  
                  <ResponsiveContainer width="100%" height={420} minWidth={320} minHeight={320}>
                    <PieChart style={{zIndex:2, background:'transparent'}}>
                      <Pie
                        data={propertyPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={180}
                        innerRadius={70}
                        label={renderCustomizedLabel}
                        isAnimationActive={true}
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
                      <Legend verticalAlign="bottom" iconType="circle" content={renderCustomLegend(null, propertyPieData)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Torta Apparecchio */}
              <div className="bg-black/60 rounded-xl p-4 border border-blue-500/30 flex flex-col items-center w-full" style={{boxShadow:'none'}}>
                <h3 className="text-center text-blue-400 mb-2 text-lg font-semibold">Punti Luce per Tipo Apparecchio</h3>
                <div className="relative w-full h-[420px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={420} minWidth={320} minHeight={320}>
                    <PieChart style={{zIndex:2, background:'transparent'}}>
                      <Pie
                        data={fixturePieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={180}
                        innerRadius={70}
                        label={renderCustomizedLabel}
                        isAnimationActive={true}
                        animationBegin={0}
                        animationDuration={2000}
                        animationEasing="ease-in-out"
                        labelLine={false}
                      >
                        {fixturePieData.map((entry, idx) => (
                          <Cell key={`cell-fixture-${idx}`} fill={CONTRAST_COLORS[idx % CONTRAST_COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                      <Legend verticalAlign="bottom" iconType="circle" content={renderCustomLegend(null, fixturePieData)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Torta Lampada */}
              <div className="bg-black/60 rounded-xl p-4 border border-blue-500/30 flex flex-col items-center w-full" style={{boxShadow:'none'}}>
                <h3 className="text-center text-blue-400 mb-2 text-lg font-semibold">Punti Luce per Tipo Lampada</h3>
                <div className="relative w-full h-[420px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={420} minWidth={320} minHeight={320}>
                    <PieChart style={{zIndex:2, background:'transparent'}}>
                      <Pie
                        data={lampPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={180}
                        innerRadius={70}
                        label={renderCustomizedLabel}
                        isAnimationActive={true}
                        animationBegin={0}
                        animationDuration={2000}
                        animationEasing="ease-in-out"
                        labelLine={false}
                      >
                        {lampPieData.map((entry, idx) => (
                          <Cell key={`cell-lamp-${idx}`} fill={CONTRAST_COLORS[idx % CONTRAST_COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                      <Legend verticalAlign="bottom" iconType="circle" content={renderCustomLegend(null, lampPieData)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            {/* Tempo di risposta medio */}
            <div className="bg-black/60 rounded-xl p-6 border border-blue-500/30 flex flex-col items-center">
              <h3 className="text-blue-400 text-lg font-semibold mb-2">Tempo di risposta medio alle segnalazioni</h3>
              {loadingAvg ? (
                <span className="text-blue-200">Caricamento...</span>
              ) : errorAvg ? (
                <span className="text-red-400">{errorAvg}</span>
              ) : avgResponseTime !== null ? (
                <span className="text-3xl font-bold text-blue-200">{avgResponseTime}</span>
              ) : (
                <span className="text-blue-200">Nessun dato disponibile</span>
              )}
            </div>
            {/* Grafico a colonne segnalazioni/operazioni */}
            <div className="bg-black/60 rounded-xl p-6 border border-blue-500/30">
              <h3 className="text-blue-400 text-lg font-semibold mb-4 text-center">Segnalazioni e Operazioni per mese</h3>
              <ResponsiveContainer width="100%" height={340} minWidth={220} minHeight={220}>
                <BarChart data={barData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <XAxis dataKey="mese" stroke="#60a5fa" />
                  <YAxis stroke="#60a5fa" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Segnalazioni" fill="#ef4444" radius={[8,8,0,0]} />
                  <Bar dataKey="Operazioni" fill="#2563eb" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default InfoPanel


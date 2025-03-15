"use client"

import { useState, useEffect } from "react"
import { X, MapPin, Lightbulb, Box, AlertCircle } from "lucide-react"

const StatCard = ({ title, value, icon: Icon }) => (
  <div className="bg-blue-900/50 p-4 rounded-xl border border-blue-500/30 hover:border-blue-400/50 hover:bg-blue-800/60 transition-all duration-200">
    <div className="flex items-center gap-3 mb-2">
      <Icon className="h-5 w-5 text-blue-400" />
      <h4 className="text-blue-200 text-sm font-medium">{title}</h4>
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
  </div>
)

function InfoPanel({ activeMarkers, onClose }) {
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalLightFixtures: 0,
    totalCabinets: 0,
    totalActiveReports: 0,
    propertyCounts: {},
    fixtureTypeCounts: {},
    lampTypeCounts: {},
  })

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

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-black/95 via-blue-950/95 to-black/95 backdrop-blur-xl z-20 overflow-auto p-4 md:p-8">
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
      </div>
    </div>
  )
}

export default InfoPanel


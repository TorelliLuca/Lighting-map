/** Utility condivise per i chart dell'InfoPanel (shadcn + recharts). */

export const CHART_PALETTE = [
  "hsl(0 72% 55%)",
  "hsl(217 91% 60%)",
  "hsl(32 95% 52%)",
  "hsl(160 84% 39%)",
  "hsl(280 67% 45%)",
  "hsl(45 93% 47%)",
  "hsl(199 89% 48%)",
  "hsl(340 75% 55%)",
  "hsl(258 90% 56%)",
  "hsl(215 16% 47%)",
]

export const PROPERTY_CHART_COLORS = {
  EnelSole: "hsl(0 72% 55%)",
  Municipale: "hsl(217 91% 60%)",
  default: "hsl(215 16% 47%)",
}

export const slugifyKey = (name, idx) =>
  `k${idx}_${String(name || "altro")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .slice(0, 24)}`

export function buildChartModel(entries, { colorFor } = {}) {
  const config = {}
  const data = (entries || []).map((entry, idx) => {
    const key = slugifyKey(entry.name, idx)
    const color =
      (typeof colorFor === "function" && colorFor(entry, idx)) ||
      CHART_PALETTE[idx % CHART_PALETTE.length]
    config[key] = {
      label: entry.name,
      color,
    }
    return {
      key,
      name: entry.name,
      value: entry.value,
      fill: `var(--color-${key})`,
    }
  })
  return { config, data }
}

/** "2024-01" → "gen 24" */
export function formatMonthLabel(key) {
  if (!key || typeof key !== "string") return key
  const [year, month] = key.split("-")
  const d = new Date(Number(year), Number(month) - 1, 1)
  if (isNaN(d.getTime())) return key
  const label = d.toLocaleDateString("it-IT", { month: "short", year: "2-digit" })
  return label.replace(".", "")
}

export function sliceLastMonths(rows, months) {
  if (!months || !rows?.length) return rows || []
  return rows.slice(-months)
}

export function summarizeBarSeries(rows) {
  const list = rows || []
  const totalSegnalazioni = list.reduce((s, r) => s + (r.Segnalazioni || 0), 0)
  const totalOperazioni = list.reduce((s, r) => s + (r.Operazioni || 0), 0)
  let peak = null
  list.forEach((row) => {
    const total = (row.Segnalazioni || 0) + (row.Operazioni || 0)
    if (!peak || total > peak.total) {
      peak = { mese: row.mese, total, segnalazioni: row.Segnalazioni || 0, operazioni: row.Operazioni || 0 }
    }
  })
  return { totalSegnalazioni, totalOperazioni, peak }
}

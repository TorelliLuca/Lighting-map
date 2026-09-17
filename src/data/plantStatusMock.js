/** Tipi evento feed Stato impianto. */
export const PLANT_EVENT_TYPES = {
  ordinary: {
    id: "ordinary",
    label: "Ordinaria",
    shortLabel: "Ord.",
    chipClass: "border-blue-500/40 bg-blue-500/15 text-blue-100",
    timelineDot: "bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.7)]",
    timelineColor: "#3b82f6",
  },
  extraordinary: {
    id: "extraordinary",
    label: "Straordinaria",
    shortLabel: "Straord.",
    chipClass: "border-orange-500/40 bg-orange-500/15 text-orange-100",
    timelineDot: "bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.7)]",
    timelineColor: "#f97316",
  },
  quote: {
    id: "quote",
    label: "Preventivo",
    shortLabel: "Prev.",
    chipClass: "border-violet-500/40 bg-violet-500/15 text-violet-100",
    timelineDot: "bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.7)]",
    timelineColor: "#8b5cf6",
  },
  inspection: {
    id: "inspection",
    label: "Sopralluogo",
    shortLabel: "Sopr.",
    chipClass: "border-cyan-500/40 bg-cyan-500/15 text-cyan-100",
    timelineDot: "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]",
    timelineColor: "#06b6d4",
  },
  light_off: {
    id: "light_off",
    label: "PL spento",
    shortLabel: "Spento",
    chipClass: "border-amber-500/40 bg-amber-500/15 text-amber-100",
    timelineDot: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.75)]",
    timelineColor: "#f59e0b",
  },
}

/** Ordine sezioni in vista "Tutti". */
export const PLANT_EVENT_TYPE_ORDER = [
  "extraordinary",
  "ordinary",
  "light_off",
  "quote",
  "inspection",
]

export const PRIORITY_BORDER = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-amber-400",
  low: "border-l-slate-500",
}

export const PRIORITY_LABELS = {
  critical: "Critica",
  high: "Alta",
  medium: "Media",
  low: "Bassa",
}

/** Penalità priorità per score salute (sottratte da 100). */
export const PRIORITY_SCORE = {
  critical: 18,
  high: 10,
  medium: 5,
  low: 2,
}

export function countByType(events) {
  const counts = { all: events.length }
  for (const key of Object.keys(PLANT_EVENT_TYPES)) {
    counts[key] = 0
  }
  for (const event of events) {
    if (counts[event.type] != null) counts[event.type] += 1
  }
  return counts
}

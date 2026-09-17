"use client"

import { useMemo, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import { computeActivityTimeline } from "@/utils/plantStatusEvents"

export const PlantStatusActivityTimeline = ({ events = [] }) => {
  const prefersReducedMotion = useReducedMotion()
  const [hoveredId, setHoveredId] = useState(null)

  const data = useMemo(() => computeActivityTimeline(events, new Date(), 12), [events])
  const maxLabelRow = useMemo(
    () => data.signals.reduce((m, s) => Math.max(m, s.labelRow || 0), 0),
    [data.signals]
  )

  if (!data.total) {
    return (
      <section className="mb-5 rounded-xl border border-border/70 bg-card/40 px-4 py-5">
        <h3 className="text-sm font-semibold text-foreground">Timeline scadenze</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Nessuna voce scaduta o in scadenza.
        </p>
      </section>
    )
  }

  return (
    <section
      className="mb-5 rounded-xl border border-border/70 bg-card/50 px-4 py-5 sm:px-5 backdrop-blur-sm"
      aria-label="Timeline scadenze"
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
          Timeline scadenze
        </h3>
        <span className="text-xs tabular-nums text-muted-foreground">
          {data.total} voci
        </span>
      </div>

      <div
        className="relative"
        style={{ paddingBottom: maxLabelRow > 0 ? "3.25rem" : "2rem" }}
      >
        <div className="relative h-3">
          <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-zinc-700/80">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-[#c45c4a]"
              initial={prefersReducedMotion ? false : { width: 0 }}
              animate={{ width: `${data.activePercent}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          {data.signals.map((signal) => (
            <button
              key={signal.id}
              type="button"
              title={signal.title}
              aria-label={`${signal.title} · ${signal.dateLabel}`}
              onMouseEnter={() => setHoveredId(signal.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(signal.id)}
              onBlur={() => setHoveredId(null)}
              className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
              style={{ left: `${signal.percent}%` }}
            >
              <span
                className={cn(
                  "block h-2.5 w-2.5 rounded-full border border-black/40 transition-transform",
                  hoveredId === signal.id && "scale-125",
                  signal.dueStatus === "overdue" && "ring-2 ring-red-400/50"
                )}
                style={{
                  backgroundColor: signal.color,
                  boxShadow:
                    hoveredId === signal.id
                      ? `0 0 10px ${signal.color}`
                      : `0 0 4px ${signal.color}88`,
                }}
              />
              <span
                className={cn(
                  "pointer-events-none absolute left-1/2 w-[4.25rem] -translate-x-1/2 text-center text-[10px] sm:text-[11px] tabular-nums leading-tight",
                  signal.dueStatus === "overdue"
                    ? "text-red-300 font-semibold"
                    : "text-amber-200/90 font-medium",
                  signal.percent < 6 && "left-0 translate-x-0 text-left",
                  signal.percent > 94 && "left-auto right-0 translate-x-0 text-right"
                )}
                style={{ top: `calc(0.85rem + ${(signal.labelRow || 0) * 1.15}rem)` }}
              >
                {signal.dateLabel}
              </span>
              {hoveredId === signal.id ? (
                <span className="pointer-events-none absolute left-1/2 z-20 w-max max-w-[12rem] -translate-x-1/2 rounded-md border border-border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-lg"
                  style={{ top: `calc(2.4rem + ${(signal.labelRow || 0) * 1.15}rem)` }}
                >
                  {signal.title}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

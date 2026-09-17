"use client"

import { AlertTriangle } from "lucide-react"
import { useReducedMotion } from "framer-motion"
import InfoTooltip from "@/components/ui/InfoTooltip"
import { cn } from "@/lib/utils"

const formatCurrency = (value) => {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return "—"
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Colore / glow in base alla saturazione del budget straordinaria. */
const budgetProgressTone = (pct) => {
  if (pct >= 100) {
    return {
      indicator: "bg-red-500",
      baseFill: "bg-red-500/40",
      track: "bg-red-500/25",
      label: "text-red-200",
      barGlow: "shadow-[0_0_16px_rgba(239,68,68,0.55),0_0_28px_rgba(239,68,68,0.25)]",
      iconGlow: "drop-shadow-[0_0_8px_rgba(248,113,113,0.9)]",
      marker: "bg-white shadow-[0_0_8px_rgba(255,255,255,0.85)]",
    }
  }
  if (pct >= 90) {
    return {
      indicator: "bg-red-500",
      baseFill: "bg-red-500/40",
      track: "bg-red-500/20",
      label: "text-red-300",
      barGlow: "shadow-[0_0_14px_rgba(239,68,68,0.45),0_0_22px_rgba(239,68,68,0.2)]",
      iconGlow: "drop-shadow-[0_0_8px_rgba(248,113,113,0.85)]",
      marker: "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]",
    }
  }
  if (pct >= 75) {
    return {
      indicator: "bg-amber-500",
      baseFill: "bg-amber-500/40",
      track: "bg-amber-500/20",
      label: "text-amber-200",
      barGlow: "shadow-[0_0_14px_rgba(245,158,11,0.45),0_0_22px_rgba(245,158,11,0.2)]",
      iconGlow: "drop-shadow-[0_0_8px_rgba(251,191,36,0.85)]",
      marker: "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]",
    }
  }
  if (pct >= 50) {
    return {
      indicator: "bg-yellow-400",
      baseFill: "bg-yellow-400/40",
      track: "bg-yellow-500/25",
      label: "text-yellow-200",
      barGlow: "shadow-[0_0_12px_rgba(234,179,8,0.4),0_0_20px_rgba(234,179,8,0.18)]",
      iconGlow: "drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]",
      marker: "bg-white shadow-[0_0_8px_rgba(255,255,255,0.75)]",
    }
  }
  return {
    indicator: "bg-emerald-400",
    baseFill: "bg-emerald-400/40",
    track: "bg-emerald-500/20",
    label: "text-emerald-200",
    barGlow: "shadow-[0_0_12px_rgba(52,211,153,0.4),0_0_20px_rgba(52,211,153,0.18)]",
    iconGlow: "drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]",
    marker: "bg-white shadow-[0_0_8px_rgba(255,255,255,0.75)]",
  }
}

const toPct = (value, limit) => Math.round((value / limit) * 1000) / 10

const formatPctLabel = (pct) =>
  Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`

const SegmentMarker = ({ leftPct, toneClass, title, taller = false }) => (
  <div
    className={cn(
      "pointer-events-none absolute top-1/2 z-10 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
      taller ? "h-6" : "h-5",
      toneClass,
    )}
    style={{ left: `${leftPct}%` }}
    title={title}
    aria-hidden="true"
  />
)

export const DEFAULT_BUDGET_INFO_TEXT =
  "Totale = somma dei totali dei consuntivi con stato approvato."

export const REVIEW_BUDGET_INFO_TEXT =
  "Barra opaca: consuntivi già approvati. Segmento pieno: importo di questo documento sommato al progresso. Le lineette indicano dove finiscono i due tratti."

/**
 * @param {object} props
 * @param {number} props.spent - Spesa già contabilizzata (consuntivi approvati)
 * @param {number} [props.extraSpent] - Importo del documento in revisione (si somma in coda)
 * @param {number} props.limit - Budget straordinaria capitolato
 * @param {string} [props.infoText]
 * @param {string} [props.className]
 */
export const ExtraordinaryBudgetBar = ({
  spent,
  extraSpent,
  limit,
  infoText = DEFAULT_BUDGET_INFO_TEXT,
  className,
}) => {
  const reduceMotion = useReducedMotion()
  const safeLimit = Number(limit)
  if (!Number.isFinite(safeLimit) || safeLimit <= 0) return null

  const baseSpent = Math.max(0, Number(spent) || 0)
  const hasExtra = extraSpent != null && Number.isFinite(Number(extraSpent))
  const extra = hasExtra ? Math.max(0, Number(extraSpent) || 0) : 0
  const totalSpent = baseSpent + extra

  const basePct = toPct(baseSpent, safeLimit)
  const totalPct = toPct(totalSpent, safeLimit)
  const baseBar = Math.min(100, Math.max(0, basePct))
  const totalBar = Math.min(100, Math.max(0, totalPct))
  const extraBar = Math.max(0, totalBar - baseBar)

  const tone = budgetProgressTone(totalPct)
  const atOrOverLimit = totalPct >= 100
  const pctLabel = formatPctLabel(totalPct)
  const showBaseMarker = hasExtra && baseBar > 0 && baseBar < 100
  const showEndMarker = totalBar > 0
  const showSegmentLabels = hasExtra && (baseBar > 0 || extraBar > 0 || extra > 0)
  const pulseTrack = !reduceMotion && "motion-safe:animate-budget-bar-pulse"
  const pulseFill = !reduceMotion && "motion-safe:animate-budget-bar-fill-pulse"

  return (
    <div
      className={cn("w-full min-w-0 max-w-md shrink-0 space-y-1.5 lg:w-80", className)}
      data-tour="page-approval-budget"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <span className="truncate text-sm font-semibold text-foreground">
            Budget straordinaria
          </span>
          <InfoTooltip text={infoText} />
        </div>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1.5 text-sm font-bold tabular-nums",
            tone.label,
          )}
        >
          {atOrOverLimit ? (
            <AlertTriangle
              className={cn(
                "h-4 w-4 text-red-400",
                tone.iconGlow,
                pulseFill,
              )}
              aria-label="Budget saturato"
            />
          ) : null}
          {pctLabel}
        </span>
      </div>

      <div
        className={cn(
          "relative h-3.5 w-full overflow-visible rounded-full",
          tone.track,
          tone.barGlow,
          pulseTrack,
        )}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(100, totalPct))}
        aria-label={`Budget straordinaria utilizzato al ${pctLabel}`}
      >
        <div className="absolute inset-0 overflow-hidden rounded-full">
          {hasExtra ? (
            <>
              <div
                className={cn(
                  "absolute inset-y-0 left-0 transition-all",
                  tone.baseFill,
                  pulseFill,
                )}
                style={{ width: `${baseBar}%` }}
              />
              {extraBar > 0 ? (
                <div
                  className={cn(
                    "absolute inset-y-0 transition-all shadow-[0_0_12px_currentColor]",
                    tone.indicator,
                    pulseFill,
                  )}
                  style={{ left: `${baseBar}%`, width: `${extraBar}%` }}
                />
              ) : null}
            </>
          ) : (
            <div
              className={cn(
                "absolute inset-y-0 left-0 transition-all shadow-[0_0_12px_currentColor]",
                tone.indicator,
                pulseFill,
              )}
              style={{ width: `${totalBar}%` }}
            />
          )}
        </div>

        {showBaseMarker ? (
          <SegmentMarker
            leftPct={baseBar}
            toneClass={tone.marker}
            title={`Fine consuntivi approvati (${formatCurrency(baseSpent)})`}
          />
        ) : null}

        {showEndMarker ? (
          <SegmentMarker
            leftPct={totalBar}
            toneClass={cn(tone.marker, "opacity-95")}
            title={`Totale al momento dell'approvazione (${formatCurrency(totalSpent)})`}
            taller
          />
        ) : null}
      </div>

      {showSegmentLabels ? (
        <SegmentLabels
          baseBar={baseBar}
          extraBar={extraBar}
          baseSpent={baseSpent}
          totalSpent={totalSpent}
          extra={extra}
          tone={tone}
        />
      ) : null}

      <p className="text-right text-sm font-medium tabular-nums text-foreground">
        {formatCurrency(totalSpent)}
        <span className="font-normal text-muted-foreground"> / {formatCurrency(safeLimit)}</span>
      </p>
    </div>
  )
}

/** Soglia sotto la quale le etichette affiancate rischiano di sovrapporsi / risultare illeggibili. */
const SIDE_BY_SIDE_MIN_PCT = 24

const SegmentLabels = ({ baseBar, extraBar, baseSpent, totalSpent, extra, tone }) => {
  const showBase = baseBar > 0
  const showExtra = extraBar > 0 || extra > 0
  if (!showBase && !showExtra) return null

  const canSideBySide =
    showBase
    && showExtra
    && baseBar >= SIDE_BY_SIDE_MIN_PCT
    && extraBar >= SIDE_BY_SIDE_MIN_PCT

  if (canSideBySide) {
    return (
      <div className="flex w-full gap-1.5">
        <div
          className="min-w-0 text-center text-[10px] leading-snug text-muted-foreground"
          style={{ flex: `${baseBar} 1 0%` }}
        >
          <span className="block break-words">Totale consuntivi approvati</span>
          <span className="mt-0.5 block tabular-nums text-foreground/75">
            {formatCurrency(baseSpent)}
          </span>
        </div>
        <div
          className="min-w-0 text-center text-[10px] leading-snug text-muted-foreground"
          style={{ flex: `${Math.max(extraBar, 1)} 1 0%` }}
        >
          <span className="block break-words">Totale al momento dell&apos;approvazione</span>
          <span className="mt-0.5 block tabular-nums text-foreground/90">
            {formatCurrency(totalSpent)}
          </span>
        </div>
      </div>
    )
  }

  // Stack verticale: nessuna sovrapposizione possibile
  return (
    <div className="space-y-1.5 text-[10px] leading-snug text-muted-foreground">
      {showBase ? (
        <div className="flex items-start gap-2">
          <span
            className={cn("mt-0.5 h-2.5 w-2.5 shrink-0 rounded-sm", tone.baseFill)}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <span className="block">Totale consuntivi approvati</span>
            <span className="mt-0.5 block tabular-nums text-foreground/75">
              {formatCurrency(baseSpent)}
            </span>
          </div>
        </div>
      ) : null}
      {showExtra ? (
        <div className="flex items-start gap-2">
          <span
            className={cn("mt-0.5 h-2.5 w-2.5 shrink-0 rounded-sm", tone.indicator)}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <span className="block">Totale al momento dell&apos;approvazione</span>
            <span className="mt-0.5 block tabular-nums text-foreground/90">
              {formatCurrency(totalSpent)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default ExtraordinaryBudgetBar

"use client"

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react"
import { motion, useReducedMotion } from "framer-motion"
import { LightbulbLoader } from "./lightbulb-loader"

const DEFAULT_SLOW_THRESHOLD_MS = 8000
const SLOW_MESSAGE = "Ci vuole un po' più del previsto, un attimo ancora..."

const formatCount = (n) =>
  typeof n === "number" && Number.isFinite(n)
    ? Math.max(0, Math.round(n)).toLocaleString("it-IT")
    : null

/**
 * Overlay presentazionale di caricamento mappa.
 * Nessuna percentuale numerica in UI: solo barra + conteggio punti quando disponibile.
 *
 * processed:
 * - null → fase download/sconosciuta (mostra "… / totale")
 * - number → punti già creati sul client
 */
export function MapLoader({
  progress = null,
  stage = "Caricamento mappa...",
  processed = null,
  total = 0,
  slowThresholdMs = DEFAULT_SLOW_THRESHOLD_MS,
  variant = "fullscreen",
}) {
  const [showSlowMessage, setShowSlowMessage] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const isDeterminate =
    typeof progress === "number" && Number.isFinite(progress)

  const clampedProgress = isDeterminate
    ? Math.min(100, Math.max(0, progress))
    : null

  useEffect(() => {
    setShowSlowMessage(false)
    const timerId = setTimeout(() => {
      setShowSlowMessage(true)
    }, slowThresholdMs)

    return () => clearTimeout(timerId)
  }, [stage, slowThresholdMs])

  const statusMessage = showSlowMessage ? SLOW_MESSAGE : stage

  const totalLabel = formatCount(total)
  const hasTotal = totalLabel !== null && total > 0
  const processedKnown =
    typeof processed === "number" && Number.isFinite(processed)
  const processedLabel = processedKnown ? formatCount(processed) : null

  let counterText = null
  if (hasTotal && processedKnown) {
    counterText = `${processedLabel} / ${totalLabel} punti`
  } else if (hasTotal && !processedKnown) {
    counterText = `… / ${totalLabel} punti`
  } else if (processedKnown && processed > 0) {
    counterText = `${processedLabel} punti elaborati`
  }

  const subtitle =
    counterText ??
    (isDeterminate
      ? "Ottimizzazione per prestazioni migliori"
      : "Attendere, operazione in corso...")

  const progressBar = (
    <div
      className="w-full bg-blue-900/30 rounded-full h-2.5 overflow-hidden"
      role="progressbar"
      aria-valuemin={isDeterminate ? 0 : undefined}
      aria-valuemax={isDeterminate ? 100 : undefined}
      aria-valuenow={isDeterminate ? Math.round(clampedProgress) : undefined}
      aria-valuetext={
        counterText ??
        (isDeterminate
          ? `Caricamento ${Math.round(clampedProgress)} percento`
          : "Caricamento in corso")
      }
      aria-label="Avanzamento caricamento mappa"
    >
      {isDeterminate ? (
        <motion.div
          className="bg-gradient-to-r from-blue-500 to-blue-400 h-2.5 rounded-full origin-left"
          initial={false}
          animate={{ width: `${clampedProgress}%` }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 120, damping: 24, mass: 0.4 }
          }
        />
      ) : (
        <div className="relative h-full w-full">
          <motion.div
            className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-blue-400 to-transparent"
            initial={false}
            animate={
              prefersReducedMotion
                ? { opacity: [0.4, 0.9, 0.4] }
                : { x: ["-40%", "300%"] }
            }
            transition={{
              duration: prefersReducedMotion ? 1.6 : 1.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
      )}
    </div>
  )

  if (variant === "compact") {
    return (
      <div className="pointer-events-none absolute left-1/2 top-3 z-50 w-[min(92vw,28rem)] -translate-x-1/2">
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-blue-500/30 bg-black/70 px-4 py-3 shadow-[0_0_25px_rgba(0,149,255,0.15)] backdrop-blur-md">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping" />
            <LightbulbLoader size={22} />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p
              role="status"
              aria-live="polite"
              className="truncate text-sm font-medium text-blue-200"
            >
              {statusMessage}
            </p>
            {progressBar}
            <p className="text-xs text-blue-300/70 tabular-nums">{subtitle}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/45 backdrop-blur-md">
      <div className="flex w-full max-w-md flex-col items-center space-y-6 rounded-xl border border-blue-500/30 bg-black/55 p-8 shadow-[0_0_25px_rgba(0,149,255,0.15)] backdrop-blur-sm">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping" />
          <LightbulbLoader />
        </div>

        <div className="w-full space-y-2">
          <p
            role="status"
            aria-live="polite"
            className="text-center text-lg font-medium text-blue-200"
          >
            {statusMessage}
          </p>
          {progressBar}
          <p className="text-center text-sm text-blue-300/70 tabular-nums">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  )
}

const INITIAL_SNAPSHOT = {
  progress: null,
  stage: "Inizializzazione mappa...",
  processed: null,
  total: 0,
}

/**
 * Host isolato: lo stato di progresso vive QUI, non nel Dashboard.
 * Dopo ogni yield (await / rAF) React committa da solo: niente flushSync
 * (evita "flushSync was called from inside a lifecycle method").
 */
export const MapLoadOverlay = forwardRef(function MapLoadOverlay(
  {
    visible = true,
    expectedTotal = 0,
    slowThresholdMs = DEFAULT_SLOW_THRESHOLD_MS,
    variant = "fullscreen",
  },
  ref,
) {
  const [snapshot, setSnapshot] = useState(() => ({
    ...INITIAL_SNAPSHOT,
    total: expectedTotal || 0,
  }))

  useEffect(() => {
    if (expectedTotal > 0) {
      setSnapshot((prev) =>
        prev.total > 0 && prev.total !== expectedTotal && prev.processed != null
          ? prev
          : prev.total === expectedTotal
            ? prev
            : { ...prev, total: Math.max(prev.total || 0, expectedTotal) },
      )
    }
  }, [expectedTotal])

  useImperativeHandle(ref, () => ({
    update(partial) {
      setSnapshot((prev) => ({ ...prev, ...partial }))
    },
    reset(nextTotal = expectedTotal) {
      setSnapshot({
        ...INITIAL_SNAPSHOT,
        total: nextTotal || 0,
      })
    },
  }), [expectedTotal])

  if (!visible) return null

  return (
    <MapLoader
      progress={snapshot.progress}
      stage={snapshot.stage}
      processed={snapshot.processed}
      total={snapshot.total}
      slowThresholdMs={slowThresholdMs}
      variant={variant}
    />
  )
})

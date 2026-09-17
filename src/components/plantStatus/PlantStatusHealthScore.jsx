"use client"

import { useMemo } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { ShieldAlert, ShieldCheck, Activity } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

/** Aura score: 100 = verde, 0 = rosso fuoco. */
function auraFromScore(score) {
  const s = Math.max(0, Math.min(100, Number(score) || 0))
  const t = 1 - s / 100
  const hue = s >= 50 ? 55 + ((s - 50) / 50) * 75 : (s / 50) * 55
  const sat = 78 + t * 14
  const light = 48 + (1 - t) * 6
  return {
    glow: `hsla(${hue}, ${sat}%, ${light}%, ${0.28 + t * 0.22})`,
    glowSecondary: `hsla(${Math.max(0, hue - 18)}, ${sat + 5}%, ${light - 4}%, ${0.18 + t * 0.15})`,
    ring: `hsla(${hue}, ${sat}%, ${light}%, 0.5)`,
    bar: `hsl(${hue}, ${sat}%, ${Math.max(42, light)}%)`,
    scoreText: `hsl(${hue}, 85%, ${s < 35 ? 78 : 88}%)`,
    badgeBorder: `hsla(${hue}, ${sat}%, ${light}%, 0.45)`,
    badgeBg: `hsla(${hue}, ${sat}%, ${light}%, 0.16)`,
    badgeText: `hsl(${hue}, 80%, 88%)`,
  }
}

export const PlantStatusHealthScore = ({ health }) => {
  const prefersReducedMotion = useReducedMotion()
  const aura = useMemo(() => auraFromScore(health.score), [health.score])
  const Icon = health.score < 65 ? ShieldAlert : ShieldCheck

  return (
    <motion.section
      role="status"
      aria-label={`Score salute impianto ${health.score}`}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative mb-5 overflow-hidden rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-5 backdrop-blur-xl"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -left-10 -top-12 h-48 w-48 rounded-full blur-3xl"
          style={{ backgroundColor: aura.glow }}
          animate={
            prefersReducedMotion
              ? undefined
              : { opacity: [0.4, 0.85, 0.45], scale: [1, 1.1, 1] }
          }
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-6 bottom-0 h-40 w-40 rounded-full blur-3xl"
          style={{ backgroundColor: aura.glowSecondary }}
          animate={
            prefersReducedMotion
              ? undefined
              : { opacity: [0.25, 0.55, 0.3] }
          }
          transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />
      </div>

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <div
              className="absolute inset-0 rounded-full blur-md"
              style={{
                background: `radial-gradient(circle, ${aura.ring} 0%, transparent 70%)`,
              }}
            />
            <div
              className="relative flex h-[5.25rem] w-[5.25rem] flex-col items-center justify-center rounded-full border border-white/15 bg-black/55"
              style={{
                boxShadow: `inset 0 0 24px ${aura.glow}, 0 0 28px ${aura.glow}`,
              }}
            >
              <span
                className="text-3xl font-bold tabular-nums leading-none"
                style={{ color: aura.scoreText }}
              >
                {health.score}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                score
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Salute impianto
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                {health.label}
              </h2>
              <Badge
                variant="outline"
                className="rounded-full"
                style={{
                  borderColor: aura.badgeBorder,
                  backgroundColor: aura.badgeBg,
                  color: aura.badgeText,
                }}
              >
                <Icon className="mr-1 h-3 w-3" aria-hidden="true" />
                {health.score < 40 ? "Intervento urgente" : "Monitoraggio attivo"}
              </Badge>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              {health.total} eventi in scadenza / scaduti
            </p>
          </div>
        </div>

        <div className="w-full sm:max-w-xs space-y-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Indice salute</span>
              <span className="tabular-nums text-foreground/90">{health.score}/100</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${health.score}%`,
                  backgroundColor: aura.bar,
                  boxShadow: `0 0 12px ${aura.glow}`,
                }}
              />
            </div>
          </div>
          <Separator className="bg-border/70" />
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full border-red-500/35 bg-red-500/10 text-red-100">
              {health.overdue} scadute
            </Badge>
            <Badge variant="outline" className="rounded-full border-amber-500/35 bg-amber-500/10 text-amber-100">
              {health.soon} in scadenza
            </Badge>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

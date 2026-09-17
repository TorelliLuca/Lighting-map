"use client"

import { useState, useEffect, useContext } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import { UserContext, api } from "../context/UserContext"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ClipboardCheck,
  Hash,
  Home,
  Info,
  Loader2,
  User,
} from "lucide-react"
import { BackNavigationButton } from "../components/BackNavigationButton"
import ConfirmDialog from "../components/ui/ConfirmDialog"
import { GlassSelect } from "../components/ui/GlassSelect"
import { CapitolatoValidityChip } from "../components/ui/CapitolatoValidityChip"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartSection } from "@/components/infoPanel/DistributionChart"
import { cn } from "@/lib/utils"
import { INSPECTION_OUTCOMES, WORKFLOW_STATUS_LABELS, filterFaultLabelsForMarker } from "../utils/utils"
import { PAGE_SCROLL_SHELL } from "../utils/pageScrollShell"
import { guardComuneAccess } from "../utils/townHallAccess"

const OUTCOME_OPTIONS = Object.entries(INSPECTION_OUTCOMES)

const fieldClass =
  "block w-full px-4 py-3 rounded-xl border border-border/70 bg-background/50 text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring/50 transition-colors duration-200"
const labelClass = "block text-sm font-medium text-foreground mb-1.5"
const hintClass = "mt-1.5 text-xs text-muted-foreground leading-relaxed"

function InspectionPageSkeleton() {
  return (
    <div
      className={`${PAGE_SCROLL_SHELL} flex items-start justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4 py-6 sm:py-8`}
      aria-busy="true"
      aria-label="Caricamento sopralluogo"
    >
      <div className="w-full max-w-lg space-y-4">
        <ChartSection className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-11 w-11 rounded-full" />
              <Skeleton className="h-11 w-11 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </ChartSection>
      </div>
    </div>
  )
}

export default function Inspection() {
  const { userData, getLightpoint, getMaintenanceConfig, getActiveReports } = useContext(UserContext)
  const navigate = useNavigate()
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [successOutcome, setSuccessOutcome] = useState(null)
  const [quotePrompt, setQuotePrompt] = useState({ open: false, redirectTo: null, quoteId: null })
  const [lightpoint, setLightpoint] = useState(null)
  const [config, setConfig] = useState(null)
  const [capitolatoValidity, setCapitolatoValidity] = useState(null)
  const [report, setReport] = useState(null)
  const [isDirectDiscovery, setIsDirectDiscovery] = useState(false)
  const [queryParams, setQueryParams] = useState({})

  const [formData, setFormData] = useState({
    riskClass: "C",
    faultLabel: "SINGLE_OFF",
    outcome: "RESOLVED",
    suspensionReason: "",
    suspensionDays: "",
    notes: "",
  })

  useEffect(() => {
    if (!userData) {
      navigate("/")
      return
    }
    if (!["MAINTAINER", "SUPER_ADMIN", "ADMINISTRATOR"].includes(userData.user_type)) {
      navigate("/dashboard")
      return
    }

    const params = new URLSearchParams(location.search)
    const paramsObj = {
      comune: params.get("comune"),
      id: params.get("id"),
      reportId: params.get("reportId"),
    }
    setQueryParams(paramsObj)

    if (paramsObj.comune && !guardComuneAccess({ userData, comune: paramsObj.comune, navigate })) {
      return
    }

    const load = async () => {
      try {
        setLoading(true)
        const [lpRes, configRes] = await Promise.all([
          getLightpoint(paramsObj.id),
          getMaintenanceConfig(paramsObj.comune),
        ])

        setLightpoint(lpRes?.data || null)
        setConfig(configRes?.data?.config || null)
        setCapitolatoValidity(configRes?.data?.validity || null)

        let selectedReport = null
        let blockingOrdinary = null
        if (paramsObj.reportId) {
          const reportRes = await api.get(`/api/reports/${paramsObj.reportId}`)
          selectedReport = reportRes.data
        } else if (paramsObj.comune && lpRes?.data?.numero_palo) {
          const activeRes = await getActiveReports(paramsObj.comune, lpRes.data.numero_palo)
          const ordinaryActive = (activeRes?.data || []).filter(
            (r) => !r.is_solved && r.maintenance_category !== "EXTRAORDINARY",
          )
          selectedReport =
            ordinaryActive.find((r) =>
              ["OPEN", "CLASSIFICATION_PENDING"].includes(r.workflow_status || "OPEN"),
            ) || null
          if (!selectedReport && ordinaryActive.length > 0) {
            blockingOrdinary = ordinaryActive[0]
          }
        }

        // Senza segnalazione aperta: sopralluogo diretto (guasto trovato dal manutentore)
        if (!selectedReport) {
          if (blockingOrdinary) {
            setError(
              "Il sopralluogo per questa segnalazione è già stato effettuato. Procedi con un'operazione.",
            )
            setReport(null)
            setIsDirectDiscovery(false)
            return
          }
          if (!["MAINTAINER", "SUPER_ADMIN"].includes(userData.user_type)) {
            setError("Nessuna segnalazione ordinaria aperta su questo punto.")
            setReport(null)
            setIsDirectDiscovery(false)
            return
          }
          const markerFiltered = filterFaultLabelsForMarker(
            configRes?.data?.config?.faultLabels || [],
            lpRes?.data?.marker,
          )
          const firstFault = markerFiltered[0]
          setReport(null)
          setIsDirectDiscovery(true)
          setFormData((prev) => ({
            ...prev,
            riskClass: firstFault?.suggestedRiskClass || "C",
            faultLabel: firstFault?.code || (lpRes?.data?.marker === "QE" ? "PANEL_DAMAGE" : "SINGLE_OFF"),
          }))
          return
        }

        const status = selectedReport.workflow_status || "OPEN"
        if (!["OPEN", "CLASSIFICATION_PENDING"].includes(status)) {
          setError(
            "Il sopralluogo per questa segnalazione è già stato effettuato. Procedi con un'operazione.",
          )
          setReport(null)
          setIsDirectDiscovery(false)
          return
        }

        setIsDirectDiscovery(false)
        setReport(selectedReport)
        const markerFiltered = filterFaultLabelsForMarker(
          configRes?.data?.config?.faultLabels || [],
          lpRes?.data?.marker,
          { includeCodes: [selectedReport.fault_label] },
        )
        const fallbackFault =
          selectedReport.fault_label ||
          markerFiltered[0]?.code ||
          (lpRes?.data?.marker === "QE" ? "PANEL_DAMAGE" : "SINGLE_OFF")
        setFormData((prev) => ({
          ...prev,
          riskClass: selectedReport.risk_class || "C",
          faultLabel: fallbackFault,
        }))
      } catch (err) {
        console.error(err)
        setError("Impossibile caricare i dati del sopralluogo.")
      } finally {
        setLoading(false)
      }
    }

    if (paramsObj.comune && paramsObj.id) {
      load()
    }
  }, [userData, navigate, location.search, getLightpoint, getMaintenanceConfig, getActiveReports])

  const allFaultLabels = config?.faultLabels || []
  const faultLabels = filterFaultLabelsForMarker(allFaultLabels, lightpoint?.marker, {
    includeCodes: [formData.faultLabel, report?.fault_label],
  })
  const riskClasses = config?.riskClasses || []
  const faultLabelOptions = (
    faultLabels.length ? faultLabels : [{ code: formData.faultLabel, label: formData.faultLabel }]
  ).map((item) => ({
    value: item.code,
    label: item.label,
  }))
  const riskClassOptions = (
    riskClasses.length
      ? riskClasses
      : [{ code: "A" }, { code: "B" }, { code: "C" }, { code: "D" }]
  ).map((item) => ({
    value: item.code,
    label: item.label ? `${item.code} — ${item.label}` : `${item.code} — ${item.code}`,
  }))
  const selectedRisk = (riskClasses.length ? riskClasses : []).find(
    (r) => r.code === formData.riskClass,
  )
  const capitolatoWorkDays = Number(selectedRisk?.defaultWorkDays) || 0
  const capitolatoMaterialDays = Number(selectedRisk?.defaultMaterialDays) || 0
  const capitolatoLeadDays = capitolatoMaterialDays + capitolatoWorkDays
  const scheduledDueDate = (() => {
    if (capitolatoLeadDays < 1) return null
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + capitolatoLeadDays)
    return d
  })()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    if (formData.outcome === "SUSPENDED") {
      const days = Number(formData.suspensionDays)
      if (!Number.isFinite(days) || days < 1) {
        setError("Indicare i giorni di sospensione (minimo 1).")
        setSubmitting(false)
        return
      }
    }

    if (formData.outcome === "SCHEDULED" && capitolatoLeadDays < 1) {
      setError(`Termini capitolato non configurati per la classe ${formData.riskClass}.`)
      setSubmitting(false)
      return
    }

    try {
      const payload = {
        name: queryParams.comune,
        numero_palo: lightpoint?.numero_palo,
        outcome: formData.outcome,
        risk_class: formData.riskClass,
        fault_label: formData.faultLabel,
        report_type: formData.faultLabel,
        suspension_reason: formData.suspensionReason,
        suspension_days: formData.outcome === "SUSPENDED" ? Number(formData.suspensionDays) : undefined,
        notes: formData.notes,
      }
      if (report?._id) {
        payload.report_id = report._id
      }

      const response = await api.post("/api/inspections", payload)
      setSuccessOutcome(formData.outcome)
      setIsSuccess(true)

      if (formData.outcome === "SAFE_PENDING_RESTORATION" && response.data?.askCompileQuote) {
        setQuotePrompt({
          open: true,
          redirectTo:
            response.data.redirectTo ||
            (response.data.quoteId ? `/quote/${response.data.quoteId}` : null),
          quoteId: response.data.quoteId || null,
        })
        return
      }

      const shouldGoToQuote = formData.outcome === "REQUIRES_QUOTE"
      if (response.data?.redirectTo && shouldGoToQuote) {
        setTimeout(() => navigate(response.data.redirectTo), 1200)
      }
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || "Errore durante il sopralluogo.")
    } finally {
      setSubmitting(false)
    }
  }

  const goCompileQuote = () => {
    const target =
      quotePrompt.redirectTo || (quotePrompt.quoteId ? `/quote/${quotePrompt.quoteId}` : "/dashboard")
    setQuotePrompt({ open: false, redirectTo: null, quoteId: null })
    navigate(target)
  }

  const skipCompileQuote = () => {
    setQuotePrompt({ open: false, redirectTo: null, quoteId: null })
    const qs = queryParams.comune ? `?comune=${encodeURIComponent(queryParams.comune)}` : ""
    navigate(`/quotes${qs}`)
  }

  if (loading) {
    return <InspectionPageSkeleton />
  }

  if (isSuccess) {
    const isSafePending = successOutcome === "SAFE_PENDING_RESTORATION"
    return (
      <div
        className={`${PAGE_SCROLL_SHELL} flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4`}
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <ChartSection className="space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15">
              <CheckCircle className="h-8 w-8 text-emerald-400" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Sopralluogo registrato</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {isSafePending
                  ? "Segnalazione chiusa e bozza preventivo IMS creata."
                  : successOutcome === "REQUIRES_QUOTE"
                    ? "Reindirizzamento al preventivo IMS…"
                    : isDirectDiscovery
                      ? "Sopralluogo diretto registrato: classificazione definitiva senza segnalazione iniziale."
                      : "La segnalazione è stata aggiornata."}
              </p>
            </div>
            {!quotePrompt.open ? (
              <Button
                type="button"
                className="min-h-11 w-full bg-primary text-primary-foreground"
                onClick={() => navigate("/dashboard")}
              >
                <Home className="h-4 w-4" />
                Torna alla dashboard
              </Button>
            ) : null}
          </ChartSection>
        </motion.div>

        <ConfirmDialog
          isOpen={quotePrompt.open}
          title="Compilare il preventivo IMS?"
          description="È stata creata una bozza di preventivo. Puoi compilarla subito oppure riprenderla dal menu del comune → Preventivi IMS."
          confirmLabel="Sì, compila ora"
          cancelLabel="Apri elenco bozze"
          variant="primary"
          onConfirm={goCompileQuote}
          onCancel={skipCompileQuote}
        />
      </div>
    )
  }

  const operatorName =
    [userData?.name, userData?.surname].filter(Boolean).join(" ") || userData?.email || "—"
  const stepHint =
    step === 1
      ? isDirectDiscovery
        ? "Imposta la classificazione definitiva del guasto"
        : "Conferma o modifica la classificazione provvisoria"
      : step === 2
        ? "Seleziona l'esito del sopralluogo"
        : "Note e conferma"

  const canShowForm = Boolean(lightpoint && (report || isDirectDiscovery))

  return (
    <div
      className={`${PAGE_SCROLL_SHELL} flex items-start justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4 py-6 sm:py-8`}
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg space-y-4"
      >
        <ChartSection className="space-y-5">
          <div className="flex items-start justify-between gap-3" data-tour="page-inspection-title">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-6 w-6 shrink-0 text-blue-400" aria-hidden="true" />
                <h1 className="truncate text-2xl font-bold text-foreground">Sopralluogo</h1>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <CapitolatoValidityChip validity={capitolatoValidity} />
                <p className="text-sm text-muted-foreground">
                  Step {step} di 3 — {stepHint}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <BackNavigationButton />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="min-h-11 min-w-11 rounded-full bg-primary/10 hover:bg-primary/20"
                onClick={() => navigate("/dashboard")}
                aria-label="Torna alla mappa"
                title="Torna alla mappa"
              >
                <Home className="h-5 w-5 text-blue-400" aria-hidden="true" />
              </Button>
            </div>
          </div>

          {lightpoint && (report || isDirectDiscovery) ? (
            <section
              aria-label="Dettagli punto"
              className="space-y-3 rounded-xl border border-border/50 bg-secondary/30 p-4"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <Hash className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                <p className="min-w-0 break-words text-sm text-foreground">
                  <span className="font-medium">
                    {lightpoint.marker === "QE" ? "Quadro" : "Punto luce"}:
                  </span>{" "}
                  <span className="font-mono text-muted-foreground">{lightpoint.numero_palo}</span>
                  {queryParams.comune ? (
                    <span className="text-muted-foreground"> · {queryParams.comune}</span>
                  ) : null}
                </p>
              </div>
              <div className="flex items-start gap-2.5 min-w-0">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                <p className="min-w-0 break-words text-sm text-foreground">
                  <span className="font-medium">Stato:</span>{" "}
                  <span className="text-muted-foreground">
                    {isDirectDiscovery
                      ? "Sopralluogo diretto — nessuna segnalazione iniziale"
                      : WORKFLOW_STATUS_LABELS[report.workflow_status] ||
                        report.workflow_status ||
                        "Aperta"}
                  </span>
                </p>
              </div>
              <div className="flex items-start gap-2.5 min-w-0">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                <p className="min-w-0 break-words text-sm text-foreground">
                  <span className="font-medium">Operatore:</span>{" "}
                  <span className="text-muted-foreground">{operatorName}</span>
                </p>
              </div>
            </section>
          ) : null}

          {error && !canShowForm ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-200"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" aria-hidden="true" />
              <p>{error}</p>
            </div>
          ) : null}

          {canShowForm ? (
            <>
              {isDirectDiscovery ? (
                <div
                  className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-3.5 text-sm text-blue-100"
                  role="note"
                >
                  <div className="flex gap-2.5">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" />
                    <div className="space-y-1 leading-relaxed">
                      <p className="font-medium text-blue-50">Guasto rilevato sul campo</p>
                      <p className="text-blue-100/90">
                        Nessuna segnalazione iniziale: la classificazione che indichi è definitiva e
                        non richiede conferma successiva.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <Separator className="bg-border/50" />

              <form onSubmit={handleSubmit} className="space-y-5">
                {step === 1 ? (
                  <div className="space-y-5">
                    <fieldset className="space-y-4 rounded-xl border border-border/50 bg-secondary/20 p-4">
                      <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold text-foreground">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                        Classificazione
                      </legend>

                      <div>
                        <label htmlFor="faultLabel" className={labelClass}>
                          Label guasto
                        </label>
                        <GlassSelect
                          id="faultLabel"
                          value={formData.faultLabel}
                          onChange={(value) => {
                            const match = faultLabels.find((item) => item.code === value)
                            setFormData((p) => ({
                              ...p,
                              faultLabel: value,
                              ...(match?.suggestedRiskClass
                                ? { riskClass: match.suggestedRiskClass }
                                : {}),
                            }))
                          }}
                          options={faultLabelOptions}
                          aria-label="Label guasto"
                          className="border-border/60 bg-background/50"
                          maxVisible={5}
                        />
                        <p className={hintClass}>
                          {lightpoint?.marker === "QE"
                            ? "Voci specifiche per il quadro elettrico."
                            : isDirectDiscovery
                              ? "Indica la tipologia definitiva del guasto trovato."
                              : "Conferma o aggiorna la classificazione indicata in segnalazione."}
                        </p>
                      </div>

                      <div>
                        <label htmlFor="riskClass" className={labelClass}>
                          Classe rischio
                        </label>
                        <GlassSelect
                          id="riskClass"
                          value={formData.riskClass}
                          onChange={(value) => setFormData((p) => ({ ...p, riskClass: value }))}
                          options={riskClassOptions}
                          aria-label="Classe rischio"
                          className="border-border/60 bg-background/50"
                          maxVisible={6}
                        />
                      </div>
                    </fieldset>

                    <Button
                      type="button"
                      className="min-h-12 w-full bg-primary text-primary-foreground"
                      onClick={() => setStep(2)}
                    >
                      Continua
                    </Button>
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="space-y-5">
                    <div className="space-y-2" role="radiogroup" aria-label="Esito sopralluogo">
                      {OUTCOME_OPTIONS.map(([value, label]) => {
                        const selected = formData.outcome === value
                        return (
                          <label
                            key={value}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
                              selected
                                ? "border-blue-400/60 bg-blue-950/35"
                                : "border-border/50 bg-secondary/20 hover:border-border",
                            )}
                          >
                            <input
                              type="radio"
                              name="outcome"
                              value={value}
                              checked={selected}
                              onChange={(e) =>
                                setFormData((p) => ({ ...p, outcome: e.target.value }))
                              }
                              className="sr-only"
                            />
                            <span
                              aria-hidden="true"
                              className={cn(
                                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/70",
                                selected && "border-white/50",
                              )}
                            >
                              {selected ? (
                                <span className="h-2 w-2 rounded-full bg-white" />
                              ) : null}
                            </span>
                            <span className="text-sm leading-snug text-foreground">{label}</span>
                          </label>
                        )
                      })}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-12 flex-1"
                        onClick={() => setStep(1)}
                      >
                        Indietro
                      </Button>
                      <Button
                        type="button"
                        className="min-h-12 flex-1 bg-primary text-primary-foreground"
                        onClick={() => setStep(3)}
                      >
                        Continua
                      </Button>
                    </div>
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="space-y-5">
                    {formData.outcome === "SUSPENDED" ? (
                      <div className="space-y-4 rounded-xl border border-border/50 bg-secondary/20 p-4">
                        <div>
                          <label htmlFor="suspensionReason" className={labelClass}>
                            Motivo sospensione *
                          </label>
                          <textarea
                            id="suspensionReason"
                            required
                            rows={3}
                            value={formData.suspensionReason}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, suspensionReason: e.target.value }))
                            }
                            className={fieldClass}
                            placeholder="Es. mancanza componente da ordinare"
                          />
                        </div>
                        <div>
                          <label htmlFor="suspensionDays" className={labelClass}>
                            Giorni di sospensione *
                          </label>
                          <input
                            id="suspensionDays"
                            type="number"
                            required
                            min={1}
                            step={1}
                            value={formData.suspensionDays}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, suspensionDays: e.target.value }))
                            }
                            className={fieldClass}
                            placeholder="Es. 7"
                          />
                        </div>
                      </div>
                    ) : null}

                    {formData.outcome === "SCHEDULED" ? (
                      <div
                        role="status"
                        className="rounded-xl border border-red-500/40 bg-red-950/25 p-3.5 text-sm text-red-100"
                      >
                        <div className="flex gap-2.5">
                          <AlertTriangle
                            className="mt-0.5 h-4 w-4 shrink-0 text-red-300"
                            aria-hidden="true"
                          />
                          <div className="space-y-1 leading-relaxed">
                            <p className="font-medium text-red-50">
                              Scadenza dai termini del capitolato
                            </p>
                            {capitolatoLeadDays >= 1 && scheduledDueDate ? (
                              <>
                                <p>
                                  Classe {formData.riskClass}
                                  {selectedRisk?.label ? ` — ${selectedRisk.label}` : ""}:{" "}
                                  <span className="font-semibold">{capitolatoLeadDays} giorni</span>{" "}
                                  ({capitolatoMaterialDays} gg materiale + {capitolatoWorkDays} gg
                                  intervento).
                                </p>
                                <p>
                                  Scadenza prevista:{" "}
                                  <span className="font-semibold">
                                    {scheduledDueDate.toLocaleDateString("it-IT")}
                                  </span>
                                </p>
                              </>
                            ) : (
                              <p>
                                Termini capitolato non configurati per la classe {formData.riskClass}.
                                Non è possibile confermare questo esito.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {formData.outcome === "SAFE_PENDING_RESTORATION" ? (
                      <div
                        role="status"
                        className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-sm text-amber-100"
                      >
                        <div className="flex gap-2.5">
                          <Info
                            className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
                            aria-hidden="true"
                          />
                          <p className="leading-relaxed">
                            La segnalazione verrà chiusa e verrà creata una bozza di preventivo IMS.
                            Potrai scegliere se compilarla subito o in seguito.
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <label htmlFor="notes" className={labelClass}>
                        Note <span className="font-normal text-muted-foreground">(opzionale)</span>
                      </label>
                      <textarea
                        id="notes"
                        rows={3}
                        value={formData.notes}
                        onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                        className={fieldClass}
                        placeholder="Dettagli aggiuntivi sul sopralluogo"
                      />
                      <p className={hintClass}>Annotazioni utili per le fasi successive.</p>
                    </div>

                    {error ? (
                      <div
                        role="alert"
                        className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-200"
                      >
                        <AlertCircle
                          className="mt-0.5 h-5 w-5 shrink-0 text-red-400"
                          aria-hidden="true"
                        />
                        <p>{error}</p>
                      </div>
                    ) : null}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-12 flex-1"
                        onClick={() => setStep(2)}
                      >
                        Indietro
                      </Button>
                      <Button
                        type="submit"
                        disabled={
                          submitting || (formData.outcome === "SCHEDULED" && capitolatoLeadDays < 1)
                        }
                        className="min-h-12 flex-1 bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Salvataggio…
                          </>
                        ) : (
                          <>
                            <ClipboardCheck className="h-4 w-4" />
                            Conferma sopralluogo
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </form>
            </>
          ) : null}
        </ChartSection>
      </motion.div>
    </div>
  )
}

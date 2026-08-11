"use client"

import { useState, useEffect, useContext } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { UserContext, api } from "../context/UserContext"
import { AlertCircle, CheckCircle, ClipboardCheck, Home } from "lucide-react"
import { LightbulbLoader } from "../components/lightbulb-loader"
import { BackNavigationButton } from "../components/BackNavigationButton"
import ConfirmDialog from "../components/ui/ConfirmDialog"
import { INSPECTION_OUTCOMES, WORKFLOW_STATUS_LABELS } from "../utils/utils"
import { PAGE_SCROLL_SHELL } from "../utils/pageScrollShell"
import { CapitolatoValidityChip } from "../components/ui/CapitolatoValidityChip"


const OUTCOME_OPTIONS = Object.entries(INSPECTION_OUTCOMES)

export default function Inspection() {
  const { userData, getLightpoint, getMaintenanceConfig, getActiveReports } = useContext(UserContext)
  const navigate = useNavigate()
  const location = useLocation()

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
        if (paramsObj.reportId) {
          const reportRes = await api.get(`/api/reports/${paramsObj.reportId}`)
          selectedReport = reportRes.data
        } else if (paramsObj.comune && lpRes?.data?.numero_palo) {
          const activeRes = await getActiveReports(paramsObj.comune, lpRes.data.numero_palo)
          selectedReport = (activeRes?.data || []).find(
            (r) => !r.is_solved && r.maintenance_category !== "EXTRAORDINARY"
          ) || activeRes?.data?.[0]
        }

        if (!selectedReport) {
          setError("Nessuna segnalazione ordinaria aperta su questo punto.")
          return
        }

        const status = selectedReport.workflow_status || "OPEN"
        if (!["OPEN", "CLASSIFICATION_PENDING"].includes(status)) {
          setError("Il sopralluogo per questa segnalazione è già stato effettuato. Procedi con un'operazione.")
          setReport(null)
          return
        }

        setReport(selectedReport)
        setFormData((prev) => ({
          ...prev,
          riskClass: selectedReport.risk_class || "C",
          faultLabel: selectedReport.fault_label || "SINGLE_OFF",
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

  const faultLabels = config?.faultLabels || []
  const riskClasses = config?.riskClasses || []
  const selectedRisk = (riskClasses.length ? riskClasses : []).find((r) => r.code === formData.riskClass)
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
        report_id: report._id,
        outcome: formData.outcome,
        risk_class: formData.riskClass,
        fault_label: formData.faultLabel,
        report_type: formData.faultLabel,
        suspension_reason: formData.suspensionReason,
        suspension_days: formData.outcome === "SUSPENDED" ? Number(formData.suspensionDays) : undefined,
        notes: formData.notes,
      }

      const response = await api.post("/api/inspections", payload)
      setSuccessOutcome(formData.outcome)
      setIsSuccess(true)

      if (formData.outcome === "SAFE_PENDING_RESTORATION" && response.data?.askCompileQuote) {
        setQuotePrompt({
          open: true,
          redirectTo: response.data.redirectTo || (response.data.quoteId ? `/quote/${response.data.quoteId}` : null),
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
    const target = quotePrompt.redirectTo || (quotePrompt.quoteId ? `/quote/${quotePrompt.quoteId}` : "/dashboard")
    setQuotePrompt({ open: false, redirectTo: null, quoteId: null })
    navigate(target)
  }

  const skipCompileQuote = () => {
    setQuotePrompt({ open: false, redirectTo: null, quoteId: null })
    const qs = queryParams.comune ? `?comune=${encodeURIComponent(queryParams.comune)}` : ""
    navigate(`/quotes${qs}`)
  }

  if (loading) {
    return (
      <div className={`${PAGE_SCROLL_SHELL} flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4`}>
        <LightbulbLoader />
      </div>
    )
  }

  if (isSuccess) {
    const isSafePending = successOutcome === "SAFE_PENDING_RESTORATION"
    return (
      <div className={`${PAGE_SCROLL_SHELL} flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4`}>
        <div className="w-full max-w-md p-8 rounded-2xl backdrop-blur-xl bg-black/40 border border-blue-500/20 text-center">
          <CheckCircle className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white">Sopralluogo registrato</h2>
          <p className="mt-2 text-blue-200/80">
            {isSafePending
              ? "Segnalazione chiusa e bozza preventivo IMS creata."
              : successOutcome === "REQUIRES_QUOTE"
                ? "Reindirizzamento al preventivo IMS…"
                : "La segnalazione è stata aggiornata."}
          </p>
          {!quotePrompt.open && (
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="mt-6 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium"
            >
              Torna alla Dashboard
            </button>
          )}
        </div>

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

  return (
    <div className={`${PAGE_SCROLL_SHELL} flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4`}>
      <div className="w-full max-w-lg relative overflow-hidden rounded-2xl shadow-[0_0_40px_rgba(0,149,255,0.15)]">
        <div className="relative z-10 p-8 backdrop-blur-xl bg-black/40 border border-blue-500/20">
          <div className="flex items-center justify-between mb-6" data-tour="page-inspection-title">
            <div className="flex flex-col gap-2 min-w-0">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-6 w-6 text-blue-400" />
                <h2 className="text-2xl font-bold text-white">Sopralluogo</h2>
              </div>
              <CapitolatoValidityChip validity={capitolatoValidity} />
            </div>
            <div className="flex items-center gap-2">
              <BackNavigationButton />
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="p-2 rounded-full bg-blue-500/10 hover:bg-blue-500/20"
              >
                <Home className="h-5 w-5 text-blue-400" />
              </button>
            </div>
          </div>

          {lightpoint && report && (
            <div className="mb-6 p-4 rounded-xl bg-blue-900/20 border border-blue-500/20 text-sm text-blue-100 space-y-1">
              <p><span className="font-medium">Punto:</span> {lightpoint.numero_palo}</p>
              <p><span className="font-medium">Comune:</span> {queryParams.comune}</p>
              <p><span className="font-medium">Stato:</span> {WORKFLOW_STATUS_LABELS[report.workflow_status] || report.workflow_status || "Aperta"}</p>
            </div>
          )}

          {error && !report && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-200 flex gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {report && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-blue-200 text-sm">Step 1 — Conferma o modifica la classificazione provvisoria</p>
                  <div>
                    <label className="block text-sm text-blue-200 mb-2">Label guasto</label>
                    <select
                      value={formData.faultLabel}
                      onChange={(e) => setFormData((p) => ({ ...p, faultLabel: e.target.value }))}
                      className="w-full rounded-xl border border-blue-500/30 bg-blue-900/20 text-white px-4 py-3"
                    >
                      {(faultLabels.length ? faultLabels : [{ code: formData.faultLabel, label: formData.faultLabel }]).map((item) => (
                        <option key={item.code} value={item.code}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-blue-200 mb-2">Classe rischio</label>
                    <select
                      value={formData.riskClass}
                      onChange={(e) => setFormData((p) => ({ ...p, riskClass: e.target.value }))}
                      className="w-full rounded-xl border border-blue-500/30 bg-blue-900/20 text-white px-4 py-3"
                    >
                      {(riskClasses.length ? riskClasses : [{ code: "A" }, { code: "B" }, { code: "C" }, { code: "D" }]).map((item) => (
                        <option key={item.code} value={item.code}>{item.code} — {item.label || item.code}</option>
                      ))}
                    </select>
                  </div>
                  <button type="button" onClick={() => setStep(2)} className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium">
                    Continua
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-blue-200 text-sm">Step 2 — Seleziona l&apos;esito del sopralluogo</p>
                  <div className="space-y-2">
                    {OUTCOME_OPTIONS.map(([value, label]) => (
                      <label key={value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${formData.outcome === value ? "border-blue-400 bg-blue-900/30" : "border-blue-500/20 bg-blue-900/10"}`}>
                        <input
                          type="radio"
                          name="outcome"
                          value={value}
                          checked={formData.outcome === value}
                          onChange={(e) => setFormData((p) => ({ ...p, outcome: e.target.value }))}
                          className="mt-1"
                        />
                        <span className="text-sm text-blue-100">{label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-blue-500/30 text-blue-200">
                      Indietro
                    </button>
                    <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium">
                      Continua
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-blue-200 text-sm">Step 3 — Note e conferma</p>

                  {formData.outcome === "SUSPENDED" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-blue-200 mb-2">Motivo sospensione *</label>
                        <textarea
                          required
                          rows={3}
                          value={formData.suspensionReason}
                          onChange={(e) => setFormData((p) => ({ ...p, suspensionReason: e.target.value }))}
                          className="w-full rounded-xl border border-blue-500/30 bg-blue-900/20 text-white px-4 py-3"
                          placeholder="Es. mancanza componente da ordinare"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-blue-200 mb-2">Giorni di sospensione *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          step={1}
                          value={formData.suspensionDays}
                          onChange={(e) => setFormData((p) => ({ ...p, suspensionDays: e.target.value }))}
                          className="w-full rounded-xl border border-blue-500/30 bg-blue-900/20 text-white px-4 py-3"
                          placeholder="Es. 7"
                        />
                      </div>
                    </div>
                  )}

                  {formData.outcome === "SCHEDULED" && (
                    <div className="p-3 rounded-xl bg-red-900/25 border border-red-500/40 text-red-200 text-sm space-y-1">
                      <p className="font-medium text-red-100">
                        La scadenza sarà calcolata automaticamente dai termini del capitolato.
                      </p>
                      {capitolatoLeadDays >= 1 && scheduledDueDate ? (
                        <>
                          <p>
                            Classe {formData.riskClass}
                            {selectedRisk?.label ? ` — ${selectedRisk.label}` : ""}:{" "}
                            <span className="font-semibold">{capitolatoLeadDays} giorni</span>
                            {" "}({capitolatoMaterialDays} gg materiale + {capitolatoWorkDays} gg intervento).
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
                          Attenzione: termini capitolato non configurati per la classe {formData.riskClass}.
                          Non è possibile confermare questo esito.
                        </p>
                      )}
                    </div>
                  )}

                  {formData.outcome === "SAFE_PENDING_RESTORATION" && (
                    <div className="p-3 rounded-xl bg-amber-900/20 border border-amber-500/30 text-amber-100 text-sm">
                      La segnalazione verrà chiusa e verrà creata una bozza di preventivo IMS. Potrai scegliere se compilarla subito o in seguito.
                    </div>
                  )}

                  <div>
                    <label className="block text-sm text-blue-200 mb-2">Note</label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                      className="w-full rounded-xl border border-blue-500/30 bg-blue-900/20 text-white px-4 py-3"
                      placeholder="Dettagli aggiuntivi sul sopralluogo"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-200">
                      <AlertCircle className="h-5 w-5" />
                      <p>{error}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl border border-blue-500/30 text-blue-200">
                      Indietro
                    </button>
                    <button
                      type="submit"
                      disabled={
                        submitting
                        || (formData.outcome === "SCHEDULED" && capitolatoLeadDays < 1)
                      }
                      className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50"
                    >
                      {submitting ? "Salvataggio..." : "Conferma sopralluogo"}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

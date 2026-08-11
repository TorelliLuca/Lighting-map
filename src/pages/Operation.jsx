"use client"

import { useState, useEffect, useContext, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { UserContext, api } from "../context/UserContext"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Hash,
  Home,
  Info,
  MapPin,
  PenToolIcon as Tool,
  User,
} from "lucide-react"
import { LightbulbLoader } from "../components/lightbulb-loader"
import { BackNavigationButton } from "../components/BackNavigationButton"
import { GlassSelect } from "../components/ui/GlassSelect"
import { sendPushNotification } from "../utils/pushNotifications"
import { formatReportFaultLabel, canResolveExtraordinaryReport } from "../utils/utils"
import { PAGE_SCROLL_SHELL } from "../utils/pageScrollShell"
import { buildLightPointDashboardPushUrl } from "../utils/notificationDeepLinks"


/** Stati post-sopralluogo su cui si chiude l'intervento ordinario. */
const CLOSABLE_ORDINARY = new Set(["SUSPENDED", "SCHEDULED"])

const fieldClass =
  "block w-full px-4 py-3 rounded-xl border border-blue-500/30 bg-blue-900/20 text-white placeholder-blue-300/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors duration-200"
const labelClass = "block text-sm font-medium text-blue-100 mb-1.5"
const hintClass = "mt-1.5 text-xs text-blue-300/75 leading-relaxed"

const reportLabel = (report) => {
  if (!report) return ""
  const cat = report.maintenance_category === "EXTRAORDINARY" ? "Straord." : "Ord."
  const type = formatReportFaultLabel(report)
  const date = report.report_date ? new Date(report.report_date).toLocaleDateString() : ""
  return [`[${cat}]`, type, date].filter(Boolean).join(" — ")
}

const DEMO_OPERATION = {
  comune: "Comune demo",
  numeroPalo: "DEMO-01",
  lat: "45.4642",
  lng: "9.1900",
  reportId: "tour-demo-report",
}

const DEMO_ACTIVE_REPORT = {
  _id: "tour-demo-report",
  maintenance_category: "ORDINARY",
  workflow_status: "SUSPENDED",
  is_solved: false,
  report_date: new Date().toISOString(),
  report_type: "LIGHT_POINT_OFF",
  suspension: { reason: "Esempio sospensione (tutorial)" },
}

export default function Operation() {
  const { userData, getActiveReports } = useContext(UserContext)
  const navigate = useNavigate()
  const location = useLocation()
  const isTourDemo =
    new URLSearchParams(location.search).get("tourDemo") === "1" ||
    Boolean(location.state?.lmTour?.force || location.state?.tourDemo)

  const [reportId, setReportId] = useState("")
  const [notes, setNotes] = useState("")
  const [activeReports, setActiveReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [successMeta, setSuccessMeta] = useState(null)
  const [error, setError] = useState("")
  const [queryParams, setQueryParams] = useState({})

  const selectedReport = useMemo(
    () => activeReports.find((r) => String(r._id) === String(reportId)) || null,
    [activeReports, reportId],
  )

  const isExtraordinary = selectedReport?.maintenance_category === "EXTRAORDINARY"

  const reportOptions = useMemo(
    () => activeReports.map((item) => ({
      value: String(item._id),
      label: reportLabel(item),
    })),
    [activeReports],
  )

  useEffect(() => {
    if (!userData) {
      navigate("/")
      return
    }
    // Solo manutentori (e super admin): gli amministratori e sottoruoli non chiudono interventi
    if (!["MAINTAINER", "SUPER_ADMIN"].includes(userData.user_type)) {
      navigate("/dashboard")
      return
    }

    const params = new URLSearchParams(location.search)
    const paramsObj = {
      comune: params.get("comune"),
      numeroPalo: params.get("numeroPalo"),
      lat: params.get("lat"),
      lng: params.get("lng"),
      reportId: params.get("reportId"),
    }

    // Replay tutorial dal profilo
    if (isTourDemo && !paramsObj.comune) {
      setQueryParams(DEMO_OPERATION)
      setActiveReports([DEMO_ACTIVE_REPORT])
      setReportId(DEMO_ACTIVE_REPORT._id)
      setError("")
      setLoading(false)
      return
    }

    setQueryParams(paramsObj)

    const load = async () => {
      try {
        setLoading(true)
        if (!paramsObj.comune || !paramsObj.numeroPalo) {
          setError("Parametri punto luce mancanti.")
          return
        }

        const response = await getActiveReports(paramsObj.comune, paramsObj.numeroPalo)
        const allActive = (response?.data || []).filter((r) => !r?.is_solved)
        const reports = allActive.filter((r) => {
          if (r?.maintenance_category === "EXTRAORDINARY") {
            return canResolveExtraordinaryReport(r)
          }
          return CLOSABLE_ORDINARY.has(r?.workflow_status || "")
        })

        setActiveReports(reports)

        const preferred = paramsObj.reportId
          && reports.find((r) => String(r._id) === String(paramsObj.reportId))

        if (preferred) {
          setReportId(preferred._id)
        } else if (reports.length === 1) {
          setReportId(reports[0]._id)
        } else if (reports.length > 1) {
          const extraordinary = reports.find((r) => r.maintenance_category === "EXTRAORDINARY")
          const suspended = reports.find((r) => r.workflow_status === "SUSPENDED")
          setReportId((extraordinary || suspended || reports[0])._id)
        } else {
          const pendingExtra = allActive.find(
            (r) => r.maintenance_category === "EXTRAORDINARY" && !canResolveExtraordinaryReport(r),
          )
          if (pendingExtra) {
            setError("Il preventivo IMS deve essere approvato dal DEC prima di chiudere la straordinaria.")
          } else {
            setError("Nessuna segnalazione da chiudere su questo punto.")
          }
        }
      } catch (err) {
        console.error(err)
        setError("Impossibile caricare le segnalazioni.")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [userData, navigate, location.search, getActiveReports, isTourDemo])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (isTourDemo) {
      setError("Modalità tutorial: la chiusura reale è disabilitata. Apri un punto luce dalla mappa per operare.")
      return
    }

    if (!reportId || !selectedReport) {
      setError("Seleziona la segnalazione da chiudere.")
      return
    }

    const maintenanceType = selectedReport.maintenance_category === "EXTRAORDINARY"
      ? "EXTRAORDINARY"
      : "ORDINARY"

    setSubmitting(true)
    try {
      const opRes = await api.post("/addOperation", {
        operation_type: "FAULT_ELIMINATED_AND_SYSTEM_RESTORED",
        note: notes,
        name: queryParams.comune,
        numero_palo: queryParams.numeroPalo,
        email: userData.email,
        id_segnalazione: reportId,
        is_solved: true,
        date: new Date(),
        maintenance_type: maintenanceType,
      })

      const rawLinked = opRes?.data?.report?.linked_quote_id
        || selectedReport.linked_quote_id
        || null
      const linkedQuoteId = rawLinked?._id || rawLinked || null

      setSuccessMeta({
        isExtraordinary: maintenanceType === "EXTRAORDINARY",
        linkedQuoteId: linkedQuoteId ? String(linkedQuoteId) : null,
      })
      setIsSuccess(true)

      try {
        await api.post("/send-email-to-user/reportSolved", {
          name: queryParams.comune,
          user: {
            name: userData.name,
            surname: userData.surname,
            email: userData.email,
            cell: userData.cell || "",
          },
          date: new Date().toISOString(),
          light_point: {
            numero_palo: queryParams.numeroPalo,
            lat: queryParams.lat,
            lng: queryParams.lng,
          },
          operation: {
            operation_type: "Guasto eliminato e impianto ripristinato",
            notes: notes || "",
            description: notes || "",
          },
        })
      } catch (mailErr) {
        console.error("Email notification failed:", mailErr)
      }

      try {
        await sendPushNotification({
          title: `Intervento chiuso — punto ${queryParams.numeroPalo}`,
          body: `Nel comune di ${queryParams.comune}: guasto eliminato e impianto ripristinato.${notes ? ` Note: ${notes}` : ""}`,
          townHallName: queryParams.comune,
          url: buildLightPointDashboardPushUrl({
            townHallName: queryParams.comune,
            numeroPalo: queryParams.numeroPalo,
            lat: queryParams.lat,
            lng: queryParams.lng,
          }),
        })
      } catch (pushError) {
        console.error("Push notification failed:", pushError)
      }
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || "Errore durante la chiusura dell'intervento.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className={`${PAGE_SCROLL_SHELL} flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4`}>
        <div className="w-full max-w-md flex flex-col items-center justify-center">
          <LightbulbLoader />
          <p className="mt-4 text-blue-200">Caricamento intervento...</p>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className={`${PAGE_SCROLL_SHELL} flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4`}>
        <div className="w-full max-w-md relative overflow-hidden rounded-2xl shadow-[0_0_40px_rgba(0,149,255,0.15)]">
          <div className="relative z-10 p-8 backdrop-blur-xl bg-black/40 border border-blue-500/20">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-500/20 backdrop-blur-sm mb-6 border border-blue-400/30">
                <CheckCircle className="h-10 w-10 text-blue-400" aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-bold text-white">Intervento chiuso</h2>
              <p className="mt-2 text-blue-200/80 text-sm leading-relaxed">
                {successMeta?.isExtraordinary
                  ? "Intervento straordinario completato. Compila il consuntivo IMS per chiudere il ciclo documentale."
                  : "Guasto eliminato: la segnalazione è stata completata e l'impianto risulta ripristinato."}
              </p>
              {successMeta?.isExtraordinary && successMeta?.linkedQuoteId ? (
                <button
                  type="button"
                  onClick={() => navigate(`/quote/${successMeta.linkedQuoteId}/consuntivo`)}
                  className="mt-6 w-full cursor-pointer py-3 px-4 rounded-xl font-medium text-white bg-amber-600 hover:bg-amber-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                >
                  Compila consuntivo
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className={`mt-3 w-full cursor-pointer py-3 px-4 rounded-xl font-medium text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                  successMeta?.isExtraordinary && successMeta?.linkedQuoteId
                    ? "bg-blue-600/40 hover:bg-blue-600/60 border border-blue-500/30"
                    : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                }`}
              >
                Torna alla dashboard
              </button>
            </div>
          </div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" aria-hidden="true" />
        </div>
      </div>
    )
  }

  const singleReport = activeReports.length === 1
  const report = selectedReport || activeReports[0]
  const operatorName = [userData?.name, userData?.surname].filter(Boolean).join(" ") || userData?.email || "—"
  const suspensionReason = singleReport
    ? report?.workflow_status === "SUSPENDED" && report?.suspension?.reason
      ? report.suspension
      : null
    : selectedReport?.workflow_status === "SUSPENDED" && selectedReport?.suspension?.reason
      ? selectedReport.suspension
      : null

  return (
    <div className={`${PAGE_SCROLL_SHELL} flex items-start justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4 py-6 sm:py-8`}>
      <div className="w-full max-w-lg relative rounded-2xl shadow-[0_0_40px_rgba(0,149,255,0.15)]">
        <div className="relative z-10 p-6 sm:p-8 backdrop-blur-xl bg-black/40 border border-blue-500/20 rounded-2xl">
          <div className="flex items-start justify-between gap-3 mb-5" data-tour="page-operation-title">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Tool className="h-6 w-6 text-blue-400 shrink-0" aria-hidden="true" />
                <h1 className="text-2xl font-bold text-white truncate">Chiudi intervento</h1>
              </div>
              <p className="mt-1 text-sm text-blue-300/80">
                {isTourDemo
                  ? "Esempio guidato — nessun punto reale selezionato"
                  : "Conferma il ripristino dell'impianto sul punto selezionato"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <BackNavigationButton />
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                aria-label="Torna alla mappa"
                title="Torna alla mappa"
                className="cursor-pointer inline-flex items-center justify-center min-h-11 min-w-11 p-2 rounded-full bg-blue-500/10 hover:bg-blue-500/20 transition-colors duration-200"
              >
                <Home className="h-5 w-5 text-blue-400" aria-hidden="true" />
              </button>
            </div>
          </div>

          {isTourDemo ? (
            <div
              role="status"
              className="mb-4 p-3 rounded-lg bg-blue-900/30 border border-blue-500/30 text-sm text-blue-100"
            >
              Modalità tutorial: stai vedendo un esempio. La chiusura reale è disabilitata.
            </div>
          ) : null}

          {error && !activeReports.length ? (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-200 text-sm"
            >
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <p>{error}</p>
            </div>
          ) : (
            <>
              <section
                aria-label="Dettagli punto"
                data-tour="page-operation-point"
                className="mb-5 p-4 rounded-xl bg-blue-900/20 border border-blue-500/20 space-y-3"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <Hash className="w-4 h-4 mt-0.5 text-blue-400 shrink-0" aria-hidden="true" />
                  <p className="text-sm text-blue-100 min-w-0 break-words">
                    <span className="font-medium text-blue-50">Punto:</span>{" "}
                    <span className="text-blue-200 font-mono">{queryParams.numeroPalo}</span>
                    {queryParams.comune ? (
                      <span className="text-blue-300/80"> · {queryParams.comune}</span>
                    ) : null}
                  </p>
                </div>
                <div className="flex items-start gap-2.5 min-w-0">
                  <MapPin className="w-4 h-4 mt-0.5 text-blue-400 shrink-0" aria-hidden="true" />
                  <p className="text-sm text-blue-100 min-w-0 break-words">
                    <span className="font-medium text-blue-50">Manutenzione:</span>{" "}
                    <span className="text-blue-200">
                      {isExtraordinary ? "Straordinaria" : "Ordinaria"}
                    </span>
                    {isExtraordinary && selectedReport?.due_date ? (
                      <span className="text-blue-300/80">
                        {" "}· scadenza {new Date(selectedReport.due_date).toLocaleDateString("it-IT")}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex items-start gap-2.5 min-w-0">
                  <User className="w-4 h-4 mt-0.5 text-blue-400 shrink-0" aria-hidden="true" />
                  <p className="text-sm text-blue-100 min-w-0 break-words">
                    <span className="font-medium text-blue-50">Operatore:</span>{" "}
                    <span className="text-blue-200">{operatorName}</span>
                  </p>
                </div>
              </section>

              <form onSubmit={handleSubmit} className="space-y-5" data-tour="page-operation-form">
              <div
                className="p-3.5 rounded-xl bg-blue-900/25 border border-blue-500/30 text-sm text-blue-100"
                role="note"
              >
                <div className="flex gap-2.5">
                  <Info className="h-4 w-4 mt-0.5 text-blue-300 shrink-0" aria-hidden="true" />
                  <div className="space-y-1 leading-relaxed">
                    <p className="font-medium text-blue-50">Esito registrato</p>
                    <p className="text-blue-100/90">
                      Verrà chiusa la segnalazione con esito{" "}
                      <span className="font-medium text-white">
                        Guasto eliminato e impianto ripristinato
                      </span>
                      . Verifica di aver selezionato la segnalazione corretta prima di confermare.
                    </p>
                  </div>
                </div>
              </div>

              {singleReport && report ? (
                <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-4 space-y-2">
                  <p className={labelClass}>Segnalazione</p>
                  <p className="text-base font-semibold text-white leading-snug">
                    {formatReportFaultLabel(report)}
                  </p>
                  {suspensionReason && (
                    <p className="text-sm text-blue-100/90">
                      <span className="text-blue-300/80">Motivo sospensione:</span>{" "}
                      {suspensionReason.reason}
                      {suspensionReason.days ? ` (${suspensionReason.days} giorni)` : ""}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label htmlFor="reportId" className={labelClass}>
                    Segnalazione da chiudere
                  </label>
                  <GlassSelect
                    id="reportId"
                    value={reportId ? String(reportId) : ""}
                    onChange={(value) => setReportId(value)}
                    options={reportOptions}
                    aria-label="Segnalazione da chiudere"
                    placeholder="Seleziona segnalazione…"
                    className="bg-blue-900/20 border-blue-500/30"
                    maxVisible={6}
                  />
                  <p className={hintClass}>
                    Sul punto risultano più segnalazioni chiudibili: scegli quella appena risolta.
                  </p>
                  {suspensionReason && (
                    <p className="mt-2 text-sm text-blue-100/90">
                      <span className="text-blue-300/80">Motivo sospensione:</span>{" "}
                      {suspensionReason.reason}
                      {suspensionReason.days ? ` (${suspensionReason.days} giorni)` : ""}
                    </p>
                  )}
                </div>
              )}

              {isExtraordinary && (
                <div
                  className="p-3.5 rounded-xl bg-amber-900/20 border border-amber-500/30 text-sm text-amber-100"
                  role="status"
                >
                  <div className="flex gap-2.5">
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-300 shrink-0" aria-hidden="true" />
                    <div className="space-y-1 leading-relaxed">
                      <p className="font-medium text-amber-50">Consuntivo IMS richiesto</p>
                      <p className="text-amber-100/90">
                        Stai chiudendo una segnalazione straordinaria. Dopo l&apos;invio
                        dovrai compilare il consuntivo IMS per completare il ciclo documentale.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="notes" className={labelClass}>
                  Note{" "}
                  <span className="font-normal text-blue-300/70">(opzionale)</span>
                </label>
                <textarea
                  id="notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Dettagli sull'intervento di chiusura…"
                  className={fieldClass}
                />
                <p className={hintClass}>
                  Annotazioni utili per il report e le notifiche agli interessati.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-200 text-sm"
                >
                  <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !reportId}
                className="w-full cursor-pointer py-3.5 px-4 rounded-xl font-medium text-white
                bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
                focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-black
                shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <LightbulbLoader />
                    Chiusura in corso…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Tool className="h-5 w-5" aria-hidden="true" />
                    Chiudi segnalazione
                  </span>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="cursor-pointer text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
                >
                  Annulla
                </button>
              </div>
            </form>
            </>
          )}
        </div>

        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      </div>
    </div>
  )
}

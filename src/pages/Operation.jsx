"use client"

import { useState, useEffect, useContext, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import { UserContext, api } from "../context/UserContext"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  FileSpreadsheet,
  Hash,
  Home,
  Info,
  Loader2,
  MapPin,
  User,
  Wrench,
} from "lucide-react"
import { BackNavigationButton } from "../components/BackNavigationButton"
import { GlassSelect } from "../components/ui/GlassSelect"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartSection } from "@/components/infoPanel/DistributionChart"
import { cn } from "@/lib/utils"
import { sendPushNotification } from "../utils/pushNotifications"
import { formatReportFaultLabel, canResolveExtraordinaryReport } from "../utils/utils"
import { PAGE_SCROLL_SHELL } from "../utils/pageScrollShell"
import { buildLightPointDashboardPushUrl } from "../utils/notificationDeepLinks"
import { guardComuneAccess } from "../utils/townHallAccess"

/** Stati post-sopralluogo su cui si chiude l'intervento ordinario. */
const CLOSABLE_ORDINARY = new Set(["SUSPENDED", "SCHEDULED"])

const fieldClass =
  "block w-full px-4 py-3 rounded-xl border border-border/70 bg-background/50 text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring/50 transition-colors duration-200"
const labelClass = "block text-sm font-medium text-foreground mb-1.5"
const hintClass = "mt-1.5 text-xs text-muted-foreground leading-relaxed"

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

function OperationPageSkeleton() {
  return (
    <div
      className={`${PAGE_SCROLL_SHELL} flex items-start justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4 py-6 sm:py-8`}
      aria-busy="true"
      aria-label="Caricamento intervento"
    >
      <div className="w-full max-w-lg space-y-4">
        <ChartSection className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-11 w-11 rounded-full" />
              <Skeleton className="h-11 w-11 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </ChartSection>
      </div>
    </div>
  )
}

export default function Operation() {
  const { userData, getActiveReports } = useContext(UserContext)
  const navigate = useNavigate()
  const location = useLocation()
  const reduceMotion = useReducedMotion()
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
    () =>
      activeReports.map((item) => ({
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

    if (isTourDemo && !paramsObj.comune) {
      setQueryParams(DEMO_OPERATION)
      setActiveReports([DEMO_ACTIVE_REPORT])
      setReportId(DEMO_ACTIVE_REPORT._id)
      setError("")
      setLoading(false)
      return
    }

    setQueryParams(paramsObj)

    if (paramsObj.comune && !guardComuneAccess({ userData, comune: paramsObj.comune, navigate })) {
      return
    }

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

        const preferred =
          paramsObj.reportId && reports.find((r) => String(r._id) === String(paramsObj.reportId))

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
            setError(
              "Il preventivo IMS deve essere approvato dal DEC prima di chiudere la straordinaria.",
            )
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
      setError(
        "Modalità tutorial: la chiusura reale è disabilitata. Apri un punto luce dalla mappa per operare.",
      )
      return
    }

    if (!reportId || !selectedReport) {
      setError("Seleziona la segnalazione da chiudere.")
      return
    }

    const maintenanceType =
      selectedReport.maintenance_category === "EXTRAORDINARY" ? "EXTRAORDINARY" : "ORDINARY"

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

      const rawLinked =
        opRes?.data?.report?.linked_quote_id || selectedReport.linked_quote_id || null
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
    return <OperationPageSkeleton />
  }

  if (isSuccess) {
    const hasConsuntivoCta = successMeta?.isExtraordinary && successMeta?.linkedQuoteId
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
              <h2 className="text-2xl font-bold text-foreground">Intervento chiuso</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {successMeta?.isExtraordinary
                  ? "Intervento straordinario completato. Compila il consuntivo IMS per chiudere il ciclo documentale."
                  : "Guasto eliminato: la segnalazione è stata completata e l'impianto risulta ripristinato."}
              </p>
            </div>
            {hasConsuntivoCta ? (
              <Button
                type="button"
                className="min-h-11 w-full bg-amber-600 text-white hover:bg-amber-500"
                onClick={() => navigate(`/quote/${successMeta.linkedQuoteId}/consuntivo`)}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Compila consuntivo
              </Button>
            ) : null}
            <Button
              type="button"
              variant={hasConsuntivoCta ? "outline" : "default"}
              className={cn(
                "min-h-11 w-full",
                !hasConsuntivoCta && "bg-primary text-primary-foreground",
              )}
              onClick={() => navigate("/dashboard")}
            >
              <Home className="h-4 w-4" />
              Torna alla dashboard
            </Button>
          </ChartSection>
        </motion.div>
      </div>
    )
  }

  const singleReport = activeReports.length === 1
  const report = selectedReport || activeReports[0]
  const operatorName =
    [userData?.name, userData?.surname].filter(Boolean).join(" ") || userData?.email || "—"
  const suspensionReason = singleReport
    ? report?.workflow_status === "SUSPENDED" && report?.suspension?.reason
      ? report.suspension
      : null
    : selectedReport?.workflow_status === "SUSPENDED" && selectedReport?.suspension?.reason
      ? selectedReport.suspension
      : null

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
          <div className="flex items-start justify-between gap-3" data-tour="page-operation-title">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Wrench className="h-6 w-6 shrink-0 text-blue-400" aria-hidden="true" />
                <h1 className="truncate text-2xl font-bold text-foreground">Chiudi intervento</h1>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {isTourDemo
                  ? "Esempio guidato — nessun punto reale selezionato"
                  : "Conferma il ripristino dell'impianto sul punto selezionato"}
              </p>
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

          {isTourDemo ? (
            <div
              role="status"
              className="rounded-xl border border-blue-500/30 bg-blue-950/30 p-3 text-sm text-blue-100"
            >
              Modalità tutorial: stai vedendo un esempio. La chiusura reale è disabilitata.
            </div>
          ) : null}

          {error && !activeReports.length ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-200"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" aria-hidden="true" />
              <p>{error}</p>
            </div>
          ) : (
            <>
              <section
                aria-label="Dettagli punto"
                data-tour="page-operation-point"
                className="space-y-3 rounded-xl border border-border/50 bg-secondary/30 p-4"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <Hash className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                  <p className="min-w-0 break-words text-sm text-foreground">
                    <span className="font-medium">Punto:</span>{" "}
                    <span className="font-mono text-muted-foreground">{queryParams.numeroPalo}</span>
                    {queryParams.comune ? (
                      <span className="text-muted-foreground"> · {queryParams.comune}</span>
                    ) : null}
                  </p>
                </div>
                <div className="flex items-start gap-2.5 min-w-0">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                  <p className="min-w-0 break-words text-sm text-foreground">
                    <span className="font-medium">Manutenzione:</span>{" "}
                    <span className="text-muted-foreground">
                      {isExtraordinary ? "Straordinaria" : "Ordinaria"}
                    </span>
                    {isExtraordinary && selectedReport?.due_date ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · scadenza {new Date(selectedReport.due_date).toLocaleDateString("it-IT")}
                      </span>
                    ) : null}
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

              <Separator className="bg-border/50" />

              <form onSubmit={handleSubmit} className="space-y-5" data-tour="page-operation-form">
                <div
                  className="rounded-xl border border-blue-500/30 bg-blue-950/25 p-3.5 text-sm text-blue-100"
                  role="note"
                >
                  <div className="flex gap-2.5">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" />
                    <div className="space-y-1 leading-relaxed">
                      <p className="font-medium text-blue-50">Esito registrato</p>
                      <p className="text-blue-100/90">
                        Verrà chiusa la segnalazione con esito{" "}
                        <span className="font-medium text-foreground">
                          Guasto eliminato e impianto ripristinato
                        </span>
                        . Verifica di aver selezionato la segnalazione corretta prima di confermare.
                      </p>
                    </div>
                  </div>
                </div>

                {singleReport && report ? (
                  <div className="space-y-2 rounded-xl border border-border/50 bg-secondary/20 p-4">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <ClipboardList className="h-3.5 w-3.5 text-blue-300" aria-hidden="true" />
                      Segnalazione
                    </div>
                    <p className="text-base font-semibold leading-snug text-foreground">
                      {formatReportFaultLabel(report)}
                    </p>
                    {suspensionReason ? (
                      <p className="text-sm text-muted-foreground">
                        Motivo sospensione: {suspensionReason.reason}
                        {suspensionReason.days ? ` (${suspensionReason.days} giorni)` : ""}
                      </p>
                    ) : null}
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
                      className="border-border/60 bg-background/50"
                      maxVisible={6}
                    />
                    <p className={hintClass}>
                      Sul punto risultano più segnalazioni chiudibili: scegli quella appena risolta.
                    </p>
                    {suspensionReason ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Motivo sospensione: {suspensionReason.reason}
                        {suspensionReason.days ? ` (${suspensionReason.days} giorni)` : ""}
                      </p>
                    ) : null}
                  </div>
                )}

                {isExtraordinary ? (
                  <div
                    className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-sm text-amber-100"
                    role="status"
                  >
                    <div className="flex gap-2.5">
                      <AlertTriangle
                        className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
                        aria-hidden="true"
                      />
                      <div className="space-y-1 leading-relaxed">
                        <p className="font-medium text-amber-50">Consuntivo IMS richiesto</p>
                        <p className="text-amber-100/90">
                          Stai chiudendo una segnalazione straordinaria. Dopo l&apos;invio dovrai
                          compilare il consuntivo IMS per completare il ciclo documentale.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div>
                  <label htmlFor="notes" className={labelClass}>
                    Note <span className="font-normal text-muted-foreground">(opzionale)</span>
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

                <Button
                  type="submit"
                  disabled={submitting || !reportId}
                  className="min-h-12 w-full bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chiusura in corso…
                    </>
                  ) : (
                    <>
                      <Wrench className="h-4 w-4" />
                      Chiudi segnalazione
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-sm text-blue-400 hover:text-blue-300"
                    onClick={() => navigate("/dashboard")}
                  >
                    Annulla
                  </Button>
                </div>
              </form>
            </>
          )}
        </ChartSection>
      </motion.div>
    </div>
  )
}

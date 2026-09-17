"use client"

import { useState, useEffect, useContext } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import { UserContext } from "../context/UserContext"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Home,
  Info,
  Loader2,
  Map,
  MapPin,
  Send,
  User,
} from "lucide-react"
import { BackNavigationButton } from "../components/BackNavigationButton"
import { GlassSelect } from "../components/ui/GlassSelect"
import { CapitolatoValidityChip } from "../components/ui/CapitolatoValidityChip"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartSection } from "@/components/infoPanel/DistributionChart"
import { cn } from "@/lib/utils"
import { sendPushNotification } from "../utils/pushNotifications"
import { PAGE_SCROLL_SHELL } from "../utils/pageScrollShell"
import { buildLightPointDashboardPushUrl } from "../utils/notificationDeepLinks"
import { guardComuneAccess } from "../utils/townHallAccess"
import {
  LEGACY_REPORT_TYPES,
  filterFaultLabelsForMarker,
  filterLegacyReportTypesForMarker,
} from "../utils/utils"

const fieldClass =
  "block w-full px-4 py-3 rounded-xl border border-border/70 bg-background/50 text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring/50 transition-colors duration-200"
const labelClass = "block text-sm font-medium text-foreground mb-1.5"
const hintClass = "mt-1.5 text-xs text-muted-foreground leading-relaxed"

const DEMO_LIGHTPOINT = {
  _id: "tour-demo-lightpoint",
  numero_palo: "DEMO-01",
  marker: "PL",
  lat: "45.4642",
  lng: "9.1900",
  adr: "Via Esempio 1 — modalità tutorial",
  city: "Demo",
}

function ReportPageSkeleton() {
  return (
    <div
      className={`${PAGE_SCROLL_SHELL} flex items-start justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4 py-6 sm:py-8`}
      aria-busy="true"
      aria-label="Caricamento segnalazione"
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
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </ChartSection>
      </div>
    </div>
  )
}

export default function Report() {
  const { userData, getLightpoint, addReport, getMaintenanceConfig } = useContext(UserContext)
  const navigate = useNavigate()
  const location = useLocation()
  const reduceMotion = useReducedMotion()
  const isTourDemo =
    new URLSearchParams(location.search).get("tourDemo") === "1" ||
    Boolean(location.state?.lmTour?.force || location.state?.tourDemo)
  const [formData, setFormData] = useState({
    reportType: "LIGHT_POINT_OFF",
    faultLabel: "SINGLE_OFF",
    riskClass: "C",
    description: "",
  })
  const [maintenanceConfig, setMaintenanceConfig] = useState(null)
  const [capitolatoValidity, setCapitolatoValidity] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")
  const [address, setAddress] = useState("Caricamento indirizzo...")
  const [lightpoint, setLightpoint] = useState(null)

  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API
  const isAdminReport = ["ADMINISTRATOR", "SUPER_ADMIN"].includes(userData?.user_type)

  const allFaultLabels = maintenanceConfig?.faultLabels?.length
    ? maintenanceConfig.faultLabels
    : [
        { code: "SINGLE_OFF", label: "Punto luce singolo spento", suggestedRiskClass: "C", applicableTo: ["PL"] },
        { code: "PANEL_DAMAGE", label: "Quadro elettrico danneggiato", suggestedRiskClass: "B", applicableTo: ["QE"] },
        { code: "NON_URGENT", label: "Anomalia non urgente", suggestedRiskClass: "D", applicableTo: ["PL", "QE"] },
      ]

  const faultLabels = filterFaultLabelsForMarker(allFaultLabels, lightpoint?.marker)

  const riskClasses = maintenanceConfig?.riskClasses?.length
    ? maintenanceConfig.riskClasses
    : [{ code: "A" }, { code: "B" }, { code: "C" }, { code: "D" }]

  const selectedFault = faultLabels.find((item) => item.code === formData.faultLabel)
  const selectedRisk = riskClasses.find((item) => item.code === formData.riskClass)

  const findAddress = async (lat, lng) => {
    lat = lat.replace(",", ".")
    lng = lng.replace(",", ".")
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`,
      )
      const data = await response.json()
      const route = data.results.filter((result) => result.types.includes("route"))
      return route.length > 0 ? route[0].formatted_address : "Indirizzo non trovato"
    } catch (err) {
      console.error("Error fetching address:", err)
      return "Errore nel recupero dell'indirizzo"
    }
  }

  useEffect(() => {
    if (!userData) {
      navigate("/")
      return
    }
    if (userData.user_type === "SURVEYOR") {
      navigate("/dashboard")
      return
    }
    // Il manutentore non apre una segnalazione: va al sopralluogo diretto.
    if (userData.user_type === "MAINTAINER" && !isTourDemo) {
      const params = new URLSearchParams(location.search)
      const comune = params.get("comune")
      const id = params.get("id")
      if (comune && !guardComuneAccess({ userData, comune, navigate })) {
        return
      }
      if (comune && id) {
        navigate(`/inspection?comune=${encodeURIComponent(comune)}&id=${encodeURIComponent(id)}`, {
          replace: true,
        })
      } else {
        navigate("/dashboard", { replace: true })
      }
      return
    }

    const params = new URLSearchParams(location.search)
    const comune = params.get("comune")
    const id = params.get("id")

    if (comune && !guardComuneAccess({ userData, comune, navigate })) {
      return
    }

    if (isTourDemo && !id) {
      setLightpoint(DEMO_LIGHTPOINT)
      setAddress(DEMO_LIGHTPOINT.adr)
      return
    }

    const fetchLightpoint = async () => {
      try {
        const [response, configResponse] = await Promise.all([
          getLightpoint(id),
          comune ? getMaintenanceConfig(comune) : Promise.resolve(null),
        ])
        if (configResponse?.data?.config) {
          setMaintenanceConfig(configResponse.data.config)
          setCapitolatoValidity(configResponse.data.validity || null)
        }
        if (response && response.data) {
          setLightpoint(response.data)
          if (configResponse?.data?.config) {
            const markerFiltered = filterFaultLabelsForMarker(
              configResponse.data.config.faultLabels || [],
              response.data.marker,
            )
            const firstFault = markerFiltered[0]
            if (firstFault) {
              setFormData((prev) => ({
                ...prev,
                faultLabel: firstFault.code,
                riskClass: firstFault.suggestedRiskClass || "C",
                reportType:
                  response.data.marker === "QE" ? "BROKEN_PANEL" : prev.reportType,
              }))
            } else if (response.data.marker === "QE") {
              setFormData((prev) => ({ ...prev, reportType: "BROKEN_PANEL" }))
            }
          } else if (response.data.marker === "QE") {
            setFormData((prev) => ({ ...prev, reportType: "BROKEN_PANEL" }))
          }
          if (response.data.lat && response.data.lng) {
            if (response.data.adr) {
              setAddress(response.data.adr)
            } else {
              const addr = await findAddress(response.data.lat, response.data.lng)
              setAddress(addr)
            }
          } else {
            setAddress("Indirizzo non trovato")
          }
        } else {
          setLightpoint(null)
          setAddress("Indirizzo non trovato")
        }
      } catch {
        setLightpoint(null)
        setAddress("Indirizzo non trovato")
      }
    }
    fetchLightpoint()
  }, [userData, navigate, location.search, isTourDemo])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const setSelectField = (name, value) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value }
      if (name === "faultLabel") {
        const match = faultLabels.find((item) => item.code === value)
        if (match?.suggestedRiskClass) {
          next.riskClass = match.suggestedRiskClass
        }
      }
      return next
    })
  }

  const faultLabelOptions = faultLabels.map((item) => ({
    value: item.code,
    label: item.label,
  }))

  const riskClassOptions = riskClasses.map((item) => ({
    value: item.code,
    label: item.label ? `${item.code} — ${item.label}` : item.code,
  }))

  const reportTypeOptions = filterLegacyReportTypesForMarker(lightpoint?.marker).map(
    ([value, label]) => ({
      value,
      label,
    }),
  )

  const getReportLabel = () => {
    if (isAdminReport) {
      return faultLabels.find((item) => item.code === formData.faultLabel)?.label || formData.faultLabel
    }
    return LEGACY_REPORT_TYPES[formData.reportType] || formData.reportType
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isTourDemo) {
      setError(
        "Modalità tutorial: l’invio reale è disabilitato. Torna alla mappa per segnalare un punto luce.",
      )
      return
    }
    setIsLoading(true)
    setError("")
    const comune = new URLSearchParams(location.search).get("comune")

    try {
      const reportData = {
        report_type: isAdminReport ? formData.faultLabel : formData.reportType,
        fault_label: isAdminReport ? formData.faultLabel : undefined,
        risk_class: isAdminReport ? formData.riskClass : undefined,
        maintenance_category: "ORDINARY",
        description: formData.description,
        name: comune,
        user_creator_id: userData.id,
        numero_palo: lightpoint?.numero_palo,
        date: new Date(),
      }
      const res1 = await addReport(reportData)
      if (!res1) {
        setError("Errore nell'invio della segnalazione. Riprova.")
        return
      }

      try {
        let pushTitle
        const reportDate = reportData.date
        const time = reportDate.toLocaleTimeString()
        const day = reportDate.toLocaleDateString()
        const reportLabel = getReportLabel()
        const noteSuffix = reportData.description ? ` Note: ${reportData.description}` : ""

        if (lightpoint && lightpoint.marker === "PL") {
          pushTitle = `Guasto segnalato sul punto luce: ${lightpoint.numero_palo}`
        } else {
          pushTitle = `Guasto segnalato sul quadro elettrico: ${lightpoint?.numero_palo ?? ""}`
        }

        await sendPushNotification({
          title: pushTitle,
          body: `È stato segnalato un problema di tipo "${reportLabel}" nel comune di ${reportData.name} alle ore: ${time} del giorno ${day}.${noteSuffix}`,
          townHallName: comune,
          url: buildLightPointDashboardPushUrl({
            townHallName: comune,
            numeroPalo: lightpoint?.numero_palo,
            lat: lightpoint?.lat,
            lng: lightpoint?.lng,
          }),
        })
      } catch (pushError) {
        console.error("Push notification failed:", pushError)
      }

      setIsSuccess(true)
    } catch (err) {
      console.error("Error submitting report:", err)
      setError("Invio non riuscito. Riprova tra poco.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
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
              <h2 className="text-2xl font-bold text-foreground">Segnalazione inviata</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                La segnalazione è stata registrata. La classificazione indicata è provvisoria: verrà
                revisionata e confermata dal manutentore in fase di sopralluogo.
              </p>
            </div>
            <Button
              type="button"
              className="min-h-11 w-full bg-primary text-primary-foreground"
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

  if (!lightpoint) {
    return <ReportPageSkeleton />
  }

  const pointLabel = lightpoint.marker === "PL" ? "Punto luce" : "Quadro"
  const comune =
    new URLSearchParams(location.search).get("comune") || (isTourDemo ? "Comune demo" : null)

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
          <div className="flex items-start justify-between gap-3" data-tour="page-report-title">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-6 w-6 shrink-0 text-blue-400" aria-hidden="true" />
                <h1 className="truncate text-2xl font-bold text-foreground">Segnala guasto</h1>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {!isTourDemo ? <CapitolatoValidityChip validity={capitolatoValidity} /> : null}
                <p className="text-sm text-muted-foreground">
                  {isTourDemo
                    ? "Esempio guidato — nessun punto reale selezionato"
                    : "Descrivi l'anomalia sul punto selezionato"}
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

          {isTourDemo ? (
            <div
              role="status"
              className="rounded-xl border border-blue-500/30 bg-blue-950/30 p-3 text-sm text-blue-100"
            >
              Modalità tutorial: stai vedendo un esempio. L&apos;invio reale è disabilitato.
            </div>
          ) : null}

          <section
            aria-label="Dettagli punto"
            data-tour="page-report-point"
            className="space-y-3 rounded-xl border border-border/50 bg-secondary/30 p-4"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
              <p className="min-w-0 break-words text-sm text-foreground">
                <span className="font-medium">{pointLabel}:</span>{" "}
                <span className="font-mono text-muted-foreground">{lightpoint.numero_palo}</span>
                {comune ? <span className="text-muted-foreground"> · {comune}</span> : null}
              </p>
            </div>
            <div className="flex items-start gap-2.5 min-w-0">
              <Map className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
              <p className="min-w-0 break-words text-sm leading-snug text-foreground">
                <span className="font-medium">Indirizzo:</span>{" "}
                <span className="text-muted-foreground">{address}</span>
              </p>
            </div>
            <div className="flex items-start gap-2.5 min-w-0">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
              <p className="min-w-0 break-words text-sm text-foreground">
                <span className="font-medium">Segnalante:</span>{" "}
                <span className="text-muted-foreground">
                  {userData?.surname} {userData?.name}
                </span>
              </p>
            </div>
          </section>

          <div
            className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-sm text-amber-100"
            role="note"
          >
            <div className="flex gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-medium text-amber-50">Classificazione provvisoria</p>
                <p className="text-amber-100/90">
                  Il tipo di guasto{isAdminReport ? " e la classe di rischio" : ""} indicati in
                  questa fase sono solo una stima iniziale. Verranno revisionati e confermati dal
                  manutentore in fase di sopralluogo.
                </p>
              </div>
            </div>
          </div>

          <Separator className="bg-border/50" />

          <form onSubmit={handleSubmit} className="space-y-5" data-tour="page-report-form">
            {isAdminReport ? (
              <fieldset className="space-y-4 rounded-xl border border-border/50 bg-secondary/20 p-4">
                <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold text-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                  Classificazione
                </legend>

                <div>
                  <label htmlFor="faultLabel" className={labelClass}>
                    Tipo di guasto
                  </label>
                  <GlassSelect
                    id="faultLabel"
                    value={formData.faultLabel}
                    onChange={(value) => setSelectField("faultLabel", value)}
                    options={faultLabelOptions}
                    aria-label="Tipo di guasto"
                    className="border-border/60 bg-background/50"
                    maxVisible={5}
                  />
                  <p className={hintClass}>
                    {lightpoint?.marker === "QE"
                      ? "Voci specifiche per il quadro elettrico."
                      : "Selezionare la voce che meglio descrive l'anomalia osservata."}
                  </p>
                </div>

                <div>
                  <label htmlFor="riskClass" className={labelClass}>
                    Classe di rischio suggerita
                  </label>
                  <GlassSelect
                    id="riskClass"
                    value={formData.riskClass}
                    onChange={(value) => setSelectField("riskClass", value)}
                    options={riskClassOptions}
                    aria-label="Classe di rischio suggerita"
                    className="border-border/60 bg-background/50"
                    maxVisible={6}
                  />
                  <p className={hintClass}>
                    {selectedFault?.suggestedRiskClass
                      ? `Suggerita dal tipo di guasto: classe ${selectedFault.suggestedRiskClass}${
                          selectedRisk?.label && selectedRisk.code === formData.riskClass
                            ? ` (${selectedRisk.label})`
                            : ""
                        }. Puoi modificarla se necessario.`
                      : "Può essere aggiornata automaticamente al cambio del tipo di guasto."}
                  </p>
                </div>
              </fieldset>
            ) : (
              <div>
                <label htmlFor="reportType" className={labelClass}>
                  Tipo di guasto
                </label>
                <GlassSelect
                  id="reportType"
                  value={formData.reportType}
                  onChange={(value) => setSelectField("reportType", value)}
                  options={reportTypeOptions}
                  aria-label="Tipo di guasto"
                  className="border-border/60 bg-background/50"
                  maxVisible={6}
                />
                <p className={hintClass}>
                  Indica la tipologia più vicina: sarà confermata dal manutentore in sopralluogo.
                </p>
              </div>
            )}

            <div>
              <label htmlFor="description" className={labelClass}>
                Descrizione <span className="font-normal text-muted-foreground">(opzionale)</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows="4"
                value={formData.description}
                onChange={handleChange}
                placeholder="Es. orario dell'anomalia, rumori, pericolo per il traffico…"
                className={fieldClass}
              />
              <p className={hintClass}>
                Dettagli utili al manutentore accelerano la presa in carico.
              </p>
            </div>

            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-200"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" aria-hidden="true" />
                <p>{error}</p>
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={isLoading}
              className={cn(
                "min-h-12 w-full bg-primary text-primary-foreground",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Invia segnalazione
                </>
              )}
            </Button>
          </form>
        </ChartSection>
      </motion.div>
    </div>
  )
}

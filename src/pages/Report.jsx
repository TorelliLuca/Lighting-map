"use client"

import { useState, useEffect, useContext } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { UserContext } from "../context/UserContext"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Home,
  Info,
  Map,
  MapPin,
  User,
} from "lucide-react"
import { LightbulbLoader } from "../components/lightbulb-loader"
import { BackNavigationButton } from "../components/BackNavigationButton"
import { GlassSelect } from "../components/ui/GlassSelect"
import { sendPushNotification } from "../utils/pushNotifications"
import { PAGE_SCROLL_SHELL } from "../utils/pageScrollShell"
import { CapitolatoValidityChip } from "../components/ui/CapitolatoValidityChip"
import { buildLightPointDashboardPushUrl } from "../utils/notificationDeepLinks"


const LEGACY_REPORT_TYPES = {
  LIGHT_POINT_OFF: "Punto luce spento",
  PLANT_OFF: "Impianto spento",
  DAMAGED_COMPLEX: "Complesso danneggiato",
  DAMAGED_SUPPORT: "Morsettiera rotta",
  BROKEN_TERMINAL_BLOCK: "Sostegno danneggiato",
  BROKEN_PANEL: "Quadro danneggiato",
  OTHER: "Altro",
}

const fieldClass =
  "block w-full px-4 py-3 rounded-xl border border-blue-500/30 bg-blue-900/20 text-white placeholder-blue-300/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors duration-200"
const labelClass = "block text-sm font-medium text-blue-100 mb-1.5"
const hintClass = "mt-1.5 text-xs text-blue-300/75 leading-relaxed"

const DEMO_LIGHTPOINT = {
  _id: "tour-demo-lightpoint",
  numero_palo: "DEMO-01",
  marker: "PL",
  lat: "45.4642",
  lng: "9.1900",
  adr: "Via Esempio 1 — modalità tutorial",
  city: "Demo",
}

export default function Report() {
  const { userData, getLightpoint, addReport, getMaintenanceConfig } = useContext(UserContext)
  const navigate = useNavigate()
  const location = useLocation()
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

  const faultLabels = maintenanceConfig?.faultLabels?.length
    ? maintenanceConfig.faultLabels
    : [
        { code: "SINGLE_OFF", label: "Punto luce singolo spento", suggestedRiskClass: "C" },
        { code: "NON_URGENT", label: "Anomalia non urgente", suggestedRiskClass: "D" },
      ]

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

    const params = new URLSearchParams(location.search)
    const comune = params.get("comune")
    const id = params.get("id")

    // Replay tutorial dal profilo: UI completa senza punto luce reale
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
          const firstFault = configResponse.data.config.faultLabels?.[0]
          if (firstFault) {
            setFormData((prev) => ({
              ...prev,
              faultLabel: firstFault.code,
              riskClass: firstFault.suggestedRiskClass || "C",
            }))
          }
        }
        if (response && response.data) {
          setLightpoint(response.data)
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

  const reportTypeOptions = Object.entries(LEGACY_REPORT_TYPES).map(([value, label]) => ({
    value,
    label,
  }))

  const getReportLabel = () => {
    if (isAdminReport) {
      return faultLabels.find((item) => item.code === formData.faultLabel)?.label || formData.faultLabel
    }
    return LEGACY_REPORT_TYPES[formData.reportType] || formData.reportType
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isTourDemo) {
      setError("Modalità tutorial: l’invio reale è disabilitato. Torna alla mappa per segnalare un punto luce.")
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
      <div className={`${PAGE_SCROLL_SHELL} flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4`}>
        <div className="w-full max-w-md relative overflow-hidden rounded-2xl shadow-[0_0_40px_rgba(0,149,255,0.15)]">
          <div className="relative z-10 p-8 backdrop-blur-xl bg-black/40 border border-blue-500/20">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-500/20 backdrop-blur-sm mb-6 border border-blue-400/30">
                <CheckCircle className="h-10 w-10 text-blue-400" aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-bold text-white">Segnalazione inviata</h2>
              <p className="mt-2 text-blue-200/80 text-sm leading-relaxed">
                La segnalazione è stata registrata. La classificazione indicata è provvisoria:
                verrà revisionata e confermata dal manutentore in fase di sopralluogo.
              </p>
              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="w-full cursor-pointer py-3 px-4 rounded-xl font-medium text-white
                  bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-black
                  shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-200"
                >
                  Torna alla dashboard
                </button>
              </div>
            </div>
          </div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" aria-hidden="true" />
        </div>
      </div>
    )
  }

  if (!lightpoint) {
    return (
      <div className={`${PAGE_SCROLL_SHELL} flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4`}>
        <div className="w-full max-w-md flex flex-col items-center justify-center">
          <LightbulbLoader />
          <p className="mt-4 text-blue-200">Caricamento punto luce...</p>
        </div>
      </div>
    )
  }

  const pointLabel = lightpoint.marker === "PL" ? "Punto luce" : "Quadro"
  const comune =
    new URLSearchParams(location.search).get("comune") ||
    (isTourDemo ? "Comune demo" : null)

  return (
    <div className={`${PAGE_SCROLL_SHELL} flex items-start justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4 py-6 sm:py-8`}>
      <div className="w-full max-w-lg relative rounded-2xl shadow-[0_0_40px_rgba(0,149,255,0.15)]">
        <div className="relative z-10 p-6 sm:p-8 backdrop-blur-xl bg-black/40 border border-blue-500/20 rounded-2xl">
          <div className="flex items-start justify-between gap-3 mb-5" data-tour="page-report-title">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-6 w-6 text-blue-400 shrink-0" aria-hidden="true" />
                <h1 className="text-2xl font-bold text-white truncate">Segnala guasto</h1>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {!isTourDemo ? <CapitolatoValidityChip validity={capitolatoValidity} /> : null}
                <p className="text-sm text-blue-300/80">
                  {isTourDemo
                    ? "Esempio guidato — nessun punto reale selezionato"
                    : "Descrivi l'anomalia sul punto selezionato"}
                </p>
              </div>
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
              Modalità tutorial: stai vedendo un esempio. L&apos;invio reale è disabilitato.
            </div>
          ) : null}

          <section
            aria-label="Dettagli punto"
            data-tour="page-report-point"
            className="mb-5 p-4 rounded-xl bg-blue-900/20 border border-blue-500/20 space-y-3"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <MapPin className="w-4 h-4 mt-0.5 text-blue-400 shrink-0" aria-hidden="true" />
              <p className="text-sm text-blue-100 min-w-0 break-words">
                <span className="font-medium text-blue-50">{pointLabel}:</span>{" "}
                <span className="text-blue-200 font-mono">{lightpoint.numero_palo}</span>
                {comune ? (
                  <span className="text-blue-300/80"> · {comune}</span>
                ) : null}
              </p>
            </div>
            <div className="flex items-start gap-2.5 min-w-0">
              <Map className="w-4 h-4 mt-0.5 text-blue-400 shrink-0" aria-hidden="true" />
              <p className="text-sm text-blue-100 leading-snug min-w-0 break-words">
                <span className="font-medium text-blue-50">Indirizzo:</span>{" "}
                <span className="text-blue-200">{address}</span>
              </p>
            </div>
            <div className="flex items-start gap-2.5 min-w-0">
              <User className="w-4 h-4 mt-0.5 text-blue-400 shrink-0" aria-hidden="true" />
              <p className="text-sm text-blue-100 min-w-0 break-words">
                <span className="font-medium text-blue-50">Segnalante:</span>{" "}
                <span className="text-blue-200">{userData?.surname} {userData?.name}</span>
              </p>
            </div>
          </section>

          <div
            className="mb-5 p-3.5 rounded-xl bg-amber-900/20 border border-amber-500/30 text-sm text-amber-100"
            role="note"
          >
            <div className="flex gap-2.5">
              <Info className="h-4 w-4 mt-0.5 text-amber-300 shrink-0" aria-hidden="true" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-medium text-amber-50">Classificazione provvisoria</p>
                <p className="text-amber-100/90">
                  Il tipo di guasto{isAdminReport ? " e la classe di rischio" : ""} indicati 
                  in questa fase sono solo una stima iniziale. Verranno revisionati e confermati dal
                  manutentore in fase di sopralluogo.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" data-tour="page-report-form">
            {isAdminReport ? (
              <fieldset className="space-y-4 rounded-xl border border-blue-500/20 bg-blue-950/20 p-4">
                <legend className="px-1 text-sm font-semibold text-blue-100 flex items-center gap-1.5">
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
                    className="bg-blue-900/20 border-blue-500/30"
                    maxVisible={5}
                  />
                  <p className={hintClass}>
                    Selezionare la voce che meglio descrive l&apos;anomalia osservata.
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
                    className="bg-blue-900/20 border-blue-500/30"
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
                  className="bg-blue-900/20 border-blue-500/30"
                  maxVisible={6}
                />
                <p className={hintClass}>
                  Indica la tipologia più vicina: sarà confermata dal manutentore in sopralluogo.
                </p>
              </div>
            )}

            <div>
              <label htmlFor="description" className={labelClass}>
                Descrizione{" "}
                <span className="font-normal text-blue-300/70">(opzionale)</span>
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
              disabled={isLoading}
              className="w-full cursor-pointer py-3 px-4 rounded-xl font-medium text-white
              bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
              focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-black
              shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <LightbulbLoader />
                  <span className="ml-2">Invio in corso...</span>
                </span>
              ) : (
                "Invia segnalazione"
              )}
            </button>
          </form>
        </div>

        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      </div>
    </div>
  )
}

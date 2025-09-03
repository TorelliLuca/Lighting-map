"use client"

import { useState, useEffect, useContext } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { UserContext } from "../context/UserContext"
import { AlertCircle, CheckCircle, ChevronLeft, MapPin, Map, User } from "lucide-react"
import { LightbulbLoader } from "../components/lightbulb-loader"
import { api } from "../context/UserContext"
import { usePushNotifications } from "../hooks/usePushNotifications"
import { sendPushNotification } from "../utils/pushNotifications"
import { title } from "process"

const BASE_URL = import.meta.env.VITE_SERVER_URL

export default function Report() {
  const { userData, getLightpoint, addReport } = useContext(UserContext)
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState({
    reportType: "LIGHT_POINT_OFF",
    description: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")
  const [address, setAddress] = useState("Loading address...")
  const [lightpoint, setLightpoint] = useState(null)
  const isPushReady = usePushNotifications();

  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API

  const reportTypes = {
    LIGHT_POINT_OFF: "Punto luce spento",
    PLANT_OFF: "Impianto spento",
    DAMAGED_COMPLEX: "Complesso danneggiato",
    DAMAGED_SUPPORT: "Morsettiera rotta",
    BROKEN_TERMINAL_BLOCK: "Sostegno danneggiato",
    BROKEN_PANEL: "Quadro danneggiato",
    OTHER: "Altro",
  }

  // Funzione per trovare l'indirizzo tramite lat/lng
  const findAddress = async (lat, lng) => {
    lat = lat.replace(",", ".")
    lng = lng.replace(",", ".")
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`,
      )
      const data = await response.json()
      const route = data.results.filter((result) => result.types.includes("route"))
      return route.length > 0 ? route[0].formatted_address : "Address not found"
    } catch (error) {
      console.error("Error fetching address:", error)
      return "Error fetching address"
    }
  }

  // Carica il punto luce all'avvio
  useEffect(() => {
    if (!userData) {
      navigate("/")
      return
    }
    
    const params = new URLSearchParams(location.search)
    const comune = params.get("comune")
    const id = params.get("id")

    const fetchLightpoint = async () => {
      try {
        const response = await getLightpoint(id)
        if (response && response.data) {
          setLightpoint(response.data)
          // Se c'è lat/lng, trova l'indirizzo
          if (response.data.lat && response.data.lng) {
            if (response.data.adr) {
              setAddress(response.data.adr)
            } else {
              const addr = await findAddress(response.data.lat, response.data.lng)
              setAddress(addr)
            }
          } else {
            setAddress("Address not found")
          }
        } else {
          setLightpoint(null)
          setAddress("Address not found")
        }
      } catch (err) {
        setLightpoint(null)
        setAddress("Address not found")
      }
    }
    fetchLightpoint()
  }, [userData, navigate, location.search])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const sendMailOfReport = async () => {
    try {
      const date = new Date().toISOString()
      const comune = new URLSearchParams(location.search).get("comune")

      const mailData = {
        name: comune,
        user: {
          name: userData.name,
          surname: userData.surname,
          email: userData.email,
          cell: userData.cell || "",
        },
        date: date,
        light_point: {
          numero_palo: lightpoint?.numeroPalo,
          indirizzo: address,
          ...lightpoint, // puoi aggiungere altre caratteristiche qui
        },
        report: {
          report_type: reportTypes[formData.reportType],
          description: formData.description,
        },
      }
      await api.post("/send-email-to-user/lightPointReported", mailData)
      return true
    } catch (error) {
      console.error("Error sending email notification:", error)
      return false
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    const comune = new URLSearchParams(location.search).get("comune")

    try {
      const reportData = {
        report_type: formData.reportType,
        description: formData.description,
        name: comune,
        user_creator_id: userData.id,
        numero_palo: lightpoint?.numero_palo,
        date: new Date(),
        ...lightpoint, 
      }
      const res1 = await addReport(reportData)
      if (!res1 ) {
        setError("Errore nell'invio della segnalazione. Riprova.")
        return
      }
      const res2 = await sendMailOfReport()
      if (!res2) {
        setError("Errore nell'invio della mail di notifica. Riprova.")
        return
      }
      console.log(isPushReady);
      if(isPushReady) {
        let title, body;
        console.log(lightpoint);
        if (lightpoint && lightpoint.marker === "PL") {
          title = `Guasto segnalato sul punto luce: ${lightpoint.numero_palo}`;
          if (reportData.description) {
            body = `È stato segnalato un problema di tipo "${reportTypes[reportData.report_type]}" nel comune di ${reportData.name} alle ore: ${reportData.date.toLocaleTimeString()} del giorno ${reportData.date.toLocaleDateString()}.Note: ${reportData.description}`;
            } else {
            body = `È stato segnalato un problema di tipo "${reportTypes[reportData.report_type]}" nel comune di ${reportData.name} alle ore: ${reportData.date.toLocaleTimeString()} del giorno ${reportData.date.toLocaleDateString()}.`;
            }
        } else {
          title = `Guasto segnalato sul quadro elettrico: ${lightpoint.numero_palo}`;
          if (reportData.description) {
              body = `È stato segnalato un problema di tipo "${reportTypes[reportData.report_type]}" nel comune di ${reportData.name} alle ore: ${reportData.date.toLocaleTimeString()} del giorno ${reportData.date.toLocaleDateString()}.Note: ${reportData.description}`;
            } else {
              body = `È stato segnalato un problema di tipo "${reportTypes[reportData.report_type]}" nel comune di ${reportData.name} alle ore: ${reportData.date.toLocaleTimeString()} del giorno ${reportData.date.toLocaleDateString()}.`;

            }
        }
        const r = await sendPushNotification(title, body, userData.id)
        console.log(r);
      }
      setIsSuccess(true)
    } catch (error) {
      console.error("Error submitting report:", error)
      setError("Failed to submit report. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4">
        <div className="w-full max-w-md relative overflow-hidden rounded-2xl shadow-[0_0_40px_rgba(0,149,255,0.15)]">
          {/* Glass effect container */}
          <div className="relative z-10 p-8 backdrop-blur-xl bg-black/40 border border-blue-500/20">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-500/20 backdrop-blur-sm mb-6 border border-blue-400/30">
                <CheckCircle className="h-10 w-10 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Segnalazione Inviata con Successo</h2>
              <p className="mt-2 text-blue-200/80">La tua segnalazione è stata inviata e sarà elaborata.</p>
              <div className="mt-8">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="w-full py-3 px-4 rounded-xl font-medium text-white 
                  bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-black
                  shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-200"
                >
                  Torna alla Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl"></div>
        </div>
      </div>
    )
  }

  // Loading state
  if (!lightpoint) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4">
        <div className="w-full max-w-md flex flex-col items-center justify-center">
          <LightbulbLoader />
          <p className="mt-4 text-blue-200">Caricamento punto luce...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4">
      <div className="w-full max-w-md relative overflow-hidden rounded-2xl shadow-[0_0_40px_rgba(0,149,255,0.15)]">
        {/* Glass effect container */}
        <div className="relative z-10 p-8 backdrop-blur-xl bg-black/40 border border-blue-500/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Segnala guasto</h2>
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 rounded-full bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-blue-400" />
              <span className="sr-only">Back to dashboard</span>
            </button>
          </div>

          <div className="space-y-3 mb-6 p-4 rounded-xl bg-blue-900/20 border border-blue-500/20">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <p className="text-blue-100">
                {lightpoint.marker === "PL" ? (
                  <>
                    <span className="font-medium">N° Punto Luce:</span>{" "}
                    <span className="text-blue-200">{lightpoint.numero_palo}</span>
                  </>
                ) : <>
                    <span className="font-medium">N° Quadro:</span>{" "}
                    <span className="text-blue-200">{lightpoint.numero_palo}</span>
                  </>}
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <Map className="w-5 h-5" />
              <p className="text-blue-100">
                <span className="font-medium">Indirizzo:</span> <span className="text-blue-200">{address}</span>
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <User className="w-5 h-5" />
              <p className="text-blue-100">
                <span className="font-medium">Segnalante:</span> <span className="text-blue-200">{userData?.surname} {userData?.name}</span>
              </p>
            </div>
            
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="reportType" className="block text-sm font-medium text-blue-200 mb-2">
                Tipo di guasto
              </label>
              <div className="relative">
                <select
                  id="reportType"
                  name="reportType"
                  value={formData.reportType}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 rounded-xl border border-blue-500/30 
                  bg-blue-900/20 text-white placeholder-blue-300/50 backdrop-blur-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                  appearance-none"
                >
                  {Object.entries(reportTypes).map(([value, label]) => (
                    <option key={value} value={value} className="bg-blue-900 text-white">
                      {label}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-blue-200 mb-2">
                Descrizione
              </label>
              <textarea
                id="description"
                name="description"
                rows="4"
                value={formData.description}
                onChange={handleChange}
                placeholder="Fornisci dettagli aggiuntivi sul guasto"
                className="block w-full px-4 py-3 rounded-xl border border-blue-500/30 
                bg-blue-900/20 text-white placeholder-blue-300/50 backdrop-blur-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              ></textarea>
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-200">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-medium text-white 
              bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
              focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-black
              shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <LightbulbLoader />
                  <span className="ml-2">Elaborazione in corso...</span>
                </span>
              ) : (
                "Invia Segnalazione"
              )}
            </button>
          </form>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  )
}


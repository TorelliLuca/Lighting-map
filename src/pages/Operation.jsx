"use client"

import { useState, useEffect, useContext } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { UserContext } from "../context/UserContext"
import { AlertCircle, CheckCircle, ChevronLeft, PenToolIcon as Tool, User, Hash } from "lucide-react"
import { LightbulbLoader } from "../components/lightbulb-loader"
import { api } from "../context/UserContext"
import { translateString } from "../utils/utils"

const BASE_URL = import.meta.env.VITE_SERVER_URL

export default function Operation() {
  const { userData, getActiveReports } = useContext(UserContext)
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState({
    reportId: "operationWithoutReport",
    operationType: "MADE_SAFE_BUT_SYSTEM_NEEDS_RESTORING",
    notes: "",
  })
  const [activeReports, setActiveReports] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")
  const [queryParams, setQueryParams] = useState({})

  const operationTypes = {
    MADE_SAFE_BUT_SYSTEM_NEEDS_RESTORING: "Messa in sicurezza ma da ripristinare impianto",
    FAULT_ELIMINATED_AND_SYSTEM_RESTORED: "Guasto eliminato e impianto ripristinato",
    OTHER: "Altro",
  }

  const reportTypes = {
    LIGHT_POINT_OFF: "Punto luce spento",
    PLANT_OFF: "Impianto spento",
    DAMAGED_COMPLEX: "Complesso danneggiato",
    DAMAGED_SUPPORT: "Morsettiera rotta",
    BROKEN_TERMINAL_BLOCK: "Sostegno danneggiato",
    BROKEN_PANEL: "Quadro danneggiato",
    OTHER: "Altro",
  }

  useEffect(() => {
    if (!userData) {
      navigate("/")
      return
    }

    // Parse query parameters
    const params = new URLSearchParams(location.search)
    const paramsObj = {
      comune: params.get("comune"),
      numeroPalo: params.get("numeroPalo"),
      lat: params.get("lat"),
      lng: params.get("lng"),
    }

    setQueryParams(paramsObj)

    // Fetch active reports for this light point
    if (paramsObj.comune && paramsObj.numeroPalo) {
      fetchActiveReports(paramsObj.comune, paramsObj.numeroPalo)
    }
  }, [userData, navigate, location.search])

  const sendMailOfReport = async () => {
    try {
      const date = new Date().toISOString()

      const mailData = {
        name: queryParams.comune,
        user: {
          name: userData.name,
          surname: userData.surname,
          email: userData.email,
          cell: userData.cell || "",
        },
        date: date,
        light_point: {
          numero_palo: queryParams.numeroPalo,
          //indirizzo: address,
        },
        operation: {
          operation_type: operationTypes[formData.operationType],
          description: formData.description || "",
        },
      }
      console.log(mailData);
      const response = await api.post("/send-email-to-user/reportSolved", mailData)
      return true
    } catch (error) {
      console.error("Error sending email notification:", error)
      return false
    }
  }

  const fetchActiveReports = async (city, lightPointId) => {
    try {
      const response = await getActiveReports(city, lightPointId)
      const reports = response.data
      setActiveReports(reports)
    } catch (error) {
      console.error("Error fetching active reports:", error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const isSolved = formData.operationType === "FAULT_ELIMINATED_AND_SYSTEM_RESTORED"

      const operationData = {
        operation_type: formData.operationType,
        note: formData.notes,
        name: queryParams.comune,
        numero_palo: queryParams.numeroPalo,
        email: userData.email,
        id_segnalazione: formData.reportId === "operationWithoutReport" ? null : formData.reportId,
        is_solved: isSolved,
        date: new Date(),
      }

      const response = await api.post("/addOperation", operationData)
      setIsSuccess(true)
      await sendMailOfReport()
    } catch (error) {
      console.error("Error submitting operation:", error)
      setError("Failed to submit operation. Please try again.")
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
              <h2 className="text-2xl font-bold text-white">Operazione Registrata con Successo</h2>
              <p className="mt-2 text-blue-200/80">L'operazione è stata registrata e il sistema è stato aggiornato.</p>
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4">
      <div className="w-full max-w-md relative overflow-hidden rounded-2xl shadow-[0_0_40px_rgba(0,149,255,0.15)]">
        {/* Glass effect container */}
        <div className="relative z-10 p-8 backdrop-blur-xl bg-black/40 border border-blue-500/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Registra Operazione</h2>
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
              <Hash className="h-4 w-4 text-blue-400" />
              <p className="text-blue-100">
                <span className="font-medium">ID Punto Luce:</span>{" "}
                <span className="text-blue-200">{queryParams.numeroPalo}</span>
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-400" />
              <p className="text-blue-100">
                <span className="font-medium">Utente:</span> <span className="text-blue-200">{userData?.email}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="reportId" className="block text-sm font-medium text-blue-200 mb-2">
                Seleziona Problema da Risolvere
              </label>
              <div className="relative">
                <select
                  id="reportId"
                  name="reportId"
                  value={formData.reportId}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 rounded-xl border border-blue-500/30 
                  bg-blue-900/20 text-white placeholder-blue-300/50 backdrop-blur-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                  appearance-none"
                >
                  <option value="operationWithoutReport" className="bg-blue-900 text-white">
                    Risolvi guasto senza segnalazione
                  </option>
                  {activeReports.map((report) => {
                    const date = new Date(report.report_date).toLocaleDateString()
                    const type = reportTypes[report.report_type] || report.report_type
                    return (
                      <option key={report._id} value={report._id} className="bg-blue-900 text-white">
                        {type} - {date}
                      </option>
                    )
                  })}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-xs text-blue-300/70">
                Seleziona "Risolvi guasto senza segnalazione" se stai risolvendo un guasto non segnalato.
              </p>
            </div>

            <div>
              <label htmlFor="operationType" className="block text-sm font-medium text-blue-200 mb-2">
                Tipo di Operazione
              </label>
              <div className="relative">
                <select
                  id="operationType"
                  name="operationType"
                  value={formData.operationType}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 rounded-xl border border-blue-500/30 
                  bg-blue-900/20 text-white placeholder-blue-300/50 backdrop-blur-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                  appearance-none"
                >
                  {Object.entries(operationTypes).map(([value, label]) => (
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
              <label htmlFor="notes" className="block text-sm font-medium text-blue-200 mb-2">
                Note
              </label>
              <textarea
                id="notes"
                name="notes"
                rows="4"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Fornisci dettagli sull'operazione eseguita"
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
                <span className="flex items-center justify-center">
                  <Tool className="mr-2 h-5 w-5" />
                  Registra Operazione
                </span>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Annulla e torna alla dashboard
              </button>
            </div>
          </form>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  )
}


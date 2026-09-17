import { useEffect, useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { CheckCircle, XCircle, ArrowRight, Loader2 } from "lucide-react"
import { api } from "../context/UserContext"

/** Cache a livello modulo: sopravvive al remount Strict Mode e evita doppio confirm. */
const confirmInFlight = new Map()
const confirmSucceeded = new Set()

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState("loading")
  const [message, setMessage] = useState("Conferma dell'email in corso...")
  const navigate = useNavigate()
  const token = searchParams.get("token")

  useEffect(() => {
    let cancelled = false

    const handleConfirmEmail = async () => {
      if (!token) {
        setStatus("error")
        setMessage("Token non valido.")
        return
      }

      if (confirmSucceeded.has(token)) {
        setStatus("success")
        setMessage("Email confermata con successo! Ora puoi accedere.")
        return
      }

      try {
        let request = confirmInFlight.get(token)
        if (!request) {
          request = api.get(`/confirm-email`, { params: { token } })
          confirmInFlight.set(token, request)
        }
        await request
        confirmSucceeded.add(token)
        if (cancelled) return
        setStatus("success")
        setMessage("Email confermata con successo! Ora puoi accedere.")
      } catch (error) {
        console.error(error)
        if (cancelled) return
        // Se una richiesta parallela ha già avuto successo, non mostrare errore
        if (confirmSucceeded.has(token)) {
          setStatus("success")
          setMessage("Email confermata con successo! Ora puoi accedere.")
          return
        }
        setStatus("error")
        setMessage(
          error.response?.data || "Si è verificato un errore durante la conferma dell'email."
        )
      } finally {
        confirmInFlight.delete(token)
      }
    }

    handleConfirmEmail()
    return () => {
      cancelled = true
    }
  }, [token])

  const isLoading = status === "loading"
  const isSuccess = status === "success"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4">
      <div className="w-full max-w-md relative overflow-hidden rounded-2xl shadow-[0_0_40px_rgba(0,149,255,0.15)]">
        <div className="relative z-10 p-8 backdrop-blur-xl bg-black/40 border border-blue-500/20 text-center transform transition-all duration-300 hover:shadow-[0_0_50px_rgba(0,149,255,0.2)]">
          <div className="mb-6">
            {isLoading ? (
              <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            ) : isSuccess ? (
              <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-gradient-to-r from-red-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                <XCircle className="w-8 h-8 text-white" />
              </div>
            )}
            <h2 className="text-3xl font-bold text-white mb-4">
              {isLoading
                ? "Verifica in corso..."
                : isSuccess
                  ? "Operazione completata con successo!"
                  : "Errore nella verifica della mail"}
            </h2>
          </div>

          <p
            className={`text-lg mb-8 ${
              isLoading ? "text-blue-200" : isSuccess ? "text-green-300" : "text-red-300"
            }`}
          >
            {message}
          </p>

          <button
            className="w-full py-3 px-4 rounded-xl font-medium text-white 
            bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
            focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-black
            shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-200
            hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] transform hover:scale-[1.02]
            disabled:opacity-60 disabled:pointer-events-none"
            onClick={() => navigate("/login")}
            disabled={isLoading}
          >
            <span className="flex items-center justify-center">
              Torna al login
              <ArrowRight className="w-5 h-5 ml-2 transform transition-transform duration-200 group-hover:translate-x-1" />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

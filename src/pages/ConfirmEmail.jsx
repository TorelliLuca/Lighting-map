import { useEffect, useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { X, CheckCircle, XCircle, ArrowRight } from "lucide-react"
import {api} from "../context/UserContext"

const BASE_URL = import.meta.env.VITE_SERVER_URL

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState("loading")
  const [message, setMessage] = useState("")
  const navigate = useNavigate()
  const token = searchParams.get("token")

    useEffect(() => {
        const handleConfirmEmail = async () => {
            if (!token) {
            setStatus("error")
            setMessage("Token non valido.")
            return
            }
            let response

            try {
                try {
                response = await api.get(`/confirm-email`, { params: { token } }); 
                } catch (error) {
                  console.error(error)
                  setStatus("error")
                  setMessage(error.response?.data || "Si è verificato un errore durante la conferma dell'email.")
                  return
                }
            setStatus("success")
            setMessage("Email confermata con successo! Ora puoi accedere.")
            } catch (error) {
                console.log(error);
                console.log(error.response?.data);
            setStatus("error")
            setMessage(error.response?.data || "Si è verificato un errore durante la conferma dell'email.")
            }
        }
        handleConfirmEmail()
    }, [token])

return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4">
      <div className="w-full max-w-md relative overflow-hidden rounded-2xl shadow-[0_0_40px_rgba(0,149,255,0.15)]">
        {/* Glass effect container */}
        <div className="relative z-10 p-8 backdrop-blur-xl bg-black/40 border border-blue-500/20 text-center transform transition-all duration-300 hover:shadow-[0_0_50px_rgba(0,149,255,0.2)]">
          
          {/* Content */}
          <div className="mb-6">
            {status === "success" ? (
              <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-gradient-to-r from-red-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                <XCircle className="w-8 h-8 text-white" />
              </div>
            )}
            <h2 className="text-3xl font-bold text-white mb-4">
              {status === "success" ? "Operazione completata con successo!" : "Errore nella verifica della mail"}
            </h2>
          </div>
          
          <p className={`text-lg mb-8 ${
            status === "success" 
              ? "text-green-300" 
              : "text-red-300"
          }`}>
            {message}
          </p>
          
          
          <button
            className="w-full py-3 px-4 rounded-xl font-medium text-white 
            bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
            focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-black
            shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-200
            hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] transform hover:scale-[1.02]"
            onClick={() => navigate("/login")}
          >
              <span className="flex items-center justify-center">
              Torna al login
              <ArrowRight className="w-5 h-5 ml-2 transform transition-transform duration-200 group-hover:translate-x-1" />
            </span>
          </button>
        
        </div>
      </div>
    </div>
  );
}
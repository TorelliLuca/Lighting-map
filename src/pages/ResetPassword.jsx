import React, { useState, useEffect } from "react"
import { Link, useSearchParams, useNavigate } from "react-router-dom"
import { Lock, Eye, EyeOff, CheckCircle, Check, X, Shield, AlertCircle } from "lucide-react"
import Logo from "../components/Logo" // Assicurati che il path sia corretto
import { LightbulbLoader } from "../components/lightbulb-loader"
import { useUser } from "../context/UserContext"

export default function ResetPassword() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [token, setToken] = useState("")
  
  const [searchParams] = useSearchParams()
  const { resetPassword } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    const tokenParam = searchParams.get("token")
    if (!tokenParam) {
      setError("Token di reset password non valido o mancante")
      return
    }
    setToken(tokenParam)
  }, [searchParams])

  // Funzione per validare i singoli requisiti della password
  const getPasswordValidation = (password) => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }
  }

  // Calcola la forza della password
  const getPasswordStrength = (password) => {
    const validation = getPasswordValidation(password)
    const passed = Object.values(validation).filter(Boolean).length
    
    if (password.length === 0) return { level: 0, text: "", color: "" }
    if (passed <= 2) return { level: 1, text: "Debole", color: "text-red-400" }
    if (passed === 3) return { level: 2, text: "Media", color: "text-yellow-400" }
    if (passed === 4) return { level: 3, text: "Forte", color: "text-green-400" }
    if (passed === 5) return { level: 4, text: "Molto Forte", color: "text-emerald-400" }
    
    return { level: 0, text: "", color: "" }
  }

  const validatePassword = (password) => {
    if (password.length < 8) {
      return "La password deve essere di almeno 8 caratteri"
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return "La password deve contenere almeno una lettera maiuscola, una minuscola e un numero"
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Validazione password
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      setIsLoading(false)
      return
    }

    // Verifica che le password coincidano
    if (password !== confirmPassword) {
      setError("Le password non coincidono")
      setIsLoading(false)
      return
    }

    try {
      const response = await resetPassword(password, token)
      
      setSuccess(true)
      
      // Reindirizza al login dopo 3 secondi
      setTimeout(() => {
        navigate("/login")
      }, 3000)

    } catch (err) {
      setError(err.message || "Si è verificato un errore durante il reset della password")
    } finally {
      setIsLoading(false)
    }
  }

  const passwordValidation = getPasswordValidation(password)
  const passwordStrength = getPasswordStrength(password)
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  if (!token && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4">
        <div className="text-center">
          <LightbulbLoader />
          <p className="mt-4 text-blue-200">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4">
        <div className="w-full max-w-md relative overflow-hidden rounded-2xl shadow-[0_0_40px_rgba(0,149,255,0.15)]">
          <div className="relative z-10 p-8 backdrop-blur-xl bg-black/40 border border-blue-500/20 text-center">
            <div className="flex justify-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Password aggiornata!</h2>
            <p className="text-blue-200/70 mb-6">
              La tua password è stata aggiornata con successo. Verrai reindirizzato alla pagina di login.
            </p>
            <Link 
              to="/login"
              className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl font-medium text-white 
              bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
              focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-black
              shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-200"
            >
              Vai al Login
            </Link>
          </div>
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
          <div className="flex justify-center">
            <Logo className="w-64" />
          </div>

          <h2 className="mt-6 text-center text-3xl font-bold text-white">Reimposta password</h2>
          <p className="mt-2 text-center text-sm text-blue-200/70">
            Inserisci la tua nuova password per completare il reset
          </p>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="relative">
                <label htmlFor="password" className="block text-sm font-medium text-blue-200 mb-2">
                  Nuova Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 rounded-xl border border-blue-500/30 
                    bg-blue-900/20 text-white placeholder-blue-300/50 backdrop-blur-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-blue-200/70">Forza password:</span>
                      <span className={`text-xs font-medium ${passwordStrength.color}`}>
                        {passwordStrength.text}
                      </span>
                    </div>
                    <div className="w-full bg-blue-900/30 rounded-full h-2 mb-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          passwordStrength.level === 1 ? 'bg-red-500 w-1/4' :
                          passwordStrength.level === 2 ? 'bg-yellow-500 w-2/4' :
                          passwordStrength.level === 3 ? 'bg-green-500 w-3/4' :
                          passwordStrength.level === 4 ? 'bg-emerald-500 w-full' :
                          'w-0'
                        }`}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Password Requirements Checklist */}
              {password.length > 0 && (
                <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-center mb-3">
                    <Shield className="h-4 w-4 text-blue-400 mr-2" />
                    <span className="text-sm font-medium text-blue-200">Requisiti password</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <div className={`mr-2 ${passwordValidation.minLength ? 'text-green-400' : 'text-red-400'}`}>
                        {passwordValidation.minLength ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </div>
                      <span className={passwordValidation.minLength ? 'text-green-200' : 'text-red-200'}>
                        Almeno 8 caratteri
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className={`mr-2 ${passwordValidation.hasUppercase ? 'text-green-400' : 'text-red-400'}`}>
                        {passwordValidation.hasUppercase ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </div>
                      <span className={passwordValidation.hasUppercase ? 'text-green-200' : 'text-red-200'}>
                        Una lettera maiuscola (A-Z)
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className={`mr-2 ${passwordValidation.hasLowercase ? 'text-green-400' : 'text-red-400'}`}>
                        {passwordValidation.hasLowercase ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </div>
                      <span className={passwordValidation.hasLowercase ? 'text-green-200' : 'text-red-200'}>
                        Una lettera minuscola (a-z)
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className={`mr-2 ${passwordValidation.hasNumber ? 'text-green-400' : 'text-red-400'}`}>
                        {passwordValidation.hasNumber ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </div>
                      <span className={passwordValidation.hasNumber ? 'text-green-200' : 'text-red-200'}>
                        Un numero (0-9)
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className={`mr-2 ${passwordValidation.hasSpecialChar ? 'text-green-400' : 'text-amber-400'}`}>
                        {passwordValidation.hasSpecialChar ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                      </div>
                      <span className={passwordValidation.hasSpecialChar ? 'text-green-200' : 'text-amber-200'}>
                        Un carattere speciale (!@#$%^&*) - Consigliato
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="relative">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-blue-200 mb-2">
                  Conferma Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 rounded-xl border border-blue-500/30 
                    bg-blue-900/20 text-white placeholder-blue-300/50 backdrop-blur-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {/* Password Match Indicator */}
                {confirmPassword.length > 0 && (
                  <div className="flex items-center mt-2 text-sm">
                    <div className={`mr-2 ${passwordsMatch ? 'text-green-400' : 'text-red-400'}`}>
                      {passwordsMatch ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </div>
                    <span className={passwordsMatch ? 'text-green-200' : 'text-red-200'}>
                      {passwordsMatch ? 'Le password coincidono' : 'Le password non coincidono'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-200">
                <svg
                  className="h-5 w-5 text-red-400 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p>{error}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading || !token}
                className="w-full py-3 px-4 rounded-xl font-medium text-white 
                bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
                focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-black
                shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-200
                disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <LightbulbLoader />
                    <span className="ml-2">Aggiornamento in corso...</span>
                  </span>
                ) : (
                  "Aggiorna Password"
                )}
              </button>
            </div>

            <div className="text-center text-sm">
              <p className="text-blue-200/70">
                <Link to="/login" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                  Torna al Login
                </Link>
              </p>
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
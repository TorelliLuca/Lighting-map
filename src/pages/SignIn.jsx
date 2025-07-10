"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Eye, EyeOff, Mail, Lock, User, CheckCircle } from "lucide-react"
import { LightbulbLoader } from "../components/lightbulb-loader"
import Logo from "../components/Logo"
import axios from "axios"

const BASE_URL = import.meta.env.VITE_SERVER_URL

export default function SignIn() {
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return false
    }
    return true
  }

  const sendMailToAdmin = async (name, surname) => {
    try {
      const date = new Date().toISOString()
      const dataToSend = {
        user: {
          name,
          surname,
          date,
        },
      }
      await axios.post(`${import.meta.env.VITE_SERVER_URL}/send-email-to-user/userNeedValidation`, dataToSend)
    } catch (error) {
      console.error("Failed to send admin notification:", error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setError("")

    try {
      const dataToSend = {
        name: formData.name,
        surname: formData.surname,
        email: formData.email,
        password: formData.password,
      }
      const response = await axios.post(`${import.meta.env.VITE_SERVER_URL}/addPendingUser`, dataToSend)
      await sendMailToAdmin(formData.name, formData.surname)
      setIsSuccess(true)
    } catch (error) {
      console.error(error)
      setError(error.response.data || "Registration failed. Please try again.")
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
              <h2 className="text-2xl font-bold text-white">Registrazione Completata</h2>
              <p className="mt-2 text-blue-200/80">
                La tua registrazione è stata inviata. Riceverai un'email quando la tua richiesta sarà approvata.
              </p>
              <div className="mt-8">
                <Link
                  to="/"
                  className="w-full inline-block py-3 px-4 rounded-xl font-medium text-white 
                  bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-black
                  shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-200 text-center"
                >
                  Torna al Login
                </Link>
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
          <div className="flex justify-center">
            <Logo className="w-64" />
          </div>

          <h2 className="mt-6 text-center text-3xl font-bold text-white">Crea un account</h2>
          <p className="mt-2 text-center text-sm text-blue-200/70">
            Unisciti alla nostra piattaforma di gestione dell'illuminazione pubblica
          </p>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label htmlFor="name" className="block text-sm font-medium text-blue-200 mb-2">
                    Nome
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-blue-400" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-3 rounded-xl border border-blue-500/30 
                      bg-blue-900/20 text-white placeholder-blue-300/50 backdrop-blur-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      placeholder="First Name"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label htmlFor="surname" className="block text-sm font-medium text-blue-200 mb-2">
                    Cognome
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-blue-400" />
                    </div>
                    <input
                      id="surname"
                      name="surname"
                      type="text"
                      required
                      value={formData.surname}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-3 rounded-xl border border-blue-500/30 
                      bg-blue-900/20 text-white placeholder-blue-300/50 backdrop-blur-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      placeholder="Last Name"
                    />
                  </div>
                </div>
              </div>

              <div className="relative">
                <label htmlFor="email" className="block text-sm font-medium text-blue-200 mb-2">
                  Indirizzo email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                    className="block w-full pl-10 pr-3 py-3 rounded-xl border border-blue-500/30 
                    bg-blue-900/20 text-white placeholder-blue-300/50 backdrop-blur-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="relative">
                <label htmlFor="password" className="block text-sm font-medium text-blue-200 mb-2">
                  Password
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
                    value={formData.password}
                    onChange={handleChange}
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
              </div>

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
                    value={formData.confirmPassword}
                    onChange={handleChange}
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
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl font-medium text-white 
                bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
                focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-black
                shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-200
                disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <LightbulbLoader />
                    <span className="ml-2">Creazione account in corso...</span>
                  </span>
                ) : (
                  "Registrati"
                )}
              </button>
            </div>

            <div className="text-center text-sm">
              <p className="text-blue-200/70">
                Hai già un account?{" "}
                <Link to="/" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                  Accedi
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


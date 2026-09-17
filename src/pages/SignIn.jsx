"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  CheckCircle,
  Shield,
  Check,
  X,
  AlertCircle,
  Info,
  FileText,
  CircleAlert,
  Loader2,
} from "lucide-react"
import Logo from "../components/Logo"
import TownhallAutocomplete from "../components/TownhallAutocomplete"
import axios from "axios"
import { capitalizeString, validateName } from "../utils/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { AuthPageSkeleton } from "@/components/ui/AuthPageSkeleton"
import { AuthLegalFooter } from "@/components/legal/LegalDocumentPage"
import { useUser } from "../context/UserContext"
import { cn } from "@/lib/utils"

const RequirementRow = ({ ok, children, warn = false }) => (
  <div className="flex items-center text-sm">
    <span
      className={cn(
        "mr-2",
        ok ? "text-green-400" : warn ? "text-amber-400" : "text-red-400"
      )}
    >
      {ok ? <Check className="h-4 w-4" /> : warn ? <AlertCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
    </span>
    <span className={ok ? "text-green-200" : warn ? "text-amber-200" : "text-red-200"}>
      {children}
    </span>
  </div>
)

export default function SignIn() {
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    password: "",
    confirmPassword: "",
    requested_townhall: "",
    requested_townhall_notes: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [registrationEmailSent, setRegistrationEmailSent] = useState(true)
  const [nameError, setNameError] = useState("")
  const [surnameError, setSurnameError] = useState("")
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [pageReady, setPageReady] = useState(false)
  const { loading } = useUser()

  useEffect(() => {
    if (loading) {
      setPageReady(false)
      return
    }
    const frame = requestAnimationFrame(() => setPageReady(true))
    return () => cancelAnimationFrame(frame)
  }, [loading])

  const handleChange = (e) => {
    const { name, value } = e.target
    const trimmedValue = value.trim()

    if (error) setError("")

    if (name === "name") {
      if (trimmedValue && !validateName(trimmedValue)) {
        setNameError("Il nome non può contenere numeri o caratteri speciali.")
      } else {
        setNameError("")
      }
    } else if (name === "surname") {
      if (trimmedValue && !validateName(trimmedValue)) {
        setSurnameError("Il cognome non può contenere numeri o caratteri speciali.")
      } else {
        setSurnameError("")
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const getPasswordValidation = (password) => ({
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  })

  const getPasswordStrength = (password) => {
    const validation = getPasswordValidation(password)
    const passed = Object.values(validation).filter(Boolean).length

    if (password.length === 0) return { level: 0, text: "", color: "" }
    if (passed <= 2) return { level: 1, text: "Debole", color: "text-red-400", bar: "bg-red-500" }
    if (passed === 3) return { level: 2, text: "Media", color: "text-yellow-400", bar: "bg-yellow-500" }
    if (passed === 4) return { level: 3, text: "Forte", color: "text-green-400", bar: "bg-green-500" }
    if (passed === 5) return { level: 4, text: "Molto Forte", color: "text-emerald-400", bar: "bg-emerald-500" }

    return { level: 0, text: "", color: "", bar: "" }
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

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateForm = () => {
    if (
      !formData.name.trim() ||
      !formData.surname.trim() ||
      !formData.email.trim() ||
      !formData.password.trim() ||
      !formData.confirmPassword.trim() ||
      !formData.requested_townhall.trim()
    ) {
      setError("Per favore, compila tutti i campi, incluso il comune richiesto.")
      return false
    }

    if (nameError || surnameError) {
      setError("Correggi gli errori nei campi Nome e Cognome.")
      return false
    }

    if (!validateEmail(formData.email.trim())) {
      setError("Inserisci un indirizzo email valido.")
      return false
    }

    const passwordError = validatePassword(formData.password)
    if (passwordError) {
      setError(passwordError)
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Le password non corrispondono.")
      return false
    }

    if (!acceptedPrivacy) {
      setError("Per registrarti devi accettare l’informativa sulla privacy.")
      return false
    }

    return true
  }

  const sendMailToAdmin = async (name, surname, userEmail) => {
    try {
      const date = new Date().toISOString()
      await axios.post(`${import.meta.env.VITE_SERVER_URL}/send-email-to-user/userNeedValidation`, {
        user: { name, surname, email: userEmail, date },
      })
    } catch (err) {
      console.error("Failed to send admin notification:", err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const { data } = await axios.post(`${import.meta.env.VITE_SERVER_URL}/addPendingUser`, {
        name: capitalizeString(formData.name),
        surname: capitalizeString(formData.surname),
        email: formData.email,
        password: formData.password,
        requested_townhall: formData.requested_townhall,
        requested_townhall_notes: formData.requested_townhall_notes,
      })
      await sendMailToAdmin(formData.name, formData.surname, formData.email)
      setRegistrationEmailSent(data?.emailSent !== false)
      setIsSuccess(true)
    } catch (err) {
      console.error(err)
      const errData = err.response?.data
      setError(
        typeof errData === "string"
          ? errData
          : errData?.message || "Registration failed. Please try again."
      )
    } finally {
      setIsLoading(false)
    }
  }

  const passwordValidation = getPasswordValidation(formData.password)
  const passwordStrength = getPasswordStrength(formData.password)
  const passwordsMatch =
    formData.password === formData.confirmPassword && formData.confirmPassword.length > 0

  const fieldClass =
    "h-11 border-blue-500/30 bg-blue-900/20 text-white placeholder:text-blue-300/50 focus-visible:border-blue-500/50 focus-visible:ring-blue-500/40"
  const labelClass = "text-blue-200"

  if (loading || !pageReady) {
    return <AuthPageSkeleton variant="signin" />
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4">
        <Card className="relative w-full max-w-md overflow-hidden border-blue-500/20 bg-black/40 shadow-[0_0_40px_rgba(0,149,255,0.15)] backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
          <CardHeader className="relative z-10 items-center text-center">
            <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/20 backdrop-blur-sm">
              <CheckCircle className="h-10 w-10 text-blue-400" />
            </div>
            <CardTitle className="text-2xl text-white">Registrazione Quasi Completata</CardTitle>
            <CardDescription className="text-blue-200/80">
              {registrationEmailSent
                ? "La tua registrazione è stata inviata ma devi ancora confermare la tua mail. Controlla la casella di posta (anche nello spam) per confermare l'indirizzo."
                : "La tua registrazione è stata salvata, ma non siamo riusciti a inviare la mail di conferma. Accedi al login e usa \"Rinvia email di conferma\" dopo aver inserito le credenziali."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="relative z-10">
            <Button asChild className="w-full bg-primary text-primary-foreground shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              <Link to="/">Torna al Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4">
      <div className="w-full max-w-md">
      <Card className="relative w-full overflow-hidden border-blue-500/20 bg-black/40 py-0 shadow-[0_0_40px_rgba(0,149,255,0.15)] backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />

        <CardHeader className="relative z-10 items-center pb-2 pt-8 text-center">
          <Logo />
          <CardTitle className="mt-3 text-3xl text-white">Crea un account</CardTitle>
          <CardDescription className="text-blue-200/70">
            Unisciti alla nostra piattaforma di gestione dell&apos;illuminazione pubblica
          </CardDescription>
        </CardHeader>

        <CardContent className="relative z-10 pb-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className={labelClass}>
                  Nome
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  aria-invalid={Boolean(nameError)}
                  className={cn(fieldClass, nameError && "border-red-500/50")}
                  placeholder="Nome"
                />
                {nameError && <p className="text-sm text-red-400">{nameError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="surname" className={labelClass}>
                  Cognome
                </Label>
                <Input
                  id="surname"
                  name="surname"
                  type="text"
                  required
                  value={formData.surname}
                  onChange={handleChange}
                  aria-invalid={Boolean(surnameError)}
                  className={cn(fieldClass, surnameError && "border-red-500/50")}
                  placeholder="Cognome"
                />
                {surnameError && <p className="text-sm text-red-400">{surnameError}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className={labelClass}>
                Indirizzo email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                  className={cn(fieldClass, "pl-10")}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requested_townhall" className={labelClass}>
                Comune richiesto
              </Label>
              <TownhallAutocomplete
                value={formData.requested_townhall}
                onChange={(townhallName) => {
                  if (error) setError("")
                  setFormData((prev) => ({ ...prev, requested_townhall: townhallName }))
                }}
                placeholder="Cerca un comune italiano..."
              />
              <Alert className="border-blue-500/15 bg-blue-950/40 text-blue-200/80 [&>svg]:text-blue-400">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs text-blue-300/70">
                  L&apos;associazione definitiva del comune verrà eseguita solo in fase di
                  accettazione della richiesta.
                </AlertDescription>
              </Alert>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requested_townhall_notes" className={labelClass}>
                Note per la richiesta del comune{" "}
                <span className="font-normal text-blue-300/60">(Opzionale)</span>
              </Label>
              <div className="relative">
                <FileText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-blue-400" />
                <Textarea
                  id="requested_townhall_notes"
                  name="requested_townhall_notes"
                  rows={3}
                  value={formData.requested_townhall_notes}
                  onChange={handleChange}
                  className={cn(
                    "min-h-[5rem] resize-none border-blue-500/30 bg-blue-900/20 pl-10 text-sm text-white placeholder:text-blue-300/50 focus-visible:ring-blue-500/40"
                  )}
                  placeholder="Inserisci eventuali note o motivazioni per l'amministratore..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className={labelClass}>
                Password
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={cn(fieldClass, "pl-10 pr-10")}
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-blue-400 hover:bg-transparent hover:text-blue-300"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>

              {formData.password.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-200/70">Forza password:</span>
                    <span className={cn("text-xs font-medium", passwordStrength.color)}>
                      {passwordStrength.text}
                    </span>
                  </div>
                  <Progress
                    value={passwordStrength.level * 25}
                    className="h-2 bg-blue-900/30"
                    indicatorClassName={passwordStrength.bar}
                  />
                </div>
              )}
            </div>

            {formData.password.length > 0 && (
              <div className="space-y-2 rounded-xl border border-blue-500/20 bg-blue-900/10 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-200">Requisiti password</span>
                </div>
                <RequirementRow ok={passwordValidation.minLength}>Almeno 8 caratteri</RequirementRow>
                <RequirementRow ok={passwordValidation.hasUppercase}>
                  Una lettera maiuscola (A-Z)
                </RequirementRow>
                <RequirementRow ok={passwordValidation.hasLowercase}>
                  Una lettera minuscola (a-z)
                </RequirementRow>
                <RequirementRow ok={passwordValidation.hasNumber}>Un numero (0-9)</RequirementRow>
                <RequirementRow ok={passwordValidation.hasSpecialChar} warn>
                  Un carattere speciale (!@#$%^&*) - Consigliato
                </RequirementRow>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className={labelClass}>
                Conferma Password
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={cn(fieldClass, "pl-10 pr-10")}
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-blue-400 hover:bg-transparent hover:text-blue-300"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={
                    showConfirmPassword ? "Nascondi conferma password" : "Mostra conferma password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {formData.confirmPassword.length > 0 && (
                <div className="flex items-center text-sm">
                  <span className={cn("mr-2", passwordsMatch ? "text-green-400" : "text-red-400")}>
                    {passwordsMatch ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </span>
                  <span className={passwordsMatch ? "text-green-200" : "text-red-200"}>
                    {passwordsMatch ? "Le password coincidono" : "Le password non coincidono"}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="accept-privacy"
                checked={acceptedPrivacy}
                onCheckedChange={(checked) => {
                  setAcceptedPrivacy(checked === true)
                  if (error) setError("")
                }}
                disabled={isLoading}
                className="mt-0.5 border-blue-500/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
              />
              <Label
                htmlFor="accept-privacy"
                className="block cursor-pointer text-sm font-normal leading-snug text-blue-200/80"
              >
                Dichiaro di aver letto e accettato l&apos;
                <Link
                  to="/privacy"
                  className="inline font-medium text-blue-400 underline-offset-2 hover:text-blue-300 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  informativa sulla privacy
                </Link>
                {" "}e la{" "}
                <Link
                  to="/cookie"
                  className="inline font-medium text-blue-400 underline-offset-2 hover:text-blue-300 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  cookie policy
                </Link>
                .
              </Label>
            </div>

            {error && (
              <Alert
                variant="destructive"
                className="border-red-500/30 bg-red-900/20 text-red-200 [&>svg]:text-red-400"
              >
                <CircleAlert className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isLoading || !acceptedPrivacy}
              className="h-11 w-full bg-primary text-primary-foreground shadow-[0_0_15px_rgba(59,130,246,0.5)]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Creazione account in corso...
                </>
              ) : (
                "Registrati"
              )}
            </Button>

            <p className="text-center text-sm text-blue-200/70">
              Hai già un account?{" "}
              <Link
                to="/"
                className="font-medium text-blue-400 transition-colors hover:text-blue-300"
              >
                Accedi
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
      <AuthLegalFooter />
      </div>
    </div>
  )
}

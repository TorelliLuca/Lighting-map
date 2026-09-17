"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  CheckCircle,
  ArrowLeft,
  CircleAlert,
  Loader2,
  LogIn,
} from "lucide-react"
import { useUser } from "../context/UserContext"
import Logo from "../components/Logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { AuthPageSkeleton } from "@/components/ui/AuthPageSkeleton"
import { AuthLegalFooter } from "@/components/legal/LegalDocumentPage"
import { cn } from "@/lib/utils"

const fieldClass =
  "h-11 border-blue-500/30 bg-blue-900/20 text-white placeholder:text-blue-300/50 focus-visible:border-blue-500/50 focus-visible:ring-blue-500/40"
const labelClass = "text-blue-200"

const AuthShell = ({ children }) => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4">
    <div className="w-full max-w-md">
      <Card className="relative w-full overflow-hidden border-blue-500/20 bg-black/40 py-0 shadow-[0_0_40px_rgba(0,149,255,0.15)] backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
        {children}
      </Card>
      <AuthLegalFooter />
    </div>
  </div>
)

const getApiErrorMessage = (err, fallback) => {
  const data = err?.response?.data
  if (typeof data === "string" && data.trim()) return data
  if (data && typeof data === "object" && data.message) return data.message
  return fallback
}

const LoginForm = ({
  onForgotPasswordClick,
  email,
  setEmail,
  password,
  setPassword,
  rememberMe,
  setRememberMe,
  handleSubmit,
  isLoading,
  error,
  showPassword,
  setShowPassword,
  needsEmailConfirm,
  onResendConfirmation,
  isResendingConfirm,
  confirmResendMessage,
}) => (
  <>
    <CardHeader className="relative z-10 items-center pb-2 pt-8 text-center">
      <Logo />
      <CardTitle className="mt-3 text-3xl text-white">Accedi al tuo account</CardTitle>
      <CardDescription className="text-blue-200/70">
        Accedi alla tua dashboard di gestione dell&apos;illuminazione pubblica
      </CardDescription>
    </CardHeader>

    <CardContent className="relative z-10 pb-8">
      <form className="space-y-5" onSubmit={handleSubmit} autoComplete="off">
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
              autoComplete="off"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(fieldClass, "pl-10")}
              placeholder="you@example.com"
              disabled={isLoading}
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
              autoComplete="off"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(fieldClass, "pl-10 pr-10")}
              placeholder="••••••••"
              disabled={isLoading}
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-blue-400 hover:bg-transparent hover:text-blue-300"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              aria-label={showPassword ? "Nascondi password" : "Mostra password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="remember-me"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
            disabled={isLoading}
            className="border-blue-500/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
          />
          <Label htmlFor="remember-me" className="cursor-pointer text-sm font-normal text-blue-200/80">
            Resta connesso
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

        {confirmResendMessage && (
          <Alert className="border-blue-500/30 bg-blue-900/20 text-blue-100 [&>svg]:text-blue-400">
            <Mail className="h-4 w-4" />
            <AlertDescription>{confirmResendMessage}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="h-11 w-full bg-primary text-primary-foreground shadow-[0_0_15px_rgba(59,130,246,0.5)]"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              Accesso in corso...
            </>
          ) : (
            <>
              <LogIn />
              Accedi
            </>
          )}
        </Button>

        {needsEmailConfirm && (
          <Button
            type="button"
            variant="outline"
            disabled={isResendingConfirm || !email || isLoading}
            onClick={onResendConfirmation}
            className="h-11 w-full border-blue-500/30 bg-transparent text-blue-300 hover:bg-blue-900/30 hover:text-blue-200"
          >
            {isResendingConfirm ? (
              <>
                <Loader2 className="animate-spin" />
                Invio in corso...
              </>
            ) : (
              "Rinvia email di conferma"
            )}
          </Button>
        )}

        <div className="space-y-2 text-center text-sm">
          <p className="text-blue-200/70">
            Non hai un account?{" "}
            <Link
              to="/signin"
              className="font-medium text-blue-400 transition-colors hover:text-blue-300"
            >
              Registrati
            </Link>
          </p>
          <p>
            <button
              type="button"
              className="font-medium text-blue-400 transition-colors hover:text-blue-300"
              onClick={onForgotPasswordClick}
            >
              Password dimenticata?
            </button>
          </p>
        </div>
      </form>
    </CardContent>
  </>
)

const ForgotPasswordForm = ({
  onBackToLogin,
  handleSendResetLink,
  emailForReset,
  setEmailForReset,
  isSending,
  error,
}) => (
  <>
    <CardHeader className="relative z-10 items-center pb-2 pt-8 text-center">
      <Logo className="w-64" />
      <CardTitle className="mt-3 text-3xl text-white">Reimposta Password</CardTitle>
      <CardDescription className="text-blue-200/70">
        Inserisci la tua email per ricevere le istruzioni.
      </CardDescription>
    </CardHeader>

    <CardContent className="relative z-10 pb-8">
      <form className="space-y-5" onSubmit={handleSendResetLink}>
        <div className="space-y-2">
          <Label htmlFor="reset-email" className={labelClass}>
            Indirizzo email
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
            <Input
              id="reset-email"
              name="reset-email"
              type="email"
              autoComplete="email"
              required
              value={emailForReset}
              onChange={(e) => setEmailForReset(e.target.value)}
              className={cn(fieldClass, "pl-10")}
              placeholder="you@example.com"
              disabled={isSending}
            />
          </div>
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
          disabled={isSending}
          className="h-11 w-full bg-primary text-primary-foreground shadow-[0_0_15px_rgba(59,130,246,0.5)]"
        >
          {isSending ? (
            <>
              <Loader2 className="animate-spin" />
              Invio in corso...
            </>
          ) : (
            "Invia link per il reset"
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={onBackToLogin}
          className="w-full text-blue-400 hover:bg-blue-900/20 hover:text-blue-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna al Login
        </Button>
      </form>
    </CardContent>
  </>
)

const SuccessScreen = ({ email, onBackToLogin, onResend, canResend, countdown }) => {
  const maskEmail = (value) => {
    if (!value) return ""
    const [localPart, domain] = value.split("@")
    if (!domain) return value
    const [domainName, domainTld] = domain.split(".")
    const maskedLocal =
      localPart.length > 2 ? `${localPart.substring(0, 2)}***` : `${localPart}***`
    const maskedDomain =
      domainName.length > 2
        ? `${domainName.substring(0, 2)}***`
        : `${domainName.substring(0, 1)}**`
    return `${maskedLocal}@${maskedDomain}.${domainTld}`
  }

  return (
    <>
      <CardHeader className="relative z-10 items-center pb-2 pt-8 text-center">
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full border border-green-400/30 bg-green-500/20">
          <CheckCircle className="h-10 w-10 text-green-400" />
        </div>
        <CardTitle className="text-3xl text-white">Controlla la tua email</CardTitle>
        <CardDescription className="text-blue-200/80">
          Se l&apos;indirizzo{" "}
          <span className="font-bold text-blue-300">{maskEmail(email)}</span> è associato a un
          account, riceverai un messaggio con le istruzioni per reimpostare la password.
        </CardDescription>
        <p className="pt-1 text-sm text-blue-300/60">
          Non dimenticare di controllare la cartella spam.
        </p>
      </CardHeader>
      <CardFooter className="relative z-10 flex-col gap-3 pb-8">
        <Button
          onClick={onBackToLogin}
          className="h-11 w-full bg-primary text-primary-foreground shadow-[0_0_15px_rgba(59,130,246,0.5)]"
        >
          Torna al Login
        </Button>
        <Button
          variant="outline"
          onClick={onResend}
          disabled={!canResend}
          className="h-11 w-full border-blue-500/30 bg-transparent text-blue-300 hover:bg-blue-900/30 hover:text-blue-200"
        >
          {canResend ? "Rinvia email" : `Rinvia email tra ${countdown}s`}
        </Button>
      </CardFooter>
    </>
  )
}

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [view, setView] = useState("login")
  const [emailForReset, setEmailForReset] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const [pageReady, setPageReady] = useState(false)
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false)
  const [isResendingConfirm, setIsResendingConfirm] = useState(false)
  const [confirmResendMessage, setConfirmResendMessage] = useState("")

  const { login, forgotPassword, sendConfirmation, loading } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) {
      setPageReady(false)
      return
    }
    const frame = requestAnimationFrame(() => setPageReady(true))
    return () => cancelAnimationFrame(frame)
  }, [loading])

  useEffect(() => {
    let timer
    if (view === "success" && !canResend) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            setCanResend(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [view, canResend])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setConfirmResendMessage("")
    setNeedsEmailConfirm(false)

    try {
      await login(email, password, rememberMe)
      navigate("/dashboard")
    } catch (err) {
      const data = err.response?.data
      const code = data && typeof data === "object" ? data.code : null
      setNeedsEmailConfirm(code === "EMAIL_NOT_VERIFIED")
      setError(getApiErrorMessage(err, "Credenziali non valide. Riprova."))
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!email) {
      setError("Inserisci un indirizzo email.")
      return
    }
    setIsResendingConfirm(true)
    setConfirmResendMessage("")
    setError("")
    try {
      const response = await sendConfirmation(email)
      setConfirmResendMessage(
        typeof response?.data === "string"
          ? response.data
          : "Se l'email è registrata e non ancora verificata, riceverai un link di conferma."
      )
    } catch (err) {
      setError(getApiErrorMessage(err, "Impossibile inviare la mail di conferma. Riprova più tardi."))
    } finally {
      setIsResendingConfirm(false)
    }
  }

  const handleSendResetLink = async (e) => {
    if (e) e.preventDefault()
    if (!emailForReset) {
      setError("Inserisci un indirizzo email.")
      return
    }
    setIsSending(true)
    setError("")

    try {
      await forgotPassword(emailForReset)
      setView("success")
      setCanResend(false)
      setCountdown(60)
    } catch (err) {
      console.error("Errore durante forgotPassword:", err)
      setView("success")
      setCanResend(false)
      setCountdown(60)
    } finally {
      setIsSending(false)
    }
  }

  const handleBackToLogin = () => {
    setView("login")
    setError("")
    setEmailForReset("")
    setNeedsEmailConfirm(false)
    setConfirmResendMessage("")
  }

  if (loading || !pageReady) {
    return (
      <AuthPageSkeleton
        variant={view === "forgotPassword" || view === "success" ? "forgot" : "login"}
      />
    )
  }

  const renderContent = () => {
    switch (view) {
      case "forgotPassword":
        return (
          <ForgotPasswordForm
            onBackToLogin={handleBackToLogin}
            handleSendResetLink={handleSendResetLink}
            emailForReset={emailForReset}
            setEmailForReset={setEmailForReset}
            isSending={isSending}
            error={error}
          />
        )
      case "success":
        return (
          <SuccessScreen
            email={emailForReset}
            onBackToLogin={handleBackToLogin}
            onResend={handleSendResetLink}
            canResend={canResend}
            countdown={countdown}
          />
        )
      case "login":
      default:
        return (
          <LoginForm
            onForgotPasswordClick={() => {
              setView("forgotPassword")
              setError("")
              setNeedsEmailConfirm(false)
              setConfirmResendMessage("")
            }}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            rememberMe={rememberMe}
            setRememberMe={setRememberMe}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            error={error}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            needsEmailConfirm={needsEmailConfirm}
            onResendConfirmation={handleResendConfirmation}
            isResendingConfirm={isResendingConfirm}
            confirmResendMessage={confirmResendMessage}
          />
        )
    }
  }

  return <AuthShell>{renderContent()}</AuthShell>
}

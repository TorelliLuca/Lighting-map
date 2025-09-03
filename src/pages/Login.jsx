"use client"

import { useState, useContext, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { UserContext, useUser } from "../context/UserContext"
import { Eye, EyeOff, Mail, Lock , CheckCircle, ArrowLeft } from "lucide-react"
import { LightbulbLoader } from "../components/lightbulb-loader"
import Logo from "../components/Logo"

const BASE_URL = import.meta.env.VITE_SERVER_URL

const LoginForm = ({ onForgotPasswordClick, email, setEmail, password, setPassword, handleSubmit, isLoading, error, showPassword, setShowPassword }) => (
  <>
    <div className="flex justify-center">
      <Logo className="w-64" />
    </div>
    <h2 className="mt-6 text-center text-3xl font-bold text-white">Accedi al tuo account</h2>
    <p className="mt-2 text-center text-sm text-blue-200/70">
      Accedi alla tua dashboard di gestione dell'illuminazione pubblica
    </p>

    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-4">
        {/* Email Input */}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 rounded-xl border border-blue-500/30 bg-blue-900/20 text-white placeholder-blue-300/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              placeholder="you@example.com"
            />
          </div>
        </div>

        {/* Password Input */}
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full pl-10 pr-10 py-3 rounded-xl border border-blue-500/30 bg-blue-900/20 text-white placeholder-blue-300/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
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
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-200">
           <svg className="h-5 w-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
           </svg>
           <p className="text-sm">{error}</p>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-black shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <LightbulbLoader />
              <span className="ml-2">Accesso in corso...</span>
            </span>
          ) : (
            "Accedi"
          )}
        </button>
      </div>

      <div className="text-center text-sm space-y-2">
        <p className="text-blue-200/70">
          Non hai un account?{" "}
          <Link to="/signin" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
            Registrati
          </Link>
        </p>
        <p className="text-blue-200/70">
          <button
            type="button"
            className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
            onClick={onForgotPasswordClick}
          >
            Password dimenticata?
          </button>
        </p>
      </div>
    </form>
  </>
);

// Componente per il form "Password Dimenticata"
const ForgotPasswordForm = ({ onBackToLogin, handleSendResetLink, emailForReset, setEmailForReset, isSending, error }) => (
  <>
    <div className="flex justify-center">
      <Logo className="w-64" />
    </div>
    <h2 className="mt-6 text-center text-3xl font-bold text-white">Reimposta Password</h2>
    <p className="mt-2 text-center text-sm text-blue-200/70">
      Inserisci la tua email per ricevere le istruzioni.
    </p>

    <form className="mt-8 space-y-6" onSubmit={handleSendResetLink}>
      <div className="relative">
        <label htmlFor="reset-email" className="block text-sm font-medium text-blue-200 mb-2">
          Indirizzo email
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-blue-400" />
          </div>
          <input
            id="reset-email"
            name="reset-email"
            type="email"
            autoComplete="email"
            required
            value={emailForReset}
            onChange={(e) => setEmailForReset(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 rounded-xl border border-blue-500/30 bg-blue-900/20 text-white placeholder-blue-300/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            placeholder="you@example.com"
          />
        </div>
      </div>
       
      {error && (
        <div className="flex items-center space-x-2 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-200">
           <svg className="h-5 w-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
           </svg>
           <p className="text-sm">{error}</p>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isSending}
          className="w-full py-3 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-black shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isSending ? (
            <span className="flex items-center justify-center">
              <LightbulbLoader />
              <span className="ml-2">Invio in corso...</span>
            </span>
          ) : (
            "Invia link per il reset"
          )}
        </button>
      </div>

      <div className="text-center text-sm">
        <button
          type="button"
          onClick={onBackToLogin}
          className="font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center w-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna al Login
        </button>
      </div>
    </form>
  </>
);

// Componente per la schermata di conferma invio email
const SuccessScreen = ({ email, onBackToLogin, onResend, canResend, countdown }) => {
    const maskEmail = (email) => {
        if (!email) return "";
        const [localPart, domain] = email.split('@');
        if (!domain) return email;
        const [domainName, domainTld] = domain.split('.');
        const maskedLocal = localPart.length > 2 ? `${localPart.substring(0, 2)}***` : `${localPart}***`;
        const maskedDomain = domainName.length > 2 ? `${domainName.substring(0, 2)}***` : `${domainName.substring(0,1)}**`;
        return `${maskedLocal}@${maskedDomain}.${domainTld}`;
    };

    return (
        <div className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-400" />
            <h2 className="mt-6 text-3xl font-bold text-white">Controlla la tua email</h2>
            <p className="mt-4 text-blue-200/80">
                Se l’indirizzo <span className="font-bold text-blue-300">{maskEmail(email)}</span> è associato a un account, riceverai un messaggio con le istruzioni per reimpostare la password.
            </p>
            <p className="mt-2 text-sm text-blue-300/60">
                Non dimenticare di controllare la cartella spam.
            </p>
            <div className="mt-8 space-y-4">
                <button
                    onClick={onBackToLogin}
                    className="w-full py-3 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-black shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-200"
                >
                    Torna al Login
                </button>
                <button
                    onClick={onResend}
                    disabled={!canResend}
                    className="w-full py-3 px-4 rounded-xl font-medium text-blue-300 bg-transparent border border-blue-500/30 hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {canResend ? "Rinvia email" : `Rinvia email tra ${countdown}s`}
                </button>
            </div>
        </div>
    );
};
export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  // Stati per il flow di "Password Dimenticata"
  const [view, setView] = useState('login'); // 'login', 'forgotPassword', 'success'
  const [emailForReset, setEmailForReset] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const { login, forgotPassword } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    let timer;
    if (view === 'success' && !canResend) {
        timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setCanResend(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }
    return () => clearInterval(timer);
  }, [view, canResend]);


  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      await login(email, password)
      navigate("/dashboard")
    } catch (err) {
      setError(err.response?.data || "Credenziali non valide. Riprova.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendResetLink = async (e) => {
    if(e) e.preventDefault();
    if (!emailForReset) {
      setError("Inserisci un indirizzo email.")
      return
    }
    setIsSending(true)
    setError("")
    
    try {
      console.log(emailForReset);
      await forgotPassword(emailForReset) 
      setView('success');
      setCanResend(false);
      setCountdown(60);
    } catch (err) {
      // Per sicurezza, non riveliamo se l'email esiste o no.
      // Mostriamo comunque la schermata di successo.
      console.error("Errore durante forgotPassword:", err);
      setView('success');
      setCanResend(false);
      setCountdown(60);
    } finally {
      setIsSending(false)
    }
  }

  const handleBackToLogin = () => {
      setView('login');
      setError('');
      setEmailForReset('');
  }

  const renderContent = () => {
    switch (view) {
      case 'forgotPassword':
        return <ForgotPasswordForm 
                    onBackToLogin={handleBackToLogin} 
                    handleSendResetLink={handleSendResetLink}
                    emailForReset={emailForReset}
                    setEmailForReset={setEmailForReset}
                    isSending={isSending}
                    error={error}
                />;
      case 'success':
        return <SuccessScreen 
                    email={emailForReset} 
                    onBackToLogin={handleBackToLogin}
                    onResend={handleSendResetLink}
                    canResend={canResend}
                    countdown={countdown}
                />;
      case 'login':
      default:
        return <LoginForm 
                    onForgotPasswordClick={() => { setView('forgotPassword'); setError(''); }}
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    handleSubmit={handleSubmit}
                    isLoading={isLoading}
                    error={error}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                />;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4">
      <div className="w-full max-w-md relative overflow-hidden rounded-2xl shadow-[0_0_40px_rgba(0,149,255,0.15)]">
        <div className="relative z-10 p-8 backdrop-blur-xl bg-black/40 border border-blue-500/20">
          {renderContent()}
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  )
}
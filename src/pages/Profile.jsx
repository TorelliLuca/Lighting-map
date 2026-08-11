"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  UserCircle,
  Mail,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Building2,
  HelpCircle,
  BookOpen,
  Info,
  ExternalLink,
  Home,
  Tag,
  Sparkles,
  Megaphone,
  GraduationCap,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import { useUser } from "../context/UserContext"
import { BackNavigationButton } from "../components/BackNavigationButton"
import { PAGE_SCROLL_SHELL } from "../utils/pageScrollShell"
import { translateUserType } from "../utils/utils"
import { getReplayableTutorials } from "../data/pageTours"
import { buildLmTourState, clearReplayQueue, writeReplayQueue } from "../utils/tourReplayQueue"

const ILLUMINAZIONE_PUBBLICA_URL =
  "https://www.torellistudio.com/studio/category/illuminazione-pubblica/"

const SECURITY_EMAIL = "sicurezza@torellistudio.com"
const SECURITY_MAILTO = `mailto:${SECURITY_EMAIL}?subject=${encodeURIComponent("Supporto LightingMap")}`

const glassCard =
  "bg-black/30 backdrop-blur-md border border-blue-500/20 rounded-xl p-4 sm:p-6 shadow-[0_0_20px_rgba(0,149,255,0.15)]"

const helpButtonClass =
  "cursor-pointer w-full flex items-center gap-3 min-h-11 px-4 py-3 rounded-lg bg-blue-900/20 border border-blue-500/20 text-left text-white hover:bg-blue-900/40 transition-colors duration-200"

function getInitials(name, surname) {
  const a = (name || "").trim().charAt(0)
  const b = (surname || "").trim().charAt(0)
  const initials = `${a}${b}`.toUpperCase()
  return initials || "?"
}

function getTownHallNames(list) {
  if (!Array.isArray(list) || list.length === 0) return []
  return list
    .map((item) => {
      if (!item) return null
      if (typeof item === "string") return item
      return item.name || item.nome || null
    })
    .filter(Boolean)
}

function getTypeLabel(type) {
  if (type === "TOWNHALL") return "Comune"
  if (type === "ENTERPRISE") return "Impresa"
  return type || "Organizzazione"
}

function getTypeColor(type) {
  if (type === "TOWNHALL") return "bg-green-900/20 text-green-400 border-green-500/30"
  if (type === "ENTERPRISE") return "bg-blue-900/20 text-blue-400 border-blue-500/30"
  return "bg-gray-900/20 text-gray-400 border-gray-500/30"
}

function formatOrgAddress(address) {
  if (!address) return null
  const parts = [address.street, address.city, address.province].filter(Boolean)
  return parts.length ? parts.join(", ") : null
}

export default function Profile() {
  const navigate = useNavigate()
  const { userData, getOrganizationByUserId, fetchUserProfile } = useUser()
  const [org, setOrg] = useState(null)
  const [orgLoading, setOrgLoading] = useState(false)
  const [orgError, setOrgError] = useState(null)
  const [selectedTourIds, setSelectedTourIds] = useState(() => new Set(["dashboard"]))

  const replayableTutorials = useMemo(
    () => getReplayableTutorials(userData),
    [userData?.user_type, userData?.sub_role, userData?.id],
  )

  useEffect(() => {
    if (fetchUserProfile) {
      fetchUserProfile().catch(() => {})
    }
  }, [fetchUserProfile])

  const fetchOrganization = async () => {
    if (!userData?.id_organization) {
      setOrg(null)
      setOrgError(null)
      return
    }
    setOrgLoading(true)
    setOrgError(null)
    try {
      const response = await getOrganizationByUserId(userData.id_organization)
      if (response?.data) {
        setOrg(response.data)
      } else {
        setOrg(null)
        setOrgError("Dati organizzazione non disponibili")
      }
    } catch (error) {
      setOrg(null)
      setOrgError(error.message || "Errore nel caricamento dell'organizzazione")
      toast.error("Impossibile caricare l'organizzazione")
    } finally {
      setOrgLoading(false)
    }
  }

  useEffect(() => {
    if (userData) {
      fetchOrganization()
    }
  }, [userData?.id_organization, userData?.id])

  const toggleTour = (id) => {
    setSelectedTourIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const startWhatsNew = () => {
    clearReplayQueue()
    navigate("/dashboard", {
      state: { lmTour: { type: "whatsNew" } },
    })
  }

  const startSelectedTutorials = () => {
    const ordered = replayableTutorials.filter((t) => selectedTourIds.has(t.id))
    if (ordered.length === 0) {
      toast.error("Seleziona almeno un tutorial")
      return
    }
    const [first, ...rest] = ordered.map((t) => ({
      kind: t.kind,
      id: t.id,
      path: t.path,
    }))
    writeReplayQueue(rest)
    navigate(first.path, { state: { lmTour: buildLmTourState(first) } })
  }

  if (!userData) {
    return (
      <div
        className={`${PAGE_SCROLL_SHELL} flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4`}
      >
        <p className="text-blue-300">Caricamento profilo…</p>
      </div>
    )
  }

  const fullName = [userData.name, userData.surname].filter(Boolean).join(" ") || "Utente"
  const roleLabel = translateUserType(userData.user_type, userData.sub_role) || "Utente"
  const townHalls = getTownHallNames(userData.town_halls_list)
  const orgAddress = formatOrgAddress(org?.address)

  return (
    <div
      className={`${PAGE_SCROLL_SHELL} bg-gradient-to-br from-black via-blue-950 to-black p-4 py-6 sm:p-6 sm:py-8`}
    >
      <div className="mx-auto w-full max-w-2xl space-y-5 sm:space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-start justify-between gap-3"
        >
          <div className="min-w-0 flex items-center gap-3">
            <UserCircle className="h-7 w-7 text-blue-400 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white truncate">Profilo</h1>
              <p className="text-sm text-blue-300/80 mt-0.5">Le tue informazioni account</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <BackNavigationButton className="cursor-pointer inline-flex items-center justify-center min-h-11 min-w-11 p-2 rounded-full bg-blue-500/10 hover:bg-blue-500/20 transition-colors duration-200" />
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
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          aria-label="Identità"
          className={glassCard}
        >
          <div className="flex items-center gap-4">
            <div
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-blue-900/40 border border-blue-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,149,255,0.2)] shrink-0"
              aria-hidden="true"
            >
              <span className="text-xl sm:text-2xl font-semibold text-blue-200">
                {getInitials(userData.name, userData.surname)}
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-semibold text-white break-words">{fullName}</h2>
              <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs sm:text-sm bg-blue-900/30 text-blue-300 border-blue-500/30">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {roleLabel}
              </span>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          aria-label="Informazioni account"
          className={glassCard}
        >
          <h3 className="text-base sm:text-lg font-semibold text-blue-400 mb-4">Account</h3>
          <dl className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 mt-1 text-blue-400 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-xs text-blue-300/70">Email</dt>
                <dd className="text-sm sm:text-base text-white break-all">{userData.email || "—"}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              {userData.is_approved ? (
                <ShieldCheck className="h-4 w-4 mt-1 text-emerald-400 shrink-0" aria-hidden="true" />
              ) : (
                <ShieldAlert className="h-4 w-4 mt-1 text-amber-400 shrink-0" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <dt className="text-xs text-blue-300/70">Stato approvazione</dt>
                <dd className="text-sm sm:text-base text-white">
                  {userData.is_approved ? "Account approvato" : "In attesa di approvazione"}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 mt-1 text-blue-400 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <dt className="text-xs text-blue-300/70">Comuni assegnati</dt>
                <dd className="mt-1.5">
                  {townHalls.length > 0 ? (
                    <ul className="flex flex-wrap gap-2">
                      {townHalls.map((name) => (
                        <li
                          key={name}
                          className="px-2.5 py-1 rounded-md text-xs sm:text-sm bg-blue-900/30 border border-blue-500/20 text-blue-100"
                        >
                          {name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">Nessun comune assegnato</p>
                  )}
                </dd>
              </div>
            </div>
          </dl>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          aria-label="Organizzazione"
          className={glassCard}
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-blue-400 flex items-center gap-2">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              Organizzazione
            </h3>
          </div>

          {!userData.id_organization ? (
            <p className="text-sm text-gray-400">Nessuna organizzazione associata al tuo account.</p>
          ) : orgLoading ? (
            <div className="flex items-center gap-2 text-blue-300 text-sm py-2">
              <Building2 className="h-4 w-4 animate-pulse" aria-hidden="true" />
              Caricamento…
            </div>
          ) : orgError || !org ? (
            <div className="space-y-3">
              <p className="text-sm text-red-300">{orgError || "Dati non disponibili"}</p>
              <button
                type="button"
                onClick={fetchOrganization}
                className="cursor-pointer px-4 py-2 min-h-11 rounded-lg bg-blue-900/40 text-blue-300 border border-blue-500/30 hover:bg-blue-900/60 transition-colors duration-200"
              >
                Riprova
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 sm:gap-4">
                {org.logo && typeof org.logo === "string" ? (
                  <img
                    src={org.logo}
                    alt={`Logo ${org.name}`}
                    className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg object-cover border border-blue-500/30 shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg bg-blue-900/30 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <Building2 className="h-6 w-6 text-blue-400" aria-hidden="true" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-white break-words">{org.name}</p>
                  <span
                    className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs ${getTypeColor(org.type)}`}
                  >
                    <Tag className="h-3 w-3" aria-hidden="true" />
                    {getTypeLabel(org.type)}
                  </span>
                  {orgAddress && (
                    <p className="mt-2 text-sm text-gray-300 break-words flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 text-blue-400 shrink-0" aria-hidden="true" />
                      {orgAddress}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/my-organization")}
                className={`${helpButtonClass} justify-between`}
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-blue-400" aria-hidden="true" />
                  Vedi dettagli
                </span>
              </button>
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.18 }}
          aria-label="Tutorial e novità"
          className={glassCard}
        >
          <h3 className="text-base sm:text-lg font-semibold text-blue-400 mb-2 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            Tutorial e novità
          </h3>
          <p className="text-sm text-blue-200/75 mb-4">
            Rivedi la guida della mappa o delle pagine operative. Puoi selezionare più tutorial:
            verranno avviati in sequenza.
          </p>

          <button
            type="button"
            onClick={startWhatsNew}
            className={`${helpButtonClass} mb-4`}
          >
            <Megaphone className="h-4 w-4 text-blue-400 shrink-0" aria-hidden="true" />
            <span>
              <span className="block font-medium">Novità</span>
              <span className="block text-xs text-blue-300/70 mt-0.5">
                Vai alla Dashboard e apri il riepilogo aggiornamenti
              </span>
            </span>
          </button>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium uppercase tracking-wide text-blue-300/80 mb-2">
              Scegli i tutorial da ripetere
            </legend>
            {replayableTutorials.map((tour) => {
              const checked = selectedTourIds.has(tour.id)
              return (
                <label
                  key={tour.id}
                  className={`flex items-start gap-3 min-h-11 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    checked
                      ? "bg-blue-900/40 border-blue-400/40"
                      : "bg-blue-900/15 border-blue-500/20 hover:bg-blue-900/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-blue-500/50 bg-black/40 text-blue-500 focus:ring-blue-400"
                    checked={checked}
                    onChange={() => toggleTour(tour.id)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-white">{tour.label}</span>
                    {tour.description ? (
                      <span className="block text-xs text-blue-300/70 mt-0.5">{tour.description}</span>
                    ) : null}
                  </span>
                </label>
              )
            })}
          </fieldset>

          <button
            type="button"
            onClick={startSelectedTutorials}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Avvia tutorial selezionati
          </button>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.2 }}
          aria-label="Aiuto"
          className={glassCard}
        >
          <h3 className="text-base sm:text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
            <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            Help
          </h3>
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => navigate("/manual")}
              className={helpButtonClass}
            >
              <BookOpen className="h-4 w-4 text-blue-400 shrink-0" aria-hidden="true" />
              <span>
                <span className="block font-medium">Manuale operativo</span>
                <span className="block text-xs text-blue-300/70 mt-0.5">
                  Guide e istruzioni d&apos;uso
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() =>
                window.open(ILLUMINAZIONE_PUBBLICA_URL, "_blank", "noopener,noreferrer")
              }
              className={helpButtonClass}
            >
              <Info className="h-4 w-4 text-blue-400 shrink-0" aria-hidden="true" />
              <span>
                <span className="block font-medium">Scopri di più</span>
                <span className="block text-xs text-blue-300/70 mt-0.5">
                  Illuminazione pubblica — Studio Torelli
                </span>
              </span>
            </button>
            <a href={SECURITY_MAILTO} className={helpButtonClass}>
              <Mail className="h-4 w-4 text-blue-400 shrink-0" aria-hidden="true" />
              <span>
                <span className="block font-medium">Scrivi a sicurezza</span>
                <span className="block text-xs text-blue-300/70 mt-0.5 break-all">
                  {SECURITY_EMAIL}
                </span>
              </span>
            </a>
          </div>
        </motion.section>
      </div>
    </div>
  )
}

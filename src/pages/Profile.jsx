"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
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
  Shield,
  Cookie,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import { useUser } from "../context/UserContext"
import { BackNavigationButton } from "../components/BackNavigationButton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ChartSection } from "@/components/infoPanel/DistributionChart"
import { cn } from "@/lib/utils"
import { PAGE_SCROLL_SHELL } from "../utils/pageScrollShell"
import { translateUserType } from "../utils/utils"
import { getReplayableTutorials } from "../data/pageTours"
import { buildLmTourState, clearReplayQueue, writeReplayQueue } from "../utils/tourReplayQueue"

const ILLUMINAZIONE_PUBBLICA_URL =
  "https://www.torellistudio.com/studio/category/illuminazione-pubblica/"

const SECURITY_EMAIL = "sicurezza@torellistudio.com"
const SECURITY_MAILTO = `mailto:${SECURITY_EMAIL}?subject=${encodeURIComponent("Supporto LightingMap")}`

const actionRowClass =
  "flex w-full min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border/50 bg-secondary/20 px-4 py-3 text-left text-foreground transition-colors hover:bg-secondary/40"

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

function ProfilePageSkeleton() {
  return (
    <div
      className={`${PAGE_SCROLL_SHELL} flex items-start justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4 py-6 sm:py-8`}
      aria-busy="true"
      aria-label="Caricamento profilo"
    >
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <ChartSection className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-52" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-11 w-11 rounded-full" />
              <Skeleton className="h-11 w-11 rounded-full" />
            </div>
          </div>
        </ChartSection>
        <ChartSection className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 shrink-0 rounded-full sm:h-20 sm:w-20" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>
          </div>
        </ChartSection>
        <ChartSection className="space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </ChartSection>
        <ChartSection className="space-y-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </ChartSection>
      </div>
    </div>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
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
    return <ProfilePageSkeleton />
  }

  const fullName = [userData.name, userData.surname].filter(Boolean).join(" ") || "Utente"
  const roleLabel = translateUserType(userData.user_type, userData.sub_role) || "Utente"
  const townHalls = getTownHallNames(userData.town_halls_list)
  const orgAddress = formatOrgAddress(org?.address)

  return (
    <div
      className={`${PAGE_SCROLL_SHELL} bg-gradient-to-br from-black via-blue-950 to-black p-4 py-6 sm:p-6 sm:py-8`}
    >
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-start justify-between gap-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <UserCircle className="h-7 w-7 shrink-0 text-blue-400" aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-foreground">Profilo</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">Le tue informazioni account</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <BackNavigationButton />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11 rounded-full bg-primary/10 hover:bg-primary/20"
              onClick={() => navigate("/dashboard")}
              aria-label="Torna alla mappa"
              title="Torna alla mappa"
            >
              <Home className="h-5 w-5 text-blue-400" aria-hidden="true" />
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          aria-label="Identità"
        >
          <ChartSection className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border/60 bg-secondary/40 sm:h-20 sm:w-20"
                aria-hidden="true"
              >
                <span className="text-xl font-semibold text-foreground sm:text-2xl">
                  {getInitials(userData.name, userData.surname)}
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="break-words text-xl font-semibold text-foreground sm:text-2xl">
                  {fullName}
                </h2>
                <Badge variant="secondary" className="mt-2 gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {roleLabel}
                </Badge>
              </div>
            </div>
          </ChartSection>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          aria-label="Informazioni account"
        >
          <ChartSection className="space-y-4">
            <h3 className="text-base font-semibold text-foreground sm:text-lg">Account</h3>
            <dl className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-1 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd className="break-all text-sm text-foreground sm:text-base">
                    {userData.email || "—"}
                  </dd>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                {userData.is_approved ? (
                  <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                ) : (
                  <ShieldAlert className="mt-1 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                )}
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">Stato approvazione</dt>
                  <dd className="text-sm text-foreground sm:text-base">
                    {userData.is_approved ? "Account approvato" : "In attesa di approvazione"}
                  </dd>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <dt className="text-xs text-muted-foreground">Comuni assegnati</dt>
                  <dd className="mt-1.5">
                    {townHalls.length > 0 ? (
                      <ul className="flex flex-wrap gap-2">
                        {townHalls.map((name) => (
                          <li key={name}>
                            <Badge variant="outline">{name}</Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nessun comune assegnato</p>
                    )}
                  </dd>
                </div>
              </div>
            </dl>
          </ChartSection>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          aria-label="Organizzazione"
        >
          <ChartSection className="space-y-4">
            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground sm:text-lg">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              Organizzazione
            </h3>

            {!userData.id_organization ? (
              <p className="text-sm text-muted-foreground">
                Nessuna organizzazione associata al tuo account.
              </p>
            ) : orgLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4 animate-pulse" aria-hidden="true" />
                Caricamento…
              </div>
            ) : orgError || !org ? (
              <div className="space-y-3">
                <p className="text-sm text-red-300">{orgError || "Dati non disponibili"}</p>
                <Button type="button" variant="outline" onClick={fetchOrganization}>
                  Riprova
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  {org.logo && typeof org.logo === "string" ? (
                    <img
                      src={org.logo}
                      alt={`Logo ${org.name}`}
                      className="h-12 w-12 shrink-0 rounded-lg border border-border/60 object-cover sm:h-14 sm:w-14"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-secondary/40 sm:h-14 sm:w-14">
                      <Building2 className="h-6 w-6 text-blue-400" aria-hidden="true" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-lg font-semibold text-foreground">{org.name}</p>
                    <Badge
                      variant="outline"
                      className={cn("mt-2 gap-1.5", getTypeColor(org.type))}
                    >
                      <Tag className="h-3 w-3" aria-hidden="true" />
                      {getTypeLabel(org.type)}
                    </Badge>
                    {orgAddress && (
                      <p className="mt-2 flex items-start gap-1.5 break-words text-sm text-muted-foreground">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" aria-hidden="true" />
                        {orgAddress}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => navigate("/my-organization")}
                  className="w-full gap-2"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Vedi dettagli
                </Button>
              </div>
            )}
          </ChartSection>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.18 }}
          aria-label="Tutorial e novità"
        >
          <ChartSection className="space-y-4">
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-foreground sm:text-lg">
                <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                Tutorial e novità
              </h3>
              <p className="text-sm text-muted-foreground">
                Rivedi la guida della mappa o delle pagine operative. Puoi selezionare più tutorial:
                verranno avviati in sequenza.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={startWhatsNew}
              className={cn(actionRowClass, "h-auto justify-start whitespace-normal")}
            >
              <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
              <span>
                <span className="block font-medium">Novità</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Vai alla Dashboard e apri il riepilogo aggiornamenti
                </span>
              </span>
            </Button>

            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Scegli i tutorial da ripetere
              </legend>
              {replayableTutorials.map((tour) => {
                const checked = selectedTourIds.has(tour.id)
                return (
                  <label
                    key={tour.id}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                      checked
                        ? "border-blue-400/60 bg-blue-950/35"
                        : "border-border/50 bg-secondary/20 hover:bg-secondary/40",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-border bg-background text-primary focus:ring-ring"
                      checked={checked}
                      onChange={() => toggleTour(tour.id)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{tour.label}</span>
                      {tour.description ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {tour.description}
                        </span>
                      ) : null}
                    </span>
                  </label>
                )
              })}
            </fieldset>

            <Button type="button" onClick={startSelectedTutorials} className="w-full gap-2">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Avvia tutorial selezionati
            </Button>
          </ChartSection>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.2 }}
          aria-label="Aiuto"
        >
          <ChartSection className="space-y-4">
            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground sm:text-lg">
              <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              Help
            </h3>
            <div className="space-y-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/manual")}
                className={cn(actionRowClass, "h-auto justify-start whitespace-normal")}
              >
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                <span>
                  <span className="block font-medium">Manuale operativo</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Guide e istruzioni d&apos;uso
                  </span>
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/privacy")}
                className={cn(actionRowClass, "h-auto justify-start whitespace-normal")}
              >
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                <span>
                  <span className="block font-medium">Informativa privacy</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Trattamento dei dati personali
                  </span>
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/cookie")}
                className={cn(actionRowClass, "h-auto justify-start whitespace-normal")}
              >
                <Cookie className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                <span>
                  <span className="block font-medium">Cookie policy</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Cookie e memorizzazione locale
                  </span>
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  window.open(ILLUMINAZIONE_PUBBLICA_URL, "_blank", "noopener,noreferrer")
                }
                className={cn(actionRowClass, "h-auto justify-start whitespace-normal")}
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                <span>
                  <span className="block font-medium">Scopri di più</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Illuminazione pubblica — Studio Torelli
                  </span>
                </span>
              </Button>
              <a href={SECURITY_MAILTO} className={cn(actionRowClass)}>
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                <span>
                  <span className="block font-medium">Scrivi a sicurezza</span>
                  <span className="mt-0.5 block break-all text-xs text-muted-foreground">
                    {SECURITY_EMAIL}
                  </span>
                </span>
              </a>
            </div>
          </ChartSection>
        </motion.div>
      </div>
    </div>
  )
}

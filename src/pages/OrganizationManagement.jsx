"use client"

import { useState, useEffect, useContext, useCallback } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  Building2,
  Users,
  MapPin,
  Mail,
  User,
  Euro,
  ExternalLink,
  FileText,
  Wrench,
  AlertTriangle,
  CalendarDays,
  Home,
} from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { BackNavigationButton } from "../components/BackNavigationButton"
import { UserContext, api } from "../context/UserContext"
import { toast } from "react-hot-toast"
import MembersModal from "../components/MembersModal"
import { CapitolatoValidityChip } from "../components/ui/CapitolatoValidityChip"
import InfoTooltip from "../components/ui/InfoTooltip"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartSection } from "@/components/infoPanel/DistributionChart"
import { PAGE_SCROLL_SHELL } from "../utils/pageScrollShell"

const INFO_TEXT =
  "Elenco delle imprese di manutenzione collegate al capitolato attivo del comune, con i relativi budget per ordinaria e straordinaria."

const formatCurrency = (value) => {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return "—"
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatDate = (dateString) => {
  if (!dateString) return "—"
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("it-IT", { year: "numeric", month: "long", day: "numeric" })
}

const formatAddress = (address) => {
  if (!address) return "Indirizzo non disponibile"
  const parts = [
    address.street,
    [address.postal_code, address.city].filter(Boolean).join(" "),
    address.province,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : "Indirizzo non disponibile"
}

const memberKey = (member, index) =>
  member?.id || member?._id || member?.email || `member-${index}`

function OrganizationManagementSkeleton() {
  return (
    <div
      className={`${PAGE_SCROLL_SHELL} bg-gradient-to-br from-black via-blue-950 to-black`}
      aria-busy="true"
      aria-label="Caricamento organizzazioni"
    >
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/40 backdrop-blur">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4 sm:px-6">
          <Skeleton className="h-11 w-11 rounded-full" />
          <Skeleton className="h-11 w-11 rounded-full" />
          <Skeleton className="h-6 w-56" />
        </div>
      </header>
      <main className="container mx-auto space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <Skeleton className="h-4 w-full max-w-3xl" />
        <Skeleton className="h-4 w-2/3 max-w-xl" />
        {Array.from({ length: 2 }).map((_, i) => (
          <ChartSection key={i} className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-16 w-16 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full max-w-md" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          </ChartSection>
        ))}
      </main>
    </div>
  )
}

const OrganizationCard = ({ org, openMembersModal, index = 0, reduceMotion }) => {
  const members = Array.isArray(org.members) ? org.members : []
  const capitolato = org.capitolato
  const validity = capitolato?.validity

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.24), duration: 0.22 }}
    >
      <ChartSection className="space-y-0">
        <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {org.logo ? (
                <img
                  src={org.logo}
                  alt={`Logo ${org.name}`}
                  className="h-14 w-14 rounded-lg border border-border object-cover sm:h-16 sm:w-16"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-secondary/30 sm:h-16 sm:w-16">
                  <Building2 className="h-7 w-7 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h2 className="break-words text-lg font-semibold text-foreground sm:text-xl">
                    {org.name}
                  </h2>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  >
                    Manutentore
                  </Badge>
                  <CapitolatoValidityChip validity={validity} />
                </div>
                {org.description ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {org.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground/70">Nessuna descrizione</p>
                )}
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Sede</span>
              </div>
              <p className="text-sm text-muted-foreground">{formatAddress(org.address)}</p>
            </div>

            <div>
              <Button
                type="button"
                variant="link"
                className="mb-2 h-auto gap-2 px-0 text-sm font-medium text-primary"
                onClick={() => openMembersModal(members)}
              >
                <Users className="h-4 w-4" />
                Membri ({members.length})
                {members.length > 0 ? <ExternalLink className="h-3 w-3" /> : null}
              </Button>

              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun membro associato.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {members.slice(0, 4).map((member, memberIndex) => (
                    <div
                      key={memberKey(member, memberIndex)}
                      className="rounded-lg border border-border/60 bg-secondary/20 p-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border bg-secondary/40">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium text-foreground">
                            {[member.name, member.surname].filter(Boolean).join(" ") || "Utente"}
                          </div>
                          {member.email ? (
                            <div className="mt-0.5 flex items-center gap-1">
                              <Mail className="h-2.5 w-2.5 flex-shrink-0 text-muted-foreground" />
                              <span className="truncate text-xs text-muted-foreground">
                                {member.email}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                  {members.length > 4 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex h-auto items-center justify-center rounded-lg border border-border/40 bg-secondary/10 p-2.5"
                      onClick={() => openMembersModal(members)}
                    >
                      <span className="text-xs text-muted-foreground">
                        +{members.length - 4} altri
                      </span>
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-3">
            <div className="space-y-3 rounded-xl border border-border/50 bg-secondary/20 p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <h3 className="text-sm font-semibold text-foreground">Capitolato</h3>
              </div>

              {capitolato ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Versione</span>
                    <p className="font-medium text-foreground">{capitolato.version || "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Validità</span>
                    <div className="mt-1 space-y-1.5 text-foreground">
                      <p className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        <span className="w-10 text-xs text-muted-foreground">Dal</span>
                        <span>{formatDate(capitolato.validFrom)}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        <span className="w-10 text-xs text-muted-foreground">Al</span>
                        <span>
                          {capitolato.validTo ? formatDate(capitolato.validTo) : "senza scadenza"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="flex items-start gap-2 text-sm text-amber-200/90">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  Nessun capitolato attivo sul comune. L&apos;associazione potrebbe essere legacy.
                </p>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4">
              <div className="flex items-center gap-2 text-emerald-300">
                <Wrench className="h-4 w-4" />
                <h3 className="text-sm font-semibold text-foreground">Budget manutenzione</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Ordinaria</span>
                  <p className="flex items-center gap-1 font-semibold text-foreground">
                    <Euro className="h-3.5 w-3.5 text-emerald-400" />
                    {formatCurrency(org.budgetOrdinary)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Straordinaria</span>
                  <p className="flex items-center gap-1 font-semibold text-foreground">
                    <Euro className="h-3.5 w-3.5 text-violet-400" />
                    {formatCurrency(org.budgetExtraordinary)}
                  </p>
                </div>
                {org.bindingNotes ? (
                  <div>
                    <span className="text-xs text-muted-foreground">Note</span>
                    <p className="break-words text-sm text-muted-foreground">{org.bindingNotes}</p>
                  </div>
                ) : null}
                {org.responsible ? (
                  <div>
                    <span className="text-xs text-muted-foreground">Responsabile</span>
                    <p className="break-words text-sm text-foreground">
                      {typeof org.responsible === "string"
                        ? org.responsible
                        : [org.responsible?.name, org.responsible?.surname]
                            .filter(Boolean)
                            .join(" ") || "Non assegnato"}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </ChartSection>
    </motion.div>
  )
}

function OrganizationManagement() {
  const [isLoading, setIsLoading] = useState(true)
  const [organizations, setOrganizations] = useState([])
  const [selectedOrgMembers, setSelectedOrgMembers] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const selectedCity = location.state?.townhallId || null
  const { loadSelectedTownhalls } = useContext(UserContext)
  const reduceMotion = useReducedMotion()

  const fetchOrganizations = useCallback(async () => {
    setIsLoading(true)
    try {
      // selectedCity da Header è il NOME del comune, non l'ObjectId Mongo.
      const townhallRes = await loadSelectedTownhalls(selectedCity)
      const townhallId = townhallRes?.data?._id
      if (!townhallId) {
        throw new Error("Comune non selezionato")
      }

      const response = await api.get(`/organizations/townhall/${townhallId}`)
      if (response.status === 200 && Array.isArray(response.data)) {
        setOrganizations(response.data)
      } else {
        setOrganizations([])
      }
    } catch (err) {
      console.error("Failed to fetch organizations:", err)
      toast.error("Errore nel caricamento delle organizzazioni.")
      setOrganizations([])
    } finally {
      setIsLoading(false)
    }
  }, [loadSelectedTownhalls, selectedCity])

  useEffect(() => {
    document.title = "Gestione Organizzazioni - Lighting Map"
    fetchOrganizations()
  }, [fetchOrganizations])

  const openMembersModal = (members) => {
    setSelectedOrgMembers(members)
  }

  const closeMembersModal = () => {
    setSelectedOrgMembers(null)
  }

  if (isLoading) {
    return <OrganizationManagementSkeleton />
  }

  return (
    <div className={`${PAGE_SCROLL_SHELL} bg-gradient-to-br from-black via-blue-950 to-black`}>
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/40 backdrop-blur">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4 sm:px-6">
          <BackNavigationButton
            fallbackPath="/dashboard"
            onClick={() => navigate("/dashboard")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11 rounded-full"
            onClick={() => navigate("/dashboard")}
            aria-label="Torna alla dashboard"
            title="Torna alla dashboard"
          >
            <Home className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            <Building2 className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <h1 className="truncate text-lg font-semibold text-foreground sm:text-xl">
              Gestione Organizzazioni
            </h1>
            <InfoTooltip text={INFO_TEXT} />
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          Organizzazioni di manutenzione collegate al capitolato del comune, con budget
          ordinario e straordinario.
        </p>

        {organizations.length > 0 ? (
          <div className="grid gap-4 sm:gap-5">
            {organizations.map((org, index) => (
              <OrganizationCard
                key={org.id || org._id}
                org={org}
                openMembersModal={openMembersModal}
                index={index}
                reduceMotion={reduceMotion}
              />
            ))}
          </div>
        ) : (
          <ChartSection className="text-center">
            <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
            <h2 className="mb-1 text-lg font-medium text-foreground">
              Nessuna organizzazione collegata
            </h2>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Associa le imprese manutentrici al capitolato del comune dalla piattaforma
              admin (Parametri capitolato), impostando i budget di manutenzione.
            </p>
          </ChartSection>
        )}
      </main>

      {selectedOrgMembers ? (
        <MembersModal members={selectedOrgMembers} onClose={closeMembersModal} />
      ) : null}
    </div>
  )
}

export default OrganizationManagement

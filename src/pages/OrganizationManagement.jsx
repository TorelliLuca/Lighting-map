"use client"

import { useState, useEffect, useContext, useCallback } from "react"
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
} from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { LightbulbLoader } from "../components/lightbulb-loader"
import { BackNavigationButton } from "../components/BackNavigationButton"
import { UserContext, api } from "../context/UserContext"
import { toast } from "react-hot-toast"
import MembersModal from "../components/MembersModal"
import { CapitolatoValidityChip } from "../components/ui/CapitolatoValidityChip"
import InfoTooltip from "../components/ui/InfoTooltip"
import { PAGE_SCROLL_SHELL } from "../utils/pageScrollShell"

const glassCard =
  "bg-black/30 backdrop-blur-md border border-blue-500/20 rounded-xl p-4 sm:p-6 shadow-[0_0_20px_rgba(0,149,255,0.15)]"

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

const OrganizationCard = ({ org, openMembersModal }) => {
  const members = Array.isArray(org.members) ? org.members : []
  const capitolato = org.capitolato
  const validity = capitolato?.validity

  return (
    <article className={glassCard}>
      <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {org.logo ? (
              <img
                src={org.logo}
                alt={`Logo ${org.name}`}
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-lg object-cover border border-blue-500/30"
              />
            ) : (
              <div className="h-14 w-14 sm:h-16 sm:w-16 bg-blue-900/30 rounded-lg flex items-center justify-center border border-blue-500/30">
                <Building2 className="h-7 w-7 text-blue-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-lg sm:text-xl font-semibold text-white break-words">
                  {org.name}
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium bg-emerald-900/20 text-emerald-300 border-emerald-500/30">
                  Manutentore
                </span>
                <CapitolatoValidityChip validity={validity} />
              </div>
              {org.description ? (
                <p className="text-sm text-gray-300 leading-relaxed">{org.description}</p>
              ) : (
                <p className="text-sm text-gray-500">Nessuna descrizione</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-300">Sede</span>
            </div>
            <p className="text-sm text-gray-300">{formatAddress(org.address)}</p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => openMembersModal(members)}
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-300 hover:text-blue-200 transition-colors cursor-pointer mb-2"
            >
              <Users className="h-4 w-4" />
              Membri ({members.length})
              {members.length > 0 ? <ExternalLink className="h-3 w-3" /> : null}
            </button>

            {members.length === 0 ? (
              <p className="text-sm text-gray-500">Nessun membro associato.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {members.slice(0, 4).map((member, index) => (
                  <div
                    key={memberKey(member, index)}
                    className="bg-blue-900/20 p-2.5 rounded-lg border border-blue-500/20"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 bg-blue-900/40 rounded-full flex items-center justify-center border border-blue-500/30 flex-shrink-0">
                        <User className="h-3.5 w-3.5 text-blue-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-white text-xs font-medium truncate">
                          {[member.name, member.surname].filter(Boolean).join(" ") || "Utente"}
                        </div>
                        {member.email ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Mail className="h-2.5 w-2.5 text-blue-400 flex-shrink-0" />
                            <span className="text-xs text-gray-400 truncate">{member.email}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
                {members.length > 4 ? (
                  <button
                    type="button"
                    onClick={() => openMembersModal(members)}
                    className="bg-blue-900/10 p-2.5 rounded-lg border border-blue-500/10 flex items-center justify-center hover:bg-blue-800/20 transition-colors cursor-pointer"
                  >
                    <span className="text-xs text-blue-400">+{members.length - 4} altri</span>
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-blue-500/20 bg-black/20 p-4 space-y-3">
            <div className="flex items-center gap-2 text-blue-300">
              <FileText className="h-4 w-4" />
              <h3 className="text-sm font-semibold text-white">Capitolato</h3>
            </div>

            {capitolato ? (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-xs text-gray-400">Versione</span>
                  <p className="text-white font-medium">{capitolato.version || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Validità</span>
                  <div className="mt-1 space-y-1.5 text-white">
                    <p className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                      <span className="text-xs text-gray-400 w-10">Dal</span>
                      <span>{formatDate(capitolato.validFrom)}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                      <span className="text-xs text-gray-400 w-10">Al</span>
                      <span>
                        {capitolato.validTo ? formatDate(capitolato.validTo) : "senza scadenza"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-amber-200/90 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                Nessun capitolato attivo sul comune. L&apos;associazione potrebbe essere legacy.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-300">
              <Wrench className="h-4 w-4" />
              <h3 className="text-sm font-semibold text-white">Budget manutenzione</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-xs text-gray-400">Ordinaria</span>
                <p className="text-white font-semibold flex items-center gap-1">
                  <Euro className="h-3.5 w-3.5 text-emerald-400" />
                  {formatCurrency(org.budgetOrdinary)}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Straordinaria</span>
                <p className="text-white font-semibold flex items-center gap-1">
                  <Euro className="h-3.5 w-3.5 text-violet-400" />
                  {formatCurrency(org.budgetExtraordinary)}
                </p>
              </div>
              {org.bindingNotes ? (
                <div>
                  <span className="text-xs text-gray-400">Note</span>
                  <p className="text-gray-300 text-sm break-words">{org.bindingNotes}</p>
                </div>
              ) : null}
              {org.responsible ? (
                <div>
                  <span className="text-xs text-gray-400">Responsabile</span>
                  <p className="text-white text-sm break-words">
                    {typeof org.responsible === "string"
                      ? org.responsible
                      : [org.responsible?.name, org.responsible?.surname].filter(Boolean).join(" ")
                        || "Non assegnato"}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </article>
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
    return (
      <div className="min-h-dvh w-full flex items-center justify-center bg-black/40 backdrop-blur-xl">
        <LightbulbLoader size={46} />
      </div>
    )
  }

  return (
    <div className={`${PAGE_SCROLL_SHELL} bg-black/40 backdrop-blur-xl`}>
      <header className="sticky top-0 z-20 bg-black/50 backdrop-blur-xl border-b border-blue-500/20">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <BackNavigationButton
            fallbackPath="/dashboard"
            onClick={() => navigate("/dashboard")}
          />
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-5 w-5 text-blue-400 flex-shrink-0" />
            <h1 className="text-lg sm:text-xl font-semibold text-white truncate">
              Gestione Organizzazioni
            </h1>
            <InfoTooltip text={INFO_TEXT} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        <p className="text-gray-300 text-sm sm:text-base max-w-3xl">
          Organizzazioni di manutenzione collegate al capitolato del comune, con budget
          ordinario e straordinario.
        </p>

        {organizations.length > 0 ? (
          <div className="grid gap-4 sm:gap-5">
            {organizations.map((org) => (
              <OrganizationCard
                key={org.id || org._id}
                org={org}
                openMembersModal={openMembersModal}
              />
            ))}
          </div>
        ) : (
          <div className={`${glassCard} text-center text-gray-400`}>
            <Building2 className="h-8 w-8 text-blue-400/60 mx-auto mb-3" />
            <h2 className="text-lg font-medium text-white mb-1">
              Nessuna organizzazione collegata
            </h2>
            <p className="text-sm max-w-md mx-auto">
              Associa le imprese manutentrici al capitolato del comune dalla piattaforma
              admin (Parametri capitolato), impostando i budget di manutenzione.
            </p>
          </div>
        )}
      </main>

      {selectedOrgMembers ? (
        <MembersModal members={selectedOrgMembers} onClose={closeMembersModal} />
      ) : null}
    </div>
  )
}

export default OrganizationManagement

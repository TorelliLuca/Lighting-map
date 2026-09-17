"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import {
  AlertCircle,
  Building2,
  MapPin,
  Calendar,
  Users,
  User,
  Clock,
  Tag,
  Mail,
  Home,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useUser } from "../context/UserContext"
import toast from "react-hot-toast"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import MembersModal from "../components/MembersModal"
import { BackNavigationButton } from "../components/BackNavigationButton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartSection } from "@/components/infoPanel/DistributionChart"
import { PAGE_SCROLL_SHELL } from "../utils/pageScrollShell"

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API
const MAPTILER_STYLE = `https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_KEY}`

function MyOrganizationPageSkeleton() {
  return (
    <div
      className={`${PAGE_SCROLL_SHELL} flex items-start justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4 py-6 sm:py-8`}
      aria-busy="true"
      aria-label="Caricamento organizzazione"
    >
      <div className="w-full max-w-6xl space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-11 w-11 rounded-full" />
            <Skeleton className="h-11 w-11 rounded-full" />
          </div>
        </div>
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          <ChartSection className="space-y-4 lg:col-span-2">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl sm:h-64" />
            <Skeleton className="h-4 w-64" />
          </ChartSection>
          <div className="space-y-4 sm:space-y-6">
            <ChartSection className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </ChartSection>
            <ChartSection className="space-y-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </ChartSection>
            <ChartSection className="space-y-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </ChartSection>
          </div>
        </div>
      </div>
    </div>
  )
}

function MyOrganization() {
  const [isLoading, setIsLoading] = useState(true)
  const [backendLoading, setBackendLoading] = useState(false)
  const [backendError, setBackendError] = useState(null)
  const [backendData, setBackendData] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const mapContainer = useRef(null)
  const map = useRef(null)
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const { userData, getOrganizationByUserId } = useUser()

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300)
    return () => clearTimeout(timer)
  }, [])

  const fetchOrganizationDetails = async () => {
    if (!userData) return
    setBackendLoading(true)
    setBackendError(null)
    try {
      const response = await getOrganizationByUserId(userData.id_organization)
      if (response && response.data) {
        setBackendData(response.data)
      }
    } catch (error) {
      setBackendError(error.message || "Errore sconosciuto")
      toast.error(`Errore: ${error.message}` || "Errore sconosciuto")
    } finally {
      setBackendLoading(false)
    }
  }

  useEffect(() => {
    if (userData) {
      fetchOrganizationDetails()
    }
  }, [userData])

  useEffect(() => {
    if (!backendData?.location || !mapContainer.current) {
      return
    }

    if (map.current) {
      map.current.remove()
    }

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAPTILER_STYLE,
      center: [backendData.location.coordinates[0], backendData.location.coordinates[1]],
      zoom: 15,
      attributionControl: false,
    })

    new maplibregl.Marker({
      color: "#3b82f6",
    })
      .setLngLat([backendData.location.coordinates[0], backendData.location.coordinates[1]])
      .addTo(map.current)

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [backendData])

  const handleRetry = () => {
    fetchOrganizationDetails()
  }

  const formatDate = (date) => {
    if (!date) return ""
    return new Date(date).toLocaleDateString("it-IT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case "TOWNHALL":
        return "Comune"
      case "ENTERPRISE":
        return "Impresa"
      default:
        return ""
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case "TOWNHALL":
        return "bg-green-900/20 text-green-400 border-green-500/30"
      case "ENTERPRISE":
        return "bg-blue-900/20 text-blue-400 border-blue-500/30"
      default:
        return "bg-gray-900/20 text-gray-400 border-gray-500/30"
    }
  }

  const openMembersModal = () => {
    setIsModalOpen(true)
  }

  const closeMembersModal = () => {
    setIsModalOpen(false)
  }

  if (isLoading || backendLoading) {
    return <MyOrganizationPageSkeleton />
  }

  if (backendError || !backendData) {
    return (
      <div
        className={`${PAGE_SCROLL_SHELL} flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4`}
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <ChartSection className="space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-500/30 bg-red-500/15">
              <AlertCircle className="h-8 w-8 text-red-400" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Errore di caricamento</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {backendError || "Dati non disponibili"}
              </p>
            </div>
            <Button type="button" className="min-h-11 w-full" onClick={handleRetry}>
              Riprova
            </Button>
          </ChartSection>
        </motion.div>
      </div>
    )
  }

  const org = backendData

  return (
    <div className={`${PAGE_SCROLL_SHELL} bg-gradient-to-br from-black via-blue-950 to-black p-4 sm:p-6`}>
      <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-start justify-between gap-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Building2 className="h-6 w-6 shrink-0 text-blue-400" aria-hidden="true" />
            <h1 className="truncate text-2xl font-bold text-foreground">Dettagli organizzazione</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <BackNavigationButton />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11 rounded-full bg-primary/10 hover:bg-primary/20"
              onClick={() => navigate("/dashboard")}
              aria-label="Torna alla dashboard"
              title="Torna alla dashboard"
            >
              <Home className="h-5 w-5 text-blue-400" aria-hidden="true" />
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="grid gap-4 sm:gap-6 lg:grid-cols-3"
        >
          <ChartSection className="space-y-6 lg:col-span-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {org.logo && typeof org.logo === "string" ? (
                <img
                  src={org.logo}
                  alt={`${org.name} logo`}
                  className="h-12 w-12 rounded-lg border border-border/50 object-cover sm:h-16 sm:w-16"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border/50 bg-muted/40 sm:h-16 sm:w-16">
                  <Building2 className="h-6 w-6 text-blue-400 sm:h-8 sm:w-8" aria-hidden="true" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="mb-2 break-words text-xl font-bold text-foreground sm:text-2xl lg:text-3xl">
                  {org.name}
                </h2>
                <Badge variant="outline" className={`gap-1.5 ${getTypeColor(org.type)}`}>
                  <Tag className="h-3 w-3" aria-hidden="true" />
                  {getTypeLabel(org.type)}
                </Badge>
              </div>
            </div>

            {org.description ? (
              <div>
                <h3 className="mb-2 text-base font-semibold text-foreground sm:text-lg">Descrizione</h3>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {org.description}
                </p>
              </div>
            ) : null}

            {org.location ? (
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground sm:text-lg">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                  Posizione
                </h3>

                {org.location.coordinates[0] && org.location.coordinates[1] ? (
                  <div className="mb-4 h-48 overflow-hidden rounded-xl border border-border/50 sm:h-64">
                    <div ref={mapContainer} className="h-full w-full" />
                  </div>
                ) : null}

                {org.address ? (
                  <p className="break-words text-sm font-medium text-foreground sm:text-base">
                    {org.address.street}, {org.address.city}, {org.address.province}
                  </p>
                ) : null}
              </div>
            ) : null}
          </ChartSection>

          <div className="space-y-4 sm:space-y-6">
            {Array.isArray(org.members) && org.members.length > 0 ? (
              <ChartSection className="space-y-4">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-blue-400 sm:h-5 sm:w-5" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-foreground sm:text-lg">
                    Membri ({org.members.length})
                  </h3>
                </div>

                <div className="scrollbar-app max-h-96 space-y-3 overflow-y-auto">
                  {org.members.slice(0, 4).map((member, index) => (
                    <motion.div
                      key={member.id || index}
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.05, 0.2), duration: 0.22 }}
                      className="rounded-lg border border-border/50 bg-muted/20 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted/40">
                          <User className="h-4 w-4 text-blue-400" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="break-words text-sm font-medium text-foreground">
                            {member.name} {member.surname}
                          </div>
                          {member.email ? (
                            <div className="mt-1 flex items-center gap-1">
                              <Mail className="h-3 w-3 shrink-0 text-blue-400" aria-hidden="true" />
                              <span className="break-all text-xs text-muted-foreground">
                                {member.email}
                              </span>
                            </div>
                          ) : null}
                          {member.role ? (
                            <div className="mt-1 text-xs text-muted-foreground">{member.role}</div>
                          ) : null}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full"
                  onClick={openMembersModal}
                >
                  Vedi tutti
                </Button>
              </ChartSection>
            ) : null}

            {org.responsible ? (
              <ChartSection className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-blue-400 sm:h-5 sm:w-5" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-foreground sm:text-lg">Responsabile</h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-muted/40">
                    <User className="h-4 w-4 text-blue-400" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="break-words text-sm font-medium text-foreground sm:text-base">
                      {typeof org.responsible === "string" ? org.responsible : org.responsible.name}
                    </div>
                    <div className="text-xs text-muted-foreground sm:text-sm">Responsabile</div>
                  </div>
                </div>
              </ChartSection>
            ) : null}

            {org.created_at || org.updated_at ? (
              <ChartSection className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-blue-400 sm:h-5 sm:w-5" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-foreground sm:text-lg">Date</h3>
                </div>
                <div className="space-y-3">
                  {org.created_at ? (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-3 w-3 text-green-400 sm:h-4 sm:w-4" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-muted-foreground sm:text-sm">Creata il</div>
                        <div className="text-sm font-medium text-foreground sm:text-base">
                          {formatDate(org.created_at)}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {org.updated_at ? (
                    <div className="flex items-center gap-3">
                      <Clock className="h-3 w-3 text-blue-400 sm:h-4 sm:w-4" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-muted-foreground sm:text-sm">Aggiornata il</div>
                        <div className="text-sm font-medium text-foreground sm:text-base">
                          {formatDate(org.updated_at)}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </ChartSection>
            ) : null}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isModalOpen && <MembersModal members={org.members} onClose={closeMembersModal} />}
      </AnimatePresence>
    </div>
  )
}

export default MyOrganization

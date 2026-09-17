"use client"

import { useMemo, useState, useCallback, useEffect, useContext } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { motion, useReducedMotion, AnimatePresence } from "framer-motion"
import { Activity, Home } from "lucide-react"
import toast from "react-hot-toast"
import { UserContext, api } from "@/context/UserContext"
import { BackNavigationButton } from "@/components/BackNavigationButton"
import { Button } from "@/components/ui/button"
import { LightbulbLoader } from "@/components/lightbulb-loader"
import { PlantStatusHealthScore } from "@/components/plantStatus/PlantStatusHealthScore"
import { PlantStatusActivityTimeline } from "@/components/plantStatus/PlantStatusActivityTimeline"
import { PlantStatusTimeline } from "@/components/plantStatus/PlantStatusTimeline"
import { PAGE_SCROLL_SHELL } from "@/utils/pageScrollShell"
import {
  computePlantHealthScore,
  fetchPlantStatusEvents,
  isDueRelevant,
  sortEventsByDueRemaining,
} from "@/utils/plantStatusEvents"
import {
  denyUnauthorizedComuneAccess,
  guardComuneAccess,
  isTownHallAccessDeniedError,
} from "@/utils/townHallAccess"

export default function PlantStatus() {
  const { userData } = useContext(UserContext)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prefersReducedMotion = useReducedMotion()
  const [selectedId, setSelectedId] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const comune = searchParams.get("comune") || ""

  const townHallNames = useMemo(() => {
    return (userData?.town_halls_list || [])
      .map((t) => (typeof t === "string" ? t : t?.name))
      .filter(Boolean)
  }, [userData])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const data = await fetchPlantStatusEvents({
        api,
        townHallName: comune,
        townHallNames,
      })
      setEvents(data)
    } catch (err) {
      console.error(err)
      if (isTownHallAccessDeniedError(err)) {
        denyUnauthorizedComuneAccess(navigate)
        return
      }
      setError(err.response?.data?.error || "Impossibile caricare lo stato impianto.")
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [comune, townHallNames, navigate])

  useEffect(() => {
    if (!userData) {
      navigate("/")
      return
    }
    if (!["MAINTAINER", "ADMINISTRATOR", "SUPER_ADMIN"].includes(userData.user_type)) {
      navigate("/dashboard")
      return
    }
    if (comune && !guardComuneAccess({ userData, comune, navigate })) return
    load()
  }, [userData, navigate, load, comune])

  const dueEvents = useMemo(() => {
    let list = events.filter(isDueRelevant)
    if (comune) {
      list = list.filter((e) => e.townHall?.toLowerCase() === comune.toLowerCase())
    }
    return sortEventsByDueRemaining(list)
  }, [events, comune])

  const health = useMemo(
    () => computePlantHealthScore(dueEvents),
    [dueEvents]
  )

  const goToDashboard = useCallback(() => {
    if (comune) {
      navigate("/dashboard", { state: { comune } })
      return
    }
    navigate("/dashboard")
  }, [navigate, comune])

  const handleOpen = useCallback(
    (event) => {
      setSelectedId(event.id)
      if (event.type === "quote" && event.quoteId) {
        navigate(`/quote/${event.quoteId}`)
        return
      }
      const lat = event.lat
      const lng = event.lng
      if (event.townHall && lat != null && lng != null && lat !== "" && lng !== "") {
        navigate("/dashboard", {
          state: {
            comune: event.townHall,
            focusLat: String(lat),
            focusLng: String(lng),
            focusPalo: String(event.poleNumber || ""),
          },
        })
        return
      }
      if (event.townHall && event.poleNumber) {
        navigate("/dashboard", {
          state: {
            comune: event.townHall,
            focusPalo: String(event.poleNumber),
          },
        })
        return
      }
      toast.error("Coordinate del punto luce non disponibili.")
    },
    [navigate]
  )

  const listMotion = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: 0.22 },
      }

  if (!userData) return null

  if (loading) {
    return (
      <div className={`${PAGE_SCROLL_SHELL} flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black`}>
        <LightbulbLoader />
      </div>
    )
  }

  return (
    <div className={`${PAGE_SCROLL_SHELL} relative bg-gradient-to-br from-black via-blue-950 to-black p-4 sm:p-6`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-64 w-[28rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -left-20 bottom-24 h-72 w-72 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute -right-16 top-40 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <BackNavigationButton />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Activity className="h-6 w-6 text-primary shrink-0" aria-hidden="true" />
                <span className="truncate">Stato impianto</span>
              </h1>
              <p className="text-sm text-muted-foreground truncate">
                {comune
                  ? `Scadenze · ${comune}`
                  : "Scadenze · comuni assegnati"}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={goToDashboard}
            aria-label="Torna alla mappa"
            title="Torna alla mappa"
            className="min-h-11 min-w-11 rounded-full bg-primary/10 hover:bg-primary/20"
          >
            <Home className="h-5 w-5 text-primary" />
          </Button>
        </div>

        {error ? (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100"
          >
            {error}
            <Button type="button" variant="ghost" size="sm" className="ml-2" onClick={load}>
              Riprova
            </Button>
          </div>
        ) : null}

        <PlantStatusHealthScore health={health} />

        <PlantStatusActivityTimeline events={dueEvents} />

        <AnimatePresence mode="wait">
          <motion.div key={comune || "all"} {...listMotion}>
            {dueEvents.length === 0 ? (
              <div className="rounded-xl border border-border/70 bg-card/40 p-8 text-center text-muted-foreground text-sm">
                Nessuna voce scaduta o in scadenza.
              </div>
            ) : (
              <div className="pb-10">
                <PlantStatusTimeline
                  events={dueEvents}
                  selectedId={selectedId}
                  onOpen={handleOpen}
                  animate={!prefersReducedMotion}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

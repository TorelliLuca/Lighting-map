import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import WhatsNewModal from "./WhatsNewModal"
import { useProductTour } from "../hooks/useProductTour.jsx"
import { buildLmTourState, shiftReplayQueue } from "../utils/tourReplayQueue"

const isTourDemoLocation = (pathname, search) => {
  if (!["/report", "/operation", "/inspection"].includes(pathname)) return false
  return new URLSearchParams(search || "").get("tourDemo") === "1"
}

/**
 * Avanza la coda di tutorial avviati dal profilo.
 * A fine coda, esce dalle pagine demo (report/operation).
 */
export const TourReplayBridge = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { applyLmTourState, whatsNewOpen, dismissWhatsNew } = useProductTour()

  useEffect(() => {
    const onAdvance = () => {
      const next = shiftReplayQueue()
      if (next?.path) {
        navigate(next.path, { state: { lmTour: buildLmTourState(next) } })
        return
      }

      // Fine coda / skip: lascia le pagine tutorial demo
      if (isTourDemoLocation(location.pathname, location.search)) {
        navigate("/dashboard", { replace: true })
      }
    }

    window.addEventListener("lighting-map:tour-replay-advance", onAdvance)
    return () => window.removeEventListener("lighting-map:tour-replay-advance", onAdvance)
  }, [navigate, location.pathname, location.search])

  // Applica state di navigazione (es. da Profilo) su qualsiasi pagina
  useEffect(() => {
    const lmTour = location.state?.lmTour
    if (!lmTour) return undefined

    const timer = window.setTimeout(() => {
      const applied = applyLmTourState(lmTour)
      if (applied) {
        navigate(`${location.pathname}${location.search}`, { replace: true, state: {} })
      }
    }, 400)

    return () => window.clearTimeout(timer)
  }, [location.pathname, location.search, location.state, applyLmTourState, navigate])

  return <WhatsNewModal isOpen={whatsNewOpen} onClose={dismissWhatsNew} />
}

export default TourReplayBridge

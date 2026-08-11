import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { useUser } from "../context/UserContext"
import { useProductTour } from "../hooks/useProductTour.jsx"
import {
  getPageTour,
  resolvePageTourId,
  shouldShowPageTour,
} from "../data/pageTours"
import WelcomeWizard from "./WelcomeWizard"

const buildAvailableSteps = (steps = []) =>
  steps.filter((tourStep) => {
    try {
      return Boolean(document.querySelector(tourStep.element))
    } catch {
      return false
    }
  })

/**
 * Mostra un tutorial la prima volta che l'utente apre una pagina configurata.
 * Attende il completamento dell'onboarding globale per non sovrapporsi.
 */
export const PageTourHost = () => {
  const location = useLocation()
  const { userData } = useUser()
  const {
    seenPageTours,
    preferences,
    wizardOpen,
    whatsNewOpen,
    tourPending,
    pageWizardOpen,
    pageTourPending,
    activePageTourId,
    manualReplayActive,
    startPageTour,
    beginPageSpotlight,
    skipPageTour,
    onPageSpotlightFinished,
  } = useProductTour()

  const driverRef = useRef(null)
  const finishingRef = useRef(false)
  const startedForPathRef = useRef(null)

  const activeTour = activePageTourId ? getPageTour(activePageTourId) : null
  const globalBusy = wizardOpen || whatsNewOpen || tourPending || manualReplayActive

  // Auto-start al cambio route (solo prima visita, non replay manuale)
  useEffect(() => {
    if (!userData || globalBusy) return undefined
    if (!preferences?.onboardingCompleted) return undefined
    if (location.state?.lmTour) return undefined

    const pageId = resolvePageTourId(location.pathname)
    if (!pageId) return undefined
    if (startedForPathRef.current === location.pathname) return undefined
    if (!shouldShowPageTour(pageId, userData, seenPageTours)) return undefined

    const timer = window.setTimeout(() => {
      startedForPathRef.current = location.pathname
      startPageTour(pageId)
    }, 500)

    return () => window.clearTimeout(timer)
  }, [
    location.pathname,
    location.state,
    userData,
    preferences?.onboardingCompleted,
    seenPageTours,
    globalBusy,
    startPageTour,
  ])

  // Reset path marker quando si lascia la pagina
  useEffect(() => {
    return () => {
      // noop — startedForPathRef tiene traccia per non riavviare sullo stesso path
    }
  }, [location.pathname])

  // Spotlight dopo il wizard di pagina
  useEffect(() => {
    if (!pageTourPending || !activeTour) return undefined

    finishingRef.current = false
    let cancelled = false
    let timeoutId = 0

    const start = async () => {
      // Aspetta il layout delle pagine form (report/operation demo)
      await new Promise((resolve) => {
        timeoutId = window.setTimeout(resolve, 280)
      })
      if (cancelled) return

      const steps = buildAvailableSteps(activeTour.steps || [])
      if (steps.length === 0) {
        onPageSpotlightFinished()
        return
      }

      const d = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        smoothScroll: true,
        overlayOpacity: 0.62,
        stagePadding: 12,
        stageRadius: 14,
        popoverClass: "lm-driver-popover",
        nextBtnText: "Avanti",
        prevBtnText: "Indietro",
        doneBtnText: "Fine",
        progressText: "{{current}} / {{total}}",
        steps,
        onDestroyed: () => {
          driverRef.current = null
          if (finishingRef.current) return
          finishingRef.current = true
          onPageSpotlightFinished()
        },
      })

      driverRef.current = d
      d.drive()
    }

    start()

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
      if (driverRef.current) {
        finishingRef.current = true
        driverRef.current.destroy()
        driverRef.current = null
      }
    }
  }, [pageTourPending, activeTour, onPageSpotlightFinished])

  if (!activeTour) return null

  return (
    <WelcomeWizard
      isOpen={pageWizardOpen}
      slides={activeTour.wizard}
      onStartTour={beginPageSpotlight}
      onSkip={skipPageTour}
    />
  )
}

export default PageTourHost

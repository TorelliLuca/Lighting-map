import { useEffect, useRef, useState } from "react"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { useUser } from "../context/UserContext"
import { useProductTour } from "../hooks/useProductTour.jsx"
import { getOnboardingWizardSlides, getTourStepsForUser } from "../data/whatsNew"
import WelcomeWizard from "./WelcomeWizard"

const openMapControls = () => {
  window.dispatchEvent(new CustomEvent("lighting-map:map-controls-open"))
}

const closeMapControls = () => {
  window.dispatchEvent(new CustomEvent("lighting-map:map-controls-close"))
}

const buildAvailableSteps = (user) =>
  getTourStepsForUser(user).filter((tourStep) => {
    try {
      return Boolean(document.querySelector(tourStep.element))
    } catch {
      return false
    }
  })

export const ProductTourHost = ({ ready = false }) => {
  const { userData, fetchUserProfile } = useUser()
  const {
    wizardOpen,
    tourPending,
    beginSpotlightTour,
    skipOnboarding,
    onSpotlightFinished,
    evaluateAutoStart,
    manualReplayActive,
  } = useProductTour()

  const [prefsReady, setPrefsReady] = useState(
    () => userData?.preferences !== undefined,
  )
  const driverRef = useRef(null)
  const finishingRef = useRef(false)

  useEffect(() => {
    if (!ready || !userData) return undefined

    if (userData.preferences !== undefined) {
      setPrefsReady(true)
      return undefined
    }

    let cancelled = false
    fetchUserProfile()
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setPrefsReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [ready, userData, fetchUserProfile])

  useEffect(() => {
    if (!ready || !prefsReady || manualReplayActive) return undefined
    const timer = window.setTimeout(() => {
      evaluateAutoStart()
    }, 600)
    return () => window.clearTimeout(timer)
  }, [ready, prefsReady, evaluateAutoStart, manualReplayActive])

  useEffect(() => {
    if (!tourPending || !ready) return undefined

    finishingRef.current = false
    let cancelled = false
    let timeoutId = 0

    const start = async () => {
      // Apre i filtri così città / evidenzia / filtra sono nel DOM (anche su mobile)
      openMapControls()
      await new Promise((resolve) => {
        timeoutId = window.setTimeout(resolve, 220)
      })
      if (cancelled) return

      const steps = buildAvailableSteps(userData)
      if (steps.length === 0) {
        closeMapControls()
        onSpotlightFinished()
        return
      }

      const d = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        smoothScroll: true,
        overlayOpacity: 0.62,
        stagePadding: 10,
        stageRadius: 14,
        popoverClass: "lm-driver-popover",
        nextBtnText: "Avanti",
        prevBtnText: "Indietro",
        doneBtnText: "Fine",
        progressText: "{{current}} / {{total}}",
        steps,
        onDestroyed: () => {
          driverRef.current = null
          closeMapControls()
          if (finishingRef.current) return
          finishingRef.current = true
          onSpotlightFinished()
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
      closeMapControls()
    }
  }, [tourPending, ready, onSpotlightFinished, userData])

  return (
    <WelcomeWizard
      isOpen={wizardOpen}
      slides={getOnboardingWizardSlides(userData)}
      onStartTour={beginSpotlightTour}
      onSkip={skipOnboarding}
    />
  )
}

export default ProductTourHost

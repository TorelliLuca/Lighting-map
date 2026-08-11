import { createContext, useCallback, useContext, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { useUser } from "../context/UserContext"
import { CURRENT_WHATS_NEW_ID } from "../data/whatsNew"
import { shiftReplayQueue } from "../utils/tourReplayQueue"

const ProductTourContext = createContext(null)

export const ProductTourProvider = ({ children }) => {
  const { userData, updatePreferences } = useUser()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [whatsNewOpen, setWhatsNewOpen] = useState(false)
  const [tourPending, setTourPending] = useState(false)
  const [autoChecked, setAutoChecked] = useState(false)
  const [pageWizardOpen, setPageWizardOpen] = useState(false)
  const [pageTourPending, setPageTourPending] = useState(false)
  const [activePageTourId, setActivePageTourId] = useState(null)
  /** Evita che evaluateAutoStart / auto page tour si sovrappongano a un replay manuale. */
  const [manualReplayActive, setManualReplayActive] = useState(false)

  const preferences = userData?.preferences
  const seenPageTours = preferences?.seenPageTours || {}

  const markOnboardingDone = useCallback(async () => {
    try {
      await updatePreferences({
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString(),
        lastSeenWhatsNewId: CURRENT_WHATS_NEW_ID,
        seenPageTours: { dashboard: true },
      })
    } catch {
      toast.error("Impossibile salvare lo stato del tutorial")
    }
  }, [updatePreferences])

  const markPageTourSeen = useCallback(
    async (pageId) => {
      if (!pageId) return
      try {
        await updatePreferences({
          seenPageTours: { [pageId]: true },
        })
      } catch {
        toast.error("Impossibile salvare il tutorial della pagina")
      }
    },
    [updatePreferences],
  )

  const dismissWhatsNew = useCallback(async () => {
    setWhatsNewOpen(false)
    setManualReplayActive(false)
    try {
      await updatePreferences({ lastSeenWhatsNewId: CURRENT_WHATS_NEW_ID })
    } catch {
      toast.error("Impossibile salvare le preferenze novità")
    }
    window.dispatchEvent(new CustomEvent("lighting-map:tour-replay-advance"))
  }, [updatePreferences])

  const startTour = useCallback(() => {
    setWhatsNewOpen(false)
    setPageWizardOpen(false)
    setPageTourPending(false)
    setActivePageTourId(null)
    setManualReplayActive(true)
    setWizardOpen(true)
    setTourPending(false)
  }, [])

  const openWhatsNew = useCallback(() => {
    setWizardOpen(false)
    setTourPending(false)
    setPageWizardOpen(false)
    setPageTourPending(false)
    setActivePageTourId(null)
    setManualReplayActive(true)
    setWhatsNewOpen(true)
  }, [])

  const beginSpotlightTour = useCallback(() => {
    setWizardOpen(false)
    setTourPending(true)
  }, [])

  const finishManualOrOnboarding = useCallback(async () => {
    setTourPending(false)
    setWizardOpen(false)
    window.dispatchEvent(new CustomEvent("lighting-map:org-menu-close"))
    const wasManual = manualReplayActive
    setManualReplayActive(false)
    if (!wasManual) {
      await markOnboardingDone()
    }
    window.dispatchEvent(new CustomEvent("lighting-map:tour-replay-advance"))
  }, [manualReplayActive, markOnboardingDone])

  const skipOnboarding = useCallback(async () => {
    await finishManualOrOnboarding()
  }, [finishManualOrOnboarding])

  const onSpotlightFinished = useCallback(async () => {
    await finishManualOrOnboarding()
  }, [finishManualOrOnboarding])

  const startPageTour = useCallback((pageId, options = {}) => {
    if (!pageId) return
    setActivePageTourId(pageId)
    setPageWizardOpen(true)
    setPageTourPending(false)
    if (options.force) setManualReplayActive(true)
  }, [])

  const beginPageSpotlight = useCallback(() => {
    setPageWizardOpen(false)
    setPageTourPending(true)
  }, [])

  const finishPageTour = useCallback(async () => {
    const id = activePageTourId
    const wasManual = manualReplayActive
    setPageWizardOpen(false)
    setPageTourPending(false)
    setActivePageTourId(null)
    setManualReplayActive(false)
    if (id && !wasManual) await markPageTourSeen(id)
    if (id && wasManual) await markPageTourSeen(id)
    window.dispatchEvent(new CustomEvent("lighting-map:tour-replay-advance"))
  }, [activePageTourId, manualReplayActive, markPageTourSeen])

  const skipPageTour = useCallback(async () => {
    await finishPageTour()
  }, [finishPageTour])

  const onPageSpotlightFinished = useCallback(async () => {
    await finishPageTour()
  }, [finishPageTour])

  const applyLmTourState = useCallback(
    (lmTour) => {
      if (!lmTour?.type) return false
      if (lmTour.type === "whatsNew") {
        openWhatsNew()
        return true
      }
      if (lmTour.type === "dashboard") {
        startTour()
        return true
      }
      if (lmTour.type === "page" && lmTour.pageId) {
        startPageTour(lmTour.pageId, { force: Boolean(lmTour.force) })
        return true
      }
      return false
    },
    [openWhatsNew, startTour, startPageTour],
  )

  /** Valuta onboarding / what's new dopo che la Dashboard è pronta. */
  const evaluateAutoStart = useCallback(() => {
    if (autoChecked || !userData || manualReplayActive) return
    setAutoChecked(true)

    const prefs = userData.preferences || {}
    if (!prefs.onboardingCompleted) {
      setWizardOpen(true)
      return
    }
    if (prefs.lastSeenWhatsNewId !== CURRENT_WHATS_NEW_ID) {
      setWhatsNewOpen(true)
    }
  }, [autoChecked, userData, manualReplayActive])

  const value = useMemo(
    () => ({
      preferences,
      seenPageTours,
      wizardOpen,
      whatsNewOpen,
      tourPending,
      pageWizardOpen,
      pageTourPending,
      activePageTourId,
      manualReplayActive,
      startTour,
      openWhatsNew,
      beginSpotlightTour,
      skipOnboarding,
      dismissWhatsNew,
      onSpotlightFinished,
      evaluateAutoStart,
      startPageTour,
      beginPageSpotlight,
      skipPageTour,
      onPageSpotlightFinished,
      markPageTourSeen,
      applyLmTourState,
      shiftReplayQueue,
    }),
    [
      preferences,
      seenPageTours,
      wizardOpen,
      whatsNewOpen,
      tourPending,
      pageWizardOpen,
      pageTourPending,
      activePageTourId,
      manualReplayActive,
      startTour,
      openWhatsNew,
      beginSpotlightTour,
      skipOnboarding,
      dismissWhatsNew,
      onSpotlightFinished,
      evaluateAutoStart,
      startPageTour,
      beginPageSpotlight,
      skipPageTour,
      onPageSpotlightFinished,
      markPageTourSeen,
      applyLmTourState,
    ],
  )

  return (
    <ProductTourContext.Provider value={value}>{children}</ProductTourContext.Provider>
  )
}

export const useProductTour = () => {
  const ctx = useContext(ProductTourContext)
  if (!ctx) {
    throw new Error("useProductTour deve essere usato dentro ProductTourProvider")
  }
  return ctx
}

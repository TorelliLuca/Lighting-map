import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { Megaphone, ChevronRight, ChevronLeft } from "lucide-react"
import { getCurrentWhatsNew } from "../data/whatsNew"

export const WhatsNewModal = ({ isOpen, onClose }) => {
  const entry = getCurrentWhatsNew()
  const slides = entry?.slides || []
  const [step, setStep] = useState(0)
  const isLast = step >= slides.length - 1
  const current = slides[step]

  useEffect(() => {
    if (isOpen) setStep(0)
  }, [isOpen])

  if (typeof document === "undefined" || !entry || !current) return null

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[12000] overflow-y-auto overscroll-contain">
          <motion.button
            type="button"
            aria-label="Chiudi"
            className="fixed inset-0 bg-black/65 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="relative flex min-h-full items-center justify-center p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="whats-new-title"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-md rounded-2xl border border-blue-500/40 bg-black/85 p-6 text-blue-50 shadow-[0_0_30px_rgba(0,149,255,0.18)] backdrop-blur-xl"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-blue-500/30 bg-blue-900/50 text-blue-300">
                <Megaphone className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-blue-300/80">
                {entry.title} · {step + 1}/{slides.length}
              </p>
              <h2 id="whats-new-title" className="mt-1 text-xl font-semibold text-white">
                {current.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-blue-100/85">{current.body}</p>

              <div className="mt-5 flex items-center gap-1.5">
                {slides.map((slide, index) => (
                  <span
                    key={slide.title}
                    className={`h-1.5 rounded-full transition-all ${
                      index === step ? "w-6 bg-blue-400" : "w-1.5 bg-blue-900/80"
                    }`}
                  />
                ))}
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-11 rounded-lg px-3 text-sm text-blue-300/70 transition-colors hover:text-blue-100"
                >
                  Chiudi
                </button>
                <div className="flex gap-2">
                  {step > 0 ? (
                    <button
                      type="button"
                      onClick={() => setStep((s) => Math.max(0, s - 1))}
                      className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-blue-500/40 bg-black/40 px-3 text-sm font-medium text-blue-100 transition-colors hover:bg-blue-900/40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Indietro
                    </button>
                  ) : null}
                  {isLast ? (
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    >
                      Ho capito
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStep((s) => Math.min(slides.length - 1, s + 1))}
                      className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    >
                      Avanti
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

export default WhatsNewModal

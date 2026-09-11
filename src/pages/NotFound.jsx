import { motion, useReducedMotion } from "framer-motion"
import { ArrowLeft, Home, Lightbulb } from "lucide-react"
import { useNavigate } from "react-router-dom"

const NotFound = () => {
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()

  const fadeUp = (delay = 0) =>
    prefersReducedMotion
      ? { initial: false, animate: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] },
        }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-black via-blue-950 to-black px-4 py-10 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[18%] h-64 w-64 -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -right-16 top-24 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(147,197,253,0.9) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <motion.section
        {...(prefersReducedMotion
          ? { initial: false, animate: { opacity: 1 } }
          : {
              initial: { opacity: 0, scale: 0.96 },
              animate: { opacity: 1, scale: 1 },
              transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
            })}
        className="relative z-10 w-full max-w-lg rounded-3xl bg-blue-950/35 p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-xl md:p-12"
        role="alert"
        aria-labelledby="not-found-title"
      >
        <motion.div
          {...fadeUp(0.05)}
          className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center"
          aria-hidden="true"
        >
          {!prefersReducedMotion && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full bg-amber-300/20 blur-xl"
                animate={{ opacity: [0.15, 0.5, 0.12, 0.4, 0.1] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute inset-2 rounded-full bg-yellow-300/10 blur-md"
                animate={{ opacity: [0.1, 0.35, 0.08, 0.28, 0.05] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
              />
            </>
          )}
          <motion.div
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    color: ["#64748b", "#FCD34D", "#64748b", "#FCD34D", "#64748b"],
                    rotate: [0, -3, 2, -2, 0],
                  }
            }
            transition={
              prefersReducedMotion
                ? undefined
                : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
            }
            className="relative text-slate-400"
          >
            <Lightbulb className="h-16 w-16 drop-shadow-[0_0_16px_rgba(252,211,77,0.3)]" strokeWidth={1.5} />
          </motion.div>
        </motion.div>

        <motion.p
          {...fadeUp(0.15)}
          className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-blue-300/70"
        >
          Errore 404
        </motion.p>

        <motion.h1
          id="not-found-title"
          {...fadeUp(0.2)}
          className="mb-3 text-3xl font-bold tracking-tight text-white md:text-4xl"
        >
          Abbiamo spento tutto.
          <span className="mt-1 block text-amber-200/90">Anche la pagina.</span>
        </motion.h1>

        <motion.p
          {...fadeUp(0.25)}
          className="mx-auto mb-8 max-w-sm text-base leading-relaxed text-blue-100/75 md:text-lg"
        >
          L&apos;indirizzo non esiste o non è più disponibile. Torna alla
          dashboard oppure alla pagina precedente.
        </motion.p>

        <motion.div
          {...fadeUp(0.3)}
          className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
        >
          <motion.button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-500/30 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-500/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-950"
            whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Torna alla Dashboard
          </motion.button>

          <motion.button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/5 px-6 py-3 text-sm font-medium text-blue-100 transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-950"
            whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Pagina precedente
          </motion.button>
        </motion.div>
      </motion.section>
    </main>
  )
}

export default NotFound

"use client"

import { useState, useEffect, useContext, useMemo } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import { UserContext, api } from "../context/UserContext"
import {
  AlertCircle,
  CheckCircle,
  Download,
  FileSpreadsheet,
  Home,
  Loader2,
  XCircle,
} from "lucide-react"
import { BackNavigationButton } from "../components/BackNavigationButton"
import { TruncatedTextDetails } from "../components/ui/TruncatedTextDetails"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartSection } from "@/components/infoPanel/DistributionChart"
import {
  ExtraordinaryBudgetBar,
  REVIEW_BUDGET_INFO_TEXT,
} from "@/components/ui/ExtraordinaryBudgetBar"
import { QuoteStatusBadge } from "../components/ui/QuoteStatusBadge"
import { RiskClassBadge } from "../components/ui/RiskClassBadge"
import { cn } from "@/lib/utils"
import { canApproveQuoteByRole, computeQuoteTotalsClient } from "../utils/utils"
import { fetchExtraordinaryBudgetUsage } from "../utils/extraordinaryBudget"
import toast from "react-hot-toast"
import { PAGE_SCROLL_SHELL } from "../utils/pageScrollShell"
import { isEmptyNpLine, lineDetailsTitle } from "../utils/npBom"
import { formatUdmLabel } from "../utils/udm"
import {
  denyUnauthorizedComuneAccess,
  isTownHallAccessDeniedError,
} from "../utils/townHallAccess"

const fieldInputClass =
  "w-full rounded-xl border border-border/70 bg-background/50 text-foreground px-4 py-3 disabled:opacity-60 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring/50 placeholder:text-muted-foreground"

const townHallNameOf = (doc) => {
  const th = doc?.townHallId
  if (!th) return ""
  if (typeof th === "string") return ""
  return th.name || ""
}

const approvalListPath = (comune) => {
  const qs = comune ? `?comune=${encodeURIComponent(comune)}` : ""
  return `/quotes/approval${qs}`
}

/** La risposta approve/reject non popola townHallId: conserva il nome già caricato. */
const mergeQuoteKeepingTownHall = (prev, next) => {
  if (!next) return next
  const prevName = townHallNameOf(prev)
  if (prevName && !townHallNameOf(next)) {
    return { ...next, townHallId: prev.townHallId }
  }
  return next
}

function QuoteReviewSkeleton() {
  return (
    <div
      className={`${PAGE_SCROLL_SHELL} flex items-start justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4 py-6 sm:py-8`}
      aria-busy="true"
      aria-label="Caricamento revisione preventivo"
    >
      <div className="w-full max-w-3xl space-y-4">
        <ChartSection className="space-y-4 p-6 sm:p-8">
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
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </ChartSection>
      </div>
    </div>
  )
}

export default function QuoteReview() {
  const { userData } = useContext(UserContext)
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const reduceMotion = useReducedMotion()
  const comuneFromNav = location.state?.comune || ""

  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState("")
  const [quote, setQuote] = useState(null)
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [selectedIndexes, setSelectedIndexes] = useState(() => new Set())
  const [contestNotes, setContestNotes] = useState({})
  const [done, setDone] = useState(null)
  const [downloadingFormat, setDownloadingFormat] = useState(null)
  const [budgetLimit, setBudgetLimit] = useState(null)
  const [approvedSpent, setApprovedSpent] = useState(0)

  useEffect(() => {
    if (!userData) {
      navigate("/")
      return
    }
    if (!canApproveQuoteByRole(userData)) {
      navigate("/dashboard")
      return
    }

    const load = async () => {
      try {
        setLoading(true)
        setError("")
        const res = await api.get(`/api/quotes/${id}`)
        const doc = res.data
        if (doc.type !== "QUOTE") {
          setError("Il documento non è un preventivo.")
          setQuote(null)
          return
        }
        setQuote(doc)

        const comune = townHallNameOf(doc) || comuneFromNav
        if (comune) {
          try {
            const usage = await fetchExtraordinaryBudgetUsage(api, comune)
            setBudgetLimit(usage.limit)
            setApprovedSpent(usage.approvedSpent)
          } catch (budgetErr) {
            console.error(budgetErr)
            setBudgetLimit(null)
            setApprovedSpent(0)
          }
        } else {
          setBudgetLimit(null)
          setApprovedSpent(0)
        }
      } catch (err) {
        console.error(err)
        if (isTownHallAccessDeniedError(err)) {
          denyUnauthorizedComuneAccess(navigate)
          return
        }
        setError(err.response?.data?.error || "Impossibile caricare il preventivo.")
      } finally {
        setLoading(false)
      }
    }

    if (id) load()
  }, [userData, navigate, id, comuneFromNav])

  const totals = useMemo(
    () =>
      computeQuoteTotalsClient(
        quote?.lineItems || [],
        quote?.safetyChargeRate ?? 0.02,
        quote?.discountPercent ?? 0,
      ),
    [quote],
  )

  const canDecide = quote?.status === "PENDING_APPROVAL"

  const toggleContested = (index) => {
    setSelectedIndexes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const downloadFile = async (format) => {
    if (!id || downloadingFormat) return
    setDownloadingFormat(format)
    try {
      const res = await api.get(`/api/quotes/${id}/${format}`, { responseType: "blob" })
      const contentType = String(res.headers?.["content-type"] || "")
      if (contentType.includes("application/json")) {
        const text = await res.data.text()
        const json = JSON.parse(text)
        throw new Error(json.error || "Download non riuscito")
      }
      const disposition = String(res.headers?.["content-disposition"] || "")
      const headerName = disposition.match(/filename="([^"]+)"/i)?.[1]
      const blob = new Blob([res.data], {
        type:
          format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download =
        headerName || `${quote?.protocolNumber || `IMS-${String(id).slice(-6)}`}.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      toast.error(err.message || `Download ${format.toUpperCase()} non riuscito`)
    } finally {
      setDownloadingFormat(null)
    }
  }

  const handleApprove = async () => {
    const emptyNp = (quote?.lineItems || []).filter((item) => isEmptyNpLine(item))
    if (emptyNp.length > 0) {
      const msg =
        emptyNp.length === 1
          ? "Impossibile approvare: un nuovo prezzo non ha componenti nella distinta."
          : `Impossibile approvare: ${emptyNp.length} nuovi prezzi non hanno componenti nella distinta.`
      setError(msg)
      toast.error(msg)
      return
    }

    setActing(true)
    setError("")
    try {
      const comune = townHallNameOf(quote) || comuneFromNav
      const res = await api.post(`/api/quotes/${id}/approve`)
      setQuote(mergeQuoteKeepingTownHall(quote, res.data.quote))
      setDone({
        type: "approved",
        protocol: res.data.protocolNumber,
        dueDate: res.data.dueDate,
        comune,
      })
      toast.success(`Preventivo ${res.data.protocolNumber} approvato`)
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.error || "Errore approvazione"
      setError(msg)
      toast.error(msg)
    } finally {
      setActing(false)
    }
  }

  const handleReject = async () => {
    const contestedLines = []
    for (const index of selectedIndexes) {
      const note = String(contestNotes[index] || "").trim()
      if (!note) {
        const msg = `Indicare il motivo di contestazione per la voce ${index + 1}.`
        setError(msg)
        toast.error(msg)
        return
      }
      contestedLines.push({ index, note })
    }

    const generalReason = rejectReason.trim()
    if (contestedLines.length === 0 && !generalReason) {
      const msg = "Selezionare almeno una voce da contestare oppure indicare un motivo generale."
      setError(msg)
      toast.error(msg)
      return
    }

    setActing(true)
    setError("")
    try {
      const comune = townHallNameOf(quote) || comuneFromNav
      const res = await api.post(`/api/quotes/${id}/reject`, {
        reason: generalReason,
        contestedLines,
      })
      setQuote(mergeQuoteKeepingTownHall(quote, res.data))
      setDone({
        type: "rejected",
        contestedCount: contestedLines.length,
        hasGeneralReason: Boolean(generalReason),
        comune,
      })
      toast.success("Preventivo inviato al manutentore per revisione")
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.error || "Errore rifiuto"
      setError(msg)
      toast.error(msg)
    } finally {
      setActing(false)
    }
  }

  const goToApprovalList = () => {
    const comune = done?.comune || townHallNameOf(quote) || comuneFromNav
    navigate(approvalListPath(comune))
  }

  if (loading) {
    return <QuoteReviewSkeleton />
  }

  if (done) {
    return (
      <div
        className={`${PAGE_SCROLL_SHELL} flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4`}
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <ChartSection className="space-y-5 text-center">
            <div
              className={cn(
                "mx-auto flex h-16 w-16 items-center justify-center rounded-full border",
                done.type === "approved"
                  ? "border-emerald-500/30 bg-emerald-500/15"
                  : "border-amber-500/30 bg-amber-500/15",
              )}
            >
              {done.type === "approved" ? (
                <CheckCircle className="h-8 w-8 text-emerald-400" aria-hidden="true" />
              ) : (
                <XCircle className="h-8 w-8 text-amber-400" aria-hidden="true" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {done.type === "approved" ? "Preventivo approvato" : "Preventivo da revisionare"}
              </h2>
              {done.protocol ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Protocollo {done.protocol}
                  {done.dueDate ? (
                    <> — scadenza {new Date(done.dueDate).toLocaleDateString("it-IT")}</>
                  ) : null}
                </p>
              ) : null}
              {done.type === "rejected" ? (
                <p className="mt-2 text-sm leading-relaxed text-amber-100/90">
                  {done.contestedCount > 0
                    ? `${done.contestedCount} ${done.contestedCount === 1 ? "voce contestata" : "voci contestate"}. `
                    : ""}
                  Il titolare manutentore potrà correggere e reinviare.
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              className="min-h-11 w-full bg-primary text-primary-foreground"
              onClick={goToApprovalList}
            >
              Torna all&apos;elenco approvazioni
            </Button>
          </ChartSection>
        </motion.div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div
        className={`${PAGE_SCROLL_SHELL} flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4`}
      >
        <ChartSection className="max-w-md space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-red-500/30 bg-red-950/20">
            <AlertCircle className="h-7 w-7 text-red-400" aria-hidden="true" />
          </div>
          <p className="text-sm text-red-200">{error || "Preventivo non trovato"}</p>
          <Button type="button" variant="outline" className="min-h-11 w-full" onClick={goToApprovalList}>
            Torna all&apos;elenco approvazioni
          </Button>
        </ChartSection>
      </div>
    )
  }

  const lightPoint = quote.lightPointId
  const townHall = quote.townHallId

  return (
    <div
      className={`${PAGE_SCROLL_SHELL} flex items-start justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4 py-6 sm:py-8`}
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-3xl space-y-4"
      >
        <ChartSection className="space-y-5 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-2">
              <FileSpreadsheet className="mt-1 h-6 w-6 shrink-0 text-blue-400" aria-hidden="true" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-foreground">Revisione preventivo</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <QuoteStatusBadge status={quote.status} />
                  {quote.protocolNumber ? (
                    <Badge variant="outline" className="font-mono text-[11px] text-blue-200">
                      {quote.protocolNumber}
                    </Badge>
                  ) : null}
                  {quote.priorityClass ? (
                    <RiskClassBadge riskClass={quote.priorityClass} />
                  ) : null}
                </div>
              </div>
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
          </div>

          <section
            aria-label="Contesto preventivo"
            className="space-y-1 rounded-xl border border-border/50 bg-secondary/30 p-4 text-sm text-foreground"
          >
            <p>
              <span className="font-medium text-muted-foreground">Comune:</span>{" "}
              {townHall?.name || "—"}
            </p>
            <p>
              <span className="font-medium text-muted-foreground">Punto:</span>{" "}
              <span className="font-mono">{lightPoint?.numero_palo || "—"}</span>
            </p>
            <p>
              <span className="font-medium text-muted-foreground">Tempistica:</span> Materiali{" "}
              {quote.materialLeadDays} gg — Opera {quote.workLeadDays} gg
            </p>
            <p>
              <span className="font-medium text-muted-foreground">Creato da:</span>{" "}
              {quote.createdBy
                ? `${quote.createdBy.name || ""} ${quote.createdBy.surname || ""}`.trim()
                : "—"}
            </p>
          </section>

          {quote.faultDescription ? (
            <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 text-sm text-foreground">
              <p className="mb-1 font-medium text-muted-foreground">Descrizione guasto</p>
              <p>{quote.faultDescription}</p>
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="flex gap-2 rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-200"
            >
              <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">Voci preventivo</p>
              {canDecide && showReject ? (
                <p className="text-xs text-amber-200/90">
                  Seleziona le voci da contestare (opzionale)
                </p>
              ) : null}
            </div>
            {(quote.lineItems || []).map((item, idx) => {
              const selected = selectedIndexes.has(idx)
              const lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0)
              return (
                <div
                  key={idx}
                  className={cn(
                    "space-y-2 rounded-xl border p-3 text-sm",
                    selected
                      ? "border-amber-500/40 bg-amber-950/30"
                      : "border-border/50 bg-secondary/20",
                  )}
                >
                  <div className="flex items-start gap-3">
                    {canDecide && showReject ? (
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleContested(idx)}
                        className="mt-1 h-4 w-4 rounded border-amber-400/50 bg-black/40 text-amber-500 focus:ring-amber-400/40"
                        aria-label={`Contesta voce ${idx + 1}`}
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-foreground">
                        <span className="font-mono text-xs text-blue-300">
                          {item.materialCode || "—"}
                        </span>
                        {item.isAdHoc ? (
                          <Badge
                            variant="outline"
                            className="border-amber-500/30 px-1 py-0 text-[10px] text-amber-300/90"
                          >
                            NP
                          </Badge>
                        ) : null}
                      </p>
                      <div className="mt-1">
                        <TruncatedTextDetails
                          text={item.description}
                          detailsText={item.fullDescription}
                          title={lineDetailsTitle(
                            item,
                            `Voce ${idx + 1}${item.isAdHoc ? " · Nuovo prezzo" : ""}`,
                          )}
                          lines={2}
                          className="text-sm text-foreground"
                          bom={item.children || []}
                          fields={[
                            { label: "Codice", value: item.materialCode || "—" },
                            { label: "Categoria", value: item.category || "—" },
                            { label: "U.M.", value: formatUdmLabel(item.udm) },
                            {
                              label: "Prezzo unitario",
                              value: `€ ${Number(item.unitPrice || 0).toFixed(2)}`,
                            },
                          ]}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatUdmLabel(item.udm)} × {Number(item.quantity || 0)} × €{" "}
                        {Number(item.unitPrice || 0).toFixed(2)}
                        {" = "}
                        <span className="font-medium text-foreground">€ {lineTotal.toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                  {canDecide && showReject && selected ? (
                    <textarea
                      rows={2}
                      placeholder={`Motivo contestazione voce ${idx + 1} *`}
                      value={contestNotes[idx] || ""}
                      onChange={(e) =>
                        setContestNotes((prev) => ({ ...prev, [idx]: e.target.value }))
                      }
                      className={`${fieldInputClass} py-2 text-sm`}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="space-y-1 rounded-xl border border-border/50 bg-secondary/30 p-4 text-sm text-foreground">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Totale lordo</span>
              <span>€ {totals.subtotal.toFixed(2)}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Oneri / sconto</span>
              <span>€ {(totals.safetyAmount - totals.discountAmount).toFixed(2)}</span>
            </p>
            <p className="flex justify-between border-t border-border/40 pt-2 font-semibold">
              <span>Totale preventivo</span>
              <span>€ {totals.total.toFixed(2)}</span>
            </p>
          </div>

          {budgetLimit != null ? (
            <ExtraordinaryBudgetBar
              spent={approvedSpent}
              extraSpent={totals.total}
              limit={budgetLimit}
              infoText={REVIEW_BUDGET_INFO_TEXT}
              className="max-w-none lg:w-full"
            />
          ) : null}

          <Separator className="bg-border/50" />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={!!downloadingFormat}
              onClick={() => downloadFile("xlsx")}
              className="min-h-12 flex-1"
            >
              {downloadingFormat === "xlsx" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Scarica XLSX
            </Button>
          </div>

          {canDecide ? (
            <div className="space-y-3">
              {!showReject ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    disabled={acting}
                    onClick={handleApprove}
                    className="min-h-12 flex-1 bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Approva
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={acting}
                    onClick={() => {
                      setShowReject(true)
                      setError("")
                    }}
                    className="min-h-12 flex-1 border-amber-500/40 text-amber-100 hover:bg-amber-900/20"
                  >
                    Respingi per revisione
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
                  <label
                    htmlFor="quote-reject-reason"
                    className="block text-sm font-medium text-amber-100"
                  >
                    Motivo generale{" "}
                    {selectedIndexes.size === 0
                      ? "*"
                      : "(opzionale se hai contestato delle voci)"}
                  </label>
                  <textarea
                    id="quote-reject-reason"
                    rows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Es. tempistiche non coerenti, descrizione guasto incompleta…"
                    className={fieldInputClass}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      disabled={acting}
                      onClick={handleReject}
                      className="min-h-12 flex-1 bg-amber-600 text-white hover:bg-amber-500"
                    >
                      {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Conferma respingimento
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={acting}
                      onClick={() => {
                        setShowReject(false)
                        setSelectedIndexes(new Set())
                        setContestNotes({})
                        setRejectReason("")
                        setError("")
                      }}
                      className="min-h-12 flex-1"
                    >
                      Annulla
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {!canDecide ? (
            <Button
              type="button"
              className="min-h-12 w-full bg-primary text-primary-foreground"
              onClick={goToApprovalList}
            >
              Torna all&apos;elenco approvazioni
            </Button>
          ) : null}
        </ChartSection>
      </motion.div>
    </div>
  )
}

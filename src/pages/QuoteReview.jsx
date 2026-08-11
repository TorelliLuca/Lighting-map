"use client"

import { useState, useEffect, useContext, useMemo } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
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
import { LightbulbLoader } from "../components/lightbulb-loader"
import { BackNavigationButton } from "../components/BackNavigationButton"
import { canApproveQuoteByRole, QUOTE_STATUS_LABELS, computeQuoteTotalsClient } from "../utils/utils"
import toast from "react-hot-toast"
import { PAGE_SCROLL_SHELL } from "../utils/pageScrollShell"

const btnSecondaryClass =
  "cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 disabled:cursor-not-allowed"

const btnPrimaryClass =
  "cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 disabled:cursor-not-allowed"

const fieldInputClass =
  "w-full rounded-xl border border-blue-500/30 bg-blue-900/20 text-white px-4 py-3 disabled:opacity-60 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:border-blue-400/50"

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

export default function QuoteReview() {
  const { userData } = useContext(UserContext)
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
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
      } catch (err) {
        console.error(err)
        setError(err.response?.data?.error || "Impossibile caricare il preventivo.")
      } finally {
        setLoading(false)
      }
    }

    if (id) load()
  }, [userData, navigate, id])

  const totals = useMemo(
    () => computeQuoteTotalsClient(
      quote?.lineItems || [],
      quote?.safetyChargeRate ?? 0.02,
      quote?.discountPercent ?? 0
    ),
    [quote]
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
        type: format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = headerName || `${quote?.protocolNumber || `IMS-${String(id).slice(-6)}`}.${format}`
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
      setError(err.response?.data?.error || "Errore approvazione")
    } finally {
      setActing(false)
    }
  }

  const handleReject = async () => {
    const contestedLines = []
    for (const index of selectedIndexes) {
      const note = String(contestNotes[index] || "").trim()
      if (!note) {
        setError(`Indicare il motivo di contestazione per la voce ${index + 1}.`)
        return
      }
      contestedLines.push({ index, note })
    }

    const generalReason = rejectReason.trim()
    if (contestedLines.length === 0 && !generalReason) {
      setError("Selezionare almeno una voce da contestare oppure indicare un motivo generale.")
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
      setError(err.response?.data?.error || "Errore rifiuto")
    } finally {
      setActing(false)
    }
  }

  const goToApprovalList = () => {
    const comune = done?.comune || townHallNameOf(quote) || comuneFromNav
    navigate(approvalListPath(comune))
  }

  if (loading) {
    return (
      <div className={`${PAGE_SCROLL_SHELL} flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4`}>
        <LightbulbLoader />
      </div>
    )
  }

  if (done) {
    return (
      <div className={`${PAGE_SCROLL_SHELL} flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4`}>
        <div className="w-full max-w-md p-8 rounded-2xl backdrop-blur-xl bg-black/40 border border-blue-500/20 text-center">
          {done.type === "approved" ? (
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
          ) : (
            <XCircle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          )}
          <h2 className="text-2xl font-bold text-white">
            {done.type === "approved" ? "Preventivo approvato" : "Preventivo da revisionare"}
          </h2>
          {done.protocol && (
            <p className="mt-2 text-blue-200/80">
              Protocollo {done.protocol}
              {done.dueDate && (
                <> — scadenza {new Date(done.dueDate).toLocaleDateString("it-IT")}</>
              )}
            </p>
          )}
          {done.type === "rejected" && (
            <p className="mt-2 text-amber-100/90 text-sm">
              {done.contestedCount > 0
                ? `${done.contestedCount} ${done.contestedCount === 1 ? "voce contestata" : "voci contestate"}. `
                : ""}
              Il titolare manutentore potrà correggere e reinviare.
            </p>
          )}
          <button
            type="button"
            onClick={goToApprovalList}
            className={`mt-6 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium ${btnPrimaryClass}`}
          >
            Torna all&apos;elenco approvazioni
          </button>
        </div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className={`${PAGE_SCROLL_SHELL} flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4`}>
        <div className="max-w-md p-6 rounded-2xl bg-black/40 border border-red-500/30 text-red-200">
          {error || "Preventivo non trovato"}
        </div>
      </div>
    )
  }

  const lightPoint = quote.lightPointId
  const townHall = quote.townHallId

  return (
    <div className={`${PAGE_SCROLL_SHELL} flex items-start justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4 py-6 sm:py-8`}>
      <div className="w-full max-w-3xl relative overflow-hidden rounded-2xl shadow-[0_0_40px_rgba(0,149,255,0.15)]">
        <div className="relative z-10 p-6 sm:p-8 backdrop-blur-xl bg-black/40 border border-blue-500/20">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-start gap-2 min-w-0">
              <FileSpreadsheet className="h-6 w-6 text-blue-400 shrink-0 mt-1" />
              <div className="min-w-0">
                <h2 className="text-2xl font-bold text-white">Revisione preventivo</h2>
                <p className="text-xs text-blue-300/80 mt-1">
                  {QUOTE_STATUS_LABELS[quote.status] || quote.status}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <BackNavigationButton />
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                aria-label="Torna alla dashboard"
                className={`p-2 rounded-full bg-blue-500/10 hover:bg-blue-500/20 ${btnSecondaryClass}`}
              >
                <Home className="h-5 w-5 text-blue-400" />
              </button>
            </div>
          </div>

          <div className="mb-6 p-4 rounded-xl bg-blue-900/20 border border-blue-500/20 text-sm text-blue-100 space-y-1">
            <p><span className="font-medium text-blue-200">Comune:</span> {townHall?.name || "—"}</p>
            <p><span className="font-medium text-blue-200">Punto:</span> {lightPoint?.numero_palo || "—"}</p>
            <p><span className="font-medium text-blue-200">Priorità:</span> {quote.priorityClass}</p>
            <p>
              <span className="font-medium text-blue-200">Tempistica:</span>{" "}
              Materiali {quote.materialLeadDays} gg — Opera {quote.workLeadDays} gg
            </p>
            <p>
              <span className="font-medium text-blue-200">Creato da:</span>{" "}
              {quote.createdBy
                ? `${quote.createdBy.name || ""} ${quote.createdBy.surname || ""}`.trim()
                : "—"}
            </p>
          </div>

          {quote.faultDescription && (
            <div className="mb-4 p-3 rounded-xl border border-blue-500/20 bg-blue-950/30 text-sm text-blue-100">
              <p className="font-medium text-blue-200 mb-1">Descrizione guasto</p>
              <p>{quote.faultDescription}</p>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-200 flex gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-blue-200 font-medium">Voci preventivo</p>
              {canDecide && showReject && (
                <p className="text-xs text-amber-200/90">Seleziona le voci da contestare (opzionale)</p>
              )}
            </div>
            {(quote.lineItems || []).map((item, idx) => {
              const selected = selectedIndexes.has(idx)
              const lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0)
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-sm space-y-2 ${
                    selected
                      ? "bg-amber-950/30 border-amber-500/40"
                      : "bg-blue-900/10 border-blue-500/15"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {canDecide && showReject && (
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleContested(idx)}
                        className="mt-1 h-4 w-4 rounded border-amber-400/50 bg-black/40 text-amber-500 focus:ring-amber-400/40"
                        aria-label={`Contesta voce ${idx + 1}`}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-blue-100">
                        <span className="text-blue-400 font-mono text-xs">{item.materialCode || "—"}</span>
                        {" · "}
                        {item.description}
                        {item.isAdHoc ? " (NP)" : ""}
                      </p>
                      <p className="text-xs text-blue-300/80 mt-1">
                        {item.udm || "—"} × {Number(item.quantity || 0)} × € {Number(item.unitPrice || 0).toFixed(2)}
                        {" = "}
                        <span className="text-white font-medium">€ {lineTotal.toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                  {canDecide && showReject && selected && (
                    <textarea
                      rows={2}
                      placeholder={`Motivo contestazione voce ${idx + 1} *`}
                      value={contestNotes[idx] || ""}
                      onChange={(e) => setContestNotes((prev) => ({ ...prev, [idx]: e.target.value }))}
                      className={`${fieldInputClass} text-sm py-2`}
                    />
                  )}
                </div>
              )
            })}
          </div>

          <div className="mb-6 p-4 rounded-xl bg-blue-950/40 border border-blue-500/20 text-sm text-white space-y-1">
            <p className="flex justify-between"><span className="text-blue-200">Totale lordo</span><span>€ {totals.subtotal.toFixed(2)}</span></p>
            <p className="flex justify-between"><span className="text-blue-200">Oneri / sconto</span><span>€ {(totals.safetyAmount - totals.discountAmount).toFixed(2)}</span></p>
            <p className="flex justify-between font-semibold pt-2 border-t border-blue-500/20">
              <span>Totale preventivo</span><span>€ {totals.total.toFixed(2)}</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <button
              type="button"
              disabled={!!downloadingFormat}
              onClick={() => downloadFile("xlsx")}
              className={`flex-1 py-3 rounded-xl border border-blue-500/30 text-blue-100 hover:bg-blue-900/30 disabled:opacity-50 flex items-center justify-center gap-2 ${btnSecondaryClass}`}
            >
              {downloadingFormat === "xlsx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Scarica XLSX
            </button>
            {/* Scarica PDF nascosto: non ancora supportato in questo deploy */}
          </div>

          {canDecide && (
            <div className="space-y-3">
              {!showReject ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    disabled={acting}
                    onClick={handleApprove}
                    className={`flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${btnPrimaryClass}`}
                  >
                    {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Approva
                  </button>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => {
                      setShowReject(true)
                      setError("")
                    }}
                    className={`flex-1 py-3 rounded-xl border border-amber-500/40 text-amber-100 hover:bg-amber-900/20 disabled:opacity-50 ${btnSecondaryClass}`}
                  >
                    Respingi per revisione
                  </button>
                </div>
              ) : (
                <div className="space-y-3 p-4 rounded-xl border border-amber-500/30 bg-amber-950/20">
                  <label htmlFor="quote-reject-reason" className="block text-sm font-medium text-amber-100">
                    Motivo generale {selectedIndexes.size === 0 ? "*" : "(opzionale se hai contestato delle voci)"}
                  </label>
                  <textarea
                    id="quote-reject-reason"
                    rows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Es. tempistiche non coerenti, descrizione guasto incompleta…"
                    className={fieldInputClass}
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      disabled={acting}
                      onClick={handleReject}
                      className={`flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${btnPrimaryClass}`}
                    >
                      {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Conferma respingimento
                    </button>
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => {
                        setShowReject(false)
                        setSelectedIndexes(new Set())
                        setContestNotes({})
                        setRejectReason("")
                        setError("")
                      }}
                      className={`flex-1 py-3 rounded-xl border border-blue-500/30 text-blue-100 hover:bg-blue-900/30 disabled:opacity-50 ${btnSecondaryClass}`}
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!canDecide && (
            <button
              type="button"
              onClick={goToApprovalList}
              className={`w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium ${btnPrimaryClass}`}
            >
              Torna all&apos;elenco approvazioni
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

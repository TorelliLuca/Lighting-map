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

const mergeDocKeepingTownHall = (prev, next) => {
  if (!next) return next
  const prevName = townHallNameOf(prev)
  if (prevName && !townHallNameOf(next)) {
    return { ...next, townHallId: prev.townHallId }
  }
  return next
}

export default function ConsuntivoReview() {
  const { userData } = useContext(UserContext)
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const comuneFromNav = location.state?.comune || ""

  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState("")
  const [consuntivo, setConsuntivo] = useState(null)
  const [parentQuote, setParentQuote] = useState(null)
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
        if (doc.type !== "CONSUNTIVO") {
          setError("Il documento non è un consuntivo.")
          setConsuntivo(null)
          return
        }
        setConsuntivo(doc)

        if (doc.parentQuoteId) {
          const parentId = doc.parentQuoteId._id || doc.parentQuoteId
          try {
            const parentRes = await api.get(`/api/quotes/${parentId}`)
            setParentQuote(parentRes.data)
          } catch {
            setParentQuote(typeof doc.parentQuoteId === "object" ? doc.parentQuoteId : null)
          }
        }
      } catch (err) {
        console.error(err)
        setError(err.response?.data?.error || "Impossibile caricare il consuntivo.")
      } finally {
        setLoading(false)
      }
    }

    if (id) load()
  }, [userData, navigate, id])

  const totals = useMemo(
    () => computeQuoteTotalsClient(
      consuntivo?.lineItems || [],
      consuntivo?.safetyChargeRate ?? 0.02,
      consuntivo?.discountPercent ?? 0
    ),
    [consuntivo]
  )

  const parentTotal = Number(parentQuote?.total) || 0
  const exceedsParent = Boolean(parentQuote) && totals.total > parentTotal
  const canDecide = consuntivo?.status === "PENDING_APPROVAL"

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
      a.download = headerName || `${consuntivo?.protocolNumber || `IMS-C-${String(id).slice(-6)}`}.${format}`
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
      const comune = townHallNameOf(consuntivo) || comuneFromNav
      const res = await api.post(`/api/quotes/${id}/approve`)
      const nextDoc = res.data.consuntivo || res.data.quote
      setConsuntivo(mergeDocKeepingTownHall(consuntivo, nextDoc))
      setDone({
        type: "approved",
        protocol: res.data.protocolNumber,
        comune,
      })
      toast.success(`Consuntivo ${res.data.protocolNumber} approvato`)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || "Errore approvazione")
    } finally {
      setActing(false)
    }
  }

  const handleReject = async () => {
    if (selectedIndexes.size === 0) {
      setError("Selezionare almeno una voce non chiara.")
      return
    }
    const contestedLines = []
    for (const index of selectedIndexes) {
      const note = String(contestNotes[index] || "").trim()
      if (!note) {
        setError(`Indicare il motivo di contestazione per la voce ${index + 1}.`)
        return
      }
      contestedLines.push({ index, note })
    }

    setActing(true)
    setError("")
    try {
      const comune = townHallNameOf(consuntivo) || comuneFromNav
      const res = await api.post(`/api/quotes/${id}/reject`, {
        reason: rejectReason.trim(),
        contestedLines,
      })
      setConsuntivo(mergeDocKeepingTownHall(consuntivo, res.data))
      setDone({
        type: "rejected",
        contestedCount: contestedLines.length,
        comune,
      })
      toast.success("Consuntivo inviato al manutentore per revisione")
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || "Errore rifiuto")
    } finally {
      setActing(false)
    }
  }

  if (loading) {
    return (
      <div className={`${PAGE_SCROLL_SHELL} flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4`}>
        <LightbulbLoader />
      </div>
    )
  }

  const approvalQs = (() => {
    const thName = done?.comune || townHallNameOf(consuntivo) || comuneFromNav
    const params = new URLSearchParams({ tipo: "consuntivi" })
    if (thName) params.set("comune", thName)
    return `?${params.toString()}`
  })()

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
            {done.type === "approved" ? "Consuntivo approvato" : "Consuntivo da revisionare"}
          </h2>
          {done.protocol && (
            <p className="mt-2 text-blue-200/80">Protocollo {done.protocol}</p>
          )}
          {done.type === "rejected" && (
            <p className="mt-2 text-amber-100/90 text-sm">
              {done.contestedCount} {done.contestedCount === 1 ? "voce contestata" : "voci contestate"}.
              Il titolare manutentore potrà correggere e reinviare.
            </p>
          )}
          <button
            type="button"
            onClick={() => navigate(`/quotes/approval${approvalQs}`)}
            className={`mt-6 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium ${btnPrimaryClass}`}
          >
            Torna all&apos;approvazione IMS
          </button>
        </div>
      </div>
    )
  }

  if (!consuntivo) {
    return (
      <div className={`${PAGE_SCROLL_SHELL} flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4`}>
        <div className="max-w-md p-6 rounded-2xl bg-black/40 border border-red-500/30 text-red-200">
          {error || "Consuntivo non trovato"}
        </div>
      </div>
    )
  }

  const lightPoint = consuntivo.lightPointId
  const townHall = consuntivo.townHallId

  return (
    <div className={`${PAGE_SCROLL_SHELL} flex items-start justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4 py-6 sm:py-8`}>
      <div className="w-full max-w-3xl relative overflow-hidden rounded-2xl shadow-[0_0_40px_rgba(0,149,255,0.15)]">
        <div className="relative z-10 p-6 sm:p-8 backdrop-blur-xl bg-black/40 border border-blue-500/20">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-start gap-2 min-w-0">
              <FileSpreadsheet className="h-6 w-6 text-amber-400 shrink-0 mt-1" />
              <div className="min-w-0">
                <h2 className="text-2xl font-bold text-white">Revisione consuntivo</h2>
                <p className="text-xs text-blue-300/80 mt-1">
                  {QUOTE_STATUS_LABELS[consuntivo.status] || consuntivo.status}
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
            {parentQuote && (
              <>
                <p>
                  <span className="font-medium text-blue-200">Preventivo:</span>{" "}
                  {parentQuote.protocolNumber || parentQuote._id}
                </p>
                <p>
                  <span className="font-medium text-blue-200">Totale preventivo:</span>{" "}
                  € {parentTotal.toFixed(2)}
                </p>
              </>
            )}
            <p>
              <span className="font-medium text-blue-200">Creato da:</span>{" "}
              {consuntivo.createdBy
                ? `${consuntivo.createdBy.name || ""} ${consuntivo.createdBy.surname || ""}`.trim()
                : "—"}
            </p>
          </div>

          {exceedsParent && (
            <div role="status" className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-100 text-sm flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Il totale consuntivo (€ {totals.total.toFixed(2)}) supera il preventivo
                di € {(totals.total - parentTotal).toFixed(2)}.
              </p>
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
              <p className="text-sm text-blue-200 font-medium">Voci consuntivo</p>
              {canDecide && showReject && (
                <p className="text-xs text-amber-200/90">Seleziona le voci non chiare</p>
              )}
            </div>
            {(consuntivo.lineItems || []).map((item, idx) => {
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
              <span>Totale consuntivo</span><span>€ {totals.total.toFixed(2)}</span>
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
                    Approva e finalizza
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
                    Rifiuta con contestazioni
                  </button>
                </div>
              ) : (
                <div className="space-y-3 p-4 rounded-xl border border-amber-500/30 bg-amber-950/20">
                  <label htmlFor="consuntivo-reject-reason" className="block text-sm font-medium text-amber-100">
                    Nota generale (opzionale)
                  </label>
                  <textarea
                    id="consuntivo-reject-reason"
                    rows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Eventuale commento complessivo per il manutentore…"
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
                      Conferma rifiuto
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
              onClick={() => navigate(`/quotes/approval${approvalQs}`)}
              className={`w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium ${btnPrimaryClass}`}
            >
              Torna all&apos;approvazione IMS
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

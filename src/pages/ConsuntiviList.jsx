"use client"

import { useState, useEffect, useContext, useMemo, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { UserContext, api } from "../context/UserContext"
import {
  AlertCircle,
  ClipboardCheck,
  Eye,
  FileSpreadsheet,
  Home,
  Pencil,
  Trash2,
} from "lucide-react"
import toast from "react-hot-toast"
import { LightbulbLoader } from "../components/lightbulb-loader"
import { BackNavigationButton } from "../components/BackNavigationButton"
import ConfirmDialog from "../components/ui/ConfirmDialog"
import { QuoteStatusBadge } from "../components/ui/QuoteStatusBadge"
import { RiskClassBadge } from "../components/ui/RiskClassBadge"
import {
  formatReportFaultLabel,
  canManageQuotesByRole,
  canApproveQuoteByRole,
  QUOTE_EDITABLE_STATUSES,
} from "../utils/utils"
import { PAGE_SCROLL_SHELL, TABLE_SCROLL_X } from "../utils/pageScrollShell"

const EDITABLE = new Set(QUOTE_EDITABLE_STATUSES)

const reportLabel = (doc) => {
  const report = doc.reportId
  if (!report) return "—"
  const type = formatReportFaultLabel(report)
  const date = report.report_date
    ? new Date(report.report_date).toLocaleDateString("it-IT")
    : ""
  return [type, date].filter(Boolean).join(" · ")
}

const parentLabel = (doc) => {
  const parent = doc.parentQuoteId
  if (!parent) return "—"
  if (typeof parent === "object") {
    return parent.protocolNumber || parent._id || "—"
  }
  return String(parent)
}

const ConsuntivoListActions = ({
  doc,
  editable,
  reviewable,
  onOpen,
  onDelete,
}) => (
  <div className="flex flex-wrap items-center justify-end gap-2">
    <button
      type="button"
      onClick={() => onOpen(doc)}
      className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-100 border border-amber-500/30 min-h-11 text-sm"
      title={reviewable ? "Revisiona" : editable ? "Modifica" : "Apri"}
    >
      {reviewable ? (
        <ClipboardCheck className="h-3.5 w-3.5" />
      ) : editable ? (
        <Pencil className="h-3.5 w-3.5" />
      ) : (
        <Eye className="h-3.5 w-3.5" />
      )}
      {reviewable ? "Revisiona" : editable ? "Modifica" : "Apri"}
    </button>
    {editable && doc.status === "DRAFT" && (
      <button
        type="button"
        onClick={() => onDelete(doc)}
        className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-100 border border-red-500/30 min-h-11 text-sm"
        title="Elimina bozza"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Elimina
      </button>
    )}
  </div>
)

const ConsuntivoMobileCard = ({
  doc,
  editable,
  reviewable,
  onOpen,
  onDelete,
}) => (
  <article className="bg-black/40 p-4 rounded-xl border border-blue-500/20 space-y-3">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-white font-semibold">
          PL {doc.lightPointId?.numero_palo || "—"}
        </p>
        <p className="text-sm text-blue-200/90 mt-0.5">
          Preventivo {parentLabel(doc)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <QuoteStatusBadge status={doc.status} />
        <RiskClassBadge
          riskClass={doc.priorityClass || doc.parentQuoteId?.priorityClass}
        />
      </div>
    </div>

    <p className="text-sm text-blue-100 break-words">{reportLabel(doc)}</p>

    {doc.protocolNumber ? (
      <p className="text-xs text-amber-300/80 font-mono">{doc.protocolNumber}</p>
    ) : null}

    <div className="flex items-center justify-between gap-3 text-sm">
      <p className="text-white font-medium whitespace-nowrap">
        € {Number(doc.total || 0).toFixed(2)}
      </p>
      <p className="text-blue-200/80 text-xs text-right">
        {doc.updatedAt
          ? new Date(doc.updatedAt).toLocaleString("it-IT")
          : "—"}
      </p>
    </div>

    <div className="pt-1 border-t border-blue-500/15">
      <ConsuntivoListActions
        doc={doc}
        editable={editable}
        reviewable={reviewable}
        onOpen={onOpen}
        onDelete={onDelete}
      />
    </div>
  </article>
)

export default function ConsuntiviList() {
  const { userData } = useContext(UserContext)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const comune = searchParams.get("comune") || ""

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [items, setItems] = useState([])
  const [statusFilter, setStatusFilter] = useState("DRAFT,PENDING_APPROVAL,REJECTED,NEEDS_REVISION,APPROVED")

  const [confirmDelete, setConfirmDelete] = useState({ open: false, item: null })
  const [deleting, setDeleting] = useState(false)

  const canManage = useMemo(
    () => canManageQuotesByRole(userData),
    [userData]
  )
  const canApprove = useMemo(
    () => canApproveQuoteByRole(userData),
    [userData]
  )

  const loadItems = useCallback(async () => {
    if (!comune) return
    try {
      setLoading(true)
      setError("")
      const res = await api.get("/api/quotes", {
        params: {
          townHallName: comune,
          type: "CONSUNTIVO",
          status: statusFilter,
        },
      })
      setItems(res.data || [])
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || "Impossibile caricare i consuntivi.")
    } finally {
      setLoading(false)
    }
  }, [comune, statusFilter])

  useEffect(() => {
    if (!userData) {
      navigate("/")
      return
    }
    if (!canManage && canApprove) {
      const qs = comune
        ? `?comune=${encodeURIComponent(comune)}&tipo=consuntivi`
        : "?tipo=consuntivi"
      navigate(`/quotes/approval${qs}`, { replace: true })
      return
    }
    if (!canManage && !canApprove) {
      navigate("/dashboard")
      return
    }
    if (!comune) {
      setError("Seleziona un comune dalla dashboard.")
      setLoading(false)
      return
    }
    loadItems()
  }, [userData, canManage, canApprove, comune, navigate, loadItems])

  const handleDelete = async () => {
    if (!confirmDelete.item?._id) return
    setDeleting(true)
    try {
      await api.delete(`/api/quotes/${confirmDelete.item._id}`)
      toast.success("Consuntivo eliminato")
      setConfirmDelete({ open: false, item: null })
      await loadItems()
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.error || "Errore eliminazione")
    } finally {
      setDeleting(false)
    }
  }

  const openDoc = (doc) => {
    if (canApprove && doc.status === "PENDING_APPROVAL") {
      navigate(`/consuntivo/${doc._id}/review`)
      return
    }
    navigate(`/consuntivo/${doc._id}`)
  }

  const filterOptions = [
    { value: "DRAFT,PENDING_APPROVAL,REJECTED,NEEDS_REVISION,APPROVED", label: "Tutti" },
    { value: "DRAFT,REJECTED,NEEDS_REVISION", label: "Bozze / da revisionare" },
    { value: "PENDING_APPROVAL", label: "In approvazione" },
    { value: "APPROVED", label: "Approvati" },
  ]

  return (
    <div className={`${PAGE_SCROLL_SHELL} bg-gradient-to-br from-black via-blue-950 to-black p-4 sm:p-6`}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6" data-tour="page-consuntivi-title">
          <div className="flex items-center gap-3 min-w-0">
            <BackNavigationButton />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="h-6 w-6 text-amber-400 shrink-0" />
                Consuntivi IMS
              </h1>
              <p className="text-sm text-blue-300/80 truncate">{comune || "Nessun comune"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="p-2 rounded-full bg-blue-500/10 hover:bg-blue-500/20"
          >
            <Home className="h-5 w-5 text-blue-400" />
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2" data-tour="page-consuntivi-filters">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                statusFilter === opt.value
                  ? "bg-amber-600/40 border-amber-400 text-white"
                  : "bg-blue-900/20 border-blue-500/30 text-blue-200 hover:bg-blue-900/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LightbulbLoader />
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-200 flex gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 rounded-xl bg-black/40 border border-blue-500/20 text-center text-blue-200/80">
            Nessun consuntivo con i filtri selezionati.
            <p className="mt-2 text-sm text-blue-300/70">
              I consuntivi si creano dopo la chiusura di un intervento straordinario.
            </p>
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {items.map((doc) => {
                const editable = canManage && EDITABLE.has(doc.status)
                const reviewable = canApprove && doc.status === "PENDING_APPROVAL"
                return (
                  <ConsuntivoMobileCard
                    key={doc._id}
                    doc={doc}
                    editable={editable}
                    reviewable={reviewable}
                    onOpen={openDoc}
                    onDelete={(item) => setConfirmDelete({ open: true, item })}
                  />
                )
              })}
            </div>

            <div className={`hidden md:block ${TABLE_SCROLL_X} rounded-xl border border-blue-500/20 bg-black/40`}>
              <table className="w-full text-sm text-left">
                <thead className="text-blue-300 border-b border-blue-500/20 bg-blue-950/40">
                  <tr>
                    <th className="px-4 py-3 font-medium">Punto luce</th>
                    <th className="px-4 py-3 font-medium">Preventivo</th>
                    <th className="px-4 py-3 font-medium">Segnalazione</th>
                    <th className="px-4 py-3 font-medium">Classe</th>
                    <th className="px-4 py-3 font-medium">Totale</th>
                    <th className="px-4 py-3 font-medium">Stato</th>
                    <th className="px-4 py-3 font-medium">Aggiornato</th>
                    <th className="px-4 py-3 font-medium text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((doc) => {
                    const editable = canManage && EDITABLE.has(doc.status)
                    const reviewable = canApprove && doc.status === "PENDING_APPROVAL"
                    return (
                      <tr key={doc._id} className="border-b border-blue-500/10 hover:bg-blue-900/20">
                        <td className="px-4 py-3 text-white font-medium">
                          {doc.lightPointId?.numero_palo || "—"}
                        </td>
                        <td className="px-4 py-3 text-blue-100">{parentLabel(doc)}</td>
                        <td className="px-4 py-3 text-blue-100">{reportLabel(doc)}</td>
                        <td className="px-4 py-3">
                          <RiskClassBadge
                            riskClass={doc.priorityClass || doc.parentQuoteId?.priorityClass}
                          />
                        </td>
                        <td className="px-4 py-3 text-blue-100">
                          € {Number(doc.total || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <QuoteStatusBadge status={doc.status} />
                          {doc.protocolNumber ? (
                            <span className="block text-xs text-amber-300/80 mt-0.5">{doc.protocolNumber}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-blue-200/80">
                          {doc.updatedAt
                            ? new Date(doc.updatedAt).toLocaleString("it-IT")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <ConsuntivoListActions
                            doc={doc}
                            editable={editable}
                            reviewable={reviewable}
                            onOpen={openDoc}
                            onDelete={(item) => setConfirmDelete({ open: true, item })}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDelete.open}
        title="Eliminare la bozza consuntivo?"
        description="L'operazione non è reversibile. Potrai creare di nuovo il consuntivo dal preventivo collegato."
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant="danger"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ open: false, item: null })}
      />
    </div>
  )
}

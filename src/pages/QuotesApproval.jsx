"use client"

import { useState, useEffect, useContext, useCallback, useMemo } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { UserContext, api } from "../context/UserContext"
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Home,
} from "lucide-react"
import { LightbulbLoader } from "../components/lightbulb-loader"
import { BackNavigationButton } from "../components/BackNavigationButton"
import { QuoteStatusBadge } from "../components/ui/QuoteStatusBadge"
import { RiskClassBadge } from "../components/ui/RiskClassBadge"
import { canApproveQuoteByRole, formatReportFaultLabel } from "../utils/utils"
import { PAGE_SCROLL_SHELL, TABLE_SCROLL_X } from "../utils/pageScrollShell"

const TYPE_FILTERS = [
  { value: "QUOTE", label: "Preventivi" },
  { value: "CONSUNTIVO", label: "Consuntivi" },
]

const STATUS_FILTERS_QUOTE = [
  { value: "PENDING_APPROVAL,APPROVED", label: "Tutti" },
  { value: "PENDING_APPROVAL", label: "In approvazione" },
  { value: "APPROVED", label: "Approvati" },
]

const STATUS_FILTERS_CONSUNTIVO = [
  { value: "PENDING_APPROVAL,APPROVED,REJECTED,NEEDS_REVISION", label: "Tutti" },
  { value: "PENDING_APPROVAL", label: "In revisione" },
  { value: "APPROVED", label: "Approvati" },
  { value: "REJECTED,NEEDS_REVISION", label: "Da revisionare" },
]

const normalizeDocType = (raw) => {
  const value = String(raw || "").toUpperCase()
  if (value === "CONSUNTIVO" || value === "CONSUNTIVI") return "CONSUNTIVO"
  return "QUOTE"
}

const reportLabel = (doc) => {
  const report = doc.reportId
  if (!report) return "—"
  const type = formatReportFaultLabel(report)
  const date = report.report_date
    ? new Date(report.report_date).toLocaleDateString("it-IT")
    : ""
  return [type, date].filter(Boolean).join(" · ")
}

const leadDays = (doc) =>
  (Number(doc.materialLeadDays) || 0) + (Number(doc.workLeadDays) || 0)

const parentLabel = (doc) => {
  const parent = doc.parentQuoteId
  if (!parent) return "—"
  if (typeof parent === "object") {
    return parent.protocolNumber || parent._id || "—"
  }
  return String(parent)
}

const ApprovalActionButton = ({ pending, onClick, className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border min-h-11 text-sm ${
      pending
        ? "bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-100 border-emerald-500/30"
        : "bg-blue-600/20 hover:bg-blue-600/40 text-blue-100 border-blue-500/30"
    } ${className}`}
  >
    {pending ? (
      <CheckCircle2 className="h-3.5 w-3.5" />
    ) : (
      <Eye className="h-3.5 w-3.5" />
    )}
    {pending ? "Revisiona" : "Visualizza"}
  </button>
)

const ApprovalMobileCard = ({ doc, isConsuntivo, onOpen }) => {
  const pending = doc.status === "PENDING_APPROVAL"
  return (
    <article className="bg-black/40 p-4 rounded-xl border border-blue-500/20 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-white font-semibold">
            PL {doc.lightPointId?.numero_palo || "—"}
          </p>
          {isConsuntivo ? (
            <p className="text-sm text-blue-200/90 mt-0.5">
              Preventivo {parentLabel(doc)}
            </p>
          ) : null}
          <p className="text-sm text-blue-100 mt-1 break-words">{reportLabel(doc)}</p>
        </div>
        {!isConsuntivo ? (
          <RiskClassBadge riskClass={doc.priorityClass} className="shrink-0" />
        ) : (
          <RiskClassBadge
            riskClass={doc.priorityClass || doc.parentQuoteId?.priorityClass}
            className="shrink-0"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <QuoteStatusBadge status={doc.status} />
        {doc.protocolNumber ? (
          <span className="text-xs text-emerald-300/80 font-mono">{doc.protocolNumber}</span>
        ) : null}
        {!isConsuntivo ? (
          <span className="text-sm text-blue-100">
            {leadDays(doc)} gg
            <span className="text-xs text-blue-300/70">
              {" "}(Mat. {doc.materialLeadDays || 0} + Op. {doc.workLeadDays || 0})
            </span>
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 pt-1 border-t border-blue-500/15">
        <p className="text-white font-medium whitespace-nowrap">
          € {Number(doc.total || 0).toFixed(2)}
        </p>
        <ApprovalActionButton pending={pending} onClick={() => onOpen(doc)} />
      </div>
    </article>
  )
}

export default function QuotesApproval() {
  const { userData } = useContext(UserContext)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const comune = searchParams.get("comune") || ""
  const typeFilter = normalizeDocType(searchParams.get("tipo") || searchParams.get("type"))

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [items, setItems] = useState([])
  const [statusFilter, setStatusFilter] = useState(
    typeFilter === "CONSUNTIVO"
      ? "PENDING_APPROVAL,APPROVED,REJECTED,NEEDS_REVISION"
      : "PENDING_APPROVAL,APPROVED"
  )

  const statusFilters = typeFilter === "CONSUNTIVO"
    ? STATUS_FILTERS_CONSUNTIVO
    : STATUS_FILTERS_QUOTE

  const isConsuntivo = typeFilter === "CONSUNTIVO"

  const goToDashboard = useCallback(() => {
    if (comune) {
      navigate("/dashboard", { state: { comune } })
      return
    }
    navigate("/dashboard")
  }, [navigate, comune])

  const infoText = useMemo(() => {
    if (isConsuntivo) {
      return "Consuntivi in attesa di revisione RUP, già approvati o rifiutati. In caso di rifiuto puoi indicare le voci non chiare; il manutentore corregge e reinoltra."
    }
    return "Preventivi in attesa di decisione DEC/RUP e già approvati. All'approvazione verrà creata una segnalazione straordinaria sul punto luce con scadenza calcolata dai giorni materiale + opera."
  }, [isConsuntivo])

  const setTypeFilter = (nextType) => {
    const normalized = normalizeDocType(nextType)
    const next = new URLSearchParams(searchParams)
    next.set("tipo", normalized === "CONSUNTIVO" ? "consuntivi" : "preventivi")
    if (comune) next.set("comune", comune)
    setSearchParams(next, { replace: true })
    setStatusFilter(
      normalized === "CONSUNTIVO"
        ? "PENDING_APPROVAL,APPROVED,REJECTED,NEEDS_REVISION"
        : "PENDING_APPROVAL,APPROVED"
    )
  }

  const loadItems = useCallback(async () => {
    if (!comune) return
    try {
      setLoading(true)
      setError("")
      const res = await api.get("/api/quotes", {
        params: {
          townHallName: comune,
          type: typeFilter,
          status: statusFilter,
        },
      })
      setItems(res.data || [])
    } catch (err) {
      console.error(err)
      setError(
        err.response?.data?.error
        || (isConsuntivo
          ? "Impossibile caricare i consuntivi in approvazione."
          : "Impossibile caricare i preventivi in approvazione.")
      )
    } finally {
      setLoading(false)
    }
  }, [comune, typeFilter, statusFilter, isConsuntivo])

  useEffect(() => {
    if (!userData) {
      navigate("/")
      return
    }
    if (!canApproveQuoteByRole(userData)) {
      navigate("/dashboard")
      return
    }
    if (!comune) {
      setError("Seleziona un comune dalla dashboard.")
      setLoading(false)
      return
    }
    loadItems()
  }, [userData, comune, navigate, loadItems])

  const openDoc = (doc) => {
    const navState = comune ? { comune } : undefined
    if (doc.type === "CONSUNTIVO" || isConsuntivo) {
      if (doc.status === "PENDING_APPROVAL") {
        navigate(`/consuntivo/${doc._id}/review`, { state: navState })
        return
      }
      navigate(`/consuntivo/${doc._id}`, { state: navState })
      return
    }
    navigate(`/quote/${doc._id}/review`, { state: navState })
  }

  return (
    <div className={`${PAGE_SCROLL_SHELL} bg-gradient-to-br from-black via-blue-950 to-black p-4 sm:p-6`}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6" data-tour="page-approval-title">
          <div className="flex items-center gap-3 min-w-0">
            <BackNavigationButton onClick={goToDashboard} />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <ClipboardCheck className="h-6 w-6 text-emerald-400 shrink-0" />
                Approvazione IMS
              </h1>
              <p className="text-sm text-blue-300/80 truncate">{comune || "Nessun comune"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={goToDashboard}
            className="p-2 rounded-full bg-blue-500/10 hover:bg-blue-500/20"
          >
            <Home className="h-5 w-5 text-blue-400" />
          </button>
        </div>

        <div className="mb-4 p-3 rounded-xl bg-emerald-900/20 border border-emerald-500/30 text-sm text-emerald-100">
          {infoText}
        </div>

        <div className="mb-3 flex flex-wrap gap-2" data-tour="page-approval-type">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setTypeFilter(filter.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                typeFilter === filter.value
                  ? "bg-blue-600/40 border-blue-400/50 text-blue-50"
                  : "bg-black/30 border-blue-500/20 text-blue-200 hover:bg-blue-900/30"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2" data-tour="page-approval-status">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                statusFilter === filter.value
                  ? "bg-emerald-600/40 border-emerald-400/50 text-emerald-50"
                  : "bg-black/30 border-blue-500/20 text-blue-200 hover:bg-blue-900/30"
              }`}
            >
              {filter.label}
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
            {isConsuntivo
              ? "Nessun consuntivo trovato per questo filtro."
              : "Nessun preventivo trovato per questo filtro."}
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {items.map((doc) => (
                <ApprovalMobileCard
                  key={doc._id}
                  doc={doc}
                  isConsuntivo={isConsuntivo}
                  onOpen={openDoc}
                />
              ))}
            </div>

            <div className={`hidden md:block ${TABLE_SCROLL_X} rounded-xl border border-blue-500/20 bg-black/40`}>
              <table className="w-full text-sm text-left">
                <thead className="text-blue-300 border-b border-blue-500/20 bg-blue-950/40">
                  <tr>
                    <th className="px-4 py-3 font-medium">Punto luce</th>
                    {isConsuntivo ? (
                      <th className="px-4 py-3 font-medium">Preventivo</th>
                    ) : null}
                    <th className="px-4 py-3 font-medium">Segnalazione</th>
                    <th className="px-4 py-3 font-medium">Classe</th>
                    {!isConsuntivo ? (
                      <th className="px-4 py-3 font-medium">Tempistica</th>
                    ) : null}
                    <th className="px-4 py-3 font-medium">Totale</th>
                    <th className="px-4 py-3 font-medium">Stato</th>
                    <th className="px-4 py-3 font-medium text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((doc) => {
                    const pending = doc.status === "PENDING_APPROVAL"
                    return (
                      <tr key={doc._id} className="border-b border-blue-500/10 hover:bg-blue-900/20">
                        <td className="px-4 py-3 text-white font-medium">
                          {doc.lightPointId?.numero_palo || "—"}
                        </td>
                        {isConsuntivo ? (
                          <td className="px-4 py-3 text-blue-100">{parentLabel(doc)}</td>
                        ) : null}
                        <td className="px-4 py-3 text-blue-100">{reportLabel(doc)}</td>
                        <td className="px-4 py-3">
                          <RiskClassBadge
                            riskClass={
                              doc.priorityClass || doc.parentQuoteId?.priorityClass
                            }
                          />
                        </td>
                        {!isConsuntivo ? (
                          <td className="px-4 py-3 text-blue-100">
                            {leadDays(doc)} gg
                            <span className="block text-xs text-blue-300/70">
                              Mat. {doc.materialLeadDays || 0} + Op. {doc.workLeadDays || 0}
                            </span>
                          </td>
                        ) : null}
                        <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                          € {Number(doc.total || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <QuoteStatusBadge status={doc.status} />
                          {doc.protocolNumber ? (
                            <span className="block text-xs text-emerald-300/80 mt-0.5">
                              {doc.protocolNumber}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <ApprovalActionButton
                            pending={pending}
                            onClick={() => openDoc(doc)}
                            className="min-h-0 py-1.5"
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
    </div>
  )
}

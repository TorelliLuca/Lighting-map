"use client"

import { useState, useEffect, useContext, useCallback, useMemo } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { UserContext, api } from "../context/UserContext"
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
} from "lucide-react"
import { LightbulbLoader } from "../components/lightbulb-loader"
import { BackNavigationButton } from "../components/BackNavigationButton"
import {
  GoToLightPointButton,
  LightPointMapLink,
} from "../components/GoToLightPointControl"
import InfoTooltip from "../components/ui/InfoTooltip"
import { QuoteStatusBadge } from "../components/ui/QuoteStatusBadge"
import { RiskClassBadge } from "../components/ui/RiskClassBadge"
import { canApproveQuoteByRole, formatReportFaultLabel } from "../utils/utils"
import { PAGE_SCROLL_SHELL, TABLE_SCROLL_X } from "../utils/pageScrollShell"

const TYPE_FILTERS = [
  { value: "QUOTE", label: "Preventivi" },
  { value: "CONSUNTIVO", label: "Consuntivi" },
]

const STATUS_FILTERS_QUOTE = [
  { value: "PENDING_APPROVAL", label: "In approvazione" },
  { value: "APPROVED", label: "Approvati" },
  { value: "PENDING_APPROVAL,APPROVED", label: "Tutti" },
]

const STATUS_FILTERS_CONSUNTIVO = [
  { value: "PENDING_APPROVAL", label: "In revisione" },
  { value: "APPROVED", label: "Approvati" },
  { value: "REJECTED,NEEDS_REVISION", label: "Da revisionare" },
  { value: "PENDING_APPROVAL,APPROVED,REJECTED,NEEDS_REVISION", label: "Tutti" },
]

const ALL_STATUS_BY_TYPE = {
  QUOTE: "PENDING_APPROVAL,APPROVED",
  CONSUNTIVO: "PENDING_APPROVAL,APPROVED,REJECTED,NEEDS_REVISION",
}

const DEFAULT_STATUS = "PENDING_APPROVAL"

const normalizeDocType = (raw) => {
  const value = String(raw || "").toUpperCase()
  if (value === "CONSUNTIVO" || value === "CONSUNTIVI") return "CONSUNTIVO"
  return "QUOTE"
}

const statusFiltersForType = (type) =>
  type === "CONSUNTIVO" ? STATUS_FILTERS_CONSUNTIVO : STATUS_FILTERS_QUOTE

const normalizeStatusFilter = (raw, type) => {
  const filters = statusFiltersForType(type)
  const value = String(raw || "").trim()
  if (filters.some((f) => f.value === value)) return value
  return DEFAULT_STATUS
}

const matchesStatusFilter = (docStatus, filterValue) => {
  const allowed = String(filterValue)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  return allowed.includes(docStatus)
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
    className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border min-h-11 text-sm cursor-pointer transition-colors duration-150 ${
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

const ApprovalMobileCard = ({ doc, isConsuntivo, comune, navigate, onOpen }) => {
  const pending = doc.status === "PENDING_APPROVAL"
  return (
    <article
      className={`p-4 rounded-xl border space-y-3 ${
        pending
          ? "bg-emerald-950/30 border-emerald-500/30"
          : "bg-black/40 border-blue-500/20"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-white font-semibold">
            <LightPointMapLink
              lightPoint={doc.lightPointId}
              comune={comune}
              navigate={navigate}
              prefix="PL "
              className="font-semibold text-white hover:text-blue-100"
            />
          </p>
          {isConsuntivo ? (
            <p className="text-sm text-blue-200/90 mt-0.5">
              Preventivo {parentLabel(doc)}
            </p>
          ) : null}
          <p className="text-sm text-blue-100 mt-1 break-words">{reportLabel(doc)}</p>
        </div>
        <RiskClassBadge
          riskClass={doc.priorityClass || doc.parentQuoteId?.priorityClass}
          className="shrink-0"
        />
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 border-t border-blue-500/15">
        <p className="text-white font-medium whitespace-nowrap">
          € {Number(doc.total || 0).toFixed(2)}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <GoToLightPointButton
            lightPoint={doc.lightPointId}
            comune={comune}
            navigate={navigate}
          />
          <ApprovalActionButton pending={pending} onClick={() => onOpen(doc)} />
        </div>
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
  const statusFilter = normalizeStatusFilter(
    searchParams.get("stato"),
    typeFilter
  )

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [allItems, setAllItems] = useState([])

  const statusFilters = statusFiltersForType(typeFilter)
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
      return "Consuntivi in attesa di revisione RUP, già approvati o rifiutati. In caso di rifiuto puoi contestare voci specifiche e/o lasciare un motivo generale; il manutentore corregge e reinoltra."
    }
    return "Preventivi in attesa di decisione DEC/RUP e già approvati. All'approvazione verrà creata una segnalazione straordinaria sul punto luce con scadenza calcolata dai giorni materiale + opera."
  }, [isConsuntivo])

  const updateParams = useCallback(
    ({ tipo, stato } = {}) => {
      const next = new URLSearchParams(searchParams)
      if (comune) next.set("comune", comune)
      if (tipo != null) {
        next.set("tipo", tipo === "CONSUNTIVO" ? "consuntivi" : "preventivi")
      }
      if (stato != null) {
        next.set("stato", stato)
      }
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams, comune]
  )

  const setTypeFilter = (nextType) => {
    const normalized = normalizeDocType(nextType)
    updateParams({ tipo: normalized, stato: DEFAULT_STATUS })
  }

  const setStatusFilter = (nextStatus) => {
    updateParams({ stato: normalizeStatusFilter(nextStatus, typeFilter) })
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
          status: ALL_STATUS_BY_TYPE[typeFilter],
        },
      })
      setAllItems(res.data || [])
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
  }, [comune, typeFilter, isConsuntivo])

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

  // Normalizza URL se manca/è invalido lo stato
  useEffect(() => {
    const raw = searchParams.get("stato")
    const normalized = normalizeStatusFilter(raw, typeFilter)
    if (raw === normalized) return
    const next = new URLSearchParams(searchParams)
    if (comune) next.set("comune", comune)
    next.set("stato", normalized)
    setSearchParams(next, { replace: true })
  }, [searchParams, typeFilter, comune, setSearchParams])

  const statusCounts = useMemo(() => {
    const counts = {}
    for (const filter of statusFilters) {
      counts[filter.value] = allItems.filter((doc) =>
        matchesStatusFilter(doc.status, filter.value)
      ).length
    }
    return counts
  }, [allItems, statusFilters])

  const items = useMemo(
    () => allItems.filter((doc) => matchesStatusFilter(doc.status, statusFilter)),
    [allItems, statusFilter]
  )

  const pendingCount = statusCounts[DEFAULT_STATUS] || 0

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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6" data-tour="page-approval-title">
          <BackNavigationButton onClick={goToDashboard} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2 min-w-0">
                <ClipboardCheck className="h-6 w-6 text-emerald-400 shrink-0" />
                <span className="truncate">Approvazione IMS</span>
              </h1>
              <InfoTooltip text={infoText} />
            </div>
            <p className="text-sm text-blue-300/80 truncate">{comune || "Nessun comune"}</p>
          </div>
        </div>

        <div
          className="mb-4 p-1 rounded-xl bg-black/40 border border-blue-500/20 inline-flex w-full sm:w-auto"
          role="tablist"
          aria-label="Tipo documento"
          data-tour="page-approval-type"
        >
          {TYPE_FILTERS.map((filter) => {
            const active = typeFilter === filter.value
            return (
              <button
                key={filter.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTypeFilter(filter.value)}
                className={`flex-1 sm:flex-none min-h-11 px-5 rounded-lg text-sm font-semibold cursor-pointer transition-colors duration-150 ${
                  active
                    ? "bg-blue-700/80 text-blue-50 shadow-sm"
                    : "text-blue-300 hover:bg-blue-900/40 hover:text-blue-100"
                }`}
              >
                {filter.label}
              </button>
            )
          })}
        </div>

        <div
          className={`mb-5 grid gap-2 ${
            isConsuntivo
              ? "grid-cols-2 lg:grid-cols-4"
              : "grid-cols-3"
          }`}
          data-tour="page-approval-status"
          role="group"
          aria-label="Filtro stato"
        >
          {statusFilters.map((filter) => {
            const active = statusFilter === filter.value
            const count = statusCounts[filter.value] ?? 0
            const isPendingBucket = filter.value === DEFAULT_STATUS
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                aria-pressed={active}
                className={`text-left rounded-xl border px-3 py-3 min-h-11 cursor-pointer transition-colors duration-150 ${
                  active
                    ? isPendingBucket
                      ? "bg-emerald-600/25 border-emerald-400/50 text-emerald-50"
                      : "bg-blue-600/30 border-blue-400/50 text-blue-50"
                    : "bg-black/30 border-blue-500/20 text-blue-200 hover:bg-blue-900/30"
                }`}
              >
                <span className="block text-xs sm:text-sm text-blue-300/90 truncate">
                  {filter.label}
                </span>
                <span className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-semibold tabular-nums text-white">
                    {loading ? "—" : count}
                  </span>
                  {isPendingBucket && !loading && count > 0 ? (
                    <span className="text-[11px] uppercase tracking-wide text-emerald-300/90">
                      in coda
                    </span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>

        {!loading && !error && allItems.length > 0 ? (
          <div className="mb-3 flex items-center justify-between gap-2 text-sm text-blue-300/80">
            <p>
              {items.length === 1
                ? "1 documento"
                : `${items.length} documenti`}
              {statusFilter === DEFAULT_STATUS && pendingCount > 0
                ? " da esaminare"
                : ""}
            </p>
          </div>
        ) : null}

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
            {statusFilter === DEFAULT_STATUS
              ? isConsuntivo
                ? "Nessun consuntivo in attesa di revisione."
                : "Nessun preventivo in attesa di approvazione."
              : isConsuntivo
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
                  comune={comune}
                  navigate={navigate}
                  onOpen={openDoc}
                />
              ))}
            </div>

            <div className={`hidden md:block ${TABLE_SCROLL_X} rounded-xl border border-blue-500/20 bg-black/40`}>
              <table className="w-full text-sm text-left">
                <thead className="text-blue-300 border-b border-blue-500/20 bg-blue-950/80 sticky top-0 z-10 backdrop-blur-sm">
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
                      <tr
                        key={doc._id}
                        className={`border-b border-blue-500/10 transition-colors duration-150 ${
                          pending
                            ? "bg-emerald-950/20 hover:bg-emerald-900/30"
                            : "hover:bg-blue-900/20"
                        }`}
                      >
                        <td className="px-4 py-3 text-white font-medium">
                          <LightPointMapLink
                            lightPoint={doc.lightPointId}
                            comune={comune}
                            navigate={navigate}
                            className="font-medium"
                          />
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
                            <span className="block text-xs text-emerald-300/80 mt-0.5 font-mono">
                              {doc.protocolNumber}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex flex-wrap items-center justify-end gap-2">
                            <GoToLightPointButton
                              lightPoint={doc.lightPointId}
                              comune={comune}
                              navigate={navigate}
                              className="min-h-0 py-1.5"
                            />
                            <ApprovalActionButton
                              pending={pending}
                              onClick={() => openDoc(doc)}
                              className="min-h-0 py-1.5"
                            />
                          </div>
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

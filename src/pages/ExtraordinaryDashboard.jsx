"use client"

import { useState, useEffect, useContext, useMemo, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { UserContext, api } from "../context/UserContext"
import {
  AlertCircle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Hexagon,
  Home,
  MapPin,
  Search,
  X,
} from "lucide-react"
import toast from "react-hot-toast"
import { LightbulbLoader } from "../components/lightbulb-loader"
import { BackNavigationButton } from "../components/BackNavigationButton"
import { StatCard } from "../components/ui/StatCard"
import { DueStatusBadge, compareDueUrgency, DUE_LABELS } from "../components/ui/DueStatusBadge"
import { WorkflowStatusBadge } from "../components/ui/WorkflowStatusBadge"
import { QuoteStatusBadge } from "../components/ui/QuoteStatusBadge"
import { RiskClassBadge } from "../components/ui/RiskClassBadge"
import { PAGE_SCROLL_SHELL, TABLE_SCROLL_X } from "../utils/pageScrollShell"
import LegendGlass from "../components/LegendGlass"

import {
  canResolveExtraordinaryReport,
  QUOTE_STATUS_LABELS,
  WORKFLOW_STATUS_LABELS,
} from "../utils/utils"
import {
  denyUnauthorizedComuneAccess,
  guardComuneAccess,
  isTownHallAccessDeniedError,
} from "../utils/townHallAccess"

const PAGE_SIZE = 15

/** Colori allineati ai badge Due / Quote della lista. */
const EXTRAORDINARY_LEGEND_ITEMS = [
  { label: DUE_LABELS.overdue, color: "#f87171" },
  { label: DUE_LABELS.soon, color: "#fbbf24" },
  { label: DUE_LABELS.ok, color: "#34d399" },
  { label: DUE_LABELS.none, color: "#94a3b8" },
  { label: `Preventivo: ${QUOTE_STATUS_LABELS.DRAFT}`, color: "#94a3b8" },
  { label: `Preventivo: ${QUOTE_STATUS_LABELS.PENDING_APPROVAL}`, color: "#fbbf24" },
  { label: `Preventivo: ${QUOTE_STATUS_LABELS.APPROVED}`, color: "#34d399" },
  { label: `Preventivo: ${QUOTE_STATUS_LABELS.NEEDS_REVISION}`, color: "#fbbf24" },
  { label: `Preventivo: ${QUOTE_STATUS_LABELS.REJECTED}`, color: "#f87171" },
]

const EMPTY_FILTERS = {
  townHallName: "",
  risk_class: "",
  due: "",
  workflow_status: "",
}

const FILTER_LABELS = {
  townHallName: "Comune",
  risk_class: "Classe",
  due: "Scadenza",
  workflow_status: "Stato",
}

const DUE_FILTER_LABELS = {
  overdue: "Scadute",
  soon: "In scadenza",
  ok: "Nei tempi",
}

function getResolveHint(report, quoteStatus) {
  if (canResolveExtraordinaryReport(report)) return ""
  if (quoteStatus && quoteStatus !== "APPROVED") {
    return `Preventivo ${QUOTE_STATUS_LABELS[quoteStatus] || quoteStatus} — in attesa approvazione DEC`
  }
  return "In attesa approvazione preventivo IMS"
}

const FilterSelect = ({ id, label, value, onChange, children }) => (
  <div>
    <label htmlFor={id} className="block text-xs text-blue-300/80 mb-1.5">
      {label}
    </label>
    <select
      id={id}
      value={value}
      onChange={onChange}
      className="w-full rounded-xl border border-blue-500/30 bg-blue-900/40 text-white px-3 py-2.5 text-sm min-h-11"
    >
      {children}
    </select>
  </div>
)

const ExtraordinaryItemActions = ({ item, canResolve, resolveHint, onGoToMap, onResolve, layout = "stack" }) => (
  <div className={layout === "row" ? "flex flex-col items-end gap-1" : "flex flex-col gap-2"}>
    <div
      className={
        layout === "row"
          ? "flex flex-wrap justify-end gap-2"
          : "flex flex-col sm:flex-row sm:items-start gap-2"
      }
    >
      <button
        type="button"
        onClick={() => onGoToMap(item)}
        className="inline-flex items-center justify-center gap-1.5 px-3 min-h-11 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-100 border border-blue-500/30 transition-colors"
        title="Centra mappa sul punto"
      >
        <MapPin className="h-4 w-4 shrink-0" />
        Vai al punto
      </button>
      <button
        type="button"
        disabled={!canResolve}
        title={resolveHint || "Chiudi intervento straordinario"}
        onClick={onResolve}
        className="inline-flex items-center justify-center gap-1.5 px-3 min-h-11 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-100 border border-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Risolvi
      </button>
    </div>
    {!canResolve && resolveHint ? (
      <p
        className={`text-xs text-amber-200/90 leading-snug ${
          layout === "row" ? "text-right max-w-xs" : ""
        }`}
      >
        {resolveHint}
      </p>
    ) : null}
  </div>
)

const ExtraordinaryMobileCard = ({ item, navigate, onGoToMap, onResolve, canPerformOperations }) => {
  const report = item.report
  const quote = report.linked_quote_id
  const quoteId = quote?._id || quote
  const quoteStatus = quote?.status || null
  const canResolve = canPerformOperations && canResolveExtraordinaryReport(report)
  const resolveHint = !canPerformOperations
    ? "Solo i manutentori possono chiudere l'intervento"
    : getResolveHint(report, quoteStatus)

  return (
    <article className="bg-black/40 p-4 rounded-xl border border-orange-500/30 hover:bg-black/60 transition-all">
      <div className="flex justify-between items-start gap-2 mb-3">
        <div>
          <p className="text-white font-semibold">PL {item.lightPoint?.numero_palo || "—"}</p>
          <p className="text-sm text-blue-300/80">{item.townHall?.name || "—"}</p>
        </div>
        <DueStatusBadge dueStatus={item.dueStatus} daysRemaining={item.daysRemaining} />
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <RiskClassBadge riskClass={report.risk_class} prefix />
        <WorkflowStatusBadge status={report.workflow_status} />
        {quoteStatus ? <QuoteStatusBadge status={quoteStatus} /> : null}
      </div>

      <p className="text-sm text-blue-200 inline-flex items-center gap-1.5">
        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
        {report.due_date
          ? new Date(report.due_date).toLocaleDateString("it-IT")
          : "Senza scadenza"}
      </p>

      {quoteId ? (
        <div className="mt-4 pt-3 border-t border-orange-500/20">
          <button
            type="button"
            onClick={() => navigate(`/quote/${quoteId}`)}
            className="text-sm text-blue-300 hover:text-white inline-flex items-center gap-1.5 min-h-11"
          >
            {quote?.protocolNumber || "Apri preventivo"}
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div className="mt-3">
        <ExtraordinaryItemActions
          item={item}
          canResolve={canResolve}
          resolveHint={resolveHint}
          onGoToMap={onGoToMap}
          onResolve={onResolve}
        />
      </div>
    </article>
  )
}

export default function ExtraordinaryDashboard() {
  const { userData } = useContext(UserContext)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [items, setItems] = useState([])
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page")) || 1))
  const [filters, setFilters] = useState({
    townHallName: searchParams.get("comune") || "",
    risk_class: searchParams.get("classe") || "",
    due: searchParams.get("due") || "",
    workflow_status: searchParams.get("stato") || "",
  })

  const syncSearchParams = useCallback((nextFilters, nextQuery, nextPage) => {
    const sp = new URLSearchParams()
    if (nextFilters.townHallName) sp.set("comune", nextFilters.townHallName)
    if (nextFilters.risk_class) sp.set("classe", nextFilters.risk_class)
    if (nextFilters.due) sp.set("due", nextFilters.due)
    if (nextFilters.workflow_status) sp.set("stato", nextFilters.workflow_status)
    if (nextQuery?.trim()) sp.set("q", nextQuery.trim())
    if (nextPage > 1) sp.set("page", String(nextPage))
    setSearchParams(sp, { replace: true })
  }, [setSearchParams])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const res = await api.get("/api/reports/extraordinary")
      setItems(res.data || [])
    } catch (err) {
      console.error(err)
      if (isTownHallAccessDeniedError(err)) {
        denyUnauthorizedComuneAccess(navigate)
        return
      }
      setError(err.response?.data?.error || "Impossibile caricare le straordinarie.")
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    if (!userData) {
      navigate("/")
      return
    }
    if (!["MAINTAINER", "ADMINISTRATOR", "SUPER_ADMIN"].includes(userData.user_type)) {
      navigate("/dashboard")
      return
    }
    const comuneFromQuery = searchParams.get("comune") || ""
    if (comuneFromQuery && !guardComuneAccess({ userData, comune: comuneFromQuery, navigate })) {
      return
    }
    load()
  }, [userData, navigate, load, searchParams])

  const cities = useMemo(() => {
    const fromUser = (userData?.town_halls_list || [])
      .map((t) => (typeof t === "string" ? t : t?.name))
      .filter(Boolean)
    if (fromUser.length) return [...fromUser].sort((a, b) => a.localeCompare(b))
    const fromItems = [...new Set(items.map((i) => i.townHall?.name).filter(Boolean))]
    return fromItems.sort((a, b) => a.localeCompare(b))
  }, [userData, items])

  const itemsForKpis = useMemo(() => {
    if (!filters.townHallName) return items
    return items.filter((i) => i.townHall?.name === filters.townHallName)
  }, [items, filters.townHallName])

  const filteredItems = useMemo(() => {
    let result = items

    if (filters.townHallName) {
      result = result.filter((i) => i.townHall?.name === filters.townHallName)
    }
    if (filters.risk_class) {
      result = result.filter((i) => i.report.risk_class === filters.risk_class)
    }
    if (filters.due) {
      result = result.filter((i) => i.dueStatus === filters.due)
    }
    if (filters.workflow_status) {
      result = result.filter((i) => i.report.workflow_status === filters.workflow_status)
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter((item) => {
        const pl = String(item.lightPoint?.numero_palo || "").toLowerCase()
        const comune = (item.townHall?.name || "").toLowerCase()
        return pl.includes(q) || comune.includes(q)
      })
    }

    return [...result].sort((a, b) => {
      const dueCmp = compareDueUrgency(a.dueStatus, b.dueStatus)
      if (dueCmp !== 0) return dueCmp
      const daysA = a.daysRemaining ?? Number.POSITIVE_INFINITY
      const daysB = b.daysRemaining ?? Number.POSITIVE_INFINITY
      return daysA - daysB
    })
  }, [items, filters, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredItems.slice(start, start + PAGE_SIZE)
  }, [filteredItems, safePage])

  const kpis = useMemo(() => ({
    open: itemsForKpis.length,
    overdue: itemsForKpis.filter((i) => i.dueStatus === "overdue").length,
    soon: itemsForKpis.filter((i) => i.dueStatus === "soon").length,
  }), [itemsForKpis])

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some(Boolean) || Boolean(searchQuery.trim()),
    [filters, searchQuery]
  )

  const activeFilterChips = useMemo(() => {
    const chips = []
    if (filters.townHallName) {
      chips.push({ key: "townHallName", label: `${FILTER_LABELS.townHallName}: ${filters.townHallName}` })
    }
    if (filters.risk_class) {
      chips.push({ key: "risk_class", label: `${FILTER_LABELS.risk_class}: ${filters.risk_class}` })
    }
    if (filters.due) {
      chips.push({ key: "due", label: `${FILTER_LABELS.due}: ${DUE_FILTER_LABELS[filters.due] || filters.due}` })
    }
    if (filters.workflow_status) {
      chips.push({
        key: "workflow_status",
        label: `${FILTER_LABELS.workflow_status}: ${WORKFLOW_STATUS_LABELS[filters.workflow_status] || filters.workflow_status}`,
      })
    }
    if (searchQuery.trim()) {
      chips.push({ key: "q", label: `Ricerca: "${searchQuery.trim()}"` })
    }
    return chips
  }, [filters, searchQuery])

  const applyFilters = (patch) => {
    const next = { ...filters, ...patch }
    setFilters(next)
    setPage(1)
    syncSearchParams(next, searchQuery, 1)
  }

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS)
    setSearchQuery("")
    setPage(1)
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const removeFilterChip = (key) => {
    if (key === "q") {
      setSearchQuery("")
      syncSearchParams(filters, "", page)
      return
    }
    applyFilters({ [key]: "" })
  }

  const handleSearchChange = (value) => {
    setSearchQuery(value)
    setPage(1)
    syncSearchParams(filters, value, 1)
  }

  const toggleDueFilter = (dueValue) => {
    applyFilters({ due: filters.due === dueValue ? "" : dueValue })
  }

  const goToMap = (item) => {
    const lat = item.lightPoint?.lat
    const lng = item.lightPoint?.lng
    const comune = item.townHall?.name
    if (!comune || lat == null || lng == null) {
      toast.error("Coordinate del punto luce non disponibili.")
      return
    }
    navigate("/dashboard", {
      state: {
        comune,
        focusLat: String(lat),
        focusLng: String(lng),
        focusPalo: String(item.lightPoint?.numero_palo || ""),
      },
    })
  }

  const goToResolve = (item, report) => {
    navigate(
      `/operation?comune=${encodeURIComponent(item.townHall?.name || "")}&numeroPalo=${encodeURIComponent(item.lightPoint?.numero_palo || "")}&lat=${encodeURIComponent(item.lightPoint?.lat || "")}&lng=${encodeURIComponent(item.lightPoint?.lng || "")}&reportId=${encodeURIComponent(report._id)}`
    )
  }

  const goToPage = (nextPage) => {
    const clamped = Math.max(1, Math.min(totalPages, nextPage))
    setPage(clamped)
    syncSearchParams(filters, searchQuery, clamped)
  }

  const dashboardComune = filters.townHallName || searchParams.get("comune") || ""

  const goToDashboard = useCallback(() => {
    if (dashboardComune) {
      navigate("/dashboard", { state: { comune: dashboardComune } })
      return
    }
    navigate("/dashboard")
  }, [navigate, dashboardComune])

  if (!userData) return null

  const canPerformOperations = ["MAINTAINER", "SUPER_ADMIN"].includes(userData.user_type)

  return (
    <div className={`${PAGE_SCROLL_SHELL} bg-gradient-to-br from-black via-blue-950 to-black p-4 sm:p-6`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6" data-tour="page-extraordinary-title">
          <div className="flex items-center gap-3 min-w-0">
            <BackNavigationButton />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Hexagon className="h-6 w-6 text-orange-400 shrink-0" />
                Straordinarie
              </h1>
              <p className="text-sm text-blue-300/80 truncate">
                Interventi con scadenza da preventivo IMS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={goToDashboard}
            aria-label="Torna alla mappa"
            title="Torna alla mappa"
            className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-full bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
          >
            <Home className="h-5 w-5 text-blue-400" />
          </button>
        </div>

        <div
          className="mb-4 p-3 rounded-xl bg-orange-900/20 border border-orange-500/30 text-sm text-orange-100"
          role="note"
        >
          Dopo l&apos;approvazione DEC del preventivo IMS viene creata una segnalazione straordinaria
          con scadenza calcolata. Risolvi l&apos;intervento dalla mappa o da qui quando il preventivo
          è approvato.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <StatCard
            title="Aperte"
            value={kpis.open}
            icon={Hexagon}
            color="blue"
            active={!filters.due}
            onClick={() => applyFilters({ due: "" })}
          />
          <StatCard
            title="In scadenza"
            value={kpis.soon}
            icon={CalendarClock}
            color="amber"
            active={filters.due === "soon"}
            onClick={() => toggleDueFilter("soon")}
          />
          <StatCard
            title="Scadute"
            value={kpis.overdue}
            icon={AlertCircle}
            color="red"
            active={filters.due === "overdue"}
            onClick={() => toggleDueFilter("overdue")}
          />
        </div>

        <div className="rounded-xl bg-black/40 border border-blue-500/20 p-4 mb-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-blue-200 text-sm font-medium">
              <Filter className="h-4 w-4" /> Filtri
            </div>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-blue-300 hover:text-white inline-flex items-center gap-1 min-h-11 px-2"
              >
                <X className="h-3.5 w-3.5" />
                Cancella filtri
              </button>
            ) : null}
          </div>

          <div className="mb-3">
            <label htmlFor="extraordinary-search" className="block text-xs text-blue-300/80 mb-1.5">
              Cerca per punto luce o comune
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400/70 pointer-events-none" />
              <input
                id="extraordinary-search"
                type="search"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Es. 1234 o Bra"
                className="w-full rounded-xl border border-blue-500/30 bg-blue-900/40 text-white pl-10 pr-3 py-2.5 text-sm min-h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <FilterSelect
              id="filter-comune"
              label="Comune"
              value={filters.townHallName}
              onChange={(e) => applyFilters({ townHallName: e.target.value })}
            >
              <option value="">Tutti i comuni</option>
              {cities.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </FilterSelect>
            <FilterSelect
              id="filter-classe"
              label="Classe di rischio"
              value={filters.risk_class}
              onChange={(e) => applyFilters({ risk_class: e.target.value })}
            >
              <option value="">Tutte le classi</option>
              {["A", "B", "C", "D"].map((c) => (
                <option key={c} value={c}>Classe {c}</option>
              ))}
            </FilterSelect>
            <FilterSelect
              id="filter-scadenza"
              label="Scadenza"
              value={filters.due}
              onChange={(e) => applyFilters({ due: e.target.value })}
            >
              <option value="">Tutte le scadenze</option>
              <option value="overdue">Scadute</option>
              <option value="soon">In scadenza</option>
              <option value="ok">Nei tempi</option>
            </FilterSelect>
            <FilterSelect
              id="filter-stato"
              label="Stato workflow"
              value={filters.workflow_status}
              onChange={(e) => applyFilters({ workflow_status: e.target.value })}
            >
              <option value="">Tutti gli stati</option>
              {Object.entries(WORKFLOW_STATUS_LABELS)
                .filter(([k]) => k !== "RESOLVED")
                .map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
            </FilterSelect>
          </div>

          {activeFilterChips.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-3">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => removeFilterChip(chip.key)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-blue-900/40 border border-blue-500/30 text-blue-100 hover:bg-blue-800/50 min-h-11 sm:min-h-0"
                >
                  {chip.label}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="flex justify-center py-16" role="status" aria-live="polite">
            <LightbulbLoader />
          </div>
        ) : error ? (
          <div
            className="p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-200 flex gap-2"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 rounded-xl bg-black/40 border border-blue-500/20 text-center text-blue-200/80">
            <p>Nessuna segnalazione straordinaria aperta con i filtri selezionati.</p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-100 border border-blue-500/30 min-h-11"
              >
                <X className="h-4 w-4" />
                Rimuovi filtri
              </button>
            ) : (
              <button
                type="button"
                onClick={goToDashboard}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-100 border border-blue-500/30 min-h-11"
              >
                <Home className="h-4 w-4" />
                Torna alla mappa
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-blue-300/80 mb-3" aria-live="polite">
              {filteredItems.length} risultat{filteredItems.length === 1 ? "o" : "i"}
              {filteredItems.length !== itemsForKpis.length ? ` (su ${itemsForKpis.length} totali)` : ""}
            </p>

            {/* Mobile: card layout */}
            <div className="md:hidden space-y-3">
              {paginatedItems.map((item) => (
                <ExtraordinaryMobileCard
                  key={item.report._id}
                  item={item}
                  navigate={navigate}
                  onGoToMap={goToMap}
                  onResolve={() => goToResolve(item, item.report)}
                  canPerformOperations={canPerformOperations}
                />
              ))}
            </div>

            {/* Desktop: table */}
            <div className={`hidden md:block ${TABLE_SCROLL_X} rounded-xl border border-blue-500/20 bg-black/40`}>
              <table className="w-full text-sm text-left">
                <thead className="text-blue-300 border-b border-blue-500/20 bg-blue-950/40">
                  <tr>
                    <th className="px-4 py-3 font-medium">Comune</th>
                    <th className="px-4 py-3 font-medium">PL</th>
                    <th className="px-4 py-3 font-medium">Classe</th>
                    <th className="px-4 py-3 font-medium">Scadenza</th>
                    <th className="px-4 py-3 font-medium">Giorni</th>
                    <th className="px-4 py-3 font-medium">Stato</th>
                    <th className="px-4 py-3 font-medium">Preventivo</th>
                    <th className="px-4 py-3 font-medium text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item) => {
                    const report = item.report
                    const quote = report.linked_quote_id
                    const quoteId = quote?._id || quote
                    const quoteStatus = quote?.status || null
                    const canResolve =
                      canPerformOperations && canResolveExtraordinaryReport(report)
                    const resolveHint = !canPerformOperations
                      ? "Solo i manutentori possono chiudere l'intervento"
                      : getResolveHint(report, quoteStatus)

                    return (
                      <tr
                        key={report._id}
                        className="border-b border-blue-500/10 hover:bg-blue-900/20"
                      >
                        <td className="px-4 py-3 text-white">{item.townHall?.name || "—"}</td>
                        <td className="px-4 py-3 text-white font-medium">
                          {item.lightPoint?.numero_palo || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <RiskClassBadge riskClass={report.risk_class} />
                        </td>
                        <td className="px-4 py-3 text-blue-100">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {report.due_date
                              ? new Date(report.due_date).toLocaleDateString("it-IT")
                              : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <DueStatusBadge
                            dueStatus={item.dueStatus}
                            daysRemaining={item.daysRemaining}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <WorkflowStatusBadge status={report.workflow_status} />
                        </td>
                        <td className="px-4 py-3">
                          {quoteId ? (
                            <div className="flex flex-col items-start gap-1">
                              <button
                                type="button"
                                onClick={() => navigate(`/quote/${quoteId}`)}
                                className="text-blue-300 hover:text-white inline-flex items-center gap-1 min-h-11 md:min-h-0"
                              >
                                {quote?.protocolNumber || "Apri"}
                                <ExternalLink className="h-3.5 w-3.5" />
                              </button>
                              {quoteStatus ? <QuoteStatusBadge status={quoteStatus} /> : null}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <ExtraordinaryItemActions
                            item={item}
                            canResolve={canResolve}
                            resolveHint={resolveHint}
                            onGoToMap={goToMap}
                            onResolve={() => goToResolve(item, report)}
                            layout="row"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="flex items-center justify-between gap-3 mt-4">
                <p className="text-sm text-blue-300/80">
                  Pagina {safePage} di {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => goToPage(safePage - 1)}
                    className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg bg-blue-900/40 border border-blue-500/30 text-blue-100 disabled:opacity-40"
                    aria-label="Pagina precedente"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => goToPage(safePage + 1)}
                    className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg bg-blue-900/40 border border-blue-500/30 text-blue-100 disabled:opacity-40"
                    aria-label="Pagina successiva"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      <LegendGlass
        items={EXTRAORDINARY_LEGEND_ITEMS}
        title="Legenda · Straordinarie"
        subtitle="Scadenze e preventivi"
        className="fixed bottom-6 left-6 z-40 select-none"
      />
    </div>
  )
}

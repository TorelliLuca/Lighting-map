"use client"

import { useState, useEffect, useContext, useMemo, useRef, useCallback } from "react"
import { useNavigate, useLocation, useParams } from "react-router-dom"
import { UserContext, api } from "../context/UserContext"
import {
  AlertCircle,
  Download,
  FileSpreadsheet,
  Home,
  Loader2,
  Lock,
  Plus,
  Trash2,
} from "lucide-react"
import { LightbulbLoader } from "../components/lightbulb-loader"
import { BackNavigationButton } from "../components/BackNavigationButton"
import ConfirmDialog from "../components/ui/ConfirmDialog"
import InfoTooltip from "../components/ui/InfoTooltip"
import { NumberInput } from "../components/ui/NumberInput"
import { GlassSelect } from "../components/ui/GlassSelect"
import { TruncatedTextDetails, CatalogMaterialRow, DetailsInfoDialog } from "../components/ui/TruncatedTextDetails"
import {
  canApproveQuoteByRole,
  canManageQuotesByRole,
  canSubmitQuoteByRole,
  computeQuoteTotalsClient,
  QUOTE_STATUS_LABELS,
  QUOTE_EDITABLE_STATUSES,
  formatReportFaultLabel,
} from "../utils/utils"
import toast from "react-hot-toast"
import { PAGE_SCROLL_SHELL, TABLE_SCROLL_X } from "../utils/pageScrollShell"
import { CapitolatoValidityChip } from "../components/ui/CapitolatoValidityChip"

const emptyLine = () => ({
  materialCode: "",
  description: "",
  udm: "cad",
  quantity: 1,
  unitPrice: 0,
  category: "",
  isAdHoc: false,
  isContested: false,
  contestNote: "",
})

const normalizeMinDiscountPercent = (config) => {
  const value = Number(config?.minDiscountPercent)
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

const clampDiscountPercent = (value, minDiscountPercent = 0) => {
  const numericValue = Number(value)
  const normalizedValue = Number.isFinite(numericValue) ? numericValue : 0
  return Math.min(100, Math.max(minDiscountPercent, normalizedValue))
}

const CATALOG_PAGE_SIZE = 12

const QUOTE_STATUS_TAG_STYLES = {
  DRAFT: "bg-slate-500/30 text-slate-100 border-slate-400/50",
  PENDING_APPROVAL: "bg-amber-500/30 text-amber-100 border-amber-400/50",
  APPROVED: "bg-emerald-500/30 text-emerald-100 border-emerald-400/50",
  REJECTED: "bg-red-500/30 text-red-100 border-red-400/50",
  NEEDS_REVISION: "bg-amber-500/30 text-amber-100 border-amber-400/50",
}

const fieldInputClass =
  "w-full rounded-xl border border-blue-500/30 bg-blue-900/20 text-white px-4 py-3 disabled:opacity-60 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:border-blue-400/50"

const cellInputClass =
  "w-full min-w-0 rounded-lg border border-blue-500/20 bg-black/30 text-white px-2 py-1.5 text-sm disabled:opacity-60 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:border-blue-400/50"

const btnSecondaryClass =
  "cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 disabled:cursor-not-allowed"

const btnPrimaryClass =
  "cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 disabled:cursor-not-allowed"

const isLineMissingDescription = (item) => !item.description?.trim()

const inputClassWithWarning = (baseClass, isMissing) =>
  isMissing
    ? `${baseClass} border-amber-500/50 ring-1 ring-amber-500/30`
    : baseClass

const SectionHeading = ({ children }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-300 mb-3 pt-4 border-t border-blue-500/15 first:border-t-0 first:pt-0">
    {children}
  </h3>
)

const serializeFormSnapshot = (data) => JSON.stringify({
  priorityClass: data.priorityClass || "C",
  materialLeadDays: Number(data.materialLeadDays) || 0,
  workLeadDays: Number(data.workLeadDays) || 0,
  discountPercent: Number(data.discountPercent) || 0,
  faultDescription: data.faultDescription || "",
  notes: data.notes || "",
  lineItems: (data.lineItems || []).map((item) => ({
    materialCode: item.materialCode || "",
    description: item.description || "",
    udm: item.udm || "",
    quantity: Number(item.quantity) || 0,
    unitPrice: Number(item.unitPrice) || 0,
    category: item.category || "",
    isAdHoc: !!item.isAdHoc,
    isContested: !!item.isContested,
    contestNote: item.contestNote || "",
  })),
})

export default function Quote() {
  const { userData, getLightpoint, getMaintenanceConfig } = useContext(UserContext)
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [downloadingFormat, setDownloadingFormat] = useState(null)
  const [lightpoint, setLightpoint] = useState(null)
  const [config, setConfig] = useState(null)
  const [capitolatoValidity, setCapitolatoValidity] = useState(null)
  const [report, setReport] = useState(null)
  const [quote, setQuote] = useState(null)
  const [queryParams, setQueryParams] = useState({})
  const [catalogQuery, setCatalogQuery] = useState("")
  const [catalogLimit, setCatalogLimit] = useState(CATALOG_PAGE_SIZE)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showSaveBeforeDownload, setShowSaveBeforeDownload] = useState(false)
  const [missingFieldSummary, setMissingFieldSummary] = useState([])
  const [missingFieldExtraCount, setMissingFieldExtraCount] = useState(0)
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState("")
  const [pendingDownloadFormat, setPendingDownloadFormat] = useState(null)
  const [showFaultDetails, setShowFaultDetails] = useState(false)

  const pendingNavigationRef = useRef(null)

  const [formData, setFormData] = useState({
    priorityClass: "C",
    materialLeadDays: 0,
    workLeadDays: 0,
    discountPercent: 0,
    faultDescription: "",
    notes: "",
    lineItems: [],
  })

  const canEdit = useMemo(() => {
    if (!canManageQuotesByRole(userData)) return false
    if (!quote) return true
    return QUOTE_EDITABLE_STATUSES.includes(quote.status)
  }, [userData, quote])
  const canSubmit = useMemo(() => canSubmitQuoteByRole(userData), [userData])
  const canApprove = useMemo(() => canApproveQuoteByRole(userData), [userData])
  const canManage = useMemo(() => canManageQuotesByRole(userData), [userData])
  const minDiscountPercent = useMemo(() => normalizeMinDiscountPercent(config), [config])

  const totals = useMemo(
    () => computeQuoteTotalsClient(formData.lineItems, 0.02, formData.discountPercent),
    [formData.lineItems, formData.discountPercent]
  )

  const formSnapshot = useMemo(() => serializeFormSnapshot(formData), [formData])
  const isDirty = useMemo(
    () => canEdit && formSnapshot !== lastSavedSnapshot,
    [canEdit, formSnapshot, lastSavedSnapshot]
  )

  const catalog = config?.materialCatalog || []
  const catalogMatches = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter(
      (m) =>
        m.code?.toLowerCase().includes(q)
        || m.description?.toLowerCase().includes(q)
        || m.category?.toLowerCase().includes(q)
    )
  }, [catalog, catalogQuery])

  const filteredCatalog = useMemo(
    () => catalogMatches.slice(0, catalogLimit),
    [catalogMatches, catalogLimit]
  )

  const hasMoreCatalogResults = catalogMatches.length > filteredCatalog.length

  const missingDescriptionIndices = useMemo(() => {
    const indices = new Set()
    formData.lineItems.forEach((item, index) => {
      if (isLineMissingDescription(item)) indices.add(index)
    })
    return indices
  }, [formData.lineItems])

  const contestedCount = useMemo(
    () => formData.lineItems.filter((item) => item.isContested).length,
    [formData.lineItems]
  )

  const readOnlyMessage = useMemo(() => {
    if (canEdit) return null
    if (quote?.status === "PENDING_APPROVAL") {
      return "Preventivo in attesa di approvazione DEC — sola lettura."
    }
    if (quote?.status === "APPROVED") {
      return "Preventivo approvato — sola lettura."
    }
    if (quote?.status === "NEEDS_REVISION" || quote?.status === "REJECTED") {
      return "Preventivo respinto dal DEC — apri la bozza per correggerlo."
    }
    return "Preventivo non modificabile — sola lettura."
  }, [canEdit, quote?.status])

  useEffect(() => {
    setCatalogLimit(CATALOG_PAGE_SIZE)
  }, [catalogQuery])

  useEffect(() => {
    if (!userData) {
      navigate("/")
      return
    }
    if (!canManage && !canApprove) {
      navigate("/dashboard")
      return
    }

    const search = new URLSearchParams(location.search)
    const paramsObj = {
      comune: search.get("comune"),
      id: search.get("id"),
      reportId: search.get("reportId"),
      quoteId: search.get("quoteId") || params.id || null,
    }
    setQueryParams(paramsObj)

    // Gli admin vedono solo approvazione/revisione, non la compilazione bozze
    if (!canManage && canApprove) {
      if (paramsObj.quoteId) {
        navigate(`/quote/${paramsObj.quoteId}/review`, { replace: true })
        return
      }
      const comuneQs = paramsObj.comune
        ? `?comune=${encodeURIComponent(paramsObj.comune)}`
        : ""
      navigate(`/quotes/approval${comuneQs}`, { replace: true })
      return
    }

    const load = async () => {
      try {
        setLoading(true)
        setError("")

        if (paramsObj.quoteId) {
          const quoteRes = await api.get(`/api/quotes/${paramsObj.quoteId}`)
          const q = quoteRes.data
          setQuote(q)

          const thName = q.townHallId?.name || paramsObj.comune
          const lpId = q.lightPointId?._id || q.lightPointId
          const [lpRes, configRes] = await Promise.all([
            lpId ? getLightpoint(lpId) : Promise.resolve(null),
            thName ? getMaintenanceConfig(thName) : Promise.resolve(null),
          ])
          setLightpoint(lpRes?.data || q.lightPointId || null)
          setConfig(configRes?.data?.config || null)
          setCapitolatoValidity(configRes?.data?.validity || null)
          setReport(q.reportId || null)
          setQueryParams((prev) => ({
            ...prev,
            comune: thName || prev.comune,
            id: String(lpId || prev.id || ""),
            reportId: q.reportId?._id || q.reportId || prev.reportId,
          }))
          setFormData({
            priorityClass: q.priorityClass || "C",
            materialLeadDays: q.materialLeadDays ?? 0,
            workLeadDays: q.workLeadDays ?? 0,
            discountPercent: clampDiscountPercent(q.discountPercent ?? 0, normalizeMinDiscountPercent(configRes?.data?.config)),
            faultDescription: q.faultDescription || "",
            notes: q.notes || "",
            lineItems: q.lineItems?.length ? q.lineItems : [],
          })
          setLastSavedSnapshot(serializeFormSnapshot({
            priorityClass: q.priorityClass || "C",
            materialLeadDays: q.materialLeadDays ?? 0,
            workLeadDays: q.workLeadDays ?? 0,
            discountPercent: clampDiscountPercent(q.discountPercent ?? 0, normalizeMinDiscountPercent(configRes?.data?.config)),
            faultDescription: q.faultDescription || "",
            notes: q.notes || "",
            lineItems: q.lineItems?.length ? q.lineItems : [],
          }))
          return
        }

        if (!paramsObj.comune || !paramsObj.id) {
          setError("Parametri mancanti: comune e punto luce.")
          return
        }

        const [lpRes, configRes] = await Promise.all([
          getLightpoint(paramsObj.id),
          getMaintenanceConfig(paramsObj.comune),
        ])
        setLightpoint(lpRes?.data || null)
        const cfg = configRes?.data?.config || null
        setConfig(cfg)
        setCapitolatoValidity(configRes?.data?.validity || null)

        let selectedReport = null
        if (paramsObj.reportId) {
          const reportRes = await api.get(`/api/reports/${paramsObj.reportId}`)
          selectedReport = reportRes.data
        }
        setReport(selectedReport)

        const listRes = await api.get("/api/quotes", {
          params: paramsObj.reportId ? { reportId: paramsObj.reportId } : {},
        })
        const existing = (listRes.data || []).find((q) =>
          q.type !== "CONSUNTIVO"
          && ["DRAFT", "PENDING_APPROVAL", "REJECTED", "NEEDS_REVISION", "APPROVED"].includes(q.status)
        )

        if (existing) {
          const quoteRes = await api.get(`/api/quotes/${existing._id}`)
          const q = quoteRes.data
          setQuote(q)
          setFormData({
            priorityClass: q.priorityClass || "C",
            materialLeadDays: q.materialLeadDays ?? 0,
            workLeadDays: q.workLeadDays ?? 0,
            discountPercent: clampDiscountPercent(q.discountPercent ?? 0, normalizeMinDiscountPercent(cfg)),
            faultDescription: q.faultDescription || "",
            notes: q.notes || "",
            lineItems: q.lineItems?.length ? q.lineItems : [],
          })
          setLastSavedSnapshot(serializeFormSnapshot({
            priorityClass: q.priorityClass || "C",
            materialLeadDays: q.materialLeadDays ?? 0,
            workLeadDays: q.workLeadDays ?? 0,
            discountPercent: clampDiscountPercent(q.discountPercent ?? 0, normalizeMinDiscountPercent(cfg)),
            faultDescription: q.faultDescription || "",
            notes: q.notes || "",
            lineItems: q.lineItems?.length ? q.lineItems : [],
          }))
        } else {
          const riskCode = selectedReport?.risk_class || "C"
          const riskCfg = (cfg?.riskClasses || []).find((r) => r.code === riskCode)
          const nextForm = {
            priorityClass: riskCode,
            materialLeadDays: riskCfg?.defaultMaterialDays ?? 0,
            workLeadDays: riskCfg?.defaultWorkDays ?? 0,
            discountPercent: clampDiscountPercent(0, normalizeMinDiscountPercent(cfg)),
            faultDescription: selectedReport?.description || "",
            notes: "",
            lineItems: [],
          }
          setFormData((prev) => ({
            ...prev,
            ...nextForm,
          }))
          setLastSavedSnapshot(serializeFormSnapshot({
            ...nextForm,
            discountPercent: clampDiscountPercent(0, normalizeMinDiscountPercent(cfg)),
          }))
        }
      } catch (err) {
        console.error(err)
        setError(err.response?.data?.error || "Impossibile caricare il preventivo.")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [userData, canManage, canApprove, navigate, location.search, params.id, getLightpoint, getMaintenanceConfig])

  const updateLine = (index, patch) => {
    setFormData((prev) => {
      const lineItems = [...prev.lineItems]
      lineItems[index] = { ...lineItems[index], ...patch }
      return { ...prev, lineItems }
    })
  }

  const addLineFromCatalog = (fromCatalog) => {
    setFormData((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          materialCode: fromCatalog.code || "",
          description: fromCatalog.description || "",
          udm: fromCatalog.udm || "cad",
          quantity: 1,
          unitPrice: fromCatalog.unitPrice || 0,
          category: fromCatalog.category || "",
          isAdHoc: false,
        },
      ],
    }))
    setCatalogQuery("")
  }

  const addAdHocLine = () => {
    setFormData((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          ...emptyLine(),
          materialCode: `NP-${prev.lineItems.filter((i) => i.isAdHoc).length + 1}`,
          isAdHoc: true,
          description: "",
        },
      ],
    }))
  }

  const removeLine = (index) => {
    setFormData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }))
  }

  const buildPayload = () => ({
    priorityClass: formData.priorityClass,
    materialLeadDays: Number(formData.materialLeadDays) || 0,
    workLeadDays: Number(formData.workLeadDays) || 0,
    discountPercent: clampDiscountPercent(formData.discountPercent, minDiscountPercent),
    safetyChargeRate: 0.02,
    faultDescription: formData.faultDescription,
    notes: formData.notes,
    lineItems: formData.lineItems.filter((i) => i.description?.trim()),
  })

  const ensureQuote = async () => {
    if (quote?._id) return quote
    const createRes = await api.post("/api/quotes", {
      townHallName: queryParams.comune,
      lightPointId: queryParams.id || lightpoint?._id,
      reportId: queryParams.reportId || report?._id || null,
      ...buildPayload(),
    })
    setQuote(createRes.data)
    return createRes.data
  }

  const saveDraft = async ({ showToast = true } = {}) => {
    setSaving(true)
    setError("")
    try {
      const current = await ensureQuote()
      const patchRes = await api.patch(`/api/quotes/${current._id}`, buildPayload())
      setQuote(patchRes.data)
      setLastSavedSnapshot(serializeFormSnapshot(formData))
      if (showToast) toast.success("Bozza salvata")
      return { ok: true, quote: patchRes.data }
    } catch (err) {
      console.error(err)
      if (err.response?.status === 409 && err.response?.data?.quote) {
        setQuote(err.response.data.quote)
        toast.error("Esiste già un preventivo: caricata la bozza esistente.")
      } else {
        toast.error(err.response?.data?.error || "Errore salvataggio bozza")
      }
      return { ok: false }
    } finally {
      setSaving(false)
    }
  }

  const runPendingNavigation = useCallback(() => {
    const proceed = pendingNavigationRef.current
    pendingNavigationRef.current = null
    proceed?.()
  }, [])

  const cancelPendingNavigation = useCallback(() => {
    pendingNavigationRef.current = null
  }, [])

  const requestLeave = useCallback((proceed) => {
    if (!canEdit || !isDirty) {
      proceed()
      return
    }
    pendingNavigationRef.current = proceed
    setShowLeaveConfirm(true)
  }, [canEdit, isDirty])

  const handleBackNavigation = useCallback(() => {
    requestLeave(() => {
      const canGoBack = window.history.length > 1
      if (canGoBack) {
        navigate(-1)
        return
      }
      navigate("/dashboard", { replace: true })
    })
  }, [navigate, requestLeave])

  const handleHomeNavigation = useCallback(() => {
    requestLeave(() => navigate("/dashboard"))
  }, [navigate, requestLeave])

  const handleLeaveCancel = () => {
    setShowLeaveConfirm(false)
    cancelPendingNavigation()
  }

  const handleLeaveWithoutSave = () => {
    setShowLeaveConfirm(false)
    runPendingNavigation()
  }

  const handleLeaveWithSave = async () => {
    const result = await saveDraft()
    if (!result.ok) return
    setShowLeaveConfirm(false)
    runPendingNavigation()
  }

  const collectMissingDescriptionSummary = (lineItems = []) => {
    const missing = lineItems
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item.description?.trim())
      .map(({ item, index }) => {
        const code = item.materialCode?.trim()
        return code
          ? `Voce ${index + 1} (${code}): descrizione mancante`
          : `Voce ${index + 1}: descrizione mancante`
      })

    return {
      preview: missing.slice(0, 5),
      extraCount: Math.max(0, missing.length - 5),
      total: missing.length,
    }
  }

  const handleSave = async () => {
    await saveDraft()
  }

  const submitQuote = async () => {
    setSubmitting(true)
    setError("")
    try {
      const payload = buildPayload()
      if (!payload.lineItems.length) {
        toast.error("Aggiungere almeno una voce di materiale.")
        setSubmitting(false)
        return
      }
      const current = await ensureQuote()
      await api.patch(`/api/quotes/${current._id}`, payload)
      setLastSavedSnapshot(serializeFormSnapshot(formData))
      const submitRes = await api.post(`/api/quotes/${current._id}/submit`)
      setQuote(submitRes.data)
      toast.success("Preventivo inviato in approvazione al DEC")
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.error || "Errore invio in approvazione")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Solo il titolare manutentore può inviare il preventivo in approvazione.")
      return
    }

    const missing = collectMissingDescriptionSummary(formData.lineItems)
    if (missing.total > 0) {
      setMissingFieldSummary(missing.preview)
      setMissingFieldExtraCount(missing.extraCount)
      setShowSubmitConfirm(true)
      return
    }

    await submitQuote()
  }

  const handleConfirmSubmitWithMissing = async () => {
    setShowSubmitConfirm(false)
    await submitQuote()
  }

  const syncQuoteForExport = async (quoteId) => {
    if (!canEdit) return quoteId
    const patchRes = await api.patch(`/api/quotes/${quoteId}`, buildPayload())
    setQuote(patchRes.data)
    setLastSavedSnapshot(serializeFormSnapshot(formData))
    return patchRes.data._id
  }

  const downloadFile = async (format, quoteId = quote?._id) => {
    if (!quoteId || downloadingFormat) return false
    setDownloadingFormat(format)
    try {
      const exportQuoteId = await syncQuoteForExport(quoteId)
      const res = await api.get(`/api/quotes/${exportQuoteId}/${format}`, {
        responseType: "blob",
      })

      const contentType = String(res.headers?.["content-type"] || "")
      if (contentType.includes("application/json")) {
        const text = await res.data.text()
        const json = JSON.parse(text)
        throw Object.assign(new Error(json.error || "Download non riuscito"), {
          response: { data: json },
        })
      }

      const disposition = String(res.headers?.["content-disposition"] || "")
      const headerName = disposition.match(/filename="([^"]+)"/i)?.[1]
      const safeBase = String(quote?.protocolNumber || `IMS-BOZZA-${String(exportQuoteId).slice(-6)}`)
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
        .trim() || `IMS-BOZZA-${String(exportQuoteId).slice(-6)}`
      const filename = headerName || `${safeBase}.${format}`

      const blob = new Blob([res.data], {
        type: format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      return true
    } catch (err) {
      console.error(err)
      let message = `Download ${format.toUpperCase()} non riuscito`
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text()
          const json = JSON.parse(text)
          message = json.error || message
        } catch {
          /* ignore */
        }
      } else if (err.response?.data?.error) {
        message = err.response.data.error
      } else if (err.message) {
        message = err.message
      }
      toast.error(message)
      return false
    } finally {
      setDownloadingFormat(null)
    }
  }

  const handleDownloadClick = (format) => {
    if (downloadingFormat) return
    if (!quote?._id) {
      setPendingDownloadFormat(format)
      setShowSaveBeforeDownload(true)
      return
    }
    downloadFile(format)
  }

  const handleCancelSaveBeforeDownload = () => {
    setShowSaveBeforeDownload(false)
    setPendingDownloadFormat(null)
  }

  const handleConfirmSaveBeforeDownload = async () => {
    const format = pendingDownloadFormat
    const result = await saveDraft()
    if (!result.ok) return
    setShowSaveBeforeDownload(false)
    setPendingDownloadFormat(null)
    if (format) {
      await downloadFile(format, result.quote._id)
    }
  }

  const onPriorityChange = (code) => {
    const riskCfg = (config?.riskClasses || []).find((r) => r.code === code)
    setFormData((prev) => ({
      ...prev,
      priorityClass: code,
      materialLeadDays: riskCfg?.defaultMaterialDays ?? prev.materialLeadDays,
      workLeadDays: riskCfg?.defaultWorkDays ?? prev.workLeadDays,
    }))
  }

  if (loading) {
    return (
      <div className={`${PAGE_SCROLL_SHELL} flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4`}>
        <LightbulbLoader />
      </div>
    )
  }

  return (
    <div className={`${PAGE_SCROLL_SHELL} flex items-start justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4 py-6 sm:py-8`}>
      <div className="w-full max-w-5xl relative overflow-hidden rounded-2xl shadow-[0_0_40px_rgba(0,149,255,0.15)]">
        <div className="relative z-10 p-6 sm:p-8 backdrop-blur-xl bg-black/40 border border-blue-500/20">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-start gap-2 min-w-0">
              <FileSpreadsheet className="h-6 w-6 text-blue-400 shrink-0 mt-1" />
              <div className="min-w-0">
                <h2 className="text-2xl font-bold text-white">Preventivo IMS</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <CapitolatoValidityChip validity={capitolatoValidity} />
                  {quote && (
                    <>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          QUOTE_STATUS_TAG_STYLES[quote.status]
                          || "bg-blue-500/25 text-blue-100 border-blue-400/40"
                        }`}
                      >
                        {QUOTE_STATUS_LABELS[quote.status] || quote.status}
                      </span>
                      {quote.protocolNumber && (
                        <span className="text-xs text-blue-200 font-mono">
                          {quote.protocolNumber}
                        </span>
                      )}
                    </>
                  )}
                  {isDirty && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-500/20 text-amber-100 border-amber-400/40">
                      Modifiche non salvate
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <BackNavigationButton onClick={handleBackNavigation} />
              <button
                type="button"
                onClick={handleHomeNavigation}
                aria-label="Torna alla dashboard"
                className={`p-2 rounded-full bg-blue-500/10 hover:bg-blue-500/20 ${btnSecondaryClass}`}
              >
                <Home className="h-5 w-5 text-blue-400" />
              </button>
            </div>
          </div>

          {!canEdit && readOnlyMessage && (
            <div className="mb-4 p-3 rounded-lg bg-slate-800/40 border border-slate-500/30 text-slate-100 text-sm flex gap-2">
              <Lock className="h-4 w-4 shrink-0 mt-0.5 text-slate-300" />
              <p>{readOnlyMessage}</p>
            </div>
          )}

          {(lightpoint || report) && (
            <>
              <SectionHeading>Contesto</SectionHeading>
              <div className="mb-6 p-4 rounded-xl bg-blue-900/20 border border-blue-500/20 text-sm text-white space-y-1">
                <p><span className="font-medium text-blue-200">Punto:</span> {lightpoint?.numero_palo || "—"}</p>
                <p><span className="font-medium text-blue-200">Comune:</span> {queryParams.comune || "—"}</p>
                {report && (
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-blue-200 shrink-0">Segnalazione:</span>
                    <TruncatedTextDetails
                      text={formatReportFaultLabel(report)}
                      title="Dettagli segnalazione"
                      lines={2}
                      className="text-sm text-white"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {error && (
            <div role="alert" className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-200 flex gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {(quote?.rejectedReason || contestedCount > 0) && canEdit && (
            <div role="status" className="mb-4 p-3 rounded-lg bg-amber-900/20 border border-amber-500/30 text-amber-100 text-sm space-y-1">
              <p className="font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Preventivo respinto dal DEC
                {contestedCount > 0 ? ` — ${contestedCount} ${contestedCount === 1 ? "voce contestata" : "voci contestate"}` : ""}
              </p>
              {quote?.rejectedReason && (
                <p className="text-amber-100/90">{quote.rejectedReason}</p>
              )}
              <p className="text-xs text-amber-200/80">
                Correggi le voci evidenziate e invia di nuovo in approvazione.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <SectionHeading>Intervento</SectionHeading>
            <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label htmlFor="quote-fault-description" className="block text-sm font-medium text-blue-200">
                  Descrizione guasto
                </label>
                {canEdit && (formData.faultDescription || "").trim().length > 120 && (
                  <button
                    type="button"
                    onClick={() => setShowFaultDetails(true)}
                    className={`text-[11px] font-medium text-blue-300 hover:text-blue-100 underline underline-offset-2 ${btnSecondaryClass}`}
                  >
                    Dettagli
                  </button>
                )}
              </div>
              {canEdit ? (
                <textarea
                  id="quote-fault-description"
                  rows={3}
                  disabled={!canEdit}
                  value={formData.faultDescription}
                  onChange={(e) => setFormData((p) => ({ ...p, faultDescription: e.target.value }))}
                  className={fieldInputClass}
                />
              ) : (
                <div className="rounded-xl border border-blue-500/30 bg-blue-900/20 px-4 py-3">
                  <TruncatedTextDetails
                    text={formData.faultDescription}
                    title="Descrizione guasto"
                    lines={3}
                    className="text-sm text-white"
                  />
                </div>
              )}
              <DetailsInfoDialog
                isOpen={showFaultDetails}
                onClose={() => setShowFaultDetails(false)}
                title="Descrizione guasto"
                text={formData.faultDescription}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="quote-priority" className="block text-sm font-medium text-blue-200 mb-2">Priorità</label>
                <GlassSelect
                  id="quote-priority"
                  disabled={!canEdit}
                  value={formData.priorityClass}
                  onChange={onPriorityChange}
                  aria-label="Priorità preventivo"
                  openUpward={false}
                  maxVisible={6}
                  className="bg-blue-900/20 border-blue-500/30"
                  options={(config?.riskClasses?.length
                    ? config.riskClasses
                    : [{ code: "A" }, { code: "B" }, { code: "C" }, { code: "D" }]
                  ).map((r) => ({
                    value: r.code,
                    label: r.label ? `${r.code} — ${r.label}` : r.code,
                  }))}
                />
              </div>
              <div>
                <label htmlFor="quote-material-days" className="block text-sm font-medium text-blue-200 mb-2">Giorni materiale</label>
                <NumberInput
                  id="quote-material-days"
                  min={0}
                  inputMode="numeric"
                  disabled={!canEdit}
                  value={formData.materialLeadDays}
                  onChange={(e) => setFormData((p) => ({ ...p, materialLeadDays: e.target.value }))}
                  className={fieldInputClass}
                />
              </div>
              <div>
                <label htmlFor="quote-work-days" className="block text-sm font-medium text-blue-200 mb-2">Giorni opera</label>
                <NumberInput
                  id="quote-work-days"
                  min={0}
                  inputMode="numeric"
                  disabled={!canEdit}
                  value={formData.workLeadDays}
                  onChange={(e) => setFormData((p) => ({ ...p, workLeadDays: e.target.value }))}
                  className={fieldInputClass}
                />
              </div>
            </div>
            </div>

            <SectionHeading>Materiali</SectionHeading>
            <div className="space-y-5">
            {canEdit && catalog.length > 0 && (
              <div className="space-y-2">
                <label htmlFor="quote-catalog-search" className="block text-sm font-medium text-blue-200">
                  Catalogo materiali
                </label>
                <input
                  id="quote-catalog-search"
                  type="search"
                  placeholder="Cerca codice o descrizione…"
                  value={catalogQuery}
                  onChange={(e) => setCatalogQuery(e.target.value)}
                  className={`${fieldInputClass} py-2 text-sm`}
                />
                {catalogMatches.length > 0 && (
                  <p className="text-xs text-blue-200/90">
                    {filteredCatalog.length} di {catalogMatches.length} risultati
                  </p>
                )}
                <div className="max-h-36 overflow-y-auto overscroll-y-contain touch-pan-y rounded-xl border border-blue-500/20 divide-y divide-blue-500/10 scrollbar-app">
                  {filteredCatalog.map((m) => (
                    <CatalogMaterialRow
                      key={m.code}
                      material={m}
                      onAdd={addLineFromCatalog}
                      buttonClassName={btnSecondaryClass}
                    />
                  ))}
                  {filteredCatalog.length === 0 && (
                    <p className="px-3 py-4 text-xs text-blue-200/80 text-center">Nessun materiale trovato.</p>
                  )}
                </div>
                {hasMoreCatalogResults && (
                  <button
                    type="button"
                    onClick={() => setCatalogLimit((prev) => prev + CATALOG_PAGE_SIZE)}
                    className={`text-xs px-3 py-1.5 rounded-lg border border-blue-500/30 text-blue-200 hover:bg-blue-900/30 ${btnSecondaryClass}`}
                  >
                    Mostra altri ({catalogMatches.length - filteredCatalog.length} rimanenti)
                  </button>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-blue-200">Voci preventivo</span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={addAdHocLine}
                    className={`text-xs px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-200 hover:bg-amber-900/20 flex items-center gap-1 shrink-0 ${btnSecondaryClass}`}
                  >
                    <Plus className="h-3.5 w-3.5" /> Nuovo prezzo
                  </button>
                )}
              </div>

              {missingDescriptionIndices.size > 0 && canEdit && (
                <div role="status" className="p-2.5 rounded-lg bg-amber-900/20 border border-amber-500/30 text-amber-100 text-xs flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{missingDescriptionIndices.size} {missingDescriptionIndices.size === 1 ? "voce ha" : "voci hanno"} descrizione mancante.</p>
                </div>
              )}

              {contestedCount > 0 && canEdit && (
                <div role="status" className="p-2.5 rounded-lg bg-red-900/20 border border-red-500/30 text-red-100 text-xs flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>
                    {contestedCount} {contestedCount === 1 ? "voce è contestata" : "voci sono contestate"} dal DEC
                    (evidenziate in rosso).
                  </p>
                </div>
              )}

              {formData.lineItems.length === 0 ? (
                <div className="p-6 rounded-xl border border-blue-500/20 bg-blue-900/10 text-center text-sm text-blue-200">
                  Nessuna voce inserita. Aggiungi materiali dal catalogo o crea un nuovo prezzo.
                </div>
              ) : (
                <>
                  <div className="md:hidden space-y-3">
                    {formData.lineItems.map((item, index) => {
                      const isCatalogItem = !item.isAdHoc
                      const lockCatalogFields = isCatalogItem && !item.isContested
                      const lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0)
                      const isMissingDescription = missingDescriptionIndices.has(index)

                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-xl border space-y-3 ${
                            item.isContested
                              ? "bg-red-950/20 border-red-500/40"
                              : item.isAdHoc
                                ? "bg-amber-950/15 border-amber-500/25"
                                : "bg-black/20 border-blue-500/20"
                          } ${isMissingDescription && !item.isContested ? "ring-1 ring-amber-500/40" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs text-blue-300 font-medium">
                                Voce {index + 1}
                                {item.isAdHoc ? " · Nuovo prezzo" : ""}
                                {item.isContested ? " · Contestata" : ""}
                              </p>
                              {lockCatalogFields || !canEdit ? (
                                <p className="text-sm text-white font-mono truncate">{item.materialCode || "—"}</p>
                              ) : (
                                <input
                                  aria-label={`Codice voce ${index + 1}`}
                                  disabled={!canEdit}
                                  value={item.materialCode}
                                  onChange={(e) => updateLine(index, { materialCode: e.target.value })}
                                  className={cellInputClass}
                                />
                              )}
                            </div>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => removeLine(index)}
                                className={`p-2 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-900/20 shrink-0 ${btnSecondaryClass}`}
                                aria-label={`Rimuovi voce ${index + 1}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs text-blue-300 mb-1">Descrizione</label>
                            {lockCatalogFields || !canEdit ? (
                              <TruncatedTextDetails
                                text={item.description}
                                title={`Voce ${index + 1}`}
                                lines={2}
                                className="text-sm text-white"
                                fields={[
                                  { label: "Codice", value: item.materialCode || "—" },
                                  { label: "U.M.", value: item.udm || "—" },
                                  {
                                    label: "Prezzo unitario",
                                    value: `€ ${Number(item.unitPrice || 0).toFixed(2)}`,
                                  },
                                ]}
                              />
                            ) : (
                              <>
                                <input
                                  aria-label={`Descrizione voce ${index + 1}`}
                                  disabled={!canEdit}
                                  placeholder="Descrizione *"
                                  value={item.description}
                                  onChange={(e) => updateLine(index, { description: e.target.value })}
                                  className={inputClassWithWarning(cellInputClass, isMissingDescription)}
                                />
                                {isMissingDescription && (
                                  <p className="mt-1 text-xs text-amber-300">Descrizione obbligatoria</p>
                                )}
                              </>
                            )}
                            {item.isContested && item.contestNote && (
                              <p className="mt-2 text-xs text-red-200/90 bg-red-950/30 rounded-lg px-2 py-1.5 border border-red-500/20">
                                Contestazione DEC: {item.contestNote}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-blue-300 mb-1">U.M.</label>
                              {lockCatalogFields || !canEdit ? (
                                <p className="text-sm text-white">{item.udm || "—"}</p>
                              ) : (
                                <input
                                  aria-label={`Unità di misura voce ${index + 1}`}
                                  disabled={!canEdit}
                                  value={item.udm}
                                  onChange={(e) => updateLine(index, { udm: e.target.value })}
                                  className={cellInputClass}
                                />
                              )}
                            </div>
                            <div>
                              <label className="block text-xs text-blue-300 mb-1">Qtà</label>
                              <NumberInput
                                size="sm"
                                min={0}
                                textAlign="right"
                                aria-label={`Quantità voce ${index + 1}`}
                                disabled={!canEdit}
                                value={item.quantity}
                                onChange={(e) => updateLine(index, { quantity: e.target.value })}
                                className={cellInputClass}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-blue-300 mb-1">Prezzo unit.</label>
                              {lockCatalogFields || !canEdit ? (
                                <p className="text-sm text-white text-right">€ {Number(item.unitPrice || 0).toFixed(2)}</p>
                              ) : (
                                <NumberInput
                                  size="sm"
                                  min={0}
                                  textAlign="right"
                                  aria-label={`Prezzo unitario voce ${index + 1}`}
                                  disabled={!canEdit}
                                  value={item.unitPrice}
                                  onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                                  className={cellInputClass}
                                />
                              )}
                            </div>
                          </div>

                          <p className="text-sm font-medium text-white flex justify-between pt-1 border-t border-blue-500/15">
                            <span>Totale riga</span>
                            <span>€ {lineTotal.toFixed(2)}</span>
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  <div className={`hidden md:block ${TABLE_SCROLL_X} rounded-xl border border-blue-500/20 bg-black/20`}>
                    <table className="w-full min-w-[640px] text-sm text-left">
                      <thead className="text-blue-200 border-b border-blue-500/20 bg-blue-950/50">
                        <tr>
                          <th className="px-3 py-2.5 font-medium whitespace-nowrap">Codice</th>
                          <th className="px-3 py-2.5 font-medium min-w-[160px]">Descrizione</th>
                          <th className="px-3 py-2.5 font-medium whitespace-nowrap">U.M.</th>
                          <th className="px-3 py-2.5 font-medium whitespace-nowrap text-right">Qtà</th>
                          <th className="px-3 py-2.5 font-medium whitespace-nowrap text-right">Prezzo unit.</th>
                          <th className="px-3 py-2.5 font-medium whitespace-nowrap text-right">Totale</th>
                          {canEdit && <th className="px-3 py-2.5 font-medium w-10" aria-label="Azioni" />}
                        </tr>
                      </thead>
                      <tbody>
                        {formData.lineItems.map((item, index) => {
                          const isCatalogItem = !item.isAdHoc
                          const lockCatalogFields = isCatalogItem && !item.isContested
                          const lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0)
                          const isMissingDescription = missingDescriptionIndices.has(index)
                          const cellReadOnlyClass = "text-white"

                          return (
                            <tr
                              key={index}
                              className={`border-b border-blue-500/10 last:border-b-0 ${
                                item.isContested
                                  ? "bg-red-950/20"
                                  : item.isAdHoc
                                    ? "bg-amber-950/15"
                                    : "hover:bg-blue-900/10"
                              } ${isMissingDescription && !item.isContested ? "ring-1 ring-inset ring-amber-500/30" : ""}`}
                            >
                              <td className="px-3 py-2 align-middle">
                                {lockCatalogFields || !canEdit ? (
                                  <span className={`${cellReadOnlyClass} font-mono text-xs`}>{item.materialCode || "—"}</span>
                                ) : (
                                  <input
                                    aria-label={`Codice voce ${index + 1}`}
                                    disabled={!canEdit}
                                    value={item.materialCode}
                                    onChange={(e) => updateLine(index, { materialCode: e.target.value })}
                                    className={cellInputClass}
                                  />
                                )}
                              </td>
                              <td className="px-3 py-2 align-middle max-w-[280px]">
                                {lockCatalogFields || !canEdit ? (
                                  <div>
                                    <TruncatedTextDetails
                                      text={item.description}
                                      title={`Voce ${index + 1}`}
                                      lines={2}
                                      className={cellReadOnlyClass}
                                      fields={[
                                        { label: "Codice", value: item.materialCode || "—" },
                                        { label: "U.M.", value: item.udm || "—" },
                                        {
                                          label: "Prezzo unitario",
                                          value: `€ ${Number(item.unitPrice || 0).toFixed(2)}`,
                                        },
                                      ]}
                                    />
                                    {item.isContested && item.contestNote && (
                                      <p className="mt-1 text-[10px] text-red-200/90">
                                        Contestazione: {item.contestNote}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <input
                                      aria-label={`Descrizione voce ${index + 1}`}
                                      aria-invalid={isMissingDescription}
                                      disabled={!canEdit}
                                      placeholder="Descrizione *"
                                      value={item.description}
                                      onChange={(e) => updateLine(index, { description: e.target.value })}
                                      className={inputClassWithWarning(cellInputClass, isMissingDescription)}
                                    />
                                    {isMissingDescription && (
                                      <p className="mt-0.5 text-[10px] text-amber-300">Obbligatoria</p>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 align-middle whitespace-nowrap">
                                {lockCatalogFields || !canEdit ? (
                                  <span className={cellReadOnlyClass}>{item.udm || "—"}</span>
                                ) : (
                                  <input
                                    aria-label={`Unità di misura voce ${index + 1}`}
                                    disabled={!canEdit}
                                    value={item.udm}
                                    onChange={(e) => updateLine(index, { udm: e.target.value })}
                                    className={`${cellInputClass} w-16`}
                                  />
                                )}
                              </td>
                              <td className="px-3 py-2 align-middle">
                                <NumberInput
                                  size="sm"
                                  min={0}
                                  textAlign="right"
                                  aria-label={`Quantità voce ${index + 1}`}
                                  disabled={!canEdit}
                                  value={item.quantity}
                                  onChange={(e) => updateLine(index, { quantity: e.target.value })}
                                  className={`${cellInputClass} w-24 ml-auto`}
                                />
                              </td>
                              <td className="px-3 py-2 align-middle text-right whitespace-nowrap">
                                {lockCatalogFields || !canEdit ? (
                                  <span className={cellReadOnlyClass}>€ {Number(item.unitPrice || 0).toFixed(2)}</span>
                                ) : (
                                  <NumberInput
                                    size="sm"
                                    min={0}
                                    textAlign="right"
                                    aria-label={`Prezzo unitario voce ${index + 1}`}
                                    disabled={!canEdit}
                                    value={item.unitPrice}
                                    onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                                    className={`${cellInputClass} w-28 ml-auto`}
                                  />
                                )}
                              </td>
                              <td className="px-3 py-2 align-middle text-right text-white whitespace-nowrap font-medium">
                                € {lineTotal.toFixed(2)}
                              </td>
                              {canEdit && (
                                <td className="px-3 py-2 align-middle">
                                  <button
                                    type="button"
                                    onClick={() => removeLine(index)}
                                    className={`p-1.5 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-900/20 ${btnSecondaryClass}`}
                                    aria-label={`Rimuovi voce ${index + 1}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              )}
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

            <SectionHeading>Riepilogo economico</SectionHeading>
            <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="quote-discount" className="block text-sm font-medium text-blue-200 mb-2">Sconto %</label>
                <NumberInput
                  id="quote-discount"
                  min={minDiscountPercent}
                  max={100}
                  disabled={!canEdit}
                  value={formData.discountPercent}
                  onChange={(e) => setFormData((p) => ({
                    ...p,
                    discountPercent: clampDiscountPercent(e.target.value, minDiscountPercent),
                  }))}
                  className={fieldInputClass}
                />
                <p className="mt-1 text-xs text-blue-200/90">
                  Minimo da capitolato: {minDiscountPercent}%
                </p>
              </div>
              <div>
                <label htmlFor="quote-notes" className="block text-sm font-medium text-blue-200 mb-2">Note</label>
                <input
                  id="quote-notes"
                  disabled={!canEdit}
                  value={formData.notes}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  className={fieldInputClass}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/20 text-sm text-white space-y-1">
              <p className="flex justify-between"><span className="text-blue-200">Totale lordo</span><span>€ {totals.subtotal.toFixed(2)}</span></p>
              <p className="flex justify-between"><span className="text-blue-200">Oneri sicurezza 2%</span><span>€ {totals.safetyAmount.toFixed(2)}</span></p>
              <p className="flex justify-between"><span className="text-blue-200">Sconto</span><span>€ {totals.discountAmount.toFixed(2)}</span></p>
              <p className="flex justify-between font-semibold text-white pt-2 border-t border-blue-500/20">
                <span>Totale netto</span><span>€ {totals.total.toFixed(2)}</span>
              </p>
            </div>
            </div>

            <SectionHeading>Azioni</SectionHeading>
            <div className="space-y-3 pb-1">
            {(canEdit || quote?._id) && (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  disabled={!!downloadingFormat}
                  onClick={() => handleDownloadClick("xlsx")}
                  className={`flex-1 py-3 rounded-xl border border-blue-500/30 text-blue-100 hover:bg-blue-900/30 disabled:opacity-50 flex items-center justify-center gap-2 ${btnSecondaryClass}`}
                >
                  {downloadingFormat === "xlsx" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Scaricamento…
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Scarica XLSX
                    </>
                  )}
                </button>
                {/* Scarica PDF nascosto: non ancora supportato in questo deploy */}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              {canEdit && (
                <>
                  <button
                    type="button"
                    disabled={saving || submitting || (!isDirty && !!quote?._id)}
                    onClick={handleSave}
                    className={`flex-1 py-3 rounded-xl border border-blue-500/30 text-blue-100 hover:bg-blue-900/30 disabled:opacity-50 flex items-center justify-center gap-2 ${btnSecondaryClass}`}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Salvataggio…
                      </>
                    ) : (
                      "Salva bozza"
                    )}
                  </button>
                  <div className="flex-1 flex items-center gap-1">
                    <button
                      type="button"
                      disabled={saving || submitting || !canSubmit}
                      onClick={handleSubmit}
                      title={!canSubmit ? "Solo il titolare manutentore può inviare il preventivo in approvazione." : undefined}
                      className={`flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${btnPrimaryClass}`}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Invio…
                        </>
                      ) : (
                        "Invia in approvazione"
                      )}
                    </button>
                    {!canSubmit && (
                      <InfoTooltip text="Solo il titolare manutentore può inviare il preventivo in approvazione al DEC." />
                    )}
                  </div>
                </>
              )}
              {quote?._id && quote.status === "PENDING_APPROVAL" && canApprove && (
                <button
                  type="button"
                  onClick={() => navigate(`/quote/${quote._id}/review`)}
                  className={`flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium ${btnPrimaryClass}`}
                >
                  Apri revisione DEC
                </button>
              )}
              {quote?._id && !canEdit && (
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className={`flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium ${btnPrimaryClass}`}
                >
                  Torna alla Dashboard
                </button>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={showLeaveConfirm}
        title="Salvare la bozza?"
        description="Hai modifiche non salvate. Vuoi salvare la bozza prima di uscire?"
        confirmLabel="Salva bozza"
        cancelLabel="Annulla"
        secondaryLabel="Esci senza salvare"
        isLoading={saving}
        onCancel={handleLeaveCancel}
        onSecondary={handleLeaveWithoutSave}
        onConfirm={handleLeaveWithSave}
      />
      <ConfirmDialog
        isOpen={showSaveBeforeDownload}
        title="Salva la bozza"
        description={`Per scaricare il file ${pendingDownloadFormat?.toUpperCase() || ""} devi prima salvare la bozza almeno una volta.`}
        confirmLabel="Salva bozza"
        cancelLabel="Annulla"
        isLoading={saving || !!downloadingFormat}
        onCancel={handleCancelSaveBeforeDownload}
        onConfirm={handleConfirmSaveBeforeDownload}
      />
      <ConfirmDialog
        isOpen={showSubmitConfirm}
        title="Inviare con campi mancanti?"
        description={`Ci sono ${missingFieldSummary.length + missingFieldExtraCount} voci con descrizione non compilata. Vuoi inviare comunque il preventivo?`}
        details={missingFieldSummary}
        detailsExtraLabel={missingFieldExtraCount > 0 ? `+ altri ${missingFieldExtraCount} campi mancanti` : ""}
        confirmLabel="Invia comunque"
        cancelLabel="Controlla voci"
        variant="danger"
        isLoading={submitting}
        onCancel={() => setShowSubmitConfirm(false)}
        onConfirm={handleConfirmSubmitWithMissing}
      />
    </div>
  )
}

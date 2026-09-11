"use client"

import { useState, useEffect, useContext, useMemo, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { useNavigate, useParams, useMatch } from "react-router-dom"
import {
  DndContext,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
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
import { TruncatedTextDetails } from "../components/ui/TruncatedTextDetails"
import {
  computeQuoteTotalsClient,
  sumBomUnitPrice,
  QUOTE_STATUS_LABELS,
  QUOTE_EDITABLE_STATUSES,
  canManageQuotesByRole,
  canSubmitQuoteByRole,
  canApproveQuoteByRole,
} from "../utils/utils"
import {
  emptyBomChild,
  isEmptyNpLine,
  lineDetailsTitle,
  mapBomFromCatalogItem,
  mapChildrenFromBom,
  nextNpCode,
  serializeLineItemSnapshot,
} from "../utils/npBom"
import toast from "react-hot-toast"
import { PAGE_SCROLL_SHELL, TABLE_SCROLL_X } from "../utils/pageScrollShell"
import { CapitolatoValidityChip } from "../components/ui/CapitolatoValidityChip"
import { CatalogPickerModal } from "../components/CatalogPickerModal"
import { CatalogDragSkeleton } from "../components/DraggableCatalogMaterialRow"
import { CatalogMaterialSections } from "../components/CatalogMaterialSections"
import { QuoteLineItemsDropZone } from "../components/QuoteLineItemsDropZone"
import { QuoteNpLineCard, QuoteNpTableRows } from "../components/QuoteNpLineCard"
import { UdmSelect } from "../components/ui/UdmSelect"
import { useMediaQuery } from "../hooks/useMediaQuery"
import { formatUdmLabel, normalizeUdm } from "../utils/udm"

const emptyLine = () => ({
  materialCode: "",
  description: "",
  fullDescription: "",
  udm: "cad",
  quantity: 1,
  unitPrice: 0,
  category: "",
  isAdHoc: false,
  children: [],
  isContested: false,
  contestNote: "",
})

const normalizeLineItem = (item) => {
  const children = item.children?.length
    ? mapChildrenFromBom(item.children)
    : mapChildrenFromBom(item.bom || [])
  const isAdHoc = !!item.isAdHoc
  return {
    materialCode: item.materialCode || "",
    description: item.description || "",
    fullDescription: item.fullDescription || "",
    udm: normalizeUdm(item.udm),
    quantity: item.quantity ?? 1,
    unitPrice: isAdHoc && children.length
      ? sumBomUnitPrice(children)
      : Number(item.unitPrice) || 0,
    category: item.category || "",
    isAdHoc,
    isContested: !!item.isContested,
    contestNote: item.contestNote || "",
    children: isAdHoc ? children : [],
  }
}

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

/** Preferisce drop su NP rispetto all'elenco voci quando entrambi collidono. */
const catalogDropCollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) {
    const npHit = pointerCollisions.find((c) => String(c.id).startsWith("np-"))
    if (npHit) return [npHit]
    return pointerCollisions
  }
  return closestCenter(args)
}

const SectionHeading = ({ children }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-300 mb-3 pt-4 border-t border-blue-500/15 first:border-t-0 first:pt-0">
    {children}
  </h3>
)

const serializeFormSnapshot = (data) => JSON.stringify({
  discountPercent: Number(data.discountPercent) || 0,
  notes: data.notes || "",
  lineItems: (data.lineItems || []).map(serializeLineItemSnapshot),
})

const applyFormFromDocs = (c, p, minDiscountPercent = 0) => {
  const raw =
    c.lineItems?.length
      ? c.lineItems
      : (p?.lineItems?.length ? p.lineItems : [])
  return {
    discountPercent: clampDiscountPercent(
      c.discountPercent ?? p?.discountPercent ?? 0,
      minDiscountPercent
    ),
    notes: c.notes || "",
    lineItems: raw.length ? raw.map(normalizeLineItem) : [emptyLine()],
  }
}

export default function Consuntivo() {
  const { userData, getMaintenanceConfig } = useContext(UserContext)
  const navigate = useNavigate()
  const { id } = useParams()
  const fromParentRoute = Boolean(useMatch("/quote/:id/consuntivo"))

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [downloadingFormat, setDownloadingFormat] = useState(null)
  const [parentQuote, setParentQuote] = useState(null)
  const [consuntivo, setConsuntivo] = useState(null)
  const [config, setConfig] = useState(null)
  const [capitolatoValidity, setCapitolatoValidity] = useState(null)
  const [catalogQuery, setCatalogQuery] = useState("")
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showSaveBeforeDownload, setShowSaveBeforeDownload] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState("")
  const [pendingDownloadFormat, setPendingDownloadFormat] = useState(null)
  /** Indice NP per cui è aperta la modal catalogo (sotto-voci) */
  const [catalogPickerNpIndex, setCatalogPickerNpIndex] = useState(null)
  const [activeCatalogDrag, setActiveCatalogDrag] = useState(null)
  const catalogDragOverlayRef = useRef(null)
  const isMdUp = useMediaQuery("(min-width: 768px)")
  /** Drag catalogo solo desktop (esclude tablet/mobile). */
  const isDesktopDnD = useMediaQuery("(min-width: 1024px)")

  const pendingNavigationRef = useRef(null)
  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const [formData, setFormData] = useState({
    discountPercent: 0,
    notes: "",
    lineItems: [emptyLine()],
  })

  const canEdit = useMemo(() => {
    if (!canManageQuotesByRole(userData)) return false
    if (!consuntivo) return true
    return QUOTE_EDITABLE_STATUSES.includes(consuntivo.status)
  }, [userData, consuntivo])

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

  const parentTotal = Number(parentQuote?.total) || 0
  const exceedsParentTotal = Boolean(parentQuote) && totals.total > parentTotal
  const excessOverParent = exceedsParentTotal
    ? Math.round((totals.total - parentTotal) * 100) / 100
    : 0

  const catalog = config?.materialCatalog || []

  const materialCategoryOptions = useMemo(() => {
    const fromConfig = (
      config?.effectiveCategories?.length
        ? config.effectiveCategories
        : config?.materialCategories || []
    )
      .map((cat) => String(cat || "").trim())
      .filter(Boolean)
    const set = new Set(fromConfig)
    for (const material of catalog) {
      const value = String(material?.category || "").trim()
      if (value) set.add(value)
    }
    for (const item of formData.lineItems) {
      const value = String(item?.category || "").trim()
      if (value) set.add(value)
    }
    return [...set].map((cat) => ({ value: cat, label: cat }))
  }, [config?.effectiveCategories, config?.materialCategories, catalog, formData.lineItems])

  const catalogMatches = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter(
      (m) =>
        m.code?.toLowerCase().includes(q)
        || m.description?.toLowerCase().includes(q)
        || m.fullDescription?.toLowerCase().includes(q)
        || m.category?.toLowerCase().includes(q)
    )
  }, [catalog, catalogQuery])

  const isCatalogSearching = catalogQuery.trim().length > 0

  const missingDescriptionIndices = useMemo(() => {
    const indices = new Set()
    formData.lineItems.forEach((item, index) => {
      if (isLineMissingDescription(item)) indices.add(index)
    })
    return indices
  }, [formData.lineItems])

  const emptyNpIndices = useMemo(() => {
    const indices = new Set()
    formData.lineItems.forEach((item, index) => {
      if (isEmptyNpLine(item)) indices.add(index)
    })
    return indices
  }, [formData.lineItems])

  const contestedCount = useMemo(
    () => formData.lineItems.filter((item) => item.isContested).length,
    [formData.lineItems]
  )

  const readOnlyMessage = useMemo(() => {
    if (canEdit) return null
    if (consuntivo?.status === "PENDING_APPROVAL") {
      return "Consuntivo in attesa di revisione RUP — sola lettura."
    }
    if (consuntivo?.status === "APPROVED" || consuntivo?.protocolNumber) {
      return "Consuntivo approvato — sola lettura."
    }
    return "Consuntivo non modificabile — sola lettura."
  }, [canEdit, consuntivo?.status, consuntivo?.protocolNumber])

  useEffect(() => {
    if (!userData) {
      navigate("/")
      return
    }
    if (!canManage && !canApprove) {
      navigate("/dashboard")
      return
    }

    const loadConfigForDoc = async (doc, parent) => {
      const thName = doc?.townHallId?.name || parent?.townHallId?.name
      if (!thName || !getMaintenanceConfig) return { config: null, validity: null }
      try {
        const configRes = await getMaintenanceConfig(thName)
        return {
          config: configRes?.data?.config || null,
          validity: configRes?.data?.validity || null,
        }
      } catch {
        return { config: null, validity: null }
      }
    }

    const load = async () => {
      try {
        setLoading(true)
        setError("")

        if (fromParentRoute) {
          if (!canManage) {
            setError("Solo i manutentori possono creare un consuntivo.")
            return
          }
          const createRes = await api.post(`/api/quotes/${id}/consuntivo`)
          const c = createRes.data.consuntivo
          const p = createRes.data.parentQuote
          const { config: cfg, validity } = await loadConfigForDoc(c, p)
          setConfig(cfg)
          setCapitolatoValidity(validity)
          setConsuntivo(c)
          setParentQuote(p)
          const nextForm = applyFormFromDocs(c, p, normalizeMinDiscountPercent(cfg))
          setFormData(nextForm)
          setLastSavedSnapshot(serializeFormSnapshot(nextForm))
          if (c?._id) {
            navigate(`/consuntivo/${c._id}`, { replace: true })
          }
          return
        }

        const docRes = await api.get(`/api/quotes/${id}`)
        const doc = docRes.data
        if (doc.type === "QUOTE") {
          if (!canManage) {
            setError("Solo i manutentori possono creare un consuntivo.")
            return
          }
          const createRes = await api.post(`/api/quotes/${id}/consuntivo`)
          const c = createRes.data.consuntivo
          const p = createRes.data.parentQuote
          const { config: cfg, validity } = await loadConfigForDoc(c, p)
          setConfig(cfg)
          setCapitolatoValidity(validity)
          setConsuntivo(c)
          setParentQuote(p)
          const nextForm = applyFormFromDocs(c, p, normalizeMinDiscountPercent(cfg))
          setFormData(nextForm)
          setLastSavedSnapshot(serializeFormSnapshot(nextForm))
          if (c?._id) navigate(`/consuntivo/${c._id}`, { replace: true })
          return
        }

        if (doc.type !== "CONSUNTIVO") {
          setError("Documento non valido per il consuntivo.")
          return
        }

        if (!canManage && canApprove && doc.status === "PENDING_APPROVAL") {
          navigate(`/consuntivo/${doc._id}/review`, { replace: true })
          return
        }

        setConsuntivo(doc)
        let parent = null
        if (doc.parentQuoteId) {
          const parentId = doc.parentQuoteId._id || doc.parentQuoteId
          const parentRes = await api.get(`/api/quotes/${parentId}`)
          parent = parentRes.data
        }
        setParentQuote(parent)
        const { config: cfg, validity } = await loadConfigForDoc(doc, parent)
        setConfig(cfg)
        setCapitolatoValidity(validity)
        const nextForm = applyFormFromDocs(doc, parent, normalizeMinDiscountPercent(cfg))
        setFormData(nextForm)
        setLastSavedSnapshot(serializeFormSnapshot(nextForm))
      } catch (err) {
        console.error(err)
        setError(err.response?.data?.error || "Impossibile caricare il consuntivo.")
      } finally {
        setLoading(false)
      }
    }

    if (id) load()
  }, [userData, navigate, id, fromParentRoute, getMaintenanceConfig, canManage, canApprove])

  const updateLine = (index, patch) => {
    setFormData((prev) => {
      const lineItems = [...prev.lineItems]
      const next = { ...lineItems[index], ...patch }
      if (next.isAdHoc && Array.isArray(next.children)) {
        next.unitPrice = sumBomUnitPrice(next.children)
      }
      lineItems[index] = next
      return { ...prev, lineItems }
    })
  }

  const updateChild = (parentIndex, childIndex, patch) => {
    setFormData((prev) => {
      const lineItems = [...prev.lineItems]
      const parent = { ...lineItems[parentIndex] }
      const children = [...(parent.children || [])]
      children[childIndex] = { ...children[childIndex], ...patch }
      parent.children = children
      parent.unitPrice = sumBomUnitPrice(children)
      lineItems[parentIndex] = parent
      return { ...prev, lineItems }
    })
  }

  const removeChild = (parentIndex, childIndex) => {
    setFormData((prev) => {
      const lineItems = [...prev.lineItems]
      const parent = { ...lineItems[parentIndex] }
      const children = (parent.children || []).filter((_, i) => i !== childIndex)
      parent.children = children
      parent.unitPrice = sumBomUnitPrice(children)
      lineItems[parentIndex] = parent
      return { ...prev, lineItems }
    })
  }

  const addAdHocChild = (parentIndex) => {
    setFormData((prev) => {
      const lineItems = [...prev.lineItems]
      const parent = { ...lineItems[parentIndex] }
      const existing = parent.children || []
      const children = [...existing, emptyBomChild(parent.materialCode, existing)]
      parent.children = children
      parent.unitPrice = sumBomUnitPrice(children)
      lineItems[parentIndex] = parent
      return { ...prev, lineItems }
    })
  }

  const addCatalogChildToNp = useCallback((parentIndex, fromCatalog) => {
    setFormData((prev) => {
      const lineItems = [...prev.lineItems]
      const parent = lineItems[parentIndex]
      if (!parent?.isAdHoc) return prev
      const children = [...(parent.children || []), mapBomFromCatalogItem(fromCatalog)]
      lineItems[parentIndex] = {
        ...parent,
        children,
        unitPrice: sumBomUnitPrice(children),
      }
      return { ...prev, lineItems }
    })
    toast.success(`${fromCatalog.code || "Voce"} aggiunta alla distinta`)
  }, [])

  const addLineFromCatalog = useCallback((fromCatalog) => {
    const bom = fromCatalog.bom || []

    if (Array.isArray(bom) && bom.length > 0) {
      const children = mapChildrenFromBom(bom)
      setFormData((prev) => ({
        ...prev,
        lineItems: [
          ...prev.lineItems,
          {
            materialCode: fromCatalog.code || "",
            description: fromCatalog.description || "",
            fullDescription: fromCatalog.fullDescription || "",
            udm: normalizeUdm(fromCatalog.udm),
            quantity: 1,
            unitPrice: sumBomUnitPrice(children) || Number(fromCatalog.unitPrice) || 0,
            category: fromCatalog.category || "",
            isAdHoc: true,
            children,
          },
        ],
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        lineItems: [
          ...prev.lineItems,
          {
            materialCode: fromCatalog.code || "",
            description: fromCatalog.description || "",
            fullDescription: fromCatalog.fullDescription || "",
            udm: normalizeUdm(fromCatalog.udm),
            quantity: 1,
            unitPrice: fromCatalog.unitPrice || 0,
            category: fromCatalog.category || "",
            isAdHoc: false,
            children: [],
          },
        ],
      }))
    }
    setCatalogQuery("")
    toast.success(`${fromCatalog.code || "Voce"} aggiunta al consuntivo`)
  }, [])

  const handleCatalogDragStart = useCallback((event) => {
    if (!isDesktopDnD) return
    const material = event.active?.data?.current?.material
    setActiveCatalogDrag(material || null)
    if (event.activatorEvent && "clientY" in event.activatorEvent) {
      const { clientX, clientY } = event.activatorEvent
      requestAnimationFrame(() => {
        const el = catalogDragOverlayRef.current
        if (!el) return
        el.style.left = `${clientX}px`
        el.style.top = `${clientY}px`
      })
    }
  }, [isDesktopDnD])

  useEffect(() => {
    if (!activeCatalogDrag || !isDesktopDnD) return undefined
    const onPointerMove = (event) => {
      const el = catalogDragOverlayRef.current
      if (!el) return
      el.style.left = `${event.clientX}px`
      el.style.top = `${event.clientY}px`
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    return () => window.removeEventListener("pointermove", onPointerMove)
  }, [activeCatalogDrag, isDesktopDnD])

  const handleCatalogDragCancel = useCallback(() => {
    setActiveCatalogDrag(null)
  }, [])

  const handleCatalogDragEnd = useCallback((event) => {
    const { active, over } = event
    setActiveCatalogDrag(null)
    if (!isDesktopDnD) return
    const material = active?.data?.current?.material
    if (!material || !over) return

    const overId = String(over.id)
    if (overId === "quote-line-items") {
      addLineFromCatalog(material)
      return
    }
    if (overId.startsWith("np-")) {
      const match = /^np-(\d+)/.exec(overId)
      const parentIndex = match ? Number.parseInt(match[1], 10) : Number.NaN
      if (Number.isFinite(parentIndex)) {
        addCatalogChildToNp(parentIndex, material)
      }
    }
  }, [addLineFromCatalog, addCatalogChildToNp, isDesktopDnD])

  const handleCatalogPickerSelect = useCallback((fromCatalog) => {
    if (catalogPickerNpIndex == null) return
    addCatalogChildToNp(catalogPickerNpIndex, fromCatalog)
  }, [catalogPickerNpIndex, addCatalogChildToNp])

  const addAdHocLine = () => {
    setFormData((prev) => {
      const code = nextNpCode(
        catalog,
        prev.lineItems.map((item) => item.materialCode)
      )
      return {
        ...prev,
        lineItems: [
          ...prev.lineItems,
          {
            ...emptyLine(),
            materialCode: code,
            isAdHoc: true,
            description: "",
            fullDescription: "",
            children: [],
            unitPrice: 0,
          },
        ],
      }
    })
  }

  const removeLine = (index) => {
    setCatalogPickerNpIndex((prev) => {
      if (prev == null) return prev
      if (prev === index) return null
      if (prev > index) return prev - 1
      return prev
    })
    setFormData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.length <= 1
        ? [emptyLine()]
        : prev.lineItems.filter((_, i) => i !== index),
    }))
  }

  /** Persiste i NP compilati nel prezziario del capitolato attivo. */
  const syncAdHocMaterialsToCatalog = async (lineItems) => {
    const townHallKey =
      consuntivo?.townHallId?.name
      || parentQuote?.townHallId?.name
      || config?.townHallId
    if (!townHallKey) return lineItems

    const adHocItems = (lineItems || []).filter(
      (item) => item.isAdHoc
        && String(item.description || "").trim()
        && (item.children || []).some((c) => String(c.description || "").trim())
    )
    if (adHocItems.length === 0) return lineItems

    const codeUpdates = {}

    for (const item of adHocItems) {
      const children = item.children || []
      const res = await api.post(
        `/api/maintenance-config/${encodeURIComponent(townHallKey)}/materials/np`,
        {
          code: item.materialCode || undefined,
          description: String(item.description).trim(),
          fullDescription: String(item.fullDescription || "").trim(),
          udm: normalizeUdm(item.udm),
          unitPrice: sumBomUnitPrice(children),
          category: item.category || "",
          bom: children,
        }
      )
      const assigned = res.data?.materialCode
      if (assigned && assigned !== item.materialCode) {
        codeUpdates[item.materialCode] = assigned
      }
      if (res.data?.config) {
        setConfig(res.data.config)
      }
    }

    const nextItems = (lineItems || []).map((item) => (
      codeUpdates[item.materialCode]
        ? { ...item, materialCode: codeUpdates[item.materialCode] }
        : item
    ))

    if (Object.keys(codeUpdates).length > 0) {
      setFormData((prev) => ({ ...prev, lineItems: nextItems }))
    }

    const thName = consuntivo?.townHallId?.name || parentQuote?.townHallId?.name
    if (thName && getMaintenanceConfig) {
      const configRes = await getMaintenanceConfig(thName)
      if (configRes?.data?.config) {
        setConfig(configRes.data.config)
        setCapitolatoValidity(configRes.data.validity || null)
      }
    }

    return nextItems
  }

  const buildPayload = () => ({
    discountPercent: clampDiscountPercent(formData.discountPercent, minDiscountPercent),
    safetyChargeRate: 0.02,
    notes: formData.notes,
    lineItems: formData.lineItems.filter((i) => i.description?.trim()),
  })

  const saveDraft = async ({ showToast = true } = {}) => {
    if (!consuntivo?._id) return { ok: false }
    setSaving(true)
    setError("")
    try {
      const syncedItems = await syncAdHocMaterialsToCatalog(formData.lineItems)
      const payload = {
        ...buildPayload(),
        lineItems: syncedItems.filter((i) => i.description?.trim()),
      }
      const patchRes = await api.patch(`/api/quotes/${consuntivo._id}`, payload)
      setConsuntivo(patchRes.data)
      const snapshotData = { ...formData, lineItems: syncedItems }
      setFormData(snapshotData)
      setLastSavedSnapshot(serializeFormSnapshot(snapshotData))
      if (showToast) toast.success("Bozza consuntivo salvata")
      return { ok: true, consuntivo: patchRes.data }
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.error || "Errore salvataggio bozza")
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

  const handleSave = async () => {
    await saveDraft()
  }

  const submitConsuntivo = async () => {
    if (!consuntivo?._id) return
    setSubmitting(true)
    setError("")
    try {
      const syncedItems = await syncAdHocMaterialsToCatalog(formData.lineItems)
      const payload = {
        ...buildPayload(),
        lineItems: syncedItems.filter((i) => i.description?.trim()),
      }
      await api.patch(`/api/quotes/${consuntivo._id}`, payload)
      const snapshotData = { ...formData, lineItems: syncedItems }
      setFormData(snapshotData)
      setLastSavedSnapshot(serializeFormSnapshot(snapshotData))
      const submitRes = await api.post(`/api/quotes/${consuntivo._id}/submit`)
      setConsuntivo(submitRes.data)
      toast.success("Consuntivo inviato in approvazione al RUP")
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.error || "Errore invio in approvazione")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error("Solo il titolare manutentore può inviare il consuntivo in approvazione.")
      return
    }
    if (!formData.lineItems.some((i) => i.description?.trim())) {
      toast.error("Aggiungere almeno una voce di materiale.")
      return
    }

    const emptyNp = formData.lineItems
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => isEmptyNpLine(item))
    if (emptyNp.length > 0) {
      const labels = emptyNp
        .slice(0, 3)
        .map(({ item, index }) => item.materialCode?.trim() || `voce ${index + 1}`)
        .join(", ")
      const extra = emptyNp.length > 3 ? ` e altri ${emptyNp.length - 3}` : ""
      toast.error(
        emptyNp.length === 1
          ? `Il nuovo prezzo (${labels}) non ha componenti nella distinta.`
          : `Nuovi prezzi senza componenti: ${labels}${extra}. Aggiungi almeno un componente a ciascuno.`
      )
      return
    }

    setShowSubmitConfirm(true)
  }

  const handleConfirmSubmit = async () => {
    setShowSubmitConfirm(false)
    if (formData.lineItems.some((item) => isEmptyNpLine(item))) {
      toast.error("Impossibile inviare: un nuovo prezzo non ha componenti nella distinta.")
      return
    }
    await submitConsuntivo()
  }

  const syncConsuntivoForExport = async (docId) => {
    if (!canEdit) return docId
    const syncedItems = await syncAdHocMaterialsToCatalog(formData.lineItems)
    const payload = {
      ...buildPayload(),
      lineItems: syncedItems.filter((i) => i.description?.trim()),
    }
    const patchRes = await api.patch(`/api/quotes/${docId}`, payload)
    setConsuntivo(patchRes.data)
    const snapshotData = { ...formData, lineItems: syncedItems }
    setFormData(snapshotData)
    setLastSavedSnapshot(serializeFormSnapshot(snapshotData))
    return patchRes.data._id
  }

  const downloadFile = async (format, docId = consuntivo?._id) => {
    if (!docId || downloadingFormat) return false
    setDownloadingFormat(format)
    try {
      const exportId = await syncConsuntivoForExport(docId)
      const res = await api.get(`/api/quotes/${exportId}/${format}`, {
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
      const safeBase = String(consuntivo?.protocolNumber || `IMS-BOZZA-${String(exportId).slice(-6)}`)
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
        .trim() || `IMS-BOZZA-${String(exportId).slice(-6)}`
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
    if (!consuntivo?._id) {
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
      await downloadFile(format, result.consuntivo._id)
    }
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
              <FileSpreadsheet className="h-6 w-6 text-amber-400 shrink-0 mt-1" />
              <div className="min-w-0">
                <h2 className="text-2xl font-bold text-white">Consuntivo IMS</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <CapitolatoValidityChip validity={capitolatoValidity} />
                  {consuntivo && (
                    <>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          QUOTE_STATUS_TAG_STYLES[consuntivo.status]
                          || "bg-blue-500/25 text-blue-100 border-blue-400/40"
                        }`}
                      >
                        {QUOTE_STATUS_LABELS[consuntivo.status] || consuntivo.status}
                      </span>
                      {consuntivo.protocolNumber && (
                        <span className="text-xs text-blue-200 font-mono">
                          {consuntivo.protocolNumber}
                        </span>
                      )}
                    </>
                  )}
                  {isDirty && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-500/20 text-amber-100 border-amber-400/40">
                      Modifiche non salvate
                    </span>
                  )}
                  {exceedsParentTotal && (
                    <span
                      role="status"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-red-500/20 text-red-100 border-red-400/50"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      Importo totale superiore al preventivo
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

          {parentQuote && (
            <>
              <SectionHeading>Preventivo di riferimento</SectionHeading>
              <div className="mb-6 p-4 rounded-xl bg-amber-900/20 border border-amber-500/20 text-sm text-amber-100 space-y-1">
                <p>
                  <span className="font-medium text-amber-200">Preventivo:</span>{" "}
                  {parentQuote.protocolNumber || parentQuote._id}
                </p>
                <p>
                  <span className="font-medium text-amber-200">Totale preventivo:</span>{" "}
                  € {Number(parentTotal).toFixed(2)}
                </p>
                <p>
                  <span className="font-medium text-amber-200">Priorità:</span>{" "}
                  {parentQuote.priorityClass}
                </p>
              </div>
            </>
          )}

          {error && (
            <div role="alert" className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-200 flex gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {(consuntivo?.rejectedReason || contestedCount > 0) && canEdit && (
            <div role="status" className="mb-4 p-3 rounded-lg bg-amber-900/20 border border-amber-500/30 text-amber-100 text-sm space-y-1">
              <p className="font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Consuntivo respinto dal RUP
                {contestedCount > 0 ? ` — ${contestedCount} ${contestedCount === 1 ? "voce contestata" : "voci contestate"}` : ""}
              </p>
              {consuntivo?.rejectedReason && (
                <p className="text-amber-100/90">{consuntivo.rejectedReason}</p>
              )}
              <p className="text-xs text-amber-200/80">
                Correggi le voci evidenziate e invia di nuovo in approvazione.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <SectionHeading>Materiali</SectionHeading>
            <div className="space-y-5">
            <DndContext
              sensors={dndSensors}
              collisionDetection={catalogDropCollisionDetection}
              onDragStart={handleCatalogDragStart}
              onDragEnd={handleCatalogDragEnd}
              onDragCancel={handleCatalogDragCancel}
            >
            {canEdit && catalog.length > 0 && (
              <div className="space-y-2">
                <label htmlFor="consuntivo-catalog-search" className="block text-sm font-medium text-blue-200">
                  Catalogo materiali
                </label>
                <p className="text-xs text-blue-200/80">
                  {isDesktopDnD
                    ? "Clicca per aggiungere alle voci, oppure trascina la riga sull’elenco consuntivo o su un Nuovo prezzo."
                    : "Clicca una voce per aggiungerla al consuntivo. Su desktop puoi anche trascinarla."}
                </p>
                <input
                  id="consuntivo-catalog-search"
                  type="search"
                  placeholder="Cerca codice o descrizione…"
                  value={catalogQuery}
                  onChange={(e) => setCatalogQuery(e.target.value)}
                  className={`${fieldInputClass} py-2 text-sm`}
                />
                {catalogMatches.length > 0 && (
                  <p className="text-xs text-blue-200/90">
                    {catalogMatches.length} {catalogMatches.length === 1 ? "voce" : "voci"}
                    {isCatalogSearching ? " trovate" : " nel catalogo"}
                    {" · "}sezioni per prezzario e categoria
                  </p>
                )}
                <CatalogMaterialSections
                  materials={catalogMatches}
                  onAdd={addLineFromCatalog}
                  draggable={isDesktopDnD}
                  expandAll={isCatalogSearching}
                  buttonClassName={btnSecondaryClass}
                />
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-blue-200">Voci consuntivo</span>
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

              {emptyNpIndices.size > 0 && canEdit && (
                <div role="status" className="p-2.5 rounded-lg bg-amber-900/20 border border-amber-500/30 text-amber-100 text-xs flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>
                    {emptyNpIndices.size === 1
                      ? "1 nuovo prezzo non ha componenti nella distinta: aggiungine almeno uno prima di inviare."
                      : `${emptyNpIndices.size} nuovi prezzi non hanno componenti nella distinta: aggiungine almeno uno a ciascuno prima di inviare.`}
                  </p>
                </div>
              )}

              {contestedCount > 0 && canEdit && (
                <div role="status" className="p-2.5 rounded-lg bg-red-900/20 border border-red-500/30 text-red-100 text-xs flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>
                    {contestedCount} {contestedCount === 1 ? "voce è contestata" : "voci sono contestate"} dal RUP
                    (evidenziate in rosso).
                  </p>
                </div>
              )}

              <QuoteLineItemsDropZone
                disabled={!canEdit || !isDesktopDnD}
                dropHint="Rilascia per aggiungere la voce al consuntivo"
                className="space-y-3 border border-transparent"
              >
              {formData.lineItems.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-blue-500/30 bg-blue-900/10 text-center text-sm text-blue-200">
                  {isDesktopDnD
                    ? "Nessuna voce inserita. Aggiungi materiali dal catalogo (clic o drag) o crea un nuovo prezzo."
                    : "Nessuna voce inserita. Aggiungi materiali dal catalogo o crea un nuovo prezzo."}
                </div>
              ) : !isMdUp ? (
                  <div className="space-y-3">
                    {formData.lineItems.map((item, index) => {
                      const isCatalogItem = !item.isAdHoc
                      const lockCatalogFields = isCatalogItem && !item.isContested
                      const lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0)
                      const isMissingDescription = missingDescriptionIndices.has(index)
                      const isEmptyNp = emptyNpIndices.has(index)

                      if (item.isAdHoc) {
                        return (
                          <QuoteNpLineCard
                            key={index}
                            item={item}
                            index={index}
                            canEdit={canEdit}
                            enableCatalogDrop={isDesktopDnD}
                            isMissingDescription={isMissingDescription}
                            isEmptyBom={isEmptyNp}
                            materialCategoryOptions={materialCategoryOptions}
                            contestAuthority="RUP"
                            onUpdateLine={updateLine}
                            onRemoveLine={removeLine}
                            onUpdateChild={updateChild}
                            onRemoveChild={removeChild}
                            onAddAdHocChild={addAdHocChild}
                            onRequestCatalog={setCatalogPickerNpIndex}
                          />
                        )
                      }

                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-xl border space-y-3 ${
                            item.isContested
                              ? "bg-red-950/20 border-red-500/40"
                              : "bg-black/20 border-blue-500/20"
                          } ${isMissingDescription && !item.isContested ? "ring-1 ring-amber-500/40" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs text-blue-300 font-medium">
                                Voce {index + 1}
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
                            <label className="block text-xs text-blue-300 mb-1">Descrizione breve</label>
                            {lockCatalogFields || !canEdit ? (
                              <TruncatedTextDetails
                                text={item.description}
                                detailsText={item.fullDescription}
                                title={lineDetailsTitle(item, `Voce ${index + 1}`)}
                                lines={2}
                                className="text-sm text-white"
                                bom={item.children || item.bom || []}
                                fields={[
                                  { label: "Codice", value: item.materialCode || "—" },
                                  { label: "U.M.", value: formatUdmLabel(item.udm) },
                                  {
                                    label: "Prezzo unitario",
                                    value: `€ ${Number(item.unitPrice || 0).toFixed(2)}`,
                                  },
                                ]}
                              />
                            ) : (
                              <>
                                <input
                                  aria-label={`Descrizione breve voce ${index + 1}`}
                                  disabled={!canEdit}
                                  placeholder="Descrizione breve *"
                                  value={item.description}
                                  onChange={(e) => updateLine(index, { description: e.target.value })}
                                  className={inputClassWithWarning(cellInputClass, isMissingDescription)}
                                />
                                {isMissingDescription && (
                                  <p className="mt-1 text-xs text-amber-300">Descrizione breve obbligatoria</p>
                                )}
                                <label className="block text-xs text-blue-300 mt-2 mb-1">Descrizione completa</label>
                                <textarea
                                  aria-label={`Descrizione completa voce ${index + 1}`}
                                  disabled={!canEdit}
                                  rows={2}
                                  placeholder="Descrizione completa (opzionale)"
                                  value={item.fullDescription || ""}
                                  onChange={(e) => updateLine(index, { fullDescription: e.target.value })}
                                  className={`${cellInputClass} resize-y min-h-[3rem]`}
                                />
                                <label className="block text-xs text-blue-300 mt-2 mb-1">Categoria</label>
                                <GlassSelect
                                  id={`consuntivo-line-category-mobile-${index}`}
                                  disabled={!canEdit}
                                  value={item.category || ""}
                                  onChange={(value) => updateLine(index, { category: value })}
                                  aria-label={`Categoria voce ${index + 1}`}
                                  placeholder="Seleziona categoria…"
                                  openUpward={false}
                                  maxVisible={6}
                                  className="bg-black/30 border-blue-500/20 rounded-lg px-2 py-1.5 text-sm min-h-9"
                                  options={materialCategoryOptions}
                                />
                              </>
                            )}
                            {item.isContested && item.contestNote && (
                              <p className="mt-2 text-xs text-red-200/90 bg-red-950/30 rounded-lg px-2 py-1.5 border border-red-500/20">
                                Contestazione RUP: {item.contestNote}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-blue-300 mb-1">U.M.</label>
                              {lockCatalogFields || !canEdit ? (
                                <p className="text-sm text-white">{formatUdmLabel(item.udm)}</p>
                              ) : (
                                <UdmSelect
                                  aria-label={`Unità di misura voce ${index + 1}`}
                                  disabled={!canEdit}
                                  value={item.udm}
                                  onChange={(next) => updateLine(index, { udm: next })}
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
              ) : (
                  <div className={`${TABLE_SCROLL_X} rounded-xl border border-blue-500/20 bg-black/20`}>
                    <table className="w-full min-w-[760px] text-sm text-left">
                      <thead className="text-blue-200 border-b border-blue-500/20 bg-blue-950/50">
                        <tr>
                          <th className="px-3 py-2.5 font-medium whitespace-nowrap">Codice</th>
                          <th className="px-3 py-2.5 font-medium min-w-[160px]">Descrizione</th>
                          <th className="px-3 py-2.5 font-medium min-w-[140px]">Categoria</th>
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
                          const isEmptyNp = emptyNpIndices.has(index)
                          const cellReadOnlyClass = "text-white"

                          if (item.isAdHoc) {
                            return (
                              <QuoteNpTableRows
                                key={index}
                                item={item}
                                index={index}
                                canEdit={canEdit}
                                enableCatalogDrop={isDesktopDnD}
                                isMissingDescription={isMissingDescription}
                                isEmptyBom={isEmptyNp}
                                materialCategoryOptions={materialCategoryOptions}
                                contestAuthority="RUP"
                                onUpdateLine={updateLine}
                                onRemoveLine={removeLine}
                                onUpdateChild={updateChild}
                                onRemoveChild={removeChild}
                                onAddAdHocChild={addAdHocChild}
                                onRequestCatalog={setCatalogPickerNpIndex}
                              />
                            )
                          }

                          return (
                            <tr
                              key={index}
                              className={`border-b border-blue-500/10 ${
                                item.isContested
                                  ? "bg-red-950/20"
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
                                      detailsText={item.fullDescription}
                                      title={lineDetailsTitle(item, `Voce ${index + 1}`)}
                                      lines={2}
                                      className={cellReadOnlyClass}
                                      bom={item.children || []}
                                      fields={[
                                        { label: "Codice", value: item.materialCode || "—" },
                                        { label: "U.M.", value: formatUdmLabel(item.udm) },
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
                                  <div className="space-y-1.5">
                                    <input
                                      aria-label={`Descrizione breve voce ${index + 1}`}
                                      aria-invalid={isMissingDescription}
                                      disabled={!canEdit}
                                      placeholder="Descrizione breve *"
                                      value={item.description}
                                      onChange={(e) => updateLine(index, { description: e.target.value })}
                                      className={inputClassWithWarning(cellInputClass, isMissingDescription)}
                                    />
                                    {isMissingDescription && (
                                      <p className="mt-0.5 text-[10px] text-amber-300">Obbligatoria</p>
                                    )}
                                    <textarea
                                      aria-label={`Descrizione completa voce ${index + 1}`}
                                      disabled={!canEdit}
                                      rows={2}
                                      placeholder="Descrizione completa"
                                      value={item.fullDescription || ""}
                                      onChange={(e) => updateLine(index, { fullDescription: e.target.value })}
                                      className={`${cellInputClass} resize-y min-h-[2.75rem] text-xs`}
                                    />
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 align-middle min-w-[170px]">
                                {lockCatalogFields || !canEdit ? (
                                  <span className={`${cellReadOnlyClass} text-xs`}>
                                    {item.category || "—"}
                                  </span>
                                ) : (
                                  <GlassSelect
                                    id={`consuntivo-line-category-${index}`}
                                    disabled={!canEdit}
                                    value={item.category || ""}
                                    onChange={(value) => updateLine(index, { category: value })}
                                    aria-label={`Categoria voce ${index + 1}`}
                                    placeholder="Categoria…"
                                    openUpward={false}
                                    maxVisible={6}
                                    className="bg-black/30 border-blue-500/20 rounded-lg px-2 py-1.5 text-xs min-h-9"
                                    options={materialCategoryOptions}
                                  />
                                )}
                              </td>
                              <td className="px-3 py-2 align-middle whitespace-nowrap">
                                {lockCatalogFields || !canEdit ? (
                                  <span className={cellReadOnlyClass}>{formatUdmLabel(item.udm)}</span>
                                ) : (
                                  <UdmSelect
                                    aria-label={`Unità di misura voce ${index + 1}`}
                                    disabled={!canEdit}
                                    value={item.udm}
                                    onChange={(next) => updateLine(index, { udm: next })}
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
              )}
              </QuoteLineItemsDropZone>
            </div>

            {typeof document !== "undefined"
              && isDesktopDnD
              && activeCatalogDrag
              && createPortal(
                <div
                  ref={catalogDragOverlayRef}
                  className="pointer-events-none fixed z-[12000]"
                  style={{ transform: "translate(-12px, -50%)" }}
                >
                  <CatalogDragSkeleton material={activeCatalogDrag} />
                </div>,
                document.body
              )}
            </DndContext>
            </div>

            <SectionHeading>Riepilogo economico</SectionHeading>
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="consuntivo-discount" className="block text-sm font-medium text-blue-200 mb-2">
                    Sconto %
                  </label>
                  <NumberInput
                    id="consuntivo-discount"
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
                    Minimo da capitolato: {minDiscountPercent}% — applicato al lordo meno oneri
                  </p>
                </div>
                <div>
                  <label htmlFor="consuntivo-notes" className="block text-sm font-medium text-blue-200 mb-2">
                    Note intervento
                  </label>
                  <input
                    id="consuntivo-notes"
                    disabled={!canEdit}
                    value={formData.notes}
                    onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                    className={fieldInputClass}
                  />
                </div>
              </div>

              <div
                className={`p-4 rounded-xl text-sm text-white space-y-1 ${
                  exceedsParentTotal
                    ? "bg-red-950/30 border border-red-500/30"
                    : "bg-blue-950/40 border border-blue-500/20"
                }`}
              >
                <p className="flex justify-between"><span className="text-blue-200">Totale lordo</span><span>€ {totals.subtotal.toFixed(2)}</span></p>
                <p className="flex justify-between"><span className="text-blue-200">Oneri sicurezza 2%</span><span>€ {totals.safetyAmount.toFixed(2)}</span></p>
                <p className="flex justify-between"><span className="text-blue-200">Sconto</span><span>€ {totals.discountAmount.toFixed(2)}</span></p>
                <p className={`flex justify-between font-semibold pt-2 border-t ${
                  exceedsParentTotal
                    ? "text-red-100 border-red-500/30"
                    : "text-white border-blue-500/20"
                }`}>
                  <span>Totale consuntivo</span><span>€ {totals.total.toFixed(2)}</span>
                </p>
                {parentQuote && (
                  <p className="flex justify-between text-blue-200/80 pt-1">
                    <span>Riferimento preventivo</span>
                    <span>€ {parentTotal.toFixed(2)}</span>
                  </p>
                )}
                {exceedsParentTotal && (
                  <p
                    role="status"
                    className="flex items-start gap-2 pt-2 mt-1 border-t border-red-500/25 text-red-200 text-xs"
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      Il totale consuntivo supera il preventivo di € {excessOverParent.toFixed(2)}.
                    </span>
                  </p>
                )}
              </div>
            </div>

            <SectionHeading>Azioni</SectionHeading>
            <div className="space-y-3 pb-1">
              {(canEdit || consuntivo?._id) && (
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
                      disabled={saving || submitting || (!isDirty && !!consuntivo?._id)}
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
                        title={!canSubmit ? "Solo il titolare manutentore può inviare il consuntivo in approvazione." : undefined}
                        className={`flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${btnPrimaryClass}`}
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
                        <InfoTooltip text="Solo il titolare manutentore può inviare il consuntivo in approvazione al RUP." />
                      )}
                    </div>
                  </>
                )}
                {consuntivo?._id && consuntivo.status === "PENDING_APPROVAL" && canApprove && (
                  <button
                    type="button"
                    onClick={() => navigate(`/consuntivo/${consuntivo._id}/review`)}
                    className={`flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium ${btnPrimaryClass}`}
                  >
                    Apri revisione RUP
                  </button>
                )}
                {consuntivo?._id && !canEdit && !(consuntivo.status === "PENDING_APPROVAL" && canApprove) && (
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

      <CatalogPickerModal
        isOpen={catalogPickerNpIndex != null}
        onClose={() => setCatalogPickerNpIndex(null)}
        catalog={catalog}
        onSelect={handleCatalogPickerSelect}
        title="Aggiungi da catalogo"
        description={
          catalogPickerNpIndex != null
            ? `Seleziona una voce da aggiungere a ${formData.lineItems[catalogPickerNpIndex]?.materialCode || `voce ${catalogPickerNpIndex + 1}`}.`
            : undefined
        }
      />
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
        title="Inviare in approvazione?"
        description="Il consuntivo sarà inviato al RUP per revisione. Potrai modificarlo di nuovo solo se viene rifiutato."
        confirmLabel="Invia"
        cancelLabel="Annulla"
        isLoading={submitting}
        onCancel={() => setShowSubmitConfirm(false)}
        onConfirm={handleConfirmSubmit}
      />
    </div>
  )
}

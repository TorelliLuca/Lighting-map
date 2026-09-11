"use client"

import { useLayoutEffect, useRef, useState } from "react"
import ConfirmDialog from "./ConfirmDialog"
import { formatUdmLabel } from "../../utils/udm"

export function useIsTruncated(content, lines = 1) {
  const ref = useRef(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !String(content || "").trim()) {
      setIsTruncated(false)
      return undefined
    }

    const measure = () => {
      setIsTruncated(
        el.scrollWidth > el.clientWidth + 1
        || el.scrollHeight > el.clientHeight + 1
      )
    }

    measure()
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
    ro?.observe(el)
    window.addEventListener("resize", measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [content, lines])

  return { ref, isTruncated }
}

export function BomTable({ items = [] }) {
  const rows = (items || []).filter((item) => String(item.description || "").trim())
  if (rows.length === 0) return null

  return (
    <div className="rounded-lg border border-slate-700/80 bg-slate-800/60 overflow-hidden">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400 px-3 pt-3 pb-2">
        Distinta (BOM)
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="text-slate-400 border-t border-b border-slate-700/80">
            <tr>
              <th className="px-3 py-1.5 font-medium">Codice</th>
              <th className="px-3 py-1.5 font-medium">Descrizione</th>
              <th className="px-3 py-1.5 font-medium">U.M.</th>
              <th className="px-3 py-1.5 font-medium text-right">Qtà</th>
              <th className="px-3 py-1.5 font-medium text-right">Prezzo</th>
              <th className="px-3 py-1.5 font-medium text-right">Totale</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, idx) => {
              const qty = Number(item.quantity) || 0
              const price = Number(item.unitPrice) || 0
              return (
                <tr key={`${item.materialCode || "bom"}-${idx}`} className="border-t border-slate-800/80 text-slate-100">
                  <td className="px-3 py-1.5 font-mono whitespace-nowrap">{item.materialCode || "—"}</td>
                  <td className="px-3 py-1.5">{item.description || "—"}</td>
                  <td className="px-3 py-1.5">{formatUdmLabel(item.udm)}</td>
                  <td className="px-3 py-1.5 text-right">{qty}</td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap">€ {price.toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap">€ {(qty * price).toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function DetailsInfoDialog({
  isOpen,
  onClose,
  title = "Dettagli",
  text = "",
  textLabel = "Descrizione",
  fields = [],
  bom = [],
}) {
  const content = String(text || "").trim()
  const bomItems = Array.isArray(bom) ? bom : []

  const hasBom = bomItems.some((item) => String(item.description || "").trim())
  const dialogSize = hasBom || fields.length > 2 || content.length > 280 ? "lg" : "md"

  return (
    <ConfirmDialog
      isOpen={isOpen}
      mode="info"
      size={dialogSize}
      title={title}
      description=""
      cancelLabel="Chiudi"
      onCancel={onClose}
    >
      <div className="space-y-3">
        {fields.length > 0 && (
          <dl className="space-y-2 rounded-lg border border-slate-700/80 bg-slate-800/60 p-3 text-sm">
            {fields.map((field) => (
              <div key={field.label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {field.label}
                </dt>
                <dd className="mt-0.5 text-slate-100 whitespace-pre-wrap break-words">
                  {field.value || "—"}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {content && (
          <div className="rounded-lg border border-slate-700/80 bg-slate-800/60 p-3">
            {fields.length > 0 && (
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">
                {textLabel}
              </p>
            )}
            <p className="text-sm text-slate-100 whitespace-pre-wrap break-words leading-relaxed">
              {content}
            </p>
          </div>
        )}
        <BomTable items={bomItems} />
      </div>
    </ConfirmDialog>
  )
}

const clampClassFor = (lines) => (
  lines <= 1 ? "truncate"
  : lines === 2 ? "line-clamp-2"
  : lines === 3 ? "line-clamp-3"
  : "line-clamp-4"
)

/**
 * Testo con truncate/line-clamp: di default mostra la descrizione breve.
 * Se c'è una descrizione completa diversa, BOM, o testo troncato → "Dettagli".
 */
export function TruncatedTextDetails({
  text = "",
  detailsText = "",
  title = "Dettagli",
  lines = 1,
  fields = [],
  bom = [],
  className = "",
  buttonClassName = "",
}) {
  const shortContent = String(text || "").trim()
  const fullContent = String(detailsText || "").trim()
  const dialogContent = fullContent || shortContent
  const hasFullDetails = Boolean(fullContent && fullContent !== shortContent)
  const bomItems = Array.isArray(bom) ? bom : []
  const hasBom = bomItems.some((item) => String(item.description || "").trim())
  const { ref, isTruncated } = useIsTruncated(shortContent, lines)
  const [open, setOpen] = useState(false)

  if (!shortContent && !fullContent && !hasBom) {
    return <span className={className}>—</span>
  }

  const showDetails = hasFullDetails || isTruncated || hasBom
  const dialogFields = hasFullDetails
    ? [{ label: "Descrizione breve", value: shortContent || "—" }, ...fields]
    : fields

  return (
    <>
      <div className="min-w-0 flex items-start gap-2 max-w-full overflow-hidden">
        <span ref={ref} className={`min-w-0 flex-1 max-w-full overflow-hidden ${clampClassFor(lines)} ${className}`}>
          {shortContent || "—"}
        </span>
        {showDetails && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setOpen(true)
            }}
            className={`shrink-0 text-[11px] font-medium text-blue-300 hover:text-blue-100 underline underline-offset-2 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 rounded ${buttonClassName}`}
          >
            Dettagli
          </button>
        )}
      </div>

      <DetailsInfoDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        title={title}
        text={dialogContent}
        textLabel={hasFullDetails ? "Descrizione completa" : "Descrizione"}
        fields={dialogFields}
        bom={bomItems}
      />
    </>
  )
}

/** Riga catalogo: mostra descrizione breve; Dettagli apre completa + BOM. */
export function CatalogMaterialRow({
  material,
  onAdd,
  rowClassName = "",
  buttonClassName = "",
  dragHandle = null,
  setNodeRef = null,
  isDragging = false,
  dragListeners = null,
  dragAttributes = null,
}) {
  const shortDescription = material.description || ""
  const fullDescription = material.fullDescription || ""
  const dialogText = fullDescription || shortDescription
  const hasFullDetails = Boolean(fullDescription && fullDescription !== shortDescription)
  const bomItems = material.bom || material.children || []
  const hasBom = (bomItems || []).some((item) => String(item.description || "").trim())
  const { ref, isTruncated } = useIsTruncated(shortDescription, 1)
  const [open, setOpen] = useState(false)
  const showDetails = hasFullDetails || isTruncated || hasBom
  const isDraggableRow = Boolean(dragListeners)

  return (
    <>
      <div
        ref={setNodeRef}
        className={`flex items-center gap-2 px-3 py-2.5 text-xs text-blue-100 hover:bg-blue-900/40 ${
          isDragging ? "opacity-30" : ""
        } ${isDraggableRow ? "touch-none cursor-grab active:cursor-grabbing" : ""} ${rowClassName}`}
        {...(dragListeners || {})}
        {...(dragAttributes || {})}
      >
        {dragHandle}
        <button
          type="button"
          onClick={() => onAdd(material)}
          className={`min-w-0 flex-1 text-left flex justify-between gap-2 ${buttonClassName}`}
        >
          <span className="min-w-0 flex items-center gap-1 overflow-hidden">
            <span className="text-blue-400 font-medium shrink-0">{material.code}</span>
            {hasBom && (
              <span className="shrink-0 text-[10px] text-amber-300/90 border border-amber-500/30 rounded px-1">
                NP
              </span>
            )}
            <span className="text-blue-400/80 shrink-0">—</span>
            <span ref={ref} className="truncate min-w-0">
              {shortDescription || "—"}
            </span>
          </span>
          <span className="shrink-0 text-blue-200">
            € {Number(material.unitPrice).toFixed(2)}
          </span>
        </button>
        {showDetails && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              setOpen(true)
            }}
            className="shrink-0 text-[11px] font-medium text-blue-300 hover:text-blue-100 underline underline-offset-2 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 rounded py-1"
          >
            Dettagli
          </button>
        )}
      </div>

      <DetailsInfoDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        title={`Materiale ${material.code}`}
        text={dialogText}
        textLabel={hasFullDetails ? "Descrizione completa" : "Descrizione"}
        fields={[
          { label: "Codice", value: material.code },
          ...(hasFullDetails
            ? [{ label: "Descrizione breve", value: shortDescription || "—" }]
            : []),
          { label: "Categoria", value: material.category || "—" },
          { label: "U.M.", value: formatUdmLabel(material.udm) },
          { label: "Prezzo unitario", value: `€ ${Number(material.unitPrice).toFixed(2)}` },
        ]}
        bom={bomItems}
      />
    </>
  )
}

export default TruncatedTextDetails

"use client"

import { useLayoutEffect, useRef, useState } from "react"
import ConfirmDialog from "./ConfirmDialog"

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

export function DetailsInfoDialog({
  isOpen,
  onClose,
  title = "Dettagli",
  text = "",
  fields = [],
}) {
  const content = String(text || "").trim()

  return (
    <ConfirmDialog
      isOpen={isOpen}
      mode="info"
      title={title}
      description=""
      cancelLabel="Chiudi"
      onCancel={onClose}
    >
      <div className="mt-3 space-y-3">
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
                Descrizione
              </p>
            )}
            <p className="text-sm text-slate-100 whitespace-pre-wrap break-words leading-relaxed">
              {content}
            </p>
          </div>
        )}
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
 * Testo con truncate/line-clamp: se non è pienamente visibile mostra "Dettagli"
 * e apre ConfirmDialog in modalità info.
 */
export function TruncatedTextDetails({
  text = "",
  title = "Dettagli",
  lines = 1,
  fields = [],
  className = "",
  buttonClassName = "",
}) {
  const content = String(text || "").trim()
  const { ref, isTruncated } = useIsTruncated(content, lines)
  const [open, setOpen] = useState(false)

  if (!content) {
    return <span className={className}>—</span>
  }

  return (
    <>
      <div className="min-w-0 flex items-start gap-2">
        <span ref={ref} className={`min-w-0 ${clampClassFor(lines)} ${className}`}>
          {content}
        </span>
        {isTruncated && (
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
        text={content}
        fields={fields}
      />
    </>
  )
}

/** Riga catalogo: misura truncate sul testo visibile, senza button annidati. */
export function CatalogMaterialRow({
  material,
  onAdd,
  rowClassName = "",
  buttonClassName = "",
}) {
  const description = material.description || ""
  const { ref, isTruncated } = useIsTruncated(description, 1)
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className={`flex items-center gap-2 px-3 py-2.5 text-xs text-blue-100 hover:bg-blue-900/40 ${rowClassName}`}>
        <button
          type="button"
          onClick={() => onAdd(material)}
          className={`min-w-0 flex-1 text-left flex justify-between gap-2 ${buttonClassName}`}
        >
          <span className="min-w-0 flex items-center gap-1 overflow-hidden">
            <span className="text-blue-400 font-medium shrink-0">{material.code}</span>
            <span className="text-blue-400/80 shrink-0">—</span>
            <span ref={ref} className="truncate min-w-0">
              {description || "—"}
            </span>
          </span>
          <span className="shrink-0 text-blue-200">
            € {Number(material.unitPrice).toFixed(2)}
          </span>
        </button>
        {isTruncated && (
          <button
            type="button"
            onClick={() => setOpen(true)}
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
        text={description}
        fields={[
          { label: "Codice", value: material.code },
          { label: "Categoria", value: material.category || "—" },
          { label: "U.M.", value: material.udm || "—" },
          { label: "Prezzo unitario", value: `€ ${Number(material.unitPrice).toFixed(2)}` },
        ]}
      />
    </>
  )
}

export default TruncatedTextDetails

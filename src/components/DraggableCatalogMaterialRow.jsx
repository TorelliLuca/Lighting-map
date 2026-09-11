"use client"

import { useDraggable } from "@dnd-kit/core"
import { GripVertical } from "lucide-react"
import { CatalogMaterialRow } from "./ui/TruncatedTextDetails"

const btnSecondaryClass =
  "cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 disabled:cursor-not-allowed"

/** Skeleton della voce catalogo mostrato nell'overlay durante il drag. */
export function CatalogDragSkeleton({ material }) {
  const hasBom = (material?.bom || material?.children || []).some(
    (item) => String(item?.description || "").trim()
  )

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 text-xs max-w-md rounded-xl border border-blue-400/35 bg-slate-900/55 text-blue-100/80 shadow-2xl backdrop-blur-[2px] opacity-55 pointer-events-none"
      aria-hidden
    >
      <GripVertical className="h-3.5 w-3.5 text-blue-400/70 shrink-0" />
      <div className="min-w-0 flex-1 flex justify-between gap-2">
        <span className="min-w-0 flex items-center gap-1 overflow-hidden">
          <span className="h-3 w-14 rounded bg-blue-400/25 shrink-0" />
          <span className="text-blue-300/80 font-mono shrink-0 text-[11px]">
            {material?.code || "—"}
          </span>
          {hasBom && (
            <span className="shrink-0 text-[10px] text-amber-300/70 border border-amber-500/25 rounded px-1">
              NP
            </span>
          )}
          <span className="h-3 w-28 sm:w-40 rounded bg-blue-300/20 min-w-0" />
        </span>
        <span className="h-3 w-12 rounded bg-blue-300/20 shrink-0 self-center" />
      </div>
    </div>
  )
}

/**
 * Voce prezziario trascinabile (intera riga) verso elenco voci o distinta NP.
 */
export function DraggableCatalogMaterialRow({
  material,
  onAdd,
  disabled = false,
  buttonClassName = btnSecondaryClass,
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalog-${material.code}`,
    data: { type: "catalog", material },
    disabled,
  })

  return (
    <CatalogMaterialRow
      material={material}
      onAdd={onAdd}
      setNodeRef={setNodeRef}
      isDragging={isDragging}
      buttonClassName={buttonClassName}
      dragListeners={disabled ? null : listeners}
      dragAttributes={disabled ? null : attributes}
      dragHandle={
        !disabled ? (
          <span
            className="shrink-0 p-1 rounded-md text-blue-400/80 pointer-events-none"
            aria-hidden
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>
        ) : null
      }
    />
  )
}

export default DraggableCatalogMaterialRow

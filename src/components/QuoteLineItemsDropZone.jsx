"use client"

import { useDroppable } from "@dnd-kit/core"

/**
 * Zona di drop per aggiungere voci top-level al preventivo/consuntivo.
 */
export function QuoteLineItemsDropZone({
  id = "quote-line-items",
  disabled = false,
  className = "",
  dropHint = "Rilascia per aggiungere la voce al preventivo",
  children,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled,
    data: { type: "line-items" },
  })

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${
        isOver
          ? "ring-2 ring-blue-400/50 border-blue-400/40 bg-blue-900/20"
          : ""
      } transition-colors rounded-xl`}
    >
      {children}
      {isOver && (
        <p className="px-3 py-2 text-xs text-center text-blue-100 border-t border-blue-400/30">
          {dropHint}
        </p>
      )}
    </div>
  )
}

export default QuoteLineItemsDropZone

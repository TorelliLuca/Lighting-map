import { createPortal } from "react-dom"
import { ChevronUp, X } from "lucide-react"
import { useBottomSheetDrag } from "../../hooks/useBottomSheetDrag"

/**
 * Bottom sheet mobile per i menu FAB della mappa.
 * Con `collapsible`: scrim/swipe collassa (non chiude); peek per riaprire.
 * I children restano montati (stato form preservato) con translate, non unmount.
 */
export function MapFabBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  tall = false,
  collapsible = false,
  collapsed = false,
  onCollapsedChange,
  peekLabel,
}) {
  const collapse = () => onCollapsedChange?.(true)
  const expand = () => onCollapsedChange?.(false)
  const isCollapsed = Boolean(collapsible && collapsed)

  const {
    sheetOffsetY,
    sheetExpanded,
    isDraggingSheet,
    handleSheetDragStart,
    handleSheetDragMove,
    handleSheetDragEnd,
  } = useBottomSheetDrag({
    isOpen,
    onClose,
    collapsible,
    onCollapse: collapse,
    collapsed: isCollapsed,
  })

  if (!isOpen || typeof document === "undefined") {
    return null
  }

  const maxHeightClass = sheetExpanded
    ? "max-h-[96vh]"
    : tall
      ? "max-h-[92vh]"
      : "max-h-[85vh]"

  const handleScrimClick = () => {
    if (collapsible) {
      collapse()
      return
    }
    onClose()
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-[10040] flex flex-col justify-end ${
        isCollapsed ? "pointer-events-none" : ""
      }`}
    >
      {!isCollapsed && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={
            collapsible
              ? `Collassa ${title || "pannello"}`
              : `Chiudi ${title || "pannello"}`
          }
          className="absolute inset-0 z-0 bg-black/45 pointer-events-auto"
          onClick={handleScrimClick}
        />
      )}

      <div
        className={`relative z-20 transition-all duration-200 ease-out ${
          isCollapsed
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        {isCollapsed && (
          <button
            type="button"
            onClick={expand}
            className="flex w-full flex-col items-center gap-1 rounded-t-2xl border border-blue-500/40 bg-black/90 backdrop-blur-xl px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_0_25px_rgba(0,149,255,0.15)] transition-colors hover:bg-black/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={peekLabel || `Riapri ${title || "pannello"}`}
          >
            <div className="h-1.5 w-10 rounded-full bg-blue-400/50" aria-hidden="true" />
            <div className="flex w-full items-center justify-between gap-3 py-1.5">
              <span className="min-w-0 truncate text-left text-sm font-semibold text-white">
                {peekLabel || title || "Continua"}
              </span>
              <span className="inline-flex items-center gap-1 shrink-0 text-xs text-blue-300">
                Riapri
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
          </button>
        )}
      </div>

      <div
        className={`${isCollapsed ? "absolute inset-x-0 bottom-0" : "relative"} z-10 w-full ${
          isCollapsed ? "pointer-events-none" : "pointer-events-auto animate-[mapFabSheetUp_0.22s_ease-out]"
        }`}
        style={{
          transform: isCollapsed
            ? "translateY(110%)"
            : `translateY(${sheetOffsetY}px)`,
          transition: isDraggingSheet
            ? "none"
            : "transform 0.25s ease-out",
          // Fuori schermo ma dimensioni reali: evita form “morti” dopo collapse (h-0/w-0)
          visibility: isCollapsed ? "hidden" : "visible",
        }}
        role="dialog"
        aria-modal={!isCollapsed}
        aria-label={title || "Menu"}
      >
        <div
          className={`flex w-full flex-col overflow-hidden rounded-t-2xl border border-blue-500/40 bg-black/90 backdrop-blur-xl shadow-[0_0_25px_rgba(0,149,255,0.15)] ${maxHeightClass}`}
        >
          <div
            className="relative flex shrink-0 touch-none cursor-grab items-center justify-center px-3 py-2 active:cursor-grabbing"
            onPointerDown={isCollapsed ? undefined : handleSheetDragStart}
            onPointerMove={isCollapsed ? undefined : handleSheetDragMove}
            onPointerUp={isCollapsed ? undefined : handleSheetDragEnd}
            onPointerCancel={isCollapsed ? undefined : handleSheetDragEnd}
            aria-label="Trascina per spostare il pannello"
          >
            <div className="mx-auto h-1.5 w-10 rounded-full bg-blue-400/50" aria-hidden="true" />
            <button
              type="button"
              aria-label={`Chiudi ${title || "pannello"}`}
              onClick={onClose}
              onPointerDown={(event) => event.stopPropagation()}
              className="absolute right-2 top-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-blue-300 hover:bg-blue-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-1">
            {title && (
              <h2 className="text-sm font-semibold text-white mb-3">{title}</h2>
            )}
            {children}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes mapFabSheetUp {
          from { transform: translateY(100%); opacity: 0.6; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body,
  )
}

export default MapFabBottomSheet

import { useState, useRef, useEffect, useId } from "react"
import { createPortal } from "react-dom"
import { ChevronDown } from "lucide-react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

const cn = (...inputs) => twMerge(clsx(inputs))

const ITEM_HEIGHT_PX = 44

const DEFAULT_TRIGGER_CLASS =
  "w-full bg-blue-900/40 text-white border border-blue-500/40 rounded-xl px-4 py-3 text-sm min-h-11 " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:border-blue-400/50 " +
  "transition-all duration-200 flex items-center justify-between gap-2 text-left " +
  "disabled:opacity-50 disabled:cursor-not-allowed"

const DEFAULT_LIST_CLASS =
  "fixed overscroll-contain rounded-xl border border-blue-500/40 " +
  "bg-blue-950 shadow-[0_0_25px_rgba(0,149,255,0.2)] py-1"

const SCROLLBAR_CLASS = "overflow-y-auto"

/**
 * Select glass (blue palette) con lista in portal.
 * options: [{ value, label }]
 * onChange(nextValue) — valore diretto, non evento DOM.
 */
export function GlassSelect({
  id,
  value,
  onChange,
  options = [],
  openUpward = false,
  maxVisible = 5,
  disabled = false,
  placeholder = "Seleziona…",
  className = "",
  listClassName = "",
  zIndex = 11000,
  "aria-label": ariaLabel,
}) {
  const reactId = useId()
  const listboxId = id ? `${id}-listbox` : `${reactId}-listbox`
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const [coords, setCoords] = useState(null)

  const selected = options.find((o) => o.value === value)
  const hideScrollbar = options.length <= 5

  const updateCoords = () => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const visibleCount = Math.min(maxVisible, Math.max(options.length, 1))
    // py-1 (8px) sul listbox: senza questo margine con poche voci compare comunque lo scroll
    const maxHeight = visibleCount * ITEM_HEIGHT_PX + (hideScrollbar ? 8 : 0)
    if (openUpward) {
      setCoords({
        left: rect.left,
        width: rect.width,
        bottom: window.innerHeight - rect.top + 6,
        maxHeight,
      })
    } else {
      setCoords({
        left: rect.left,
        width: rect.width,
        top: rect.bottom + 6,
        maxHeight,
      })
    }
  }

  useEffect(() => {
    if (!open) return undefined

    updateCoords()

    const onReposition = () => updateCoords()
    const onPointerDown = (event) => {
      if (
        triggerRef.current?.contains(event.target)
        || listRef.current?.contains(event.target)
      ) {
        return
      }
      setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false)
    }

    window.addEventListener("resize", onReposition)
    window.addEventListener("scroll", onReposition, true)
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("touchstart", onPointerDown)
    document.addEventListener("keydown", onKey)

    return () => {
      window.removeEventListener("resize", onReposition)
      window.removeEventListener("scroll", onReposition, true)
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("touchstart", onPointerDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, openUpward, maxVisible, options.length])

  const handleSelect = (nextValue) => {
    onChange?.(nextValue)
    setOpen(false)
  }

  return (
    <div className="relative w-full min-w-0">
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        onClick={() => {
          if (disabled) return
          setOpen((prev) => !prev)
        }}
        className={cn(DEFAULT_TRIGGER_CLASS, className)}
      >
        <span className={cn("truncate", !selected && "text-blue-300/80")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-blue-400 shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open
        && coords
        && typeof document !== "undefined"
        && createPortal(
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={id}
            className={cn(
              DEFAULT_LIST_CLASS,
              hideScrollbar ? "overflow-y-hidden" : SCROLLBAR_CLASS,
              listClassName
            )}
            style={{
              zIndex,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
              ...(openUpward ? { bottom: coords.bottom } : { top: coords.top }),
            }}
          >
            {options.length === 0 ? (
              <li className="px-4 py-3 text-sm text-blue-300/80">Nessuna opzione</li>
            ) : (
              options.map((option) => {
                const isSelected = option.value === value
                return (
                  <li key={String(option.value)} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        "w-full text-left px-4 text-sm min-h-11 flex items-center transition-colors",
                        isSelected
                          ? "bg-blue-700/50 text-white"
                          : "text-blue-100 hover:bg-blue-800/60 hover:text-white"
                      )}
                    >
                      {option.label}
                    </button>
                  </li>
                )
              })
            )}
          </ul>,
          document.body
        )}
    </div>
  )
}

export default GlassSelect

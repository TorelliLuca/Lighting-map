import { useState, useRef, useEffect, useId } from "react"
import { createPortal } from "react-dom"
import { ChevronDown } from "lucide-react"

const ITEM_HEIGHT_PX = 44

/**
 * Select custom: lista in portal, apribile verso l'alto, lista scrollabile (maxVisible voci).
 */
export function MapControlSelect({
  id,
  value,
  onChange,
  options,
  openUpward = true,
  maxVisible = 5,
  disabled = false,
  "aria-label": ariaLabel,
}) {
  const reactId = useId()
  const listboxId = id ? `${id}-listbox` : `${reactId}-listbox`
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const [coords, setCoords] = useState(null)

  const selected = options.find((o) => o.value === value) ?? options[0]

  const updateCoords = () => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const maxHeight = Math.min(maxVisible, options.length) * ITEM_HEIGHT_PX
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
        triggerRef.current?.contains(event.target) ||
        listRef.current?.contains(event.target)
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
    onChange(nextValue)
    setOpen(false)
  }

  return (
    <div className="relative">
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
        className="w-full bg-blue-900/40 text-white border border-blue-500/40 rounded-xl px-4 py-3 text-sm min-h-11
          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200
          flex items-center justify-between gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="truncate">{selected?.label ?? ""}</span>
        <ChevronDown
          className={`h-5 w-5 text-blue-400 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={id}
            className="fixed z-[10060] overflow-y-auto overscroll-contain rounded-xl border border-blue-500/40 bg-blue-950 shadow-[0_0_25px_rgba(0,149,255,0.2)] py-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-blue-950 [&::-webkit-scrollbar-thumb]:bg-blue-500 [&::-webkit-scrollbar-thumb]:rounded-full"
            style={{
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
              ...(openUpward
                ? { bottom: coords.bottom }
                : { top: coords.top }),
            }}
          >
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <li key={String(option.value)} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full text-left px-4 text-sm min-h-11 flex items-center transition-colors ${
                      isSelected
                        ? "bg-blue-700/50 text-white"
                        : "text-blue-100 hover:bg-blue-800/60 hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                </li>
              )
            })}
          </ul>,
          document.body,
        )}
    </div>
  )
}

export default MapControlSelect

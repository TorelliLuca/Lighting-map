"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { MoreHorizontal } from "lucide-react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

const cn = (...inputs) => twMerge(clsx(inputs))

/**
 * Menu overflow accessibile (senza Radix): portal, Esc, click fuori, collision clamp.
 */
export const InfoWindowOverflowMenu = ({ items = [], className = "" }) => {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const menuRect = menuRef.current.getBoundingClientRect()
    const gap = 8
    const padding = 8

    let top = triggerRect.bottom + gap
    let left = triggerRect.right - menuRect.width

    if (top + menuRect.height > window.innerHeight - padding) {
      top = triggerRect.top - menuRect.height - gap
    }
    if (top < padding) top = padding
    if (left < padding) left = padding
    if (left + menuRect.width > window.innerWidth - padding) {
      left = window.innerWidth - menuRect.width - padding
    }

    setPos({ top, left })
  }, [open, items.length])

  useEffect(() => {
    if (!open) return undefined

    const handlePointer = (event) => {
      const t = event.target
      if (
        menuRef.current?.contains(t) ||
        triggerRef.current?.contains(t)
      ) {
        return
      }
      setOpen(false)
    }

    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", handlePointer)
    document.addEventListener("touchstart", handlePointer)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handlePointer)
      document.removeEventListener("touchstart", handlePointer)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])

  if (!items.length) return null

  return (
    <div className={cn("relative shrink-0", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Altre azioni"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Azioni aggiuntive"
            className="fixed z-[10050] min-w-[200px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
            style={{ top: pos.top, left: pos.left }}
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                title={item.title}
                className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none"
                onClick={() => {
                  setOpen(false)
                  item.onClick?.()
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}

export default InfoWindowOverflowMenu

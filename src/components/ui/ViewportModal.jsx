"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

const cn = (...inputs) => twMerge(clsx(inputs))

const SIZE_CLASS = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
}

/**
 * Shell modale ancorato alla viewport: padding esterno, max-height su dvh,
 * colonna flex (header/body/footer) con body scrollabile.
 */
export function ViewportModal({
  isOpen,
  onClose,
  size = "md",
  labelledBy,
  describedBy,
  className = "",
  children,
  zIndexClass = "z-[11000]",
}) {
  useEffect(() => {
    if (!isOpen) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || typeof document === "undefined") return null

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center p-3 sm:p-4 md:p-6",
        zIndexClass,
      )}
    >
      <button
        type="button"
        aria-label="Chiudi"
        className="absolute inset-0 cursor-pointer bg-black/60 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className={cn(
          "relative flex w-full flex-col overflow-hidden rounded-2xl border border-slate-700",
          "bg-slate-900/95 text-slate-100 shadow-2xl",
          "max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] md:max-h-[calc(100dvh-3rem)]",
          SIZE_CLASS[size] || SIZE_CLASS.md,
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function ViewportModalHeader({ className = "", children }) {
  return (
    <div
      className={cn(
        "shrink-0 border-b border-slate-700/60 px-4 py-3 sm:px-5 sm:py-4",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function ViewportModalBody({ className = "", children }) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y scrollbar-app",
        "px-4 py-3 sm:px-5 sm:py-4",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function ViewportModalFooter({ className = "", children }) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-slate-700/60 px-4 py-3 sm:px-5 sm:py-4",
        className,
      )}
    >
      {children}
    </div>
  )
}

export default ViewportModal

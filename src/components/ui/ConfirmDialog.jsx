"use client"

import { AlertTriangle } from "lucide-react"

export default function ConfirmDialog({
  isOpen,
  title = "Conferma azione",
  description = "Sei sicuro di voler continuare?",
  confirmLabel = "Conferma",
  cancelLabel = "Annulla",
  variant = "danger",
  onConfirm,
  onCancel,
  isLoading = false,
}) {
  if (!isOpen) return null

  const confirmClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-500 focus-visible:ring-red-400"
      : "bg-blue-600 hover:bg-blue-500 focus-visible:ring-blue-400"

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Chiudi conferma"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/95 p-5 text-slate-100 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-red-500/15 p-2 text-red-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-slate-300">{description}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="min-h-11 rounded-lg border border-slate-600 px-4 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`min-h-11 rounded-lg px-4 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 ${confirmClass} disabled:cursor-not-allowed disabled:opacity-70`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

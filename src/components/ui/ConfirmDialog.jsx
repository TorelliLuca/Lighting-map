"use client"

import { createPortal } from "react-dom"
import { AlertTriangle, Info } from "lucide-react"

export default function ConfirmDialog({
  isOpen,
  title = "Conferma azione",
  description = "Sei sicuro di voler continuare?",
  details = [],
  detailsExtraLabel = "",
  confirmLabel = "Conferma",
  cancelLabel = "Annulla",
  secondaryLabel = "",
  variant = "danger",
  mode = "confirm",
  onConfirm,
  onCancel,
  onSecondary,
  isLoading = false,
  children = null,
}) {
  if (!isOpen || typeof document === "undefined") return null

  const isInfo = mode === "info"
  const confirmClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-500 focus-visible:ring-red-400"
      : "bg-blue-600 hover:bg-blue-500 focus-visible:ring-blue-400"

  return createPortal(
    <div className="fixed inset-0 z-[11000] overflow-y-auto overscroll-contain">
      <button
        type="button"
        aria-label="Chiudi"
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/95 p-5 text-slate-100 shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 rounded-full p-2 ${
                isInfo ? "bg-blue-500/15 text-blue-300" : "bg-red-500/15 text-red-300"
              }`}
            >
              {isInfo ? <Info className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 id="confirm-dialog-title" className="text-lg font-semibold">{title}</h3>
              {description ? (
                <p className="mt-1 text-sm text-slate-300 whitespace-pre-wrap break-words">{description}</p>
              ) : null}
              {children}
              {details.length > 0 && (
                <div className="mt-3 rounded-lg border border-slate-700/80 bg-slate-800/60 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-300">Dettagli</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-200">
                    {details.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                    {detailsExtraLabel ? <li>{detailsExtraLabel}</li> : null}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="mt-5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
            {isInfo ? (
              <div className="flex w-full justify-end">
                <button
                  type="button"
                  onClick={onCancel}
                  className="min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  {cancelLabel === "Annulla" ? "Chiudi" : cancelLabel}
                </button>
              </div>
            ) : (
              <>
                {secondaryLabel && onSecondary ? (
                  <button
                    type="button"
                    onClick={onSecondary}
                    disabled={isLoading}
                    className="min-h-11 rounded-lg border border-slate-600 px-4 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:mr-auto"
                  >
                    {secondaryLabel}
                  </button>
                ) : (
                  <span className="hidden sm:block sm:mr-auto" />
                )}
                <div className="flex justify-end gap-2">
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

"use client"

import { AlertTriangle, Info } from "lucide-react"
import {
  ViewportModal,
  ViewportModalBody,
  ViewportModalFooter,
  ViewportModalHeader,
} from "./ViewportModal"

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
  size = "sm",
  onConfirm,
  onCancel,
  onSecondary,
  isLoading = false,
  children = null,
}) {
  const isInfo = mode === "info"
  const confirmClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-500 focus-visible:ring-red-400"
      : "bg-blue-600 hover:bg-blue-500 focus-visible:ring-blue-400"

  const hasScrollableContent = Boolean(children) || details.length > 0

  return (
    <ViewportModal
      isOpen={isOpen}
      onClose={onCancel}
      size={size}
      labelledBy="confirm-dialog-title"
    >
      <ViewportModalHeader className={hasScrollableContent ? "" : "border-b-0"}>
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 shrink-0 rounded-full p-2 ${
              isInfo ? "bg-blue-500/15 text-blue-300" : "bg-red-500/15 text-red-300"
            }`}
          >
            {isInfo ? <Info className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="confirm-dialog-title" className="text-base font-semibold sm:text-lg">
              {title}
            </h3>
            {description ? (
              <p className="mt-1 text-sm text-slate-300 whitespace-pre-wrap break-words">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </ViewportModalHeader>

      {hasScrollableContent ? (
        <ViewportModalBody>
          {children}
          {details.length > 0 && (
            <div className="mt-3 rounded-lg border border-slate-700/80 bg-slate-800/60 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-300">
                Dettagli
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-200">
                {details.map((item) => (
                  <li key={item}>{item}</li>
                ))}
                {detailsExtraLabel ? <li>{detailsExtraLabel}</li> : null}
              </ul>
            </div>
          )}
        </ViewportModalBody>
      ) : null}

      <ViewportModalFooter className={hasScrollableContent ? "" : "border-t-0"}>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {isInfo ? (
            <div className="flex w-full justify-stretch sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="min-h-11 w-full cursor-pointer rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:w-auto"
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
                  className="min-h-11 cursor-pointer rounded-lg border border-slate-600 px-4 text-sm font-medium text-slate-200 transition-colors duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:mr-auto"
                >
                  {secondaryLabel}
                </button>
              ) : (
                <span className="hidden sm:block sm:mr-auto" />
              )}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="min-h-11 cursor-pointer rounded-lg border border-slate-600 px-4 text-sm font-medium text-slate-100 transition-colors duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`min-h-11 cursor-pointer rounded-lg px-4 text-sm font-semibold text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 ${confirmClass} disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {confirmLabel}
                </button>
              </div>
            </>
          )}
        </div>
      </ViewportModalFooter>
    </ViewportModal>
  )
}

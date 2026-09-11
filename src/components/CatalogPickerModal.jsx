"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import { CatalogMaterialSections } from "./CatalogMaterialSections"
import {
  ViewportModal,
  ViewportModalBody,
  ViewportModalFooter,
  ViewportModalHeader,
} from "./ui/ViewportModal"
import { useMediaQuery } from "../hooks/useMediaQuery"

const fieldInputClass =
  "w-full rounded-xl border border-blue-500/30 bg-blue-900/20 text-white px-4 py-3 disabled:opacity-60 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:border-blue-400/50"

const btnSecondaryClass =
  "cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 disabled:cursor-not-allowed"

/**
 * Modal per selezionare voci del prezziario (es. componenti di un Nuovo prezzo).
 * Stessa grafica a sezioni del catalogo principale; voci selezionabili, non trascinabili.
 */
export function CatalogPickerModal({
  isOpen,
  onClose,
  catalog = [],
  onSelect,
  title = "Seleziona dal catalogo",
  description = "Scegli una voce del prezziario da aggiungere.",
}) {
  const isMobile = useMediaQuery("(max-width: 639px)")
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!isOpen) return
    setQuery("")
  }, [isOpen])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter(
      (m) =>
        m.code?.toLowerCase().includes(q)
        || m.description?.toLowerCase().includes(q)
        || m.fullDescription?.toLowerCase().includes(q)
        || m.category?.toLowerCase().includes(q)
    )
  }, [catalog, query])

  const isSearching = query.trim().length > 0

  const handleSelect = (material) => {
    onSelect?.(material)
    onClose?.()
  }

  return (
    <ViewportModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      labelledBy="catalog-picker-title"
      className="h-[calc(100dvh-1.5rem)] sm:h-[min(36rem,calc(100dvh-2rem))] md:h-[min(40rem,calc(100dvh-3rem))]"
    >
      <ViewportModalHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id="catalog-picker-title" className="text-base font-semibold sm:text-lg">
              {title}
            </h3>
            {description ? (
              <p className="mt-1 text-xs text-slate-300 sm:text-sm">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 shrink-0 ${btnSecondaryClass}`}
            aria-label="Chiudi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 space-y-2">
          <label htmlFor="catalog-picker-search" className="sr-only">
            Cerca materiale
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300/70" />
            <input
              id="catalog-picker-search"
              type="search"
              autoFocus={!isMobile}
              placeholder="Cerca codice o descrizione…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`${fieldInputClass} min-h-11 py-2.5 pl-10 text-sm`}
            />
          </div>
          {matches.length > 0 && (
            <p className="text-xs text-slate-400">
              {matches.length} {matches.length === 1 ? "voce" : "voci"}
              {isSearching ? " trovate" : " nel catalogo"}
              {" · "}sezioni per prezzario e categoria
            </p>
          )}
        </div>
      </ViewportModalHeader>

      <ViewportModalBody className="flex min-h-0 flex-col overflow-hidden p-0 sm:p-0">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y px-3 py-3 sm:px-4 sm:py-4 scrollbar-app">
          <CatalogMaterialSections
            materials={matches}
            onAdd={handleSelect}
            draggable={false}
            expandAll={isSearching}
            buttonClassName={btnSecondaryClass}
          />
        </div>
      </ViewportModalBody>

      <ViewportModalFooter>
        <div className="flex justify-stretch sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`min-h-11 w-full rounded-lg border border-slate-600 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-800 sm:w-auto ${btnSecondaryClass}`}
          >
            Chiudi
          </button>
        </div>
      </ViewportModalFooter>
    </ViewportModal>
  )
}

export default CatalogPickerModal

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { CatalogMaterialRow } from "./ui/TruncatedTextDetails"
import { DraggableCatalogMaterialRow } from "./DraggableCatalogMaterialRow"

const UNCATEGORIZED = "Senza categoria"
const PAGE_SIZE = 15

const SOURCE_SECTIONS = [
  {
    id: "regional",
    label: "Prezzario regionale",
    match: (m) => (m?.priceType || "capitolato") === "regional",
  },
  {
    id: "capitolato",
    label: "Prezzario del capitolato",
    match: (m) => (m?.priceType || "capitolato") !== "regional",
  },
]

const btnSecondaryClass =
  "cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 disabled:cursor-not-allowed"

const sourceKey = (id) => `source:${id}`
const categoryKey = (sourceId, category) => `cat:${sourceId}:${category}`

const compareCategories = (a, b) => {
  if (a === UNCATEGORIZED) return 1
  if (b === UNCATEGORIZED) return -1
  return a.localeCompare(b, "it", { sensitivity: "base" })
}

/**
 * Catalogo materiali a sezioni collassabili (prezzario → categoria).
 * Nessun max-height: espandere le sezioni allunga la pagina.
 * Oltre PAGE_SIZE voci per categoria: pulsante "Mostra altri".
 */
export function CatalogMaterialSections({
  materials = [],
  onAdd,
  draggable = false,
  /** Se true (ricerca attiva), apre prezzari e categorie con risultati. */
  expandAll = false,
  buttonClassName = btnSecondaryClass,
}) {
  const grouped = useMemo(() => {
    return SOURCE_SECTIONS.map((source) => {
      const items = materials.filter(source.match)
      const byCategory = new Map()
      for (const material of items) {
        const category = String(material?.category || "").trim() || UNCATEGORIZED
        if (!byCategory.has(category)) byCategory.set(category, [])
        byCategory.get(category).push(material)
      }
      const categories = [...byCategory.entries()]
        .map(([name, list]) => ({
          name,
          items: list,
        }))
        .sort((a, b) => compareCategories(a.name, b.name))
      return {
        ...source,
        items,
        categories,
      }
    }).filter((section) => section.items.length > 0)
  }, [materials])

  /** Tutte le sezioni partono chiuse; in ricerca si aprono. */
  const [open, setOpen] = useState({})
  /** Quante voci mostrare per ogni categoria. */
  const [visibleByCategory, setVisibleByCategory] = useState({})

  useEffect(() => {
    setOpen(() => {
      if (!expandAll) return {}
      const next = {}
      for (const section of grouped) {
        next[sourceKey(section.id)] = true
        for (const cat of section.categories) {
          next[categoryKey(section.id, cat.name)] = true
        }
      }
      return next
    })
    setVisibleByCategory({})
  }, [grouped, expandAll])

  const toggle = useCallback((key) => {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const isOpen = useCallback((key) => Boolean(open[key]), [open])

  const getVisibleCount = useCallback((key) => (
    Number.isFinite(visibleByCategory[key]) ? visibleByCategory[key] : PAGE_SIZE
  ), [visibleByCategory])

  const showMore = useCallback((key, total) => {
    setVisibleByCategory((prev) => {
      const current = Number.isFinite(prev[key]) ? prev[key] : PAGE_SIZE
      return { ...prev, [key]: Math.min(total, current + PAGE_SIZE) }
    })
  }, [])

  if (materials.length === 0) {
    return (
      <p className="px-3 py-4 text-xs text-blue-200/80 text-center rounded-xl border border-blue-500/20">
        Nessun materiale trovato.
      </p>
    )
  }

  const renderMaterial = (material) => (
    draggable ? (
      <DraggableCatalogMaterialRow
        key={material.code}
        material={material}
        onAdd={onAdd}
        buttonClassName={buttonClassName}
      />
    ) : (
      <CatalogMaterialRow
        key={material.code}
        material={material}
        onAdd={onAdd}
        buttonClassName={buttonClassName}
      />
    )
  )

  return (
    <div className="space-y-2">
      {grouped.map((section) => {
        const sk = sourceKey(section.id)
        const sourceOpen = isOpen(sk)
        return (
          <div
            key={section.id}
            className="rounded-xl border border-blue-500/20 bg-black/15 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggle(sk)}
              aria-expanded={sourceOpen}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-blue-900/25 ${btnSecondaryClass}`}
            >
              {sourceOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-blue-300" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-blue-300" />
              )}
              <span className="min-w-0 flex-1 text-sm font-semibold text-blue-100">
                {section.label}
              </span>
              <span className="text-[11px] tabular-nums text-blue-300/80 shrink-0">
                {section.items.length} {section.items.length === 1 ? "voce" : "voci"}
              </span>
            </button>

            {sourceOpen && (
              <div className="border-t border-blue-500/15 space-y-1 p-1.5 sm:p-2">
                {section.categories.map((cat) => {
                  const ck = categoryKey(section.id, cat.name)
                  const catOpen = isOpen(ck)
                  const visibleCount = getVisibleCount(ck)
                  const visibleItems = cat.items.slice(0, visibleCount)
                  const remaining = cat.items.length - visibleItems.length
                  return (
                    <div
                      key={ck}
                      className="rounded-lg border border-blue-500/15 bg-blue-950/20 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggle(ck)}
                        aria-expanded={catOpen}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-blue-900/30 ${btnSecondaryClass}`}
                      >
                        {catOpen ? (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-blue-400/80" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-blue-400/80" />
                        )}
                        <span className="min-w-0 flex-1 text-xs font-medium text-blue-200">
                          {cat.name}
                        </span>
                        <span className="text-[10px] tabular-nums text-blue-300/70 shrink-0">
                          {cat.items.length}
                        </span>
                      </button>

                      {catOpen && (
                        <div className="border-t border-blue-500/10">
                          <div className="divide-y divide-blue-500/10">
                            {visibleItems.map(renderMaterial)}
                          </div>
                          {remaining > 0 && (
                            <button
                              type="button"
                              onClick={() => showMore(ck, cat.items.length)}
                              className={`w-full text-xs px-3 py-2 border-t border-blue-500/10 text-blue-200 hover:bg-blue-900/30 ${btnSecondaryClass}`}
                            >
                              Mostra altri ({remaining} rimanenti)
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default CatalogMaterialSections

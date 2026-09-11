"use client"

import { useEffect, useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react"
import { NumberInput } from "./ui/NumberInput"
import { TruncatedTextDetails } from "./ui/TruncatedTextDetails"
import { UdmSelect } from "./ui/UdmSelect"
import { formatUdmLabel } from "../utils/udm"

const cellInputClass =
  "w-full min-w-0 rounded-lg border border-blue-500/20 bg-black/30 text-white px-2 py-1.5 text-sm md:rounded-md md:px-1.5 md:py-1 md:text-xs disabled:opacity-60 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:border-blue-400/50"

const btnSecondaryClass =
  "cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 disabled:cursor-not-allowed"

/**
 * Distinta BOM di un Nuovo Prezzo.
 * - embedded: senza box separato (divider interno al NP)
 * - showHeader=false: il collasso è gestito dal genitore (NP)
 * - registerDroppable=false: il genitore espone già la drop zone `np-{index}`
 * - droppableIdSuffix: evita collisioni di id quando genitore e distinta sono entrambi droppable
 * Su md+ le voci BOM stanno su una sola riga compatta.
 */
export function NpChildrenEditor({
  bomItems = [],
  canEdit = false,
  enableCatalogDrop = true,
  registerDroppable = true,
  droppableIdSuffix = "",
  onUpdateChild,
  onRemoveChild,
  onAddAdHocChild,
  onRequestCatalog,
  parentIndex,
  defaultCollapsed = false,
  collapsed: collapsedControlled,
  onCollapsedChange,
  embedded = false,
  showHeader = true,
  className = "",
}) {
  const [collapsedInternal, setCollapsedInternal] = useState(defaultCollapsed)
  const isControlled = typeof collapsedControlled === "boolean"
  const collapsed = isControlled ? collapsedControlled : collapsedInternal
  const setCollapsed = (next) => {
    const value = typeof next === "function" ? next(collapsed) : next
    if (!isControlled) setCollapsedInternal(value)
    onCollapsedChange?.(value)
  }

  const droppableId = droppableIdSuffix
    ? `np-${parentIndex}-${droppableIdSuffix}`
    : `np-${parentIndex}`
  const dropEnabled = canEdit && enableCatalogDrop
  const { setNodeRef, isOver } = useDroppable({
    // ID univoco anche se disabilitato (il genitore può già registrare `np-{index}`)
    id: registerDroppable ? droppableId : `${droppableId}-idle`,
    disabled: !dropEnabled || !registerDroppable,
    data: { type: "np", parentIndex },
  })

  // Drag sopra la distinta collassata → apri subito per poter rilasciare nel NP
  useEffect(() => {
    if (!isOver || !collapsed || !dropEnabled) return
    if (!isControlled) setCollapsedInternal(false)
    onCollapsedChange?.(false)
  }, [isOver, collapsed, dropEnabled, isControlled, onCollapsedChange])

  const rootClass = embedded
    ? `space-y-1.5 md:space-y-1 transition-colors ${
      isOver ? "rounded-lg ring-2 ring-amber-400/40 bg-amber-900/20 p-2 -mx-0.5" : ""
    } ${className}`
    : `rounded-lg border p-2.5 space-y-1.5 md:space-y-1 transition-colors ${
      isOver
        ? "border-amber-400/60 bg-amber-900/30 ring-2 ring-amber-400/40"
        : "border-amber-500/25 bg-amber-950/10"
    } ${className}`

  const actions = canEdit ? (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onRequestCatalog?.(parentIndex)}
        className={`text-[11px] px-2 py-1 rounded-md border border-blue-500/30 text-blue-200 hover:bg-blue-900/30 ${btnSecondaryClass}`}
      >
        Da catalogo
      </button>
      <button
        type="button"
        onClick={() => onAddAdHocChild?.(parentIndex)}
        className={`text-[11px] px-2 py-1 rounded-md border border-amber-500/30 text-amber-200 hover:bg-amber-900/20 flex items-center gap-1 ${btnSecondaryClass}`}
      >
        <Plus className="h-3 w-3" /> Voce fuori prezzario
      </button>
    </div>
  ) : null

  return (
    <div ref={registerDroppable ? setNodeRef : undefined} className={rootClass}>
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-200/90 hover:text-amber-100 ${btnSecondaryClass}`}
            aria-expanded={!collapsed}
            aria-controls={`np-children-${parentIndex}`}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            )}
            Distinta componenti ({bomItems.length})
            {dropEnabled && (
              <span className="ml-1 font-normal normal-case tracking-normal text-amber-200/60">
                · trascina qui dal catalogo
              </span>
            )}
          </button>
          {actions}
        </div>
      )}

      {!showHeader && !collapsed && canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-amber-200/80">
            Componenti
            {dropEnabled ? " · trascina qui dal catalogo" : ""}
          </p>
          {actions}
        </div>
      )}

      {!collapsed && (
        <div id={`np-children-${parentIndex}`}>
          {bomItems.length === 0 ? (
            <p
              className={`text-xs px-1 py-2 md:py-1.5 rounded-md border border-dashed text-center ${
                isOver
                  ? "border-amber-400/50 text-amber-100"
                  : "border-amber-500/20 text-amber-100/70"
              }`}
            >
              {isOver
                ? "Rilascia per aggiungere il componente"
                : dropEnabled
                  ? "Aggiungi voci dal prezziario (drag o Da catalogo) o crea voci ad hoc."
                  : "Aggiungi voci dal prezziario (Da catalogo) o crea voci ad hoc."}
            </p>
          ) : (
            <div className="space-y-2 md:space-y-1">
              {bomItems.map((child, childIndex) => {
                const locked = !child.isAdHoc
                const lineTotal = (Number(child.quantity) || 0) * (Number(child.unitPrice) || 0)
                return (
                  <div
                    key={childIndex}
                    className="rounded-md border border-blue-500/15 bg-black/20 p-2 space-y-2 md:space-y-0 md:p-1.5 md:flex md:items-center md:gap-2"
                  >
                    {/* Codice + descrizione */}
                    <div className="min-w-0 flex-1 md:flex md:items-center md:gap-2 md:max-w-md lg:max-w-lg overflow-hidden">
                      {locked || !canEdit ? (
                        <>
                          <p
                            className="text-xs font-mono text-blue-200 shrink-0 md:w-[5.5rem] md:truncate md:text-[11px]"
                            title={child.materialCode || ""}
                          >
                            {child.materialCode || "—"}
                          </p>
                          <div className="mt-1 md:mt-0 min-w-0 flex-1 max-w-full md:max-w-[14rem] lg:max-w-[18rem] overflow-hidden">
                            <TruncatedTextDetails
                              text={child.description}
                              detailsText={child.fullDescription}
                              title={`Componente ${childIndex + 1}`}
                              lines={1}
                              className="text-sm md:text-xs text-white truncate"
                              fields={[
                                { label: "Codice", value: child.materialCode || "—" },
                                { label: "U.M.", value: formatUdmLabel(child.udm) },
                                {
                                  label: "Prezzo unitario",
                                  value: `€ ${Number(child.unitPrice || 0).toFixed(2)}`,
                                },
                              ]}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 shrink-0 md:w-auto">
                            <p
                              className="text-xs font-mono text-amber-200/90 md:w-[5.5rem] md:truncate md:text-[11px]"
                              title={child.materialCode || ""}
                            >
                              {child.materialCode || "—"}
                            </p>
                            <span className="font-sans text-[10px] text-amber-200/60 md:border md:border-amber-500/25 md:rounded md:px-1 md:py-0.5">
                              <span className="md:hidden">Fuori prezzario</span>
                              <span className="hidden md:inline">Fuori</span>
                            </span>
                          </div>
                          <div className="mt-1.5 md:mt-0 min-w-0 flex-1 max-w-full md:max-w-[14rem] lg:max-w-[18rem]">
                            <input
                              aria-label={`Descrizione componente ${childIndex + 1}`}
                              value={child.description || ""}
                              onChange={(e) => onUpdateChild(parentIndex, childIndex, { description: e.target.value })}
                              placeholder="Descrizione *"
                              title={child.description || ""}
                              className={`${cellInputClass} truncate`}
                            />
                            <textarea
                              aria-label={`Descrizione completa componente ${childIndex + 1}`}
                              rows={2}
                              value={child.fullDescription || ""}
                              onChange={(e) => onUpdateChild(parentIndex, childIndex, { fullDescription: e.target.value })}
                              placeholder="Descrizione completa"
                              className={`${cellInputClass} resize-y min-h-[2.5rem] text-xs mt-1.5 md:hidden`}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* U.M. / Qtà / Prezzo */}
                    <div className="grid grid-cols-3 gap-2 md:flex md:items-center md:gap-1.5 md:shrink-0">
                      <div className="md:min-w-[5.75rem] md:shrink-0">
                        <label className="block text-[10px] text-blue-300 mb-0.5 md:sr-only">U.M.</label>
                        {locked || !canEdit ? (
                          <p className="text-xs text-white md:text-[11px] whitespace-nowrap">
                            {formatUdmLabel(child.udm)}
                          </p>
                        ) : (
                          <UdmSelect
                            value={child.udm}
                            onChange={(next) => onUpdateChild(parentIndex, childIndex, { udm: next })}
                            aria-label={`U.M. componente ${childIndex + 1}`}
                          />
                        )}
                      </div>
                      <div className="md:w-16">
                        <label className="block text-[10px] text-blue-300 mb-0.5 md:sr-only">Qtà</label>
                        <NumberInput
                          size="sm"
                          min={0}
                          textAlign="right"
                          disabled={!canEdit}
                          value={child.quantity}
                          onChange={(e) => onUpdateChild(parentIndex, childIndex, { quantity: e.target.value })}
                          className={cellInputClass}
                          aria-label={`Quantità componente ${childIndex + 1}`}
                          title="Quantità"
                        />
                      </div>
                      <div className="md:w-[4.75rem]">
                        <label className="block text-[10px] text-blue-300 mb-0.5 md:sr-only">Prezzo</label>
                        {locked || !canEdit ? (
                          <p className="text-xs text-white text-right md:text-[11px]">
                            € {Number(child.unitPrice || 0).toFixed(2)}
                          </p>
                        ) : (
                          <NumberInput
                            size="sm"
                            min={0}
                            textAlign="right"
                            disabled={!canEdit}
                            value={child.unitPrice}
                            onChange={(e) => onUpdateChild(parentIndex, childIndex, { unitPrice: e.target.value })}
                            className={cellInputClass}
                            aria-label={`Prezzo componente ${childIndex + 1}`}
                            title="Prezzo"
                          />
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-blue-200 flex justify-between md:hidden">
                      <span>Totale componente</span>
                      <span>€ {lineTotal.toFixed(2)}</span>
                    </p>
                    <span className="hidden md:inline shrink-0 text-[11px] tabular-nums text-blue-200 w-[4.5rem] text-right">
                      € {lineTotal.toFixed(2)}
                    </span>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => onRemoveChild(parentIndex, childIndex)}
                        className={`p-1.5 md:p-1 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-900/20 shrink-0 self-start md:self-center ${btnSecondaryClass}`}
                        aria-label={`Rimuovi componente ${childIndex + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 md:h-3 md:w-3" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {collapsed && canEdit && dropEnabled && registerDroppable && (
        <p
          className={`text-xs text-center py-2.5 md:py-1.5 rounded-md border border-dashed ${
            isOver
              ? "border-amber-400/50 text-amber-100 bg-amber-900/20"
              : "border-amber-500/25 text-amber-200/70"
          }`}
        >
          {isOver ? "Rilascia per aggiungere il componente" : "Trascina qui per aprire e aggiungere alla distinta"}
        </p>
      )}
    </div>
  )
}

export default NpChildrenEditor

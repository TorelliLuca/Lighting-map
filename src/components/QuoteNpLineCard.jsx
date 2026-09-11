"use client"

import { Fragment, useEffect, useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react"
import { NumberInput } from "./ui/NumberInput"
import { GlassSelect } from "./ui/GlassSelect"
import { TruncatedTextDetails } from "./ui/TruncatedTextDetails"
import { UdmSelect } from "./ui/UdmSelect"
import { NpChildrenEditor } from "./NpChildrenEditor"
import { lineDetailsTitle } from "../utils/npBom"
import { formatUdmLabel } from "../utils/udm"

const cellInputClass =
  "w-full min-w-0 rounded-lg border border-blue-500/20 bg-black/30 text-white px-2 py-1.5 text-sm disabled:opacity-60 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:border-blue-400/50"

const btnSecondaryClass =
  "cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 disabled:cursor-not-allowed"

const inputClassWithWarning = (baseClass, isMissing) =>
  isMissing
    ? `${baseClass} border-amber-500/50 ring-1 ring-amber-500/30`
    : baseClass

/** True se il click parte da un controllo interattivo (input, bottone, select, …). */
const isInteractiveTarget = (target) => {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      'input, textarea, select, button, a, label, [role="button"], [role="combobox"], [role="listbox"], [role="option"], [contenteditable="true"]',
    ),
  )
}

/**
 * Box unico Nuovo prezzo + distinta (mobile / layout card).
 * Tutta la card è droppable: se collassata, al drag-over si apre automaticamente.
 */
export function QuoteNpLineCard({
  item,
  index,
  canEdit,
  enableCatalogDrop = false,
  isMissingDescription = false,
  isEmptyBom = false,
  materialCategoryOptions = [],
  contestAuthority = "DEC",
  onUpdateLine,
  onRemoveLine,
  onUpdateChild,
  onRemoveChild,
  onAddAdHocChild,
  onRequestCatalog,
}) {
  const [bomCollapsed, setBomCollapsed] = useState(false)
  const bomCount = (item.children || []).length
  const lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0)
  const dropEnabled = canEdit && enableCatalogDrop

  const { setNodeRef, isOver } = useDroppable({
    id: `np-${index}`,
    disabled: !dropEnabled,
    data: { type: "np", parentIndex: index },
  })

  useEffect(() => {
    if (isOver && bomCollapsed) setBomCollapsed(false)
  }, [isOver, bomCollapsed])

  const toggleBomCollapsed = () => setBomCollapsed((prev) => !prev)

  return (
    <div
      ref={setNodeRef}
      className={`p-3 rounded-xl border space-y-3 bg-amber-950/15 border-amber-500/25 transition-colors ${
        item.isContested ? "ring-1 ring-red-500/40" : ""
      } ${isMissingDescription && !item.isContested ? "ring-1 ring-amber-500/40" : ""} ${
        isEmptyBom && !item.isContested ? "ring-1 ring-amber-500/50" : ""
      } ${
        isOver ? "ring-2 ring-amber-400/50 bg-amber-900/25" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={toggleBomCollapsed}
          className={`min-w-0 flex-1 text-left rounded-lg ${btnSecondaryClass}`}
          aria-expanded={!bomCollapsed}
          aria-controls={`np-children-${index}`}
          title={bomCollapsed ? "Mostra componenti" : "Nascondi componenti"}
        >
          <div className="flex items-center gap-1.5">
            {bomCollapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
            )}
            <span className="text-xs text-amber-200 font-medium">
              Voce {index + 1} · Nuovo prezzo
              {item.isContested ? " · Contestata" : ""}
              <span className="text-amber-200/70 font-normal">
                {" "}· {bomCount} {bomCount === 1 ? "componente" : "componenti"}
              </span>
            </span>
          </div>
          <p className="text-sm text-white font-mono truncate mt-1.5">{item.materialCode || "—"}</p>
        </button>
        {canEdit && (
          <button
            type="button"
            onClick={() => onRemoveLine(index)}
            className={`p-2 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-900/20 shrink-0 ${btnSecondaryClass}`}
            aria-label={`Rimuovi voce ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div>
        <label className="block text-xs text-blue-300 mb-1">Descrizione breve</label>
        {canEdit ? (
          <>
            <input
              aria-label={`Descrizione breve voce ${index + 1}`}
              disabled={!canEdit}
              placeholder="Descrizione breve *"
              value={item.description}
              onChange={(e) => onUpdateLine(index, { description: e.target.value })}
              className={inputClassWithWarning(cellInputClass, isMissingDescription)}
            />
            {isMissingDescription && (
              <p className="mt-1 text-xs text-amber-300">Descrizione breve obbligatoria</p>
            )}
            <label className="block text-xs text-blue-300 mt-2 mb-1">Descrizione completa</label>
            <textarea
              aria-label={`Descrizione completa voce ${index + 1}`}
              disabled={!canEdit}
              rows={2}
              placeholder="Descrizione completa (opzionale)"
              value={item.fullDescription || ""}
              onChange={(e) => onUpdateLine(index, { fullDescription: e.target.value })}
              className={`${cellInputClass} resize-y min-h-[3rem]`}
            />
            <label className="block text-xs text-blue-300 mt-2 mb-1">Categoria</label>
            <GlassSelect
              id={`quote-np-category-${index}`}
              disabled={!canEdit}
              value={item.category || ""}
              onChange={(value) => onUpdateLine(index, { category: value })}
              aria-label={`Categoria voce ${index + 1}`}
              placeholder="Seleziona categoria…"
              openUpward={false}
              maxVisible={6}
              className="bg-black/30 border-blue-500/20 rounded-lg px-2 py-1.5 text-sm min-h-9"
              options={materialCategoryOptions}
            />
          </>
        ) : (
          <TruncatedTextDetails
            text={item.description}
            detailsText={item.fullDescription}
            title={lineDetailsTitle(item, `Voce ${index + 1}`)}
            lines={2}
            className="text-sm text-white"
            bom={item.children || []}
            fields={[
              { label: "Codice", value: item.materialCode || "—" },
              { label: "U.M.", value: formatUdmLabel(item.udm) },
              {
                label: "Prezzo unitario",
                value: `€ ${Number(item.unitPrice || 0).toFixed(2)}`,
              },
            ]}
          />
        )}
        {isEmptyBom && canEdit && (
          <p className="mt-2 text-xs text-amber-300">
            Aggiungi almeno un componente alla distinta prima di inviare.
          </p>
        )}
        {item.isContested && item.contestNote && (
          <p className="mt-2 text-xs text-red-200/90 bg-red-950/30 rounded-lg px-2 py-1.5 border border-red-500/20">
            Contestazione {contestAuthority}: {item.contestNote}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-blue-300 mb-1">U.M.</label>
          {canEdit ? (
            <UdmSelect
              aria-label={`Unità di misura voce ${index + 1}`}
              disabled={!canEdit}
              value={item.udm}
              onChange={(next) => onUpdateLine(index, { udm: next })}
            />
          ) : (
            <p className="text-sm text-white">{formatUdmLabel(item.udm)}</p>
          )}
        </div>
        <div>
          <label className="block text-xs text-blue-300 mb-1">Qtà</label>
          <NumberInput
            size="sm"
            min={0}
            textAlign="right"
            aria-label={`Quantità voce ${index + 1}`}
            disabled={!canEdit}
            value={item.quantity}
            onChange={(e) => onUpdateLine(index, { quantity: e.target.value })}
            className={cellInputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-blue-300 mb-1">Prezzo (BOM)</label>
          <p className="text-sm text-white text-right">€ {Number(item.unitPrice || 0).toFixed(2)}</p>
        </div>
      </div>

      <p className="text-sm font-medium text-white flex justify-between pt-1 border-t border-amber-500/20">
        <span>Totale riga</span>
        <span>€ {lineTotal.toFixed(2)}</span>
      </p>

      <div className="border-t border-amber-500/20 pt-3">
        <NpChildrenEditor
          parentIndex={index}
          bomItems={item.children || []}
          canEdit={canEdit}
          enableCatalogDrop={enableCatalogDrop}
          registerDroppable={false}
          embedded
          showHeader={false}
          collapsed={bomCollapsed}
          onCollapsedChange={setBomCollapsed}
          onUpdateChild={onUpdateChild}
          onRemoveChild={onRemoveChild}
          onAddAdHocChild={onAddAdHocChild}
          onRequestCatalog={onRequestCatalog}
        />
      </div>
    </div>
  )
}

/**
 * Desktop: NP come riga tabella (come le altre voci) + distinta espandibile sotto.
 * La riga NP è droppable anche da collassata: al drag-over si apre e accetta il drop.
 */
export function QuoteNpTableRows({
  item,
  index,
  canEdit,
  enableCatalogDrop = false,
  isMissingDescription = false,
  isEmptyBom = false,
  materialCategoryOptions = [],
  contestAuthority = "DEC",
  onUpdateLine,
  onRemoveLine,
  onUpdateChild,
  onRemoveChild,
  onAddAdHocChild,
  onRequestCatalog,
}) {
  const [bomCollapsed, setBomCollapsed] = useState(true)
  const bomCount = (item.children || []).length
  const lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0)
  const colSpan = canEdit ? 8 : 7
  const cellReadOnlyClass = "text-white"
  const dropEnabled = canEdit && enableCatalogDrop

  // Riga sempre droppable: così dopo l'auto-expand il rilascio sulla riga resta sul NP
  const { setNodeRef, isOver } = useDroppable({
    id: `np-${index}`,
    disabled: !dropEnabled,
    data: { type: "np", parentIndex: index },
  })

  useEffect(() => {
    if (isOver && bomCollapsed) setBomCollapsed(false)
  }, [isOver, bomCollapsed])

  const toggleBomCollapsed = () => setBomCollapsed((prev) => !prev)

  const onRowClick = (event) => {
    if (isInteractiveTarget(event.target)) return
    toggleBomCollapsed()
  }

  return (
    <Fragment>
      <tr
        ref={setNodeRef}
        onClick={onRowClick}
        className={`border-b border-blue-500/10 bg-amber-950/15 transition-colors cursor-pointer ${
          item.isContested ? "bg-red-950/20" : ""
        } ${isMissingDescription && !item.isContested ? "ring-1 ring-inset ring-amber-500/30" : ""} ${
          isEmptyBom && !item.isContested ? "ring-1 ring-inset ring-amber-500/50" : ""
        } ${
          isOver ? "ring-2 ring-inset ring-amber-400/50 bg-amber-900/30" : ""
        }`}
        title={bomCollapsed ? "Clicca la riga per mostrare i componenti" : "Clicca la riga per nascondere i componenti"}
      >
        <td className="px-3 py-2 align-middle">
          <div className="flex items-start gap-1.5">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                toggleBomCollapsed()
              }}
              className={`mt-0.5 p-0.5 rounded text-amber-300 hover:text-amber-100 hover:bg-amber-900/30 shrink-0 ${btnSecondaryClass}`}
              aria-expanded={!bomCollapsed}
              aria-controls={`np-children-${index}`}
              title={bomCollapsed ? "Mostra componenti" : "Nascondi componenti"}
            >
              {bomCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            <div className="min-w-0 flex-1 space-y-0.5">
              <span className={`${cellReadOnlyClass} font-mono text-xs`}>{item.materialCode || "—"}</span>
              <p className="text-[10px] text-amber-200/80">
                NP · {bomCount} {bomCount === 1 ? "comp." : "comp."}
                {dropEnabled && bomCollapsed ? " · trascina qui" : ""}
              </p>
              {isEmptyBom && canEdit && (
                <p className="text-[10px] text-amber-300">Distinta vuota</p>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-2 align-middle max-w-[280px]">
          {canEdit ? (
            <div className="space-y-1.5">
              <input
                aria-label={`Descrizione breve voce ${index + 1}`}
                aria-invalid={isMissingDescription}
                disabled={!canEdit}
                placeholder="Descrizione breve *"
                value={item.description}
                onChange={(e) => onUpdateLine(index, { description: e.target.value })}
                className={inputClassWithWarning(cellInputClass, isMissingDescription)}
              />
              {isMissingDescription && (
                <p className="mt-0.5 text-[10px] text-amber-300">Obbligatoria</p>
              )}
              <textarea
                aria-label={`Descrizione completa voce ${index + 1}`}
                disabled={!canEdit}
                rows={2}
                placeholder="Descrizione completa"
                value={item.fullDescription || ""}
                onChange={(e) => onUpdateLine(index, { fullDescription: e.target.value })}
                className={`${cellInputClass} resize-y min-h-[2.75rem] text-xs`}
              />
            </div>
          ) : (
            <div>
              <TruncatedTextDetails
                text={item.description}
                detailsText={item.fullDescription}
                title={lineDetailsTitle(item, `Voce ${index + 1}`)}
                lines={2}
                className={cellReadOnlyClass}
                bom={item.children || []}
                fields={[
                  { label: "Codice", value: item.materialCode || "—" },
                  { label: "U.M.", value: formatUdmLabel(item.udm) },
                  {
                    label: "Prezzo unitario",
                    value: `€ ${Number(item.unitPrice || 0).toFixed(2)}`,
                  },
                ]}
              />
              {isEmptyBom && canEdit && (
                <p className="mt-1 text-[10px] text-amber-300">
                  Distinta vuota: aggiungi almeno un componente.
                </p>
              )}
              {item.isContested && item.contestNote && (
                <p className="mt-1 text-[10px] text-red-200/90">
                  Contestazione {contestAuthority}: {item.contestNote}
                </p>
              )}
            </div>
          )}
        </td>
        <td className="px-3 py-2 align-middle min-w-[170px]">
          {canEdit ? (
            <GlassSelect
              id={`quote-np-table-category-${index}`}
              disabled={!canEdit}
              value={item.category || ""}
              onChange={(value) => onUpdateLine(index, { category: value })}
              aria-label={`Categoria voce ${index + 1}`}
              placeholder="Categoria…"
              openUpward={false}
              maxVisible={6}
              className="bg-black/30 border-blue-500/20 rounded-lg px-2 py-1.5 text-xs min-h-9"
              options={materialCategoryOptions}
            />
          ) : (
            <span className={`${cellReadOnlyClass} text-xs`}>{item.category || "—"}</span>
          )}
        </td>
        <td className="px-3 py-2 align-middle whitespace-nowrap">
          {canEdit ? (
            <UdmSelect
              aria-label={`Unità di misura voce ${index + 1}`}
              disabled={!canEdit}
              value={item.udm}
              onChange={(next) => onUpdateLine(index, { udm: next })}
            />
          ) : (
            <span className={cellReadOnlyClass}>{formatUdmLabel(item.udm)}</span>
          )}
        </td>
        <td className="px-3 py-2 align-middle">
          <NumberInput
            size="sm"
            min={0}
            textAlign="right"
            aria-label={`Quantità voce ${index + 1}`}
            disabled={!canEdit}
            value={item.quantity}
            onChange={(e) => onUpdateLine(index, { quantity: e.target.value })}
            className={`${cellInputClass} w-24 ml-auto`}
          />
        </td>
        <td className="px-3 py-2 align-middle text-right whitespace-nowrap">
          <span className={cellReadOnlyClass}>€ {Number(item.unitPrice || 0).toFixed(2)}</span>
        </td>
        <td className="px-3 py-2 align-middle text-right text-white whitespace-nowrap font-medium">
          € {lineTotal.toFixed(2)}
        </td>
        {canEdit && (
          <td className="px-3 py-2 align-middle">
            <button
              type="button"
              onClick={() => onRemoveLine(index)}
              className={`p-1.5 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-900/20 ${btnSecondaryClass}`}
              aria-label={`Rimuovi voce ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </td>
        )}
      </tr>
      <tr className={`border-b border-blue-500/10 bg-amber-950/10 ${bomCollapsed ? "hidden" : ""}`}>
        <td colSpan={colSpan} className="px-3 py-1.5 pl-10">
          <NpChildrenEditor
            parentIndex={index}
            bomItems={item.children || []}
            canEdit={canEdit}
            enableCatalogDrop={enableCatalogDrop}
            registerDroppable={!bomCollapsed}
            droppableIdSuffix="bom"
            embedded
            showHeader={false}
            collapsed={bomCollapsed}
            onCollapsedChange={setBomCollapsed}
            onUpdateChild={onUpdateChild}
            onRemoveChild={onRemoveChild}
            onAddAdHocChild={onAddAdHocChild}
            onRequestCatalog={onRequestCatalog}
          />
        </td>
      </tr>
    </Fragment>
  )
}

export default QuoteNpLineCard

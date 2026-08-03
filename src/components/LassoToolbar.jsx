import { Cable, Check, RotateCw, Scaling, Undo2, X } from "lucide-react"

/**
 * Barra azioni dopo selezione lazo.
 */
export function LassoToolbar({
  selectedCount = 0,
  hasMoved = false,
  isSaving = false,
  isLinking = false,
  linkParentMode = false,
  scaleMode = false,
  rotateMode = false,
  canLinkToLine = false,
  onSave,
  onRevert,
  onClear,
  onLinkToLine,
  onCancelLink,
  onToggleScaleMode,
  onToggleRotateMode,
}) {
  if (selectedCount <= 0) return null

  const statusText = linkParentMode
    ? "Seleziona sulla mappa il punto a monte (quadro o palo)"
    : scaleMode
      ? "Rotella: aumenta/diminuisci la distanza tra i punti"
      : rotateMode
        ? "Rotella: ruota i punti attorno al centro della selezione"
        : `${selectedCount} ${selectedCount === 1 ? "punto selezionato" : "punti selezionati"}${
            hasMoved ? " · spostati" : " · trascina per spostare · tasto destro per muovere la mappa"
          }`

  return (
    <div className="fixed bottom-8 left-1/2 z-40 -translate-x-1/2 flex flex-wrap items-center justify-center gap-3 px-4 py-3 rounded-xl bg-black/80 backdrop-blur-xl border border-blue-500/40 shadow-[0_0_25px_rgba(0,149,255,0.2)] text-blue-100 max-w-[95vw]">
      <span className="text-sm whitespace-nowrap">{statusText}</span>
      <div className="flex flex-wrap items-center gap-2">
        {linkParentMode ? (
          <button
            type="button"
            onClick={onCancelLink}
            disabled={isSaving || isLinking}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/40 hover:bg-blue-700/30 text-sm disabled:opacity-50"
            title="Annulla collegamento"
          >
            <X className="h-4 w-4" />
            Annulla
          </button>
        ) : (
          <>
            {hasMoved && (
              <>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={isSaving || isLinking}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-white text-sm disabled:opacity-50"
                  title="Salva posizioni"
                >
                  <Check className="h-4 w-4" />
                  Salva
                </button>
                <button
                  type="button"
                  onClick={onRevert}
                  disabled={isSaving || isLinking}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/40 hover:bg-blue-700/30 text-sm disabled:opacity-50"
                  title="Annulla spostamento"
                >
                  <Undo2 className="h-4 w-4" />
                  Annulla
                </button>
              </>
            )}
            {selectedCount >= 2 && (
              <>
                <button
                  type="button"
                  onClick={onToggleScaleMode}
                  disabled={isSaving || isLinking}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50 ${
                    scaleMode
                      ? "bg-cyan-700/50 border-cyan-400/70 text-white"
                      : "border-cyan-500/50 hover:bg-cyan-700/30"
                  }`}
                  title="Scala distanze con la rotella del mouse"
                >
                  <Scaling className="h-4 w-4" />
                  {scaleMode ? "Scala attiva" : "Scala"}
                </button>
                <button
                  type="button"
                  onClick={onToggleRotateMode}
                  disabled={isSaving || isLinking}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50 ${
                    rotateMode
                      ? "bg-cyan-700/50 border-cyan-400/70 text-white"
                      : "border-cyan-500/50 hover:bg-cyan-700/30"
                  }`}
                  title="Ruota attorno al centro con la rotella del mouse"
                >
                  <RotateCw className="h-4 w-4" />
                  {rotateMode ? "Rotazione attiva" : "Ruota"}
                </button>
              </>
            )}
            {canLinkToLine && (
              <button
                type="button"
                onClick={onLinkToLine}
                disabled={isSaving || isLinking || hasMoved || scaleMode || rotateMode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/50 hover:bg-cyan-700/30 text-sm disabled:opacity-50"
                title={
                  hasMoved
                    ? "Salva o annulla lo spostamento prima di collegare"
                    : "Collega i punti selezionati a una linea esistente"
                }
              >
                <Cable className="h-4 w-4" />
                Collega a linea
              </button>
            )}
            <button
              type="button"
              onClick={onClear}
              disabled={isSaving || isLinking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/40 hover:bg-blue-700/30 text-sm disabled:opacity-50"
              title="Deseleziona"
            >
              <X className="h-4 w-4" />
              Chiudi
            </button>
          </>
        )}
      </div>
    </div>
  )
}

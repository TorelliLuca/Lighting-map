/** Modalità MapLibre attiva in Dashboard (SettingsMenu → "Semplice"). */
export const SIMPLIFIED_VISUALIZATION_MODE = "semplice"

export const PRINT_DISABLED_MESSAGE =
  "Attiva la versione semplificata per esportare la mappa"

export const isSimplifiedVisualizationMode = (visualizationMode) =>
  visualizationMode === SIMPLIFIED_VISUALIZATION_MODE

/**
 * Determina se l'export/stampa mappa è disponibile.
 * Legge la stessa prop/state usata da Dashboard e SettingsMenu.
 */
export function usePrintAvailability(visualizationMode) {
  const isPrintAvailable = isSimplifiedVisualizationMode(visualizationMode)

  return {
    isPrintAvailable,
    disabledReason: isPrintAvailable ? null : PRINT_DISABLED_MESSAGE,
    tooltipMessage: isPrintAvailable
      ? "Esporta la mappa come immagine"
      : PRINT_DISABLED_MESSAGE,
  }
}

import uniqolor from "uniqolor";

export const DEFAULT_COLOR = "#3b82f6"

export const colorsBackground = [
  "#ff0000", // Rosso intenso
  "#00ff00", // Verde neon
  "#0000ff", // Blu elettrico
  "#ff00ff", // Magenta brillante
  "#ffff00", // Giallo vibrante
  "#00ffff", // Ciano vivace
  "#ff3300", // Arancione fuoco
  "#33cc33", // Verde lime
  "#3300ff", // Blu indaco
  "#ff0099", // Rosa shocking
  "#ff9900", // Arancione brillante
  "#9900ff", // Viola intenso
  "#00cc99", // Turchese brillante
  "#ff6600", // Arancione mandarino
  "#cc00ff"  // Viola elettrico
];

export const colorsGliph = [
  "#ffffff", // White
  "#f8fafc", // Slate 50
  "#f1f5f9", // Slate 100
  "#e2e8f0", // Slate 200
  "#cbd5e1", // Slate 300
  "#94a3b8", // Slate 400
  "#64748b", // Slate 500
  "#475569", // Slate 600
  "#334155", // Slate 700
  "#1e293b", // Slate 800
  "#0f172a", // Slate 900
  "#020617", // Slate 950
]

export const coloreGliphOn = "#80EB34"

// Restituisce una lista di n colori unici, senza ripetizioni
export function getColorList(n) {
  const base = [...colorsBackground];
  if (n <= base.length) return base.slice(0, n);
  // Ripeti ciclicamente i colori base fino a raggiungere n
  const repeated = [];
  for (let i = 0; i < n; i++) {
    repeated.push(base[i % base.length]);
  }
  return repeated;
}



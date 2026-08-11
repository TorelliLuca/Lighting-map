import { describe, expect, it } from "vitest"
import { generateLegendColorMap } from "./useFilteredMarkers"
import { FC_QUADRO_COLOR } from "../utils/ColorGenerator"

describe("generateLegendColorMap", () => {
  const markers = [
    { quadro: "Q1", proprieta: "Comune", lotto: "A", tipo_apparecchio: "LED" },
    { quadro: "Q2", proprieta: "EnelSole", lotto: "B", tipo_apparecchio: "SAP" },
    { quadro: "FC", proprieta: "Comune", lotto: "A", tipo_apparecchio: "LED" },
  ]

  it("maps unique quadri for MARKER highlight", () => {
    const map = generateLegendColorMap(markers, "MARKER")
    expect(Object.keys(map.quadro)).toEqual(expect.arrayContaining(["Q1", "Q2", "FC"]))
    expect(map.quadro.FC).toBe(FC_QUADRO_COLOR)
    expect(map.quadro.Q1).toBeTruthy()
    expect(map.quadro.Q1).not.toBe(map.quadro.Q2)
  })

  it("maps proprieta values", () => {
    const map = generateLegendColorMap(markers, "PROPRIETA")
    expect(Object.keys(map.proprieta)).toEqual(expect.arrayContaining(["Comune", "EnelSole"]))
  })

  it("maps lotto values", () => {
    const map = generateLegendColorMap(markers, "LOTTO")
    expect(Object.keys(map.lotto)).toEqual(expect.arrayContaining(["A", "B"]))
  })

  it("maps tipo_apparecchio lowercase keys", () => {
    const map = generateLegendColorMap(markers, "TIPO_APPARECCHIO")
    expect(Object.keys(map.tipo_apparecchio)).toEqual(expect.arrayContaining(["led", "sap"]))
  })

  it("returns empty maps for unknown highlight", () => {
    const map = generateLegendColorMap(markers, "")
    expect(map.quadro).toEqual({})
    expect(map.proprieta).toEqual({})
  })
})

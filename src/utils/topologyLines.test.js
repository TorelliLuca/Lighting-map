import { describe, expect, it } from "vitest"
import {
  buildTopologyLineFeatures,
  getEffectiveQuadro,
  hasTopologyParent,
  mergeTopologyUpdates,
  syncQuadroFromTopologyChain,
} from "./topologyLines"

describe("topologyLines helpers", () => {
  it("hasTopologyParent accepts populated parent objects", () => {
    expect(hasTopologyParent({ parent: "abc" })).toBe(true)
    expect(hasTopologyParent({ parent: { _id: "abc" } })).toBe(true)
    expect(hasTopologyParent({ parent: null })).toBe(false)
  })

  it("getEffectiveQuadro follows parent chain to QE", () => {
    const markers = [
      { _id: "qe", marker: "QE", quadro: "Q1", parent: null, lat: 1, lng: 1 },
      { _id: "pl1", marker: "PL", quadro: "", parent: "qe", lat: 2, lng: 2 },
      { _id: "pl2", marker: "PL", quadro: "", parent: "pl1", lat: 3, lng: 3 },
    ]
    const byId = new Map(markers.map((m) => [m._id, m]))
    expect(getEffectiveQuadro(markers[2], byId)).toBe("Q1")
  })

  it("syncQuadroFromTopologyChain propagates quadro on PL chain", () => {
    const markers = [
      { _id: "qe", marker: "QE", quadro: "Q1", parent: null },
      { _id: "pl1", marker: "PL", quadro: "old", parent: "qe" },
      { _id: "pl2", marker: "PL", quadro: "", parent: "pl1" },
    ]
    const synced = syncQuadroFromTopologyChain(markers)
    expect(synced[1].quadro).toBe("Q1")
    expect(synced[2].quadro).toBe("Q1")
  })

  it("buildTopologyLineFeatures colors chain connected to QE", () => {
    const markers = [
      { _id: "qe", marker: "QE", quadro: "Q1", parent: null, lat: "45", lng: "7" },
      { _id: "pl1", marker: "PL", quadro: "", parent: "qe", lat: "45.1", lng: "7.1" },
      { _id: "pl2", marker: "PL", quadro: "", parent: "pl1", lat: "45.2", lng: "7.2" },
    ]
    const fc = buildTopologyLineFeatures(markers)
    expect(fc.features).toHaveLength(2)
    expect(fc.features.every((f) => f.properties.color !== "#64748b")).toBe(true)
    expect(fc.features.every((f) => f.properties.quadro === "Q1")).toBe(true)
  })

  it("mergeTopologyUpdates merges by id", () => {
    const merged = mergeTopologyUpdates([
      { _id: "a", parent: "b" },
      { _id: "a", quadro: "Q1" },
    ])
    expect(merged).toEqual([{ _id: "a", parent: "b", quadro: "Q1" }])
  })
})

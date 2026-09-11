import { describe, expect, it } from "vitest"
import {
  formatUdmLabel,
  isValidUdm,
  normalizeUdm,
  validateUdmMessage,
} from "./udm"

describe("normalizeUdm", () => {
  it("maps square/cubic aliases to mq/mc", () => {
    expect(normalizeUdm("m²")).toBe("mq")
    expect(normalizeUdm("m2")).toBe("mq")
    expect(normalizeUdm("m^2")).toBe("mq")
    expect(normalizeUdm("m³")).toBe("mc")
    expect(normalizeUdm("m3")).toBe("mc")
  })

  it("keeps canonical values", () => {
    expect(normalizeUdm("mq")).toBe("mq")
    expect(normalizeUdm("mc")).toBe("mc")
    expect(normalizeUdm("cad")).toBe("cad")
  })

  it("falls back for empty / unknown", () => {
    expect(normalizeUdm("")).toBe("cad")
    expect(normalizeUdm("foo")).toBe("cad")
    expect(normalizeUdm("foo", { fallback: null })).toBe(null)
  })
})

describe("formatUdmLabel", () => {
  it("shows exponents for mq/mc", () => {
    expect(formatUdmLabel("mq")).toBe("m²")
    expect(formatUdmLabel("mc")).toBe("m³")
    expect(formatUdmLabel("m²")).toBe("m²")
  })
})

describe("isValidUdm / validateUdmMessage", () => {
  it("accepts known units", () => {
    expect(isValidUdm("mq")).toBe(true)
    expect(isValidUdm("m²")).toBe(true)
    expect(validateUdmMessage("cad")).toBe(null)
  })

  it("rejects unknown units", () => {
    expect(isValidUdm("xyz")).toBe(false)
    expect(validateUdmMessage("xyz")).toMatch(/mq/i)
  })
})

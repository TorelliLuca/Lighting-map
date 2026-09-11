import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { clearAppBadge, isAppBadgeSupported, syncAppBadge } from "./appBadge"

describe("appBadge", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", {
      setAppBadge: vi.fn(async () => {}),
      clearAppBadge: vi.fn(async () => {}),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("detects support when setAppBadge exists", () => {
    expect(isAppBadgeSupported()).toBe(true)
  })

  it("sets badge for positive counts and clears for zero", async () => {
    await syncAppBadge(3)
    expect(navigator.setAppBadge).toHaveBeenCalledWith(3)

    await syncAppBadge(0)
    expect(navigator.clearAppBadge).toHaveBeenCalled()
  })

  it("clearAppBadge calls navigator.clearAppBadge", async () => {
    await clearAppBadge()
    expect(navigator.clearAppBadge).toHaveBeenCalled()
  })
})

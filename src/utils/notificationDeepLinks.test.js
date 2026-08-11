import { describe, expect, it } from "vitest"
import {
  buildLightPointDashboardPath,
  resolveNotificationNavigateTarget,
} from "./notificationDeepLinks"

describe("buildLightPointDashboardPath", () => {
  it("builds query with comune, palo and coords", () => {
    expect(
      buildLightPointDashboardPath({
        townHallName: "Alba",
        numeroPalo: "12",
        lat: "44.7",
        lng: "8.0",
      }),
    ).toBe("/dashboard?comune=Alba&focusPalo=12&focusLat=44.7&focusLng=8.0")
  })

  it("returns bare dashboard without params", () => {
    expect(buildLightPointDashboardPath()).toBe("/dashboard")
  })
})

describe("resolveNotificationNavigateTarget", () => {
  it("uses deep url as-is", () => {
    expect(
      resolveNotificationNavigateTarget({
        url: "/quote/abc/review",
        meta: {},
      }),
    ).toBe("/quote/abc/review")
  })

  it("rebuilds dashboard focus from meta when url is bare", () => {
    expect(
      resolveNotificationNavigateTarget({
        url: "/dashboard",
        meta: {
          townHallName: "Alba",
          numeroPalo: "7",
          lat: "1",
          lng: "2",
        },
      }),
    ).toBe("/dashboard?comune=Alba&focusPalo=7&focusLat=1&focusLng=2")
  })

  it("keeps dashboard url that already has query", () => {
    expect(
      resolveNotificationNavigateTarget({
        url: "/dashboard?comune=Alba&focusPalo=3",
      }),
    ).toBe("/dashboard?comune=Alba&focusPalo=3")
  })
})

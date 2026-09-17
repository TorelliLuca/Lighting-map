import { describe, expect, it } from "vitest"
import {
  TOWN_HALL_ACCESS_DENIED_MESSAGE,
  canUserAccessComune,
  isTownHallAccessDeniedError,
} from "./townHallAccess"

describe("townHallAccess", () => {
  it("allows SUPER_ADMIN for any comune", () => {
    expect(
      canUserAccessComune({ user_type: "SUPER_ADMIN", town_halls_list: [] }, "Altro"),
    ).toBe(true)
  })

  it("allows only associated town halls for normal users", () => {
    const user = {
      user_type: "MAINTAINER",
      town_halls_list: [{ name: "Modena" }, { name: "Reggio Emilia" }],
    }
    expect(canUserAccessComune(user, "Modena")).toBe(true)
    expect(canUserAccessComune(user, "modena")).toBe(true)
    expect(canUserAccessComune(user, "Bologna")).toBe(false)
  })

  it("denies when town_halls_list has only ObjectIds (no names)", () => {
    const user = {
      user_type: "MAINTAINER",
      town_halls_list: ["6874b3753ad9ca3c10eb4485"],
    }
    expect(canUserAccessComune(user, "Modena")).toBe(false)
  })

  it("denies when town_halls_list is empty", () => {
    expect(
      canUserAccessComune({ user_type: "MAINTAINER", town_halls_list: [] }, "Modena"),
    ).toBe(false)
  })

  it("detects backend 403 town-hall denial", () => {
    expect(
      isTownHallAccessDeniedError({
        response: { status: 403, data: { error: TOWN_HALL_ACCESS_DENIED_MESSAGE } },
      }),
    ).toBe(true)
    expect(
      isTownHallAccessDeniedError({
        response: { status: 403, data: { error: "Accesso negato, non possiedi i diritti necessari!" } },
      }),
    ).toBe(false)
  })
})

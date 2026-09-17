import { describe, expect, it } from "vitest"
import {
  getVisibleActions,
  getPrimaryAction,
  getSecondaryActions,
  getOverflowActions,
} from "./infoWindowActions"

const inspectableMarker = {
  marker: "PL",
  segnalazioni_in_corso: [
    { is_solved: false, maintenance_category: "ORDINARY", workflow_status: "OPEN" },
  ],
}

const operableMarker = {
  marker: "PL",
  segnalazioni_in_corso: [
    { is_solved: false, maintenance_category: "ORDINARY", workflow_status: "SCHEDULED" },
  ],
}

describe("getVisibleActions", () => {
  it("always includes wildcard overflow actions for any role", () => {
    const ids = getVisibleActions(undefined, "DEFAULT_USER").map((a) => a.id)
    expect(ids).toContain("streetview")
    expect(ids).toContain("goto")
    expect(ids).toContain("segnala")
    expect(ids).not.toContain("modifica")
    expect(ids).not.toContain("sopralluogo")
  })

  it("shows sopralluogo for maintainer with inspectable report", () => {
    const ids = getVisibleActions(undefined, "MAINTAINER", inspectableMarker).map(
      (a) => a.id
    )
    expect(ids).toContain("sopralluogo")
    expect(ids).not.toContain("segnala")
    expect(ids).not.toContain("operazione")
  })

  it("shows direct sopralluogo for maintainer without open report", () => {
    const ids = getVisibleActions(undefined, "MAINTAINER", { marker: "PL" }).map((a) => a.id)
    expect(ids).toContain("sopralluogo")
    expect(ids).not.toContain("segnala")
  })

  it("hides operazione for administrator even with operable report", () => {
    const ids = getVisibleActions(undefined, "ADMINISTRATOR", operableMarker).map(
      (a) => a.id
    )
    expect(ids).not.toContain("operazione")
    expect(ids).not.toContain("sopralluogo")
  })

  it("shows surveyor edit actions for SUPER_ADMIN", () => {
    const ids = getVisibleActions(undefined, "SUPER_ADMIN", {
      marker: "PL",
      parent: "qe-1",
    }).map((a) => a.id)
    expect(ids).toContain("modifica")
    expect(ids).toContain("duplica")
    expect(ids).toContain("elimina")
    expect(ids).toContain("clear_parent")
  })

  it("hides set_parent for QE and clear_parent without parent", () => {
    const qeIds = getVisibleActions(undefined, "SURVEYOR", { marker: "QE" }).map(
      (a) => a.id
    )
    expect(qeIds).not.toContain("set_parent")
    expect(qeIds).not.toContain("clear_parent")

    const plIds = getVisibleActions(undefined, "SURVEYOR", { marker: "PL" }).map(
      (a) => a.id
    )
    expect(plIds).toContain("set_parent")
    expect(plIds).not.toContain("clear_parent")
  })
})

describe("getPrimaryAction / getSecondaryActions / getOverflowActions", () => {
  it("prefers sopralluogo as primary without segnala secondary", () => {
    const visible = getVisibleActions(undefined, "MAINTAINER", inspectableMarker)
    const primary = getPrimaryAction(visible)
    expect(primary?.id).toBe("sopralluogo")

    const secondary = getSecondaryActions(visible, primary)
    expect(secondary.map((a) => a.id)).toEqual([])

    const overflow = getOverflowActions(visible, primary, secondary)
    expect(overflow.map((a) => a.id)).not.toContain("sopralluogo")
  })

  it("uses operazione as primary when available", () => {
    const visible = getVisibleActions(undefined, "MAINTAINER", operableMarker)
    const primary = getPrimaryAction(visible)
    expect(primary?.id).toBe("operazione")
    // Manutentore: niente Segnala; resta il sopralluogo diretto in overflow/secondario se previsto
    expect(getSecondaryActions(visible, primary).map((a) => a.id)).toEqual([])
  })
})

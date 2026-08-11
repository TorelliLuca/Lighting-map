import { describe, expect, it, vi, afterEach } from "vitest"
import {
  transformDateToIT,
  getContractStatus,
  getExtraordinaryDueUrgency,
  getDaysRemaining,
  getReportBadgeInfo,
  canStartInspection,
  canStartOperation,
  canSubmitQuoteByRole,
  canApproveQuoteByRole,
  canManageQuotesByRole,
  computeQuoteTotalsClient,
  EXTRAORDINARY_SOON_DAYS,
  mapReportForExcelExport,
  mapOperationForExcelExport,
} from "./utils"

afterEach(() => {
  vi.useRealTimers()
})

describe("transformDateToIT", () => {
  it("returns empty string for falsy input", () => {
    expect(transformDateToIT(null)).toBe("")
    expect(transformDateToIT(undefined)).toBe("")
    expect(transformDateToIT("")).toBe("")
  })

  it("formats a valid date in Italian locale", () => {
    const formatted = transformDateToIT("2024-06-15T10:30:00.000Z")
    expect(formatted).toMatch(/2024/)
    expect(formatted).toMatch(/giugno/i)
  })
})

describe("getContractStatus", () => {
  it("returns Attivo when end date is more than 90 days away", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-01T12:00:00.000Z"))
    expect(getContractStatus("2024-06-01")).toBe("Attivo")
  })

  it("returns In scadenza within 90 days", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-01T12:00:00.000Z"))
    expect(getContractStatus("2024-02-15")).toBe("In scadenza")
  })

  it("returns Scaduto when end date is in the past", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-10T12:00:00.000Z"))
    expect(getContractStatus("2024-01-01")).toBe("Scaduto da 9 giorni")
  })
})

describe("getExtraordinaryDueUrgency / getDaysRemaining", () => {
  it("returns none for missing or invalid dates", () => {
    expect(getExtraordinaryDueUrgency(null)).toBe("none")
    expect(getExtraordinaryDueUrgency("not-a-date")).toBe("none")
    expect(getDaysRemaining(null)).toBeNull()
    expect(getDaysRemaining("not-a-date")).toBeNull()
  })

  it("classifies overdue, soon and ok", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-06-10T12:00:00.000Z"))

    expect(getExtraordinaryDueUrgency("2024-06-08")).toBe("overdue")
    expect(getExtraordinaryDueUrgency("2024-06-12")).toBe("soon")
    expect(getExtraordinaryDueUrgency("2024-06-20")).toBe("ok")
    expect(getDaysRemaining("2024-06-13")).toBe(3)
    expect(EXTRAORDINARY_SOON_DAYS).toBe(3)
  })
})

describe("getReportBadgeInfo", () => {
  it("returns empty badge when there are no active reports", () => {
    expect(getReportBadgeInfo([])).toEqual({
      hasReport: false,
      type: null,
      count: 0,
      dueUrgency: "none",
    })
    expect(getReportBadgeInfo([{ is_solved: true }])).toEqual({
      hasReport: false,
      type: null,
      count: 0,
      dueUrgency: "none",
    })
  })

  it("prefers extraordinary over ordinary", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-06-10T12:00:00.000Z"))

    const info = getReportBadgeInfo([
      { is_solved: false, maintenance_category: "ORDINARY" },
      {
        is_solved: false,
        maintenance_category: "EXTRAORDINARY",
        due_date: "2024-06-20",
      },
    ])

    expect(info).toMatchObject({
      hasReport: true,
      type: "extraordinary",
      count: 2,
      dueUrgency: "ok",
      dueDate: "2024-06-20",
    })
  })

  it("detects ordinary reports", () => {
    expect(
      getReportBadgeInfo([{ is_solved: false, maintenance_category: "ORDINARY" }])
    ).toEqual({
      hasReport: true,
      type: "ordinary",
      count: 1,
      dueUrgency: "none",
    })
  })

  it("shows extraordinary pentagon for PENDING_QUOTE even if still ORDINARY", () => {
    expect(
      getReportBadgeInfo([
        {
          is_solved: false,
          maintenance_category: "ORDINARY",
          workflow_status: "PENDING_QUOTE",
        },
      ])
    ).toMatchObject({
      hasReport: true,
      type: "extraordinary",
      count: 1,
    })
  })

  it("shows extraordinary pentagon when linked quote is open", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-06-10T12:00:00.000Z"))

    expect(
      getReportBadgeInfo([
        {
          is_solved: false,
          maintenance_category: "ORDINARY",
          linked_quote_id: {
            status: "DRAFT",
            dueDate: "2024-06-20",
          },
        },
      ])
    ).toMatchObject({
      hasReport: true,
      type: "extraordinary",
      dueUrgency: "ok",
      dueDate: "2024-06-20",
    })
  })

  it("does not treat REJECTED linked quotes as open", () => {
    expect(
      getReportBadgeInfo([
        {
          is_solved: false,
          maintenance_category: "ORDINARY",
          linked_quote_id: { status: "REJECTED" },
        },
      ])
    ).toMatchObject({
      hasReport: true,
      type: "ordinary",
    })
  })
})

describe("canStartInspection / canStartOperation", () => {
  const inspectable = [
    { is_solved: false, maintenance_category: "ORDINARY", workflow_status: "OPEN" },
  ]
  const operable = [
    { is_solved: false, maintenance_category: "ORDINARY", workflow_status: "SCHEDULED" },
  ]

  it("allows inspection only for maintainer roles with inspectable report", () => {
    expect(canStartInspection("MAINTAINER", inspectable)).toBe(true)
    expect(canStartInspection("SUPER_ADMIN", inspectable)).toBe(true)
    expect(canStartInspection("ADMINISTRATOR", inspectable)).toBe(false)
    expect(canStartInspection("MAINTAINER", operable)).toBe(false)
  })

  it("allows operation for staff with operable report", () => {
    expect(canStartOperation("MAINTAINER", operable)).toBe(true)
    expect(canStartOperation("ADMINISTRATOR", operable)).toBe(false)
    expect(canStartOperation("SUPER_ADMIN", operable)).toBe(true)
    expect(canStartOperation("DEFAULT_USER", operable)).toBe(false)
    expect(canStartOperation("MAINTAINER", inspectable)).toBe(false)
  })
})

describe("quote role helpers", () => {
  it("canSubmitQuoteByRole", () => {
    expect(canSubmitQuoteByRole(null)).toBe(false)
    expect(canSubmitQuoteByRole({ user_type: "SUPER_ADMIN" })).toBe(true)
    expect(
      canSubmitQuoteByRole({ user_type: "MAINTAINER", sub_role: "LEAD_MAINTAINER" })
    ).toBe(true)
    expect(
      canSubmitQuoteByRole({ user_type: "MAINTAINER", sub_role: "MAINTAINER" })
    ).toBe(false)
    expect(canSubmitQuoteByRole({ user_type: "ADMINISTRATOR", sub_role: "DEC" })).toBe(
      false
    )
  })

  it("canApproveQuoteByRole", () => {
    expect(canApproveQuoteByRole(null)).toBe(false)
    expect(canApproveQuoteByRole({ user_type: "SUPER_ADMIN" })).toBe(true)
    expect(
      canApproveQuoteByRole({ user_type: "ADMINISTRATOR", sub_role: "RUP" })
    ).toBe(true)
    expect(
      canApproveQuoteByRole({ user_type: "ADMINISTRATOR", sub_role: "DEC" })
    ).toBe(true)
    expect(
      canApproveQuoteByRole({ user_type: "ADMINISTRATOR", sub_role: "OTHER" })
    ).toBe(false)
    expect(canApproveQuoteByRole({ user_type: "MAINTAINER" })).toBe(false)
  })

  it("canManageQuotesByRole", () => {
    expect(canManageQuotesByRole(null)).toBe(false)
    expect(canManageQuotesByRole({ user_type: "MAINTAINER" })).toBe(true)
    expect(canManageQuotesByRole({ user_type: "SUPER_ADMIN" })).toBe(true)
    expect(canManageQuotesByRole({ user_type: "ADMINISTRATOR" })).toBe(false)
  })
})

describe("computeQuoteTotalsClient", () => {
  it("computes subtotal, safety charge, discount and total", () => {
    const result = computeQuoteTotalsClient(
      [
        { quantity: 2, unitPrice: 100 },
        { quantity: 1, unitPrice: 50 },
      ],
      0.02,
      10
    )

    expect(result).toEqual({
      subtotal: 250,
      safetyAmount: 5,
      discountAmount: 25.5,
      total: 229.5,
    })
  })

  it("handles empty line items", () => {
    expect(computeQuoteTotalsClient([])).toEqual({
      subtotal: 0,
      safetyAmount: 0,
      discountAmount: 0,
      total: 0,
    })
  })
})

describe("mapReportForExcelExport", () => {
  it("maps workflow fields and skips ObjectId / versioning fields", () => {
    const row = mapReportForExcelExport(
      {
        _id: "rep1",
        __v: 0,
        report_date: "2024-06-15T10:30:00.000Z",
        report_time: "12:30",
        fault_label: "LIGHT_POINT_OFF",
        description: "Spento",
        maintenance_category: "EXTRAORDINARY",
        workflow_status: "PENDING_QUOTE",
        risk_class: "B",
        is_solved: false,
        due_date: "2024-07-01T00:00:00.000Z",
        scheduled_resolution_date: null,
        classification: { status: "PROVISIONAL", proposedBy: "userObjId" },
        plant_context: { quadroId: "qeObjId", quadroLabel: "QE-1" },
        suspension: { reason: "Pezzo", days: 5, suspendedAt: null, suspendedBy: "userObjId" },
        linked_quote_id: { protocolNumber: "IMS-42", _id: "quoteObjId" },
        parent_report_id: "parentObjId",
        town_hall_id: "thObjId",
        status_history: [{ status: "OPEN", by: "userObjId" }],
        user_creator_id: { name: "Mario", surname: "Rossi" },
        user_responsible_id: "responsibleObjId",
      },
      { comune: "Roma", numeroPalo: "12", indirizzo: "Via Roma 1" }
    )

    expect(row.COMUNE).toBe("Roma")
    expect(row.NUMERO_PALO).toBe("12")
    expect(row.ORA_SEGNALAZIONE).toBe("12:30")
    expect(row.CATEGORIA_MANUTENZIONE).toBe("Straordinaria")
    expect(row.STATO_WORKFLOW).toBe("In attesa preventivo")
    expect(row.CLASSE_RISCHIO).toBe("B")
    expect(row.STATO_CLASSIFICAZIONE).toBe("Provvisoria")
    expect(row.QUADRO).toBe("QE-1")
    expect(row.MOTIVO_SOSPENSIONE).toBe("Pezzo")
    expect(row.GIORNI_SOSPENSIONE).toBe(5)
    expect(row.NUMERO_PREVENTIVO).toBe("IMS-42")
    expect(row.RISOLTA).toBe("No")
    expect(row.SEGNALATORE).toBe("Mario Rossi")
    expect(row.OPERATORE).toBe("")
    expect(row).not.toHaveProperty("_id")
    expect(row).not.toHaveProperty("__v")
    expect(row).not.toHaveProperty("parent_report_id")
    expect(row).not.toHaveProperty("status_history")
  })
})

describe("mapOperationForExcelExport", () => {
  it("maps maintenance type and excludes ObjectId refs", () => {
    const row = mapOperationForExcelExport(
      {
        _id: "op1",
        __v: 0,
        operation_date: "2024-06-15T10:30:00.000Z",
        operation_type: "OTHER",
        maintenance_type: "ORDINARY",
        note: "Controllo",
        is_solved: true,
        operation_point_id: "lpObjId",
        report_to_solve: "repObjId",
        operation_responsible: { name: "Luca", surname: "Bianchi" },
      },
      { comune: "Roma", numeroPalo: "12", indirizzo: "Via Roma 1" }
    )

    expect(row.TIPO_MANUTENZIONE).toBe("Ordinaria")
    expect(row.RISOLTA).toBe("Sì")
    expect(row.RESPONSABILE_OPERAZIONE).toBe("Luca Bianchi")
    expect(row).not.toHaveProperty("_id")
    expect(row).not.toHaveProperty("operation_point_id")
    expect(row).not.toHaveProperty("report_to_solve")
  })
})

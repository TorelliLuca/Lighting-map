import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QuoteStatusBadge } from "./QuoteStatusBadge"
import { DueStatusBadge, compareDueUrgency } from "./DueStatusBadge"
import { WorkflowStatusBadge } from "./WorkflowStatusBadge"
import { RiskClassBadge, RISK_CLASS_STYLES } from "./RiskClassBadge"
import ConfirmDialog from "./ConfirmDialog"

describe("QuoteStatusBadge", () => {
  it("renders nothing without status", () => {
    const { container } = render(<QuoteStatusBadge status={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders known quote status label", () => {
    render(<QuoteStatusBadge status="APPROVED" />)
    expect(screen.getByText("Approvato")).toBeInTheDocument()
  })

  it("falls back to raw status text", () => {
    render(<QuoteStatusBadge status="CUSTOM" />)
    expect(screen.getByText("CUSTOM")).toBeInTheDocument()
  })
})

describe("DueStatusBadge", () => {
  it("renders overdue label", () => {
    render(<DueStatusBadge dueStatus="overdue" />)
    expect(screen.getByText("Scaduta")).toBeInTheDocument()
  })

  it("includes days remaining when provided", () => {
    render(<DueStatusBadge dueStatus="soon" daysRemaining={2} />)
    expect(screen.getByText("2 gg — In scadenza")).toBeInTheDocument()
  })

  it("compareDueUrgency orders overdue before soon", () => {
    expect(compareDueUrgency("overdue", "soon")).toBeLessThan(0)
    expect(compareDueUrgency("ok", "soon")).toBeGreaterThan(0)
  })
})

describe("WorkflowStatusBadge", () => {
  it("renders dash when status missing", () => {
    render(<WorkflowStatusBadge status={null} />)
    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("renders workflow label", () => {
    render(<WorkflowStatusBadge status="PENDING_QUOTE" />)
    expect(screen.getByText("In attesa preventivo")).toBeInTheDocument()
  })
})

describe("RiskClassBadge", () => {
  it("renders dash when class missing", () => {
    render(<RiskClassBadge riskClass={null} />)
    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("applies risk style for class A", () => {
    const { container } = render(<RiskClassBadge riskClass="A" />)
    expect(screen.getByText("A")).toBeInTheDocument()
    expect(container.firstChild.className).toContain(RISK_CLASS_STYLES.A.split(" ")[0])
  })

  it("supports Classe prefix", () => {
    render(<RiskClassBadge riskClass="B" prefix />)
    expect(screen.getByText("Classe B")).toBeInTheDocument()
  })
})

describe("ConfirmDialog", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <ConfirmDialog isOpen={false} onConfirm={() => {}} onCancel={() => {}} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("calls onConfirm and onCancel", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <ConfirmDialog
        isOpen
        title="Eliminare?"
        confirmLabel="Conferma"
        cancelLabel="Annulla"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Eliminare?")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Conferma" }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole("button", { name: "Annulla" }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

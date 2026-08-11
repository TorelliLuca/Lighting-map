import { test, expect } from "@playwright/test"
import {
  ADMIN_AUTH_FILE,
  MAINTAINER_AUTH_FILE,
} from "./fixtures/auth.js"
import {
  createDraftQuote,
  createQuoteFlowClients,
  deleteQuote,
  getQuote,
  getQuoteFlowCredentialsOrNull,
  submitQuote,
} from "./fixtures/quotes.js"

const hasQuoteFlowCreds = Boolean(getQuoteFlowCredentialsOrNull())

test.describe("quote rejection flow", () => {
  test.describe.configure({ mode: "serial" })

  test.skip(!hasQuoteFlowCreds, "Richiede E2E_MAINTAINER_* e E2E_ADMIN_* in .env.e2e")

  /** @type {import("./fixtures/api.js").ReturnType<typeof import("./fixtures/api.js").createApiClient>} */
  let maintainerApi
  let quoteId
  let contestedDescription

  test.beforeAll(async () => {
    const clients = await createQuoteFlowClients()
    maintainerApi = clients.maintainer

    const draft = await createDraftQuote(clients.maintainer, clients.maintainerUser)
    quoteId = draft._id
    contestedDescription = draft.lineItems[0].description

    await submitQuote(maintainerApi, quoteId)
    const pending = await getQuote(maintainerApi, quoteId)
    expect(pending.status).toBe("PENDING_APPROVAL")
  })

  test.afterAll(async () => {
    if (quoteId && maintainerApi) {
      await deleteQuote(maintainerApi, quoteId).catch(() => {})
    }
  })

  test("DEC respinge con voce contestata e motivo generale", async ({ browser }) => {
    const context = await browser.newContext({ storageState: ADMIN_AUTH_FILE })
    const page = await context.newPage()

    await page.goto(`quote/${quoteId}/review`)
    await expect(page.getByRole("heading", { name: /Revisione preventivo/i })).toBeVisible({
      timeout: 20_000,
    })

    await page.getByRole("button", { name: /Respingi per revisione/i }).click()
    await page.getByLabel("Contesta voce 1").check()
    await page.getByPlaceholder("Motivo contestazione voce 1 *").fill("Prezzo non giustificato per e2e")
    await page.locator("#quote-reject-reason").fill("Verificare tempistiche e costi indicati")
    await page.getByRole("button", { name: /Conferma respingimento/i }).click()

    await expect(page.getByRole("heading", { name: /Preventivo da revisionare/i })).toBeVisible({
      timeout: 20_000,
    })

    await context.close()

    const rejected = await getQuote(maintainerApi, quoteId)
    expect(rejected.status).toBe("NEEDS_REVISION")
    expect(rejected.rejectedReason).toContain("Verificare tempistiche")
    expect(rejected.lineItems[0].isContested).toBe(true)
    expect(rejected.lineItems[0].contestNote).toMatch(/Prezzo non giustificato/)
    expect(rejected.lineItems[1].isContested).toBe(false)
  })

  test("manutentore corregge la voce contestata e reinvia", async ({ browser }) => {
    const context = await browser.newContext({ storageState: MAINTAINER_AUTH_FILE })
    const page = await context.newPage()

    await page.goto(`quote/${quoteId}`)
    await expect(page.getByText(/Preventivo respinto dal DEC/i)).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText(/1 voce contestata/i)).toBeVisible()

    const descriptionInput = page.getByLabel("Descrizione voce 1").locator("visible=true")
    await expect(descriptionInput).toBeVisible()
    await descriptionInput.fill(`${contestedDescription} — corretto e2e`)

    const saveResponse = page.waitForResponse(
      (res) => res.request().method() === "PATCH" && res.url().includes(`/api/quotes/${quoteId}`),
      { timeout: 20_000 }
    )
    await page.getByRole("button", { name: /Salva bozza/i }).click()
    await saveResponse
    await expect(page.getByText(/Modifiche non salvate/i)).not.toBeVisible({ timeout: 15_000 })

    const submitButton = page.getByRole("button", { name: /Invia in approvazione/i })
    await expect(submitButton).toBeEnabled({ timeout: 10_000 })

    const submitResponse = page.waitForResponse(
      (res) => res.request().method() === "POST" && res.url().includes(`/api/quotes/${quoteId}/submit`),
      { timeout: 20_000 }
    )
    await submitButton.click()
    await submitResponse
    await expect(page.getByText(/In approvazione/i).first()).toBeVisible({ timeout: 20_000 })

    await context.close()

    const resubmitted = await getQuote(maintainerApi, quoteId)
    expect(resubmitted.status).toBe("PENDING_APPROVAL")
    expect(resubmitted.rejectedReason).toBe("")
    expect(resubmitted.lineItems.every((item) => !item.isContested)).toBe(true)
    expect(resubmitted.lineItems[0].description).toContain("corretto e2e")
  })
})

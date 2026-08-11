import { test, expect } from "@playwright/test"
import {
  createDraftQuote,
  createQuoteFlowClients,
  deleteQuote,
  getQuoteFlowCredentialsOrNull,
  requireQuoteFlowCredentials,
  submitQuote,
} from "../fixtures/quotes.js"
import {
  beat,
  clearSession,
  loginForDemo,
  polishForRecording,
  typeSlow,
} from "./helpers.js"

/**
 * Demo video: DEC respinge un preventivo contestando una voce,
 * poi il manutentore corregge e reinvia in approvazione.
 *
 * Richiede E2E_MAINTAINER_* e E2E_ADMIN_* in `.env.e2e`.
 * Esegui: npm run record:demo  (o PW_DEMO=quote-rejection)
 */
test.describe("demo quote rejection + risoluzione", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 })

  let maintainerApi
  let quoteId
  let creds

  test.beforeAll(async () => {
    if (!getQuoteFlowCredentialsOrNull()) {
      throw new Error(
        "Demo quote-rejection: imposta in `.env.e2e` E2E_MAINTAINER_EMAIL, E2E_MAINTAINER_PASSWORD, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD (titolare manutentore + DEC/RUP sullo stesso comune). Vedi `.env.e2e.example`."
      )
    }
    creds = requireQuoteFlowCredentials()
    const clients = await createQuoteFlowClients(creds)
    maintainerApi = clients.maintainer

    const draft = await createDraftQuote(clients.maintainer, clients.maintainerUser, {
      notes: "Creato da demo video quote-rejection",
    })
    quoteId = draft._id
    await submitQuote(maintainerApi, quoteId)
  })

  test.afterAll(async () => {
    if (quoteId && maintainerApi) {
      await deleteQuote(maintainerApi, quoteId).catch(() => {})
    }
  })

  test("registra rigetto DEC e correzione manutentore", async ({ page }) => {
    // --- Parte 1: DEC / admin respinge contestando la voce 1 ---
    await loginForDemo(page, creds.admin)

    await page.goto(`quote/${quoteId}/review`)
    await polishForRecording(page)
    await expect(page.getByRole("heading", { name: /Revisione preventivo/i })).toBeVisible({
      timeout: 20_000,
    })
    await beat(page, 1400)

    const lineItemsHeading = page.getByText("Voci preventivo")
    await lineItemsHeading.scrollIntoViewIfNeeded()
    await beat(page, 1000)

    await page.getByRole("button", { name: /Respingi per revisione/i }).scrollIntoViewIfNeeded()
    await beat(page, 600)
    await page.getByRole("button", { name: /Respingi per revisione/i }).click()
    await beat(page, 900)

    await page.getByLabel("Contesta voce 1").scrollIntoViewIfNeeded()
    await page.getByLabel("Contesta voce 1").check()
    await beat(page, 700)

    const contestNote = page.getByPlaceholder("Motivo contestazione voce 1 *")
    await contestNote.click()
    await typeSlow(contestNote, "Prezzo non giustificato rispetto al capitolato", 35)
    await beat(page, 600)

    await page.locator("#quote-reject-reason").scrollIntoViewIfNeeded()
    await typeSlow(
      page.locator("#quote-reject-reason"),
      "Verificare tempistiche e costi della prima voce",
      35
    )
    await beat(page, 800)

    await page.getByRole("button", { name: /Conferma respingimento/i }).click()
    await expect(page.getByRole("heading", { name: /Preventivo da revisionare/i })).toBeVisible({
      timeout: 20_000,
    })
    await beat(page, 1600)

    // --- Parte 2: manutentore corregge e reinvia ---
    await clearSession(page)
    await loginForDemo(page, creds.maintainer, { slow: true })

    await page.goto(`quote/${quoteId}`)
    await polishForRecording(page)
    await expect(page.getByText(/Preventivo respinto dal DEC/i)).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText(/1 voce contestata/i)).toBeVisible()
    await beat(page, 1400)

    const descriptionInput = page.getByLabel("Descrizione voce 1").locator("visible=true")
    await descriptionInput.scrollIntoViewIfNeeded()
    await beat(page, 700)
    await descriptionInput.click()
    // Testo breve: pressSequentially su descrizioni lunghe sforava il timeout con slowMo
    await typeSlow(descriptionInput, "Voce corretta — prezzo riallineato al capitolato", 28)
    await beat(page, 900)

    const saveResponse = page.waitForResponse(
      (res) => res.request().method() === "PATCH" && res.url().includes(`/api/quotes/${quoteId}`),
      { timeout: 20_000 }
    )
    await page.getByRole("button", { name: /Salva bozza/i }).scrollIntoViewIfNeeded()
    await page.getByRole("button", { name: /Salva bozza/i }).click()
    await saveResponse
    await expect(page.getByText(/Modifiche non salvate/i)).not.toBeVisible({ timeout: 15_000 })
    await beat(page, 900)

    const submitButton = page.getByRole("button", { name: /Invia in approvazione/i })
    await expect(submitButton).toBeEnabled({ timeout: 10_000 })
    await submitButton.scrollIntoViewIfNeeded()
    await beat(page, 600)

    const submitResponse = page.waitForResponse(
      (res) =>
        res.request().method() === "POST" && res.url().includes(`/api/quotes/${quoteId}/submit`),
      { timeout: 20_000 }
    )
    await submitButton.click()
    await submitResponse
    await expect(page.getByText(/In approvazione/i).first()).toBeVisible({ timeout: 20_000 })
    await beat(page, 1600)
  })
})

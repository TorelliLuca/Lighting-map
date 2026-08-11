import { test } from "@playwright/test"
import { expectLoginForm } from "./fixtures/auth.js"

test.describe("smoke health", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("pagina login carica il form", async ({ page }) => {
    await page.goto("login")
    await expectLoginForm(page)
  })
})

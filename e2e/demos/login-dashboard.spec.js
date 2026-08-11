import { test, expect } from "@playwright/test"
import { requireE2ECredentials } from "../fixtures/auth.js"
import { beat, polishForRecording, typeSlow } from "./helpers.js"

/**
 * Demo video: login → dashboard → Straordinarie → torna in dashboard.
 * Esegui con: npm run record:demo
 */
test.describe("demo login + dashboard", () => {
  test("registra flusso login e navigazione", async ({ page }) => {
    const { email, password } = requireE2ECredentials()

    await page.goto("login")
    await polishForRecording(page)
    await expect(page.locator("#email")).toBeVisible({ timeout: 15_000 })
    await beat(page, 1200)

    await typeSlow(page.locator("#email"), email)
    await beat(page, 400)
    await typeSlow(page.locator("#password"), password, 40)
    await beat(page, 700)

    await page.locator('button[type="submit"]').click()
    await page.waitForURL("**/dashboard**", { timeout: 25_000 })
    await polishForRecording(page)
    await expect(page).toHaveURL(/dashboard/i)
    await beat(page, 1800)

    await page.goto("extraordinary")
    await polishForRecording(page)
    await expect(page.getByRole("heading", { name: /Straordinarie/i })).toBeVisible({
      timeout: 15_000,
    })
    await beat(page, 1600)

    await page.goto("dashboard")
    await polishForRecording(page)
    await expect(page).toHaveURL(/dashboard/i)
    await beat(page, 1400)
  })
})

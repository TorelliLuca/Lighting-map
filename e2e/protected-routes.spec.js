import { test, expect } from "@playwright/test"
import { expectLoginForm } from "./fixtures/auth.js"

test.describe("protected routes", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("dashboard senza token reindirizza al login", async ({ page }) => {
    await page.goto("dashboard")
    // App may send anonymous users to /login or to base "/"
    await page.waitForURL(/\/(login\/?)?$/, { timeout: 15_000 })
    await expectLoginForm(page)
  })
})

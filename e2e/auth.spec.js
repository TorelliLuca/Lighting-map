import { test, expect } from "@playwright/test"
import { expectLoginForm, loginViaForm, requireE2ECredentials } from "./fixtures/auth.js"

test.describe("auth", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("login valido apre la dashboard", async ({ page }) => {
    requireE2ECredentials()
    await loginViaForm(page)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test("login invalido resta sul form", async ({ page }) => {
    await page.goto("login")
    await page.locator("#email").fill("e2e-invalid@example.com")
    await page.locator("#password").fill("wrong-password-e2e")
    await page.locator('button[type="submit"]').click()

    await expectLoginForm(page)
    await expect(page).not.toHaveURL(/\/dashboard/)
    await expect(page.locator("form .text-red-200, form .text-sm").last()).toBeVisible({
      timeout: 10_000,
    })
  })
})

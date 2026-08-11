import { test, expect } from "@playwright/test"

test.describe("roles", () => {
  test("gate su approvazione preventivi rispetta il ruolo", async ({ page }) => {
    await page.goto("quotes/approval")

    const expectation = (process.env.E2E_APPROVAL_EXPECTATION || "").trim()

    if (expectation === "can_approve") {
      await expect(
        page.getByRole("heading", { name: /Approvazione preventivi IMS/i })
      ).toBeVisible({ timeout: 15_000 })
      return
    }

    if (expectation === "cannot_approve") {
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
      return
    }

    // Senza expectation: o landing su approval (con possibile errore comune) o redirect dashboard
    await Promise.race([
      page
        .getByRole("heading", { name: /Approvazione preventivi IMS/i })
        .waitFor({ timeout: 15_000 }),
      page.waitForURL(/\/dashboard/, { timeout: 15_000 }),
    ])
  })
})

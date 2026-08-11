import { test, expect } from "@playwright/test"

test.describe("navigation", () => {
  test("report mostra stato di caricamento o form senza crash", async ({ page }) => {
    await page.goto("report")
    await expect(
      page.getByText(/Caricamento punto luce|Segnala guasto|Verifica in corso/i).first()
    ).toBeVisible({ timeout: 15_000 })
  })

  test("extraordinary apre la pagina Straordinarie", async ({ page }) => {
    await page.goto("extraordinary")
    await expect(page.getByRole("heading", { name: /Straordinarie/i })).toBeVisible({
      timeout: 15_000,
    })
  })
})

import { test as setup } from "@playwright/test"
import { AUTH_FILE, ensureAuthDir, loginViaForm, requireE2ECredentials } from "./fixtures/auth.js"

setup("authenticate", async ({ page }) => {
  requireE2ECredentials()
  await ensureAuthDir()
  await loginViaForm(page)
  await page.context().storageState({ path: AUTH_FILE })
})

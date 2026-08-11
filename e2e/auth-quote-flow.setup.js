import { test as setup } from "@playwright/test"
import {
  ensureAuthDir,
  loginViaForm,
  MAINTAINER_AUTH_FILE,
  ADMIN_AUTH_FILE,
} from "./fixtures/auth.js"
import { getQuoteFlowCredentialsOrNull } from "./fixtures/quotes.js"

const creds = getQuoteFlowCredentialsOrNull()

setup("maintainer auth for quote flow", async ({ page }) => {
  setup.skip(!creds, "Credenziali quote flow non configurate")

  await ensureAuthDir()
  await loginViaForm(page, creds.maintainer)
  await page.context().storageState({ path: MAINTAINER_AUTH_FILE })
})

setup("admin auth for quote flow", async ({ page }) => {
  setup.skip(!creds, "Credenziali quote flow non configurate")

  await ensureAuthDir()
  await loginViaForm(page, creds.admin)
  await page.context().storageState({ path: ADMIN_AUTH_FILE })
})

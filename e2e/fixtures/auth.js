import { expect } from "@playwright/test"
import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "node:fs"

const dirname = path.dirname(fileURLToPath(import.meta.url))
export const AUTH_FILE = path.join(dirname, "../.auth/user.json")
export const AUTH_DIR = path.join(dirname, "../.auth")
export const MAINTAINER_AUTH_FILE = path.join(AUTH_DIR, "maintainer.json")
export const ADMIN_AUTH_FILE = path.join(AUTH_DIR, "admin.json")

export function requireE2ECredentials() {
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD
  if (!email || !password) {
    throw new Error(
      "Imposta E2E_EMAIL e E2E_PASSWORD in `.env.e2e` (vedi `.env.e2e.example`)."
    )
  }
  return { email, password }
}

/** Login via form (selettori allineati a scripts/login-dev-profiles.mjs). */
export async function loginViaForm(page, { email, password } = requireE2ECredentials()) {
  // Relative to baseURL path (/LIGHTING-MAP/); leading "/" would hit origin root.
  await page.goto("login")
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL("**/dashboard**", { timeout: 20_000 })
}

export async function ensureAuthDir() {
  const dir = path.dirname(AUTH_FILE)
  fs.mkdirSync(dir, { recursive: true })
}

export async function expectLoginForm(page) {
  await expect(page.locator("#email")).toBeVisible()
  await expect(page.locator("#password")).toBeVisible()
}

import { defineConfig, devices } from "@playwright/test"
import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "node:fs"

const dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(dirname, ".env.e2e")
const authFile = path.join(dirname, "e2e/.auth/user.json")

if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, "utf8")
  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5174/LIGHTING-MAP/"
const isRecording = process.env.PW_RECORD === "1"

const e2eProjects = [
  {
    name: "chromium-anon",
    testMatch: /smoke-health\.spec\.js|auth\.spec\.js|protected-routes\.spec\.js/,
    use: {
      ...devices["Desktop Chrome"],
      storageState: { cookies: [], origins: [] },
    },
  },
  {
    name: "setup",
    testMatch: /auth\.setup\.js/,
  },
  {
    name: "chromium",
    testMatch: /navigation\.spec\.js|roles\.spec\.js/,
    dependencies: ["setup"],
    use: {
      ...devices["Desktop Chrome"],
      storageState: authFile,
    },
  },
  {
    name: "quote-flow-setup",
    testMatch: /auth-quote-flow\.setup\.js/,
  },
  {
    name: "chromium-quotes",
    testMatch: /quote-rejection\.spec\.js/,
    dependencies: ["quote-flow-setup"],
    use: {
      ...devices["Desktop Chrome"],
    },
  },
]

/** Solo con `npm run record:demo` (PW_RECORD=1). Non gira in `test:e2e`. */
const recordingProjects = [
  {
    name: "recordings",
    testMatch: /demos\/.*\.spec\.js/,
    timeout: 180_000,
    use: {
      ...devices["Desktop Chrome"],
      headless: true,
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      video: {
        mode: "on",
        size: { width: 1280, height: 720 },
      },
      screenshot: "off",
      trace: "off",
      launchOptions: {
        slowMo: Number(process.env.PW_SLOWMO || 90),
      },
      storageState: { cookies: [], origins: [] },
    },
  },
]

export default defineConfig({
  testDir: "e2e",
  fullyParallel: !isRecording,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: isRecording ? 1 : process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: isRecording ? "videos/raw" : "test-results",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "it-IT",
  },
  projects: isRecording ? recordingProjects : e2eProjects,
  webServer: {
    command: "npm run dev -- --host localhost --port 5174",
    url: baseURL.endsWith("/") ? baseURL : `${baseURL}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})

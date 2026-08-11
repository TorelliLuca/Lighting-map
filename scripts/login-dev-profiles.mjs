/**
 * Apre 1–3 finestre Chrome (profili isolati) e fa login automatico.
 *
 * Uso:
 *   npm run login:dev              → tutti e 3 i profili
 *   npm run login:dev -- 1         → solo profilo 1 (prova@2.com)
 *   DEV_URL=http://localhost:5173 npm run login:dev
 */
import { chromium } from "playwright";
import os from "node:os";
import path from "node:path";

const BASE_URL = process.env.DEV_URL || "http://localhost:5174/LIGHTING-MAP";
const PASSWORD = "giocoso";

const ALL_PROFILES = [
  { id: 1, email: "prova@2.com" },
  { id: 2, email: "prova@3.com" },
  { id: 3, email: "prova@4.com" },
];

const selectedId = process.argv[2] ? Number(process.argv[2]) : null;
const profiles = selectedId
  ? ALL_PROFILES.filter((p) => p.id === selectedId)
  : ALL_PROFILES;

if (profiles.length === 0) {
  console.error(`Profilo non valido: ${process.argv[2]}. Usa 1, 2 o 3.`);
  process.exit(1);
}

async function loginProfile({ id, email }) {
  const userDataDir = path.join(os.tmpdir(), `ChromeDev${id}`);
  console.log(`[Profilo ${id}] Apro ${email} → ${BASE_URL}/login`);

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chrome",
    headless: false,
    viewport: null,
    args: [`--window-position=${80 + (id - 1) * 40},${80 + (id - 1) * 40}`],
  });

  const page = context.pages()[0] || (await context.newPage());

  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.locator('button[type="submit"]').click();

  try {
    await page.waitForURL("**/dashboard**", { timeout: 20000 });
    console.log(`[Profilo ${id}] Login OK → dashboard`);
  } catch {
    const errText = await page.locator("form .text-red-200, form .text-sm").last().textContent().catch(() => null);
    console.error(`[Profilo ${id}] Login fallito o timeout.${errText ? ` ${errText.trim()}` : ""}`);
  }

  return context;
}

const contexts = await Promise.all(profiles.map(loginProfile));

console.log("Finestre aperte. Chiudile (o Ctrl+C) per terminare lo script.");
await Promise.all(
  contexts.map(
    (ctx) =>
      new Promise((resolve) => {
        ctx.on("close", resolve);
      })
  )
);

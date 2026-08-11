/**
 * Avvia Playwright in modalità registrazione video (headless).
 * Uso: npm run record:demo [-- eventuali args playwright]
 *
 * Env opzionali:
 *   PW_SLOWMO=120   — ritardo ms tra azioni (default 90)
 *   PW_DEMO=login-dashboard  — filtra una sola spec (nome file senza .spec.js)
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(dirname, "..")
const rawDir = path.join(root, "videos", "raw")

process.env.PW_RECORD = "1"

const extra = process.argv.slice(2)
const demoFilter = process.env.PW_DEMO
const args = ["test", "--project=recordings", ...extra]

if (demoFilter && !extra.some((a) => a.includes("demos"))) {
  args.push(`e2e/demos/${demoFilter}.spec.js`)
}

const result = spawnSync("npx", ["playwright", ...args], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: process.env,
})

function countWebm(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) countWebm(full, acc)
    else if (entry.name.endsWith(".webm")) acc.push(full)
  }
  return acc
}

if (result.status !== 0) {
  const partial = countWebm(rawDir)
  console.error("\nRegistrazione fallita (vedi output Playwright sopra).")
  if (partial.length > 0) {
    console.error("Video parziali comunque presenti:")
    for (const file of partial) {
      console.error(`  - ${path.relative(root, file)}`)
    }
  }
  process.exit(result.status ?? 1)
}

const videos = countWebm(rawDir)
if (videos.length === 0) {
  console.error("\nNessun .webm generato in videos/raw/.")
  console.error(
    "Se il test è skipped/fallito: controlla `.env.e2e` (per quote-rejection servono E2E_MAINTAINER_* e E2E_ADMIN_*)."
  )
  process.exit(1)
}

console.log(`\nVideo grezzi (${videos.length}):`)
for (const file of videos) {
  console.log(`  - ${path.relative(root, file)}`)
}
console.log("Per MP4: npm run record:demo:mp4")
process.exit(0)

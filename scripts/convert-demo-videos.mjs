/**
 * Converte i WebM di Playwright (videos/raw) in MP4 H.264 (videos/mp4).
 * Cerca ffmpeg nel PATH oppure in posizioni note su Windows.
 *
 * Uso: npm run record:demo:mp4
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { fileURLToPath } from "node:url"

const dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(dirname, "..")
const rawDir = path.join(root, "videos", "raw")
const outDir = path.join(root, "videos", "mp4")

function findWebm(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) findWebm(full, acc)
    else if (entry.name.endsWith(".webm")) acc.push(full)
  }
  return acc
}

function resolveFfmpeg() {
  const exe = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
  const candidates = [
    process.env.FFMPEG_PATH,
    path.join(process.env.LOCALAPPDATA || "", "ffmpeg", "bin", exe),
    path.join(os.homedir(), "AppData", "Local", "ffmpeg", "bin", exe),
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }

  const probe = spawnSync(process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg", ["-version"], {
    encoding: "utf8",
    shell: true,
  })
  if (!probe.error && probe.status === 0) {
    return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
  }

  return null
}

const ffmpegBin = resolveFfmpeg()
if (!ffmpegBin) {
  console.error(
    "ffmpeg non trovato. Installa Gyan.FFmpeg.Essentials (winget) oppure imposta FFMPEG_PATH."
  )
  console.error("Percorso atteso: %LOCALAPPDATA%\\ffmpeg\\bin\\ffmpeg.exe")
  process.exit(1)
}

const files = findWebm(rawDir)
if (files.length === 0) {
  console.error(`Nessun .webm in ${rawDir}. Esegui prima: npm run record:demo`)
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })
console.log(`Usando ffmpeg: ${ffmpegBin}`)

for (const webm of files) {
  const base = path.basename(webm, ".webm")
  const parent = path.basename(path.dirname(webm))
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")
  const outName = `${parent}-${base}-${stamp}.mp4`
  const outPath = path.join(outDir, outName)

  console.log(`→ ${path.relative(root, webm)}`)
  const result = spawnSync(
    ffmpegBin,
    [
      "-y",
      "-i",
      webm,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      outPath,
    ],
    { encoding: "utf8" }
  )

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout)
    process.exit(result.status ?? 1)
  }
  console.log(`  salvato: videos/mp4/${outName}`)
}

console.log(`\nFatto: ${files.length} file in videos/mp4/`)

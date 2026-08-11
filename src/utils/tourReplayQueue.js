/** Coda tutorial da rifare (sessionStorage). */

const QUEUE_KEY = "lm-tour-replay-queue"

export const readReplayQueue = () => {
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const writeReplayQueue = (queue) => {
  try {
    if (!queue?.length) {
      sessionStorage.removeItem(QUEUE_KEY)
      return
    }
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // ignore
  }
}

export const clearReplayQueue = () => {
  try {
    sessionStorage.removeItem(QUEUE_KEY)
  } catch {
    // ignore
  }
}

/** @returns {{ kind: string, id: string, path: string } | null} */
export const shiftReplayQueue = () => {
  const queue = readReplayQueue()
  if (!queue.length) return null
  const [next, ...rest] = queue
  writeReplayQueue(rest)
  return next
}

export const buildLmTourState = (item) => {
  if (!item) return null
  if (item.kind === "dashboard" || item.id === "dashboard") {
    return { type: "dashboard" }
  }
  if (item.kind === "whatsNew") {
    return { type: "whatsNew" }
  }
  return { type: "page", pageId: item.id, force: true }
}

/** Pause “cinematografica” tra le azioni (ms). */
export async function beat(page, ms = 900) {
  await page.waitForTimeout(ms)
}

/**
 * Riduce rumore UI nel video: scroll istantaneo, niente scrollbar,
 * cursore di sistema più leggibile dove supportato.
 */
export async function polishForRecording(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        scroll-behavior: auto !important;
        animation-duration: 0.35s !important;
        transition-duration: 0.25s !important;
      }
      html { scrollbar-width: none; }
      ::-webkit-scrollbar { width: 0; height: 0; display: none; }
    `,
  })
}

/** Digita carattere per carattere (più naturale in video). */
export async function typeSlow(locator, text, delay = 55) {
  await locator.click()
  await locator.fill("")
  await locator.pressSequentially(text, { delay })
}

/** Reset sessione browser (per cambiare ruolo nello stesso video). */
export async function clearSession(page) {
  await page.evaluate(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("userData")
  })
}

/**
 * Login via form con typing lento (demo).
 * @param {{ email: string, password: string }} credentials
 * @param {{ slow?: boolean }} [options]
 */
export async function loginForDemo(page, credentials, { slow = true } = {}) {
  await page.goto("login")
  await polishForRecording(page)
  await page.locator("#email").waitFor({ state: "visible", timeout: 15_000 })
  await beat(page, 700)

  if (slow) {
    await typeSlow(page.locator("#email"), credentials.email)
    await beat(page, 350)
    await typeSlow(page.locator("#password"), credentials.password, 40)
  } else {
    await page.locator("#email").fill(credentials.email)
    await page.locator("#password").fill(credentials.password)
  }

  await beat(page, 500)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL("**/dashboard**", { timeout: 25_000 })
  await polishForRecording(page)
  await beat(page, 900)
}

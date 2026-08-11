import { describe, expect, it, beforeEach } from "vitest"
import {
  clearStoredAuth,
  decodeJwtPayload,
  getRememberMePreference,
  persistAuthToken,
  persistUserData,
  readStoredAuth,
  shouldAttemptTokenRefresh,
} from "./authStorage"

const createToken = (payload) => {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
  return `${header}.${body}.signature`
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe("authStorage", () => {
  it("persists remember-me sessions in localStorage", () => {
    persistAuthToken("token-remember", true)
    persistUserData({ id: "1" }, true)

    expect(localStorage.getItem("token")).toBe("token-remember")
    expect(sessionStorage.getItem("token")).toBeNull()
    expect(getRememberMePreference()).toBe(true)
  })

  it("persists session-only auth in sessionStorage", () => {
    persistAuthToken("token-session", false)
    persistUserData({ id: "1" }, false)

    expect(sessionStorage.getItem("token")).toBe("token-session")
    expect(localStorage.getItem("token")).toBeNull()
    expect(getRememberMePreference()).toBe(false)
  })

  it("reads stored auth from the selected storage", () => {
    persistAuthToken("token-session", false)
    persistUserData({ id: "42" }, false)

    expect(readStoredAuth()).toEqual({
      rememberMe: false,
      token: "token-session",
      userData: JSON.stringify({ id: "42" }),
    })
  })

  it("clears both storages on logout", () => {
    persistAuthToken("token-remember", true)
    persistUserData({ id: "1" }, true)
    sessionStorage.setItem("token", "legacy-token")

    clearStoredAuth()

    expect(localStorage.getItem("token")).toBeNull()
    expect(sessionStorage.getItem("token")).toBeNull()
    expect(localStorage.getItem("rememberMe")).toBeNull()
  })

  it("decodes base64url jwt payloads", () => {
    const token = createToken({ exp: 9999999999, rememberMe: true })
    expect(decodeJwtPayload(token)).toEqual({ exp: 9999999999, rememberMe: true })
  })

  it("detects auth statuses that should trigger refresh", () => {
    expect(shouldAttemptTokenRefresh(401)).toBe(true)
    expect(shouldAttemptTokenRefresh(403)).toBe(true)
    expect(shouldAttemptTokenRefresh(500)).toBe(false)
  })
})

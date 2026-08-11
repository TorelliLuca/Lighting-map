const REMEMBER_ME_KEY = "rememberMe"

const getAuthStorage = () => {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
  }

  const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === "true"
  return rememberMe ? localStorage : sessionStorage
}

export const getRememberMePreference = () => {
  if (typeof window === "undefined") return true
  const storedPreference = localStorage.getItem(REMEMBER_ME_KEY)
  if (storedPreference === null) return true
  return storedPreference === "true"
}

export const setRememberMePreference = (rememberMe) => {
  if (typeof window === "undefined") return
  localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? "true" : "false")
}

export const readStoredAuth = () => {
  const rememberMe = getRememberMePreference()
  const storage = rememberMe ? localStorage : sessionStorage

  return {
    rememberMe,
    token: storage.getItem("token"),
    userData: storage.getItem("userData"),
  }
}

export const persistAuthToken = (token, rememberMe = getRememberMePreference()) => {
  if (typeof window === "undefined") return

  setRememberMePreference(rememberMe)
  const storage = rememberMe ? localStorage : sessionStorage
  const otherStorage = rememberMe ? sessionStorage : localStorage

  storage.setItem("token", token)
  otherStorage.removeItem("token")
}

export const persistUserData = (userData, rememberMe = getRememberMePreference()) => {
  if (typeof window === "undefined") return

  setRememberMePreference(rememberMe)
  const storage = rememberMe ? localStorage : sessionStorage
  const otherStorage = rememberMe ? sessionStorage : localStorage
  const serialized = JSON.stringify(userData)

  storage.setItem("userData", serialized)
  otherStorage.removeItem("userData")
}

export const clearStoredAuth = () => {
  if (typeof window === "undefined") return

  localStorage.removeItem("token")
  localStorage.removeItem("userData")
  sessionStorage.removeItem("token")
  sessionStorage.removeItem("userData")
  localStorage.removeItem(REMEMBER_ME_KEY)
}

export const decodeJwtPayload = (token) => {
  const payload = token.split(".")[1]
  if (!payload) {
    throw new Error("Token JWT non valido")
  }

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=")
  return JSON.parse(atob(padded))
}

export const isTokenExpiringSoon = (token, thresholdMs = 300000) => {
  const decodedPayload = decodeJwtPayload(token)
  const expirationTime = decodedPayload.exp * 1000
  return expirationTime - Date.now() < thresholdMs
}

export const shouldAttemptTokenRefresh = (status) => status === 401 || status === 403

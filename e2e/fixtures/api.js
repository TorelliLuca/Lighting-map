const DEFAULT_API_URL = "http://localhost:3000"

export function getApiBaseUrl() {
  return (process.env.E2E_API_URL || DEFAULT_API_URL).replace(/\/$/, "")
}

export async function loginApi({ email, password }) {
  const baseUrl = getApiBaseUrl()
  const res = await fetch(`${baseUrl}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Login API fallito (${res.status}): ${text}`)
  }

  const data = await res.json()
  if (!data?.token || !data?.user) {
    throw new Error("Risposta login incompleta (token/user mancanti)")
  }

  return { token: data.token, user: data.user }
}

export function createApiClient(token) {
  const baseUrl = getApiBaseUrl()

  async function request(method, path, { body, params } = {}) {
    const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`)
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value))
        }
      }
    }

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    const contentType = res.headers.get("content-type") || ""
    const payload = contentType.includes("application/json")
      ? await res.json()
      : await res.text()

    if (!res.ok) {
      const message = typeof payload === "string"
        ? payload
        : payload?.error || JSON.stringify(payload)
      throw new Error(`${method} ${path} → ${res.status}: ${message}`)
    }

    return payload
  }

  return {
    get: (path, options) => request("GET", path, options),
    post: (path, body) => request("POST", path, { body }),
    patch: (path, body) => request("PATCH", path, { body }),
    delete: (path) => request("DELETE", path),
  }
}

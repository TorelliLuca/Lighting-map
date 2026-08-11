import { createApiClient, loginApi } from "./api.js"

export function getQuoteFlowCredentialsOrNull() {
  const maintainerEmail = process.env.E2E_MAINTAINER_EMAIL?.trim()
  const maintainerPassword = process.env.E2E_MAINTAINER_PASSWORD?.trim()
  const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim()
  const adminPassword = process.env.E2E_ADMIN_PASSWORD?.trim()

  if (!maintainerEmail || !maintainerPassword || !adminEmail || !adminPassword) {
    return null
  }

  return {
    maintainer: { email: maintainerEmail, password: maintainerPassword },
    admin: { email: adminEmail, password: adminPassword },
  }
}

export function requireQuoteFlowCredentials() {
  const creds = getQuoteFlowCredentialsOrNull()
  if (!creds) {
    throw new Error(
      "Imposta E2E_MAINTAINER_EMAIL, E2E_MAINTAINER_PASSWORD, E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD in `.env.e2e`."
    )
  }
  return creds
}

export async function createQuoteFlowClients(credentials = requireQuoteFlowCredentials()) {
  const maintainerSession = await loginApi(credentials.maintainer)
  const adminSession = await loginApi(credentials.admin)

  return {
    maintainer: createApiClient(maintainerSession.token),
    admin: createApiClient(adminSession.token),
    maintainerUser: maintainerSession.user,
    adminUser: adminSession.user,
  }
}

function resolveTownHallName(user) {
  const entry = user?.town_halls_list?.[0]
  if (!entry) return null
  if (typeof entry === "object") return entry.name || entry._id || null
  return String(entry)
}

export async function resolveQuoteFixtures(maintainerClient, maintainerUser) {
  const townHallName = resolveTownHallName(maintainerUser)
  if (!townHallName) {
    throw new Error("Il manutentore E2E non ha comuni associati.")
  }

  const lightPointsResponse = await maintainerClient.get(
    `/townHalls/${encodeURIComponent(townHallName)}/lightPoints`,
    { params: { limit: 1 } }
  )

  const items = Array.isArray(lightPointsResponse?.items)
    ? lightPointsResponse.items
    : Array.isArray(lightPointsResponse)
      ? lightPointsResponse
      : []

  const lightPoint = items[0] || null
  if (!lightPoint?._id) {
    throw new Error(`Nessun punto luce trovato per ${townHallName}.`)
  }

  return { townHallName, lightPointId: lightPoint._id }
}

export async function createDraftQuote(maintainerClient, maintainerUser, overrides = {}) {
  const { townHallName, lightPointId } = await resolveQuoteFixtures(
    maintainerClient,
    maintainerUser
  )

  const stamp = Date.now()
  const quote = await maintainerClient.post("/api/quotes", {
    townHallName,
    lightPointId,
    faultDescription: `Guasto test e2e ${stamp}`,
    notes: "Creato da test e2e quote-rejection",
    lineItems: [
      {
        materialCode: "E2E-TEST",
        description: `Voce test e2e ${stamp}`,
        udm: "cad",
        quantity: 1,
        unitPrice: 42.5,
        isAdHoc: true,
      },
      {
        materialCode: "E2E-OK",
        description: `Voce non contestata ${stamp}`,
        udm: "cad",
        quantity: 2,
        unitPrice: 10,
        isAdHoc: true,
      },
    ],
    ...overrides,
  })

  return quote
}

export async function submitQuote(client, quoteId) {
  return client.post(`/api/quotes/${quoteId}/submit`)
}

export async function deleteQuote(client, quoteId) {
  return client.delete(`/api/quotes/${quoteId}`)
}

export async function getQuote(client, quoteId) {
  return client.get(`/api/quotes/${quoteId}`)
}

/**
 * Carica budget straordinaria (capitolato) e spesa da consuntivi approvati.
 * @param {import('axios').AxiosInstance} api
 * @param {string} comune
 * @param {{ excludeId?: string|null }} [options]
 * @returns {Promise<{ limit: number|null, approvedSpent: number }>}
 */
export async function fetchExtraordinaryBudgetUsage(api, comune, options = {}) {
  const excludeId = options.excludeId ? String(options.excludeId) : null

  if (!comune) {
    return { limit: null, approvedSpent: 0 }
  }

  const [configRes, approvedRes] = await Promise.all([
    api.get(`/api/maintenance-config/by-name/${encodeURIComponent(comune)}`),
    api.get("/api/quotes", {
      params: {
        townHallName: comune,
        type: "CONSUNTIVO",
        status: "APPROVED",
      },
    }),
  ])

  const linked = configRes.data?.config?.linkedOrganizations || []
  const limitSum = linked.reduce(
    (sum, org) => sum + (Number(org.budgetExtraordinary) || 0),
    0,
  )
  // 0 / assente ⇒ importo massimo non definito → nascondi la barra
  const limit = limitSum > 0 ? limitSum : null

  const approvedSpent = (approvedRes.data || []).reduce((sum, doc) => {
    if (excludeId && String(doc._id) === excludeId) return sum
    return sum + (Number(doc.total) || 0)
  }, 0)

  return { limit, approvedSpent }
}

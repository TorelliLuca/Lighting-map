import toast from "react-hot-toast"

/** Messaggio allineato al 403 backend (`utils/roles.js`). */
export const TOWN_HALL_ACCESS_DENIED_MESSAGE =
  "Non sei autorizzato a visualizzare le informazioni di questo comune"

/**
 * Verifica se l'utente può accedere al comune (per nome).
 * SUPER_ADMIN ha accesso a tutti i comuni.
 */
export function canUserAccessComune(userData, comuneName) {
  if (!userData || !comuneName) return false
  if (userData.user_type === "SUPER_ADMIN") return true

  const target = String(comuneName).trim().toLowerCase()
  if (!target) return false

  const list = userData.town_halls_list || []
  if (!list.length) return false

  return list.some((th) => {
    // ID grezzo (stringa ObjectId) non autorizza un accesso per nome
    if (typeof th === "string") {
      if (/^[a-f0-9]{24}$/i.test(th)) return false
      return th.trim().toLowerCase() === target
    }
    const name = th?.name
    return Boolean(name && String(name).trim().toLowerCase() === target)
  })
}

export function isTownHallAccessDeniedError(error) {
  if (error?.response?.status !== 403) return false
  const msg = String(error?.response?.data?.error || "")
  return (
    msg.includes("Non sei autorizzato a visualizzare le informazioni di questo comune") ||
    msg.includes("Accesso negato al comune")
  )
}

/**
 * Toast + redirect dashboard quando il comune in query non è autorizzato.
 * @returns {boolean} true se l'accesso è negato (chiamante deve interrompere il flusso)
 */
export function denyUnauthorizedComuneAccess(navigate, options = {}) {
  const { showToast = true } = options
  if (showToast) {
    toast.error(TOWN_HALL_ACCESS_DENIED_MESSAGE)
  }
  navigate("/dashboard", { replace: true })
  return true
}

/**
 * Guard sincrono: se comune presente e non in lista utente → toast + redirect.
 * @returns {boolean} true se può proseguire
 */
export function guardComuneAccess({ userData, comune, navigate }) {
  if (!comune) return true
  if (!userData) return false
  if (canUserAccessComune(userData, comune)) return true
  denyUnauthorizedComuneAccess(navigate)
  return false
}

"use client"

import { useEffect, useRef } from "react"
import { Navigate, Outlet, useSearchParams } from "react-router-dom"
import { useUser } from "../context/UserContext"
import {
  TOWN_HALL_ACCESS_DENIED_MESSAGE,
  canUserAccessComune,
} from "../utils/townHallAccess"
import toast from "react-hot-toast"

/**
 * Layout route: se c'è ?comune= e non è nella lista utente,
 * non monta le pagine figlie e reindirizza alla dashboard.
 */
export default function RequireComuneAccess() {
  const { userData } = useUser()
  const [searchParams] = useSearchParams()
  const comune = (searchParams.get("comune") || "").trim()
  const toastedRef = useRef(false)

  const denied = Boolean(
    userData && comune && !canUserAccessComune(userData, comune),
  )

  useEffect(() => {
    if (!denied) {
      toastedRef.current = false
      return
    }
    if (toastedRef.current) return
    toastedRef.current = true
    toast.error(TOWN_HALL_ACCESS_DENIED_MESSAGE)
  }, [denied])

  if (!userData) return null

  if (denied) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

"use client"

import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useUser } from "../context/UserContext"

export default function ProtectedRoute({ children }) {
  const { userData, token, loading, fetchUserProfile } = useUser()
  const navigate = useNavigate()
  
  useEffect(() => {
    // If not loading and no token, redirect to login
    if (!loading && !token) {
      navigate("/login")
      return
    }
    
    // If we have a token but no user data, fetch the profile
    if (token && !userData) {
      navigate("/login")
      return
    }
  }, [loading, token, userData, fetchUserProfile, navigate])
  
  // Show loading state while checking authentication
  if (loading || (!userData && token)) {
    return <div className="flex items-center justify-center h-screen">Caricamento...</div>
  }
  
  // Only render children if authenticated
  return token ? children : null
}
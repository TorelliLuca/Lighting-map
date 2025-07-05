"use client"

import { createContext, useState, useEffect, useContext, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

// Create a custom axios instance with default config
export const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL
})

export const UserContext = createContext()

export const useUser = () => useContext(UserContext)

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Initialize from localStorage on component mount
  useEffect(() => {
    const storedUserData = localStorage.getItem("userData")
    const storedToken = localStorage.getItem("token")
    
    if (storedUserData) {
      setUserData(JSON.parse(storedUserData))
    }
    
    if (storedToken) {
      setToken(storedToken)
    }
    
    setLoading(false)
  }, [])

  // Set up axios interceptors for JWT handling
  useEffect(() => {
    // Request interceptor to add token to all requests
    const requestInterceptor = api.interceptors.request.use(
      config => {
        if (token) {
          config.headers["Authorization"] = `Bearer ${token}`
        }
        return config
      },
      error => Promise.reject(error)
    )

    // Response interceptor to handle token expiration
    const responseInterceptor = api.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config
        
        // If the error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true
          
          try {
            // Try to refresh the token
            const response = await api.post("/refresh-token")
            const newToken = response.data.token
            
            // Update token in state and localStorage
            updateToken(newToken)
            console.log("token refreshed");
            // Retry the original request with new token
            originalRequest.headers["Authorization"] = `Bearer ${newToken}`
            return api(originalRequest)
          } catch (refreshError) {
            // If refresh fails, log the user out
            logout()
            return Promise.reject(refreshError)
          }
        }
        
        return Promise.reject(error)
      }
    )

    // Clean up interceptors on unmount
    return () => {
      api.interceptors.request.eject(requestInterceptor)
      api.interceptors.response.eject(responseInterceptor)
    }
  }, [token]) // Re-run when token changes

  // Login function
  const login = async (email, password) => {
    try {
      const response = await api.post(`/login`, { email, password })
      const { user, token: newToken } = response.data
      
      updateUserData(user)
      updateToken(newToken)
      
      return user
    } catch (error) {
      console.error("Login failed:", error)
      throw error
    }
  }

  // Register function
  const register = async (userData) => {
    try {
      await api.post("/users/addPendingUser", userData)
    } catch (error) {
      console.error("Registration failed:", error)
      throw error
    }
  }

  // Get user profile data using token
  const fetchUserProfile = useCallback(async () => {
    if (!token) return null
    
    try {
      const response = await api.get(`/profile`)
      updateUserData(response.data.user)
      return response.data.user
    } catch (error) {
      console.error("Failed to fetch user profile:", error)
      if (error.response?.status === 401) {
        logout()
      }
      return null
    }
  }, [token])

  // Logout function
  const logout = useCallback(() => {
    clearUserData()
    clearToken()
    navigate("/login") // Use React Router's navigate
  }, [navigate])

  // Update token helper
  const updateToken = (newToken) => {
    setToken(newToken)
    localStorage.setItem("token", newToken)
  }

  // Clear token helper
  const clearToken = () => {
    setToken(null)
    localStorage.removeItem("token")
  }

  // User data helpers
  const updateUserData = (data) => {
    setUserData(data)
    localStorage.setItem("userData", JSON.stringify(data))
  }

  const clearUserData = () => {
    setUserData(null)
    localStorage.removeItem("userData")
  }

  // Check if token is about to expire and refresh if needed
  const checkTokenExpiration = useCallback(() => {
    if (!token) return false
    
    try {
      // JWT tokens are in format: header.payload.signature
      const payload = token.split('.')[1]
      const decodedPayload = JSON.parse(atob(payload))
      const expirationTime = decodedPayload.exp * 1000 // Convert to milliseconds
      const currentTime = Date.now()
      
      // If token expires in less than 5 minutes (300000 ms), refresh it
      if (expirationTime - currentTime < 300000) {
        console.log("you have to refresh");
        refreshToken()
        return true
      }
      
      return false
    } catch (error) {
      console.error("Error checking token expiration:", error)
      return false
    }
  }, [token])

  // Manually refresh token
  const refreshToken = async () => {
    if (!token) return false
    
    try {
      const response = await api.post("/refresh-token")
      const newToken = response.data.token
      updateToken(newToken)
      return true
    } catch (error) {
      console.error("Failed to refresh token:", error)
      logout()
      return false
    }
  }

  useEffect(() => {
    if (!token) return;
    
    // Controlla il token all'avvio
    checkTokenExpiration();
    
    // Imposta un intervallo per controllare periodicamente il token
    const tokenCheckInterval = setInterval(() => {
      console.log("Esecuzione controllo scadenza token");
      checkTokenExpiration();
    }, 60000); // Controlla ogni minuto
    
    return () => clearInterval(tokenCheckInterval);
  }, [token, checkTokenExpiration]);

  const loadSelectedTownhalls = async (selectedCity) => {
    try {
      const response = await api.get(`/townHalls/${selectedCity}`)
      return response
    } catch (error) {
      console.error(error)
      return
    }
  }

  const downloadReport = async (jsonResponseForDownload)=>{
    try {
      const response = await api.post(`/api/downloadExcelReport`, jsonResponseForDownload, {
        responseType: "blob",
      });
      return response
    } catch (error) {
      console.error(error)
      return
    }
  }

  const getActiveReports = async (city, lightPointId)=>{
    try {
      const response = await api.get(`/townHalls/lightpoints/getActiveReports`, {
        params: { name: city, numero_palo: lightPointId }
      });
    return response

    } catch (error) {
      console.error("Errore nel recupero delle segnalazioni attive", error.response?.data || error.message);
    }
    
  }

  const updateLightPoint = async (lightPointId, data) => {
    try {
      const response = await api.patch(`/townHalls/lightPoints/update/${lightPointId}`, data)
      return response
    } catch (error) {
      console.error(error)
      return
    }
  }

  return (
    <UserContext.Provider 
      value={{ 
        userData, 
        token,
        loading,
        login,
        register,
        logout,
        updateUserData,
        clearUserData,
        fetchUserProfile,
        refreshToken,
        checkTokenExpiration,
        loadSelectedTownhalls,
        downloadReport,
        getActiveReports,
        updateLightPoint,
        isAuthenticated: !!token
      }}
    >
      {!loading && children}
    </UserContext.Provider>
  )
}
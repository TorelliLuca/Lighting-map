"use client"

import { createContext, useState, useEffect, useContext, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import {
  readStoredAuth,
  persistAuthToken,
  persistUserData,
  clearStoredAuth,
  isTokenExpiringSoon,
  shouldAttemptTokenRefresh,
} from "../utils/authStorage"

// Create a custom axios instance with default config
export const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL
})

export const UserContext = createContext()

export const useUser = () => useContext(UserContext)

const REFRESH_TOKEN_PATH = "/users/refresh-token"

const authTokenRef = { current: null }
const refreshAuthRef = { current: async () => false }

const getActiveAuthToken = () => authTokenRef.current ?? readStoredAuth().token

api.interceptors.request.use(
  (config) => {
    if (!config._skipAuthRefresh) {
      const currentToken = getActiveAuthToken()
      if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`
      }
    }
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (
      !originalRequest ||
      originalRequest._skipAuthRefresh ||
      originalRequest.url?.includes(REFRESH_TOKEN_PATH)
    ) {
      return Promise.reject(error)
    }

    const status = error.response?.status
    if (shouldAttemptTokenRefresh(status) && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshed = await refreshAuthRef.current(getActiveAuthToken())
      if (refreshed) {
        const latestToken = getActiveAuthToken()
        originalRequest.headers.Authorization = `Bearer ${latestToken}`
        return api(originalRequest)
      }
    }

    return Promise.reject(error)
  },
)

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null)
  const [token, setToken] = useState(null)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const refreshPromiseRef = useRef(null)

  const updateToken = useCallback((newToken, persistRememberMe = rememberMe) => {
    authTokenRef.current = newToken
    setToken(newToken)
    persistAuthToken(newToken, persistRememberMe)
  }, [rememberMe])

  const updateUserData = useCallback((data, persistRememberMe = rememberMe) => {
    setUserData(data)
    persistUserData(data, persistRememberMe)
  }, [rememberMe])

  const updatePreferences = useCallback(async (partial) => {
    try {
      const response = await api.post("/users/me/preferences", partial)
      const preferences = response.data?.preferences
      if (!preferences) return null

      setUserData((prev) => {
        if (!prev) return prev
        const next = { ...prev, preferences }
        persistUserData(next, rememberMe)
        return next
      })
      return preferences
    } catch (error) {
      console.error("Failed to update preferences:", error)
      throw error
    }
  }, [rememberMe])

  const clearToken = useCallback(() => {
    authTokenRef.current = null
    setToken(null)
  }, [])

  const clearUserData = useCallback(() => {
    setUserData(null)
  }, [])

  const logout = useCallback(() => {
    clearUserData()
    clearToken()
    clearStoredAuth()
    setRememberMe(true)
    navigate("/login")
  }, [navigate, clearToken, clearUserData])

  const refreshToken = useCallback(async (currentToken = token) => {
    if (!currentToken) return false

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current
    }

    refreshPromiseRef.current = (async () => {
      try {
        const response = await api.post(REFRESH_TOKEN_PATH, null, {
          headers: { Authorization: `Bearer ${currentToken}` },
          _skipAuthRefresh: true,
        })
        updateToken(response.data.token)
        return true
      } catch (error) {
        console.error("Failed to refresh token:", error)
        logout()
        return false
      } finally {
        refreshPromiseRef.current = null
      }
    })()

    return refreshPromiseRef.current
  }, [token, updateToken, logout])

  useEffect(() => {
    refreshAuthRef.current = refreshToken
  }, [refreshToken])

  const checkTokenExpiration = useCallback(() => {
    if (!token) return false

    try {
      if (isTokenExpiringSoon(token)) {
        refreshToken(token)
        return true
      }
      return false
    } catch (error) {
      console.error("Error checking token expiration:", error)
      logout()
      return false
    }
  }, [token, refreshToken, logout])

  // Initialize from storage on component mount
  useEffect(() => {
    const storedAuth = readStoredAuth()

    if (storedAuth.userData) {
      try {
        setUserData(JSON.parse(storedAuth.userData))
      } catch (error) {
        console.error("Stored user data is invalid:", error)
        clearStoredAuth()
      }
    }

    if (storedAuth.token) {
      authTokenRef.current = storedAuth.token
      setToken(storedAuth.token)
    }

    setRememberMe(storedAuth.rememberMe)
    setLoading(false)
  }, [])

  const login = async (email, password, stayLoggedIn = true) => {
    try {
      const response = await api.post(`/login`, { email, password, rememberMe: stayLoggedIn })
      const { user, token: newToken } = response.data

      setRememberMe(stayLoggedIn)
      updateUserData(user, stayLoggedIn)
      updateToken(newToken, stayLoggedIn)

      return user
    } catch (error) {
      console.error("Login failed:", error)
      throw error
    }
  }

  const forgotPassword = async (email) => {
    try {
      const response = await api.post(`/forgot-password`, { email })
      return response
    } catch (error) {
      console.error("Reset password failed:", error)
      throw error
    }
  }

  const resetPassword = async (password, resetToken) => {
    try {
      const response = await api.post(`/reset-password`, { password, token: resetToken })
      return response
    } catch (error) {
      console.error("Reset password failed:", error)
      throw error
    }
  }

  const register = async (registrationData) => {
    try {
      await api.post("/addPendingUser", registrationData)
    } catch (error) {
      console.error("Registration failed:", error)
      throw error
    }
  }

  const fetchUserProfile = useCallback(async () => {
    if (!token) return null

    try {
      const response = await api.get(`/users/profile`)
      updateUserData(response.data.user)
      return response.data.user
    } catch (error) {
      console.error("Failed to fetch user profile:", error)
      if (shouldAttemptTokenRefresh(error.response?.status)) {
        logout()
      }
      return null
    }
  }, [token, updateUserData, logout])

  useEffect(() => {
    if (!token) return

    checkTokenExpiration()

    const tokenCheckInterval = setInterval(() => {
      checkTokenExpiration()
    }, 60000)

    return () => clearInterval(tokenCheckInterval)
  }, [token, checkTokenExpiration])

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
      console.log("data", data);
      const response = await api.patch(`/townHalls/lightPoints/update/${lightPointId}`, data)
      return response
    } catch (error) {
      console.error(error)
      return
    }
  }

  const updateLightPointsBatch = async (updates) => {
    const response = await api.patch(`/townHalls/lightPoints/updateBatch`, { updates })
    return response
  }

  const addLightPoint = async (data) => {
    try {
      const response = await api.post(`/townHalls/lightPoints/create`, data)
      return response
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  const deleteLightPoint = async (lightPointId) => {
    try {
      const response = await api.delete(`/townHalls/lightPoints/delete/${lightPointId}`)
      return response
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  const getAverageResponseTime = async (townhallName) => {
    try {
      const response = await api.get(`/api/avg-time-report-operation/${townhallName}`)
      return response
    } catch (error) {
      console.error(error)
      return
    }
  }

  const getTownhallGeojson = async (selectedCity) => {
    try {
      const response = await api.get(`/townHalls/${selectedCity}/geojson`)
      return response
    } catch (error) {
      console.error(error)
      return
    }
  }

  const getTownhallMeta = async (selectedCity) => {
    try {
      const response = await api.get(`/townHalls/${encodeURIComponent(selectedCity)}/meta`)
      return response
    } catch (error) {
      console.error(error)
      return
    }
  }

  const loadTownhallLightPointsPage = async (selectedCity, offset = 0, limit = 500) => {
    try {
      const response = await api.get(
        `/townHalls/${encodeURIComponent(selectedCity)}/lightPoints`,
        { params: { offset, limit } },
      )
      return response
    } catch (error) {
      console.error(error)
      return
    }
  }

  const getTownhallGeojsonPage = async (selectedCity, offset = 0, limit = 500) => {
    try {
      const response = await api.get(
        `/townHalls/${encodeURIComponent(selectedCity)}/geojson`,
        { params: { offset, limit } },
      )
      return response
    } catch (error) {
      console.error(error)
      return
    }
  }

  const getTownhallLightpointsCount = async () =>{
    try {
      const response = await api.get(`/townHalls/lightPoints/counts?userId=${userData.id}`)
      return response
    } catch (error) {
      console.error(error)
      return
    }
  }
  const getLightpoint = async (id) =>{
    try {
      const response = await api.get(`/townHalls/lightpoints/${id}`);
      return response
    } catch (error) {
      console.error(error)
      return
    }
  }
  const addReport = async (data) =>{
    try {
      const response = await api.post(`/addReport`, data);
      return response
    } catch (error) {
      console.error(error)
      return
    }
  }
  
  const confirmEmail = async (data) =>{
    try {
      const response = await api.get(`/confirm-email`, { params: data });
      return response
    } catch (error) {
      console.error(error)
      return
    }
  }

  const getOrganizationByUserId = async (id) => {
    try {
      const response = await api.get(`/organizations/my-organization/${id}`);
      return response
    } catch (error) {
      console.error(error)
      return
    }
  }

  const getMaintenanceConfig = async (townHallIdOrName) => {
    try {
      const isObjectId = /^[a-f\d]{24}$/i.test(String(townHallIdOrName))
      const path = isObjectId
        ? `/api/maintenance-config/${townHallIdOrName}`
        : `/api/maintenance-config/by-name/${encodeURIComponent(townHallIdOrName)}`
      const response = await api.get(path)
      return response
    } catch (error) {
      console.error(error)
      return
    }
  }

  const createQuote = async (data) => {
    const response = await api.post('/api/quotes', data)
    return response
  }

  const updateQuote = async (id, data) => {
    const response = await api.patch(`/api/quotes/${id}`, data)
    return response
  }

  const submitQuote = async (id) => {
    const response = await api.post(`/api/quotes/${id}/submit`)
    return response
  }

  const getQuote = async (id) => {
    const response = await api.get(`/api/quotes/${id}`)
    return response
  }

  const listQuotes = async (params = {}) => {
    const response = await api.get('/api/quotes', { params })
    return response
  }

  const approveQuote = async (id) => {
    const response = await api.post(`/api/quotes/${id}/approve`)
    return response
  }

  const rejectQuote = async (id, reason, extra = {}) => {
    const response = await api.post(`/api/quotes/${id}/reject`, { reason, ...extra })
    return response
  }

  const deleteQuote = async (id) => {
    const response = await api.delete(`/api/quotes/${id}`)
    return response
  }

  const createConsuntivo = async (parentQuoteId, data = {}) => {
    const response = await api.post(`/api/quotes/${parentQuoteId}/consuntivo`, data)
    return response
  }

  const finalizeConsuntivo = async (id) => {
    const response = await api.post(`/api/quotes/${id}/finalize-consuntivo`)
    return response
  }

  const getExtraordinaryReports = async (params = {}) => {
    const response = await api.get('/api/reports/extraordinary', { params })
    return response
  }

  return (
    <UserContext.Provider 
      value={{ 
        userData, 
        token,
        rememberMe,
        loading,
        login,
        resetPassword,
        forgotPassword,
        register,
        logout,
        updateUserData,
        clearUserData,
        fetchUserProfile,
        updatePreferences,
        refreshToken,
        checkTokenExpiration,
        loadSelectedTownhalls,
        downloadReport,
        getActiveReports,
        updateLightPoint,
        updateLightPointsBatch,
        addLightPoint,
        deleteLightPoint,
        getAverageResponseTime,
        getTownhallGeojson,
        getTownhallMeta,
        loadTownhallLightPointsPage,
        getTownhallGeojsonPage,
        getTownhallLightpointsCount,
        getLightpoint,
        addReport,
        getOrganizationByUserId,
        getMaintenanceConfig,
        createQuote,
        updateQuote,
        submitQuote,
        getQuote,
        listQuotes,
        approveQuote,
        rejectQuote,
        deleteQuote,
        createConsuntivo,
        finalizeConsuntivo,
        getExtraordinaryReports,
        confirmEmail,
        isAuthenticated: !!token
      }}
    >
      {!loading && children}
    </UserContext.Provider>
  )
}

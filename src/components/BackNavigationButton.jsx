"use client"

import { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

export const BackNavigationButton = ({
  fallbackPath = "/dashboard",
  className = "p-2 rounded-full bg-blue-500/10 hover:bg-blue-500/20",
  iconClassName = "h-5 w-5 text-blue-400",
  ariaLabel = "Torna indietro",
  onClick,
}) => {
  const navigate = useNavigate()

  const handleGoBack = useCallback(() => {
    if (onClick) {
      onClick()
      return
    }
    const canGoBack = window.history.length > 1
    if (canGoBack) {
      navigate(-1)
      return
    }
    navigate(fallbackPath, { replace: true })
  }, [navigate, fallbackPath, onClick])

  return (
    <button
      type="button"
      onClick={handleGoBack}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={className}
    >
      <ArrowLeft className={iconClassName} />
    </button>
  )
}

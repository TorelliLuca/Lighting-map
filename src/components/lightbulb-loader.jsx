"use client"

import { useEffect, useState } from "react"
import { Lightbulb } from "lucide-react"

export function LightbulbLoader() {
  const [isOn, setIsOn] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsOn((prev) => !prev)
    }, 800)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative">
      <Lightbulb
        className={`h-5 w-5 transition-colors duration-300 ${isOn ? "text-yellow-300" : "text-blue-200/50"}`}
      />
      {isOn && (
        <>
          <div className="absolute inset-0 bg-yellow-300/50 blur-sm rounded-full animate-pulse"></div>
          <div className="absolute -inset-1 bg-yellow-300/20 blur-md rounded-full animate-pulse"></div>
        </>
      )}
    </div>
  )
}


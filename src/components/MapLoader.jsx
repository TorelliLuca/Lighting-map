"use client"

import { useEffect, useState } from "react"
import { LightbulbLoader } from "./lightbulb-loader"

export function MapLoader() {
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState("Inizializzazione mappa...")

  // Simulate loading progress
  useEffect(() => {
    const messages = [
      "Inizializzazione mappa...",
      "Caricamento punti luce...",
      "Creazione cluster...",
      "Ottimizzazione visualizzazione...",
      "Quasi pronto...",
    ]

    let currentStep = 0
    const interval = setInterval(() => {
      currentStep++
      if (currentStep < messages.length) {
        setMessage(messages[currentStep])
        setProgress(Math.min((currentStep / (messages.length - 1)) * 100, 95))
      } else {
        clearInterval(interval)
      }
    }, 800)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center space-y-6 p-8 bg-black/60 rounded-xl border border-blue-500/30 shadow-[0_0_25px_rgba(0,149,255,0.15)] max-w-md w-full">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping"></div>
          <LightbulbLoader />
        </div>

        <div className="w-full space-y-2">
          <p className="text-blue-200 text-lg font-medium text-center">{message}</p>

          <div className="w-full bg-blue-900/30 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-400 h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <p className="text-blue-300/70 text-sm text-center">
            {progress < 95 ? "Ottimizzazione per prestazioni migliori" : "Completamento in corso..."}
          </p>
        </div>
      </div>
    </div>
  )
}

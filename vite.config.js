import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: "/LIGHTING-MAP/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Lighting Map',
        short_name: 'LightingMap',
        start_url: '.',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#38bdf8',
        icons: [
          {
            src: '/faviconWhite.png',

            type: 'image/png'
          },
          {
            src: '/faviconWhite.png',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})

/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig(({ mode }) => {
  const base = mode === 'staging' ? '/dev-LIGHTING-MAP/' : '/LIGHTING-MAP/';

  return {
    base,
    plugins: [react(), tailwindcss(), VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['faviconWhite.png', 'faviconDark.png'],
      manifest: {
        id: base,
        name: 'Lighting Map',
        short_name: 'LightingMap',
        description: 'Gestione illuminazione pubblica comunale',
        lang: 'it',
        start_url: '.',
        scope: base,
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'any',
        background_color: '#000000',
        theme_color: '#172554',
        icons: [
          {
            src: 'faviconWhite.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'faviconWhite.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'faviconWhite.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Mappa',
            short_name: 'Mappa',
            description: 'Apri la dashboard con la mappa dei punti luce',
            url: 'dashboard',
            icons: [{ src: 'faviconWhite.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Preventivi IMS',
            short_name: 'Preventivi',
            description: 'Bozze e preventivi IMS',
            url: 'quotes',
            icons: [{ src: 'faviconWhite.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Straordinarie',
            short_name: 'Straordinarie',
            description: 'Segnalazioni straordinarie e scadenze',
            url: 'extraordinary',
            icons: [{ src: 'faviconWhite.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        screenshots: [
          {
            src: 'pwa-screenshot-wide.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Dashboard mappa Lighting Map',
          },
          {
            src: 'pwa-screenshot-narrow.png',
            sizes: '720x1280',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Mappa Lighting Map su mobile',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/pwa-screenshot-*.png'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html'
      }
    })],
    test: {
      coverage: {
        provider: 'v8',
        include: ['src/utils/**', 'src/hooks/**'],
        exclude: [
          'src/utils/createMarkers.jsx',
          'src/utils/createTopologyPolylines.js',
          'src/utils/topologyLines.js',
          'src/utils/topologyApi.js',
          'src/utils/pushNotifications.js',
          'src/**/*.{test,spec}.{js,jsx}',
        ],
      },
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'jsdom',
            globals: false,
            include: ['src/**/*.{test,spec}.{js,jsx}'],
            setupFiles: ['src/test/setup.js'],
          },
        },
        {
          extends: true,
          plugins: [
            // The plugin will run tests for the stories defined in your Storybook config
            // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
            storybookTest({
              configDir: path.join(dirname, '.storybook'),
            }),
          ],
          test: {
            name: 'storybook',
            browser: {
              enabled: true,
              headless: true,
              provider: 'playwright',
              instances: [{
                browser: 'chromium',
              }],
            },
            setupFiles: ['.storybook/vitest.setup.js'],
          },
        },
      ],
    },
  };
});

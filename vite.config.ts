import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'travix-logo.png',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'draco/draco_decoder.wasm',
          'draco/draco_decoder.js',
          'draco/draco_wasm_wrapper.js',
        ],
        manifest: {
          id: '/',
          name: 'Travix 3D — Simulador Espacial 3D',
          short_name: 'Travix 3D',
          description:
            'Travix 3D: simulador espacial 3D en tiempo real con efemérides J2000, telemetría orbital, Vía Láctea oficial de la NASA y archivo fotográfico 100% sin internet.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'any',
          theme_color: '#05070d',
          background_color: '#05070d',
          lang: 'es',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: [
            '**/*.{js,css,html,ico,png,jpg,gif,svg,wasm,woff,woff2,glb}',
          ],
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'nasa-planets-cdn',
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 60 * 60 * 24 * 90,
                },
                cacheableResponse: {statuses: [0, 200]},
              },
            },
            {
              urlPattern: /^https:\/\/raw\.githubusercontent\.com\/nasa\/NASA-3D-Resources\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'nasa-3d-resources',
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 60 * 60 * 24 * 90,
                },
                cacheableResponse: {statuses: [0, 200]},
              },
            },
            {
              urlPattern: /^https:\/\/images-(api|assets)\.nasa\.gov\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'nasa-images-archive',
                expiration: {
                  maxEntries: 140,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {statuses: [0, 200]},
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {statuses: [0, 200]},
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});


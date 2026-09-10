import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*'],
      manifest: {
        name: 'Regain - Focus Music',
        short_name: 'Regain',
        description: 'A premium, minimal focus companion designed for luxury focus sessions.',
        theme_color: '#02040a',
        background_color: '#02040a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'icons/icon-192-v14.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512-v14.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-v14.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Clean dynamic cache limits
        maximumFileSizeToCacheInBytes: 3000000
      }
    })
  ]
});

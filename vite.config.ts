import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'Jarvis',
        short_name: 'Jarvis',
        lang: 'tr',
        display: 'standalone',
        start_url: '/#/',
        background_color: '#0f1115',
        theme_color: '#0f1115',
      },
      pwaAssets: { image: 'public/icon.svg' },
    }),
  ],
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
  test: { globals: true, environment: 'jsdom', setupFiles: ['tests/setup.ts'] },
})

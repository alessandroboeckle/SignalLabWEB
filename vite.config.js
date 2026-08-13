import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [
    vue(),
    // Auto-imports only the Vuetify components/directives actually used in
    // templates (and their per-component styles), instead of the previous
    // "import * as components from 'vuetify/components'" which pulled in
    // every component + the full stylesheet regardless of usage.
    vuetify({ autoImport: true }),
  ],
  base: '/SignalLabWEB/',
  server: { port: 3000 },
  test: {
    // Without this, Vitest's default module resolution treats Vuetify as
    // an external Node dependency and loads its CSS imports natively
    // (Node's ESM loader chokes on ".css" — "Unknown file extension")
    // instead of letting Vite's own pipeline transform them like it does
    // for every other import. Needed for any test that actually mounts a
    // Vuetify component instead of just importing plain .js/.vue logic.
    server: {
      deps: {
        inline: [/vuetify/],
      },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'pinia'],
          vuetify: ['vuetify'],
          charts: ['chart.js', 'chartjs-plugin-zoom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})

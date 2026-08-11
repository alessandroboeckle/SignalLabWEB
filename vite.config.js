import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
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

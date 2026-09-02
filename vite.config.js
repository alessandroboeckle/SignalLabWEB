import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  // autoImport: true replaces the old "import * as components from
  // 'vuetify/components'" in main.js — instead of pulling in all 100+
  // Vuetify components, it scans every .vue file's <template> and only
  // imports the ~54 tags we actually use. That's the bulk of what made
  // the main chunk 640 KB (see index-CeJs9xgM.js before this change).
  plugins: [vue(), vuetify({ autoImport: true })],
  base: '/SignalLabWEB/',
  server: { port: 3000 },
  resolve: {
    alias: {
      // jsPDF statically imports html2canvas for its .html() method, which
      // we never call — see src/utils/html2canvasStub.js for the full
      // explanation. Without this, ~200 KB of unused code ships in the
      // PDF-export chunk.
      html2canvas: '/src/utils/html2canvasStub.js',
      dompurify: '/src/utils/dompurifyStub.js',
    },
  },
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

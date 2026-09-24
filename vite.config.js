import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

// GitHub Pages has no SPA fallback: reloading /SignalLabWEB/mt-import
// would return GitHub's own 404 page. Serving index.html as 404.html
// lets App.vue boot and pick the tab from the URL instead.
// (Harmless on the Proxmox LXC — nginx uses try_files there.)
let outDir = 'dist'
const spaFallback404 = {
  name: 'spa-fallback-404',
  apply: 'build',
  configResolved(config) {
    outDir = resolve(config.root, config.build.outDir)
  },
  closeBundle() {
    copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
  },
}

export default defineConfig({
// autoImport: true replaces the old "import * as components from
// 'vuetify/components'" in main.js — instead of pulling in all 100+
// Vuetify components, it scans every .vue file's <template> and only
// imports the ~54 tags we actually use. That's the bulk of what made
// the main chunk 640 KB (see index-CeJs9xgM.js before this change).
  plugins: [vue(), vuetify({ autoImport: true }), spaFallback404],
// Default = GitHub Pages (served under /SignalLabWEB/).
// Proxmox/LXC serves from root → build there with "npm run build:proxmox",
// which passes --base=/ and overrides this value.
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
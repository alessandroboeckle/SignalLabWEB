import { createApp } from "vue";
import { createPinia } from "pinia";
import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { aliases, mdi } from "vuetify/iconsets/mdi";

// Import MDI icon font (THIS makes icons visible!)
import "@mdi/font/css/materialdesignicons.css";

// Import global styles
import "./styles/global.css";

import App from "./App.vue";

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: { mdi },
  },
  // Centralizes the "look" decisions that were otherwise being repeated
  // (or, in ~24 places, forgotten) per-component across every page —
  // Vuetify only falls back to these when a component doesn't set its
  // own prop explicitly, so nothing already-specified anywhere changes.
  defaults: {
    global: {
      // Material's classic all-caps button text reads dated now; every
      // modern interface (including Material 3 itself) uses sentence
      // case. Vuetify 3's CSS still forces uppercase by default.
      ripple: true,
    },
    VBtn: {
      class: "text-none",
      rounded: "lg",
    },
    VCard: { rounded: "lg" },
    VTextField: { variant: "outlined", density: "comfortable" },
    VSelect: { variant: "outlined", density: "comfortable" },
    VAutocomplete: { variant: "outlined", density: "comfortable" },
    VCombobox: { variant: "outlined", density: "comfortable" },
    VTextarea: { variant: "outlined", density: "comfortable" },
    VChip: { rounded: "lg" },
  },
  theme: {
    defaultTheme: "light",
    themes: {
      light: {
        dark: false,
        colors: {
          // Refined cyan/teal instead of generic Material blue — reads
          // closer to an instrument/scope readout than a stock SaaS
          // dashboard, and stays clearly distinct from the success green
          // and warning amber already used elsewhere.
          primary: "#0E7490",
          secondary: "#64748B",
          accent: "#FF6B35",
          error: "#EF4444",
          warning: "#F59E0B",
          info: "#3B82F6",
          success: "#10B981",
          background: "#F9FAFB",
          surface: "#FFFFFF",
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: "#22D3EE",
          secondary: "#94A3B8",
          accent: "#FF6B35",
          error: "#F87171",
          warning: "#FBBF24",
          info: "#60A5FA",
          success: "#34D399",
          background: "#0B1220",
          surface: "#151F2E",
        },
      },
    },
  },
});

const app = createApp(App);
const pinia = createPinia();

// Last-resort safety net: ErrorBoundary.vue catches and contains errors
// within whatever it wraps (shows a friendly fallback there). This global
// handler is for anything that somehow isn't caught by a boundary —
// logs it instead of leaving a silent blank page.
app.config.errorHandler = (err, instance, info) => {
  // eslint-disable-next-line no-console
  console.error("[Global error handler]", err, info);
};
window.addEventListener("unhandledrejection", (event) => {
  // eslint-disable-next-line no-console
  console.error("[Unhandled promise rejection]", event.reason);
});

app.use(pinia);
app.use(vuetify);

app.mount("#app");

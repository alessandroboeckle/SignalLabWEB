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
  theme: {
    defaultTheme: "light",
    themes: {
      light: {
        dark: false,
        colors: {
          primary: "#2563EB",
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
          primary: "#3B82F6",
          secondary: "#94A3B8",
          accent: "#FF6B35",
          error: "#F87171",
          warning: "#FBBF24",
          info: "#60A5FA",
          success: "#34D399",
          background: "#111827",
          surface: "#1F2937",
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

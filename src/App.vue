<template>
  <v-app>
    <!-- Still checking initial auth state -->
    <div v-if="auth.loading" class="boot-screen">
      <div class="boot-spinner"></div>
    </div>

    <!-- Not logged in -> Login blocks everything -->
    <LoginScreen v-else-if="!auth.user" />

    <!-- Logged in but not approved -> Waiting screen -->
    <WaitingScreen v-else-if="!auth.approved" />

    <!-- Logged in AND approved -> the real app -->
    <template v-else>
      <!-- Top bar with gradient -->
      <v-app-bar :elevation="3" class="app-header" height="64">
        <v-app-bar-nav-icon
          color="white"
          aria-label="Navigation ein-/ausblenden"
          @click="toggleDrawer"
        >
          <v-icon>mdi-menu</v-icon>
        </v-app-bar-nav-icon>

        <div
          class="app-logo"
          role="button"
          tabindex="0"
          @click="selectTab('start')"
          @keyup.enter="selectTab('start')"
          @mouseenter="logoHover = true"
          @mouseleave="logoHover = false"
        >
          <svg
            class="logo-svg"
            :class="{ wiggle: logoHover }"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              stroke-width="3"
            />
            <path
              d="M 18 50 Q 30 24 42 50 T 66 50 T 84 50"
              stroke="white"
              stroke-width="5"
              fill="none"
              stroke-linecap="round"
            />
          </svg>
          <span class="logo-text">Signal Lab</span>
        </div>

        <v-spacer></v-spacer>

        <span class="user-email d-none d-sm-inline">{{ auth.user.email }}</span>

        <v-btn icon variant="text" @click="toggleTheme">
          <v-icon color="white">{{
            isDark ? "mdi-white-balance-sunny" : "mdi-weather-night"
          }}</v-icon>
          <v-tooltip activator="parent" location="bottom">
            {{ isDark ? "Heller Modus" : "Dunkler Modus" }}
          </v-tooltip>
        </v-btn>

        <v-btn icon variant="text" @click="selectTab('settings')">
          <v-icon color="white">mdi-cog</v-icon>
          <v-tooltip activator="parent" location="bottom"
            >Einstellungen</v-tooltip
          >
        </v-btn>

        <v-btn icon variant="text" @click="selectTab('hilfe')">
          <v-icon color="white">mdi-help-circle-outline</v-icon>
          <v-tooltip activator="parent" location="bottom"
            >Hilfe / Bedienungsanleitung</v-tooltip
          >
        </v-btn>

        <v-btn icon variant="text" @click="showAbout = true">
          <v-icon color="white">mdi-information-outline</v-icon>
          <v-tooltip activator="parent" location="bottom">Über</v-tooltip>
        </v-btn>

        <v-btn icon variant="text" @click="auth.signOut()">
          <v-icon color="white">mdi-logout</v-icon>
          <v-tooltip activator="parent" location="bottom">Abmelden</v-tooltip>
        </v-btn>
      </v-app-bar>

      <!-- Sidebar: permanent + collapsible rail on desktop, overlay on mobile -->
      <v-navigation-drawer
        v-model="drawer"
        :rail="!mobile && rail"
        :permanent="!mobile"
        :temporary="mobile"
        class="side-nav"
        width="240"
      >
        <v-list
          v-model:opened="openGroups"
          nav
          density="comfortable"
          class="nav-list"
        >
          <!-- Start (always visible top-level) — lets you jump straight to
               either tool without guessing which group it lives in. -->
          <v-list-item
            value="start"
            :active="activeTab === 'start'"
            prepend-icon="mdi-home-outline"
            title="Start"
            rounded="lg"
            class="nav-item"
            @click="selectTab('start')"
          ></v-list-item>

          <!-- Messtool group (expandable) — the actively used tool, shown first -->
          <v-list-group value="messtool">
            <template #activator="{ props }">
              <v-list-item
                v-bind="props"
                prepend-icon="mdi-tools"
                title="Messtool"
                rounded="lg"
                class="nav-item"
                @click="expandIfRailed('messtool')"
              ></v-list-item>
            </template>

            <v-list-item
              v-for="sub in messtoolItems"
              :key="sub.value"
              :value="sub.value"
              :active="activeTab === sub.value"
              :prepend-icon="sub.icon"
              :title="sub.label"
              rounded="lg"
              class="nav-item nav-sub"
              @click="selectTab(sub.value)"
            ></v-list-item>
          </v-list-group>

          <!-- Generier-Tool group (expandable) — the original signal-generator
               tool. Dashboard/Sessions/Settings live in here too now (they're
               specifically the generator's own, not the Messtool's) so there's
               no more ambiguous top-level items or a duplicate "Sessions"
               label next to the Messtool's own Sessions. -->
          <v-list-group value="generiertool">
            <template #activator="{ props }">
              <v-list-item
                v-bind="props"
                prepend-icon="mdi-waveform"
                title="Generier-Tool"
                rounded="lg"
                class="nav-item"
                @click="expandIfRailed('generiertool')"
              ></v-list-item>
            </template>

            <v-list-item
              v-for="sub in generierToolItems"
              :key="sub.value"
              :value="sub.value"
              :active="activeTab === sub.value"
              :prepend-icon="sub.icon"
              :title="sub.label"
              rounded="lg"
              class="nav-item nav-sub"
              @click="selectTab(sub.value)"
            ></v-list-item>
          </v-list-group>

          <!-- Admin (only for admins) -->
          <v-list-item
            v-if="auth.isAdmin"
            value="admin"
            :active="activeTab === 'admin'"
            prepend-icon="mdi-shield-account"
            title="Admin"
            rounded="lg"
            class="nav-item"
            @click="selectTab('admin')"
          ></v-list-item>
        </v-list>
      </v-navigation-drawer>

      <!-- Main content -->
      <v-main class="main-area">
        <!-- Admin-triggered announcement (e.g. "new version, please reload") —
             shown to every currently open tab, dismissible per tab. -->
        <v-alert
          v-if="presence.announcement"
          type="info"
          variant="tonal"
          density="comfortable"
          closable
          rounded="0"
          class="announcement-banner"
          @click:close="presence.dismissAnnouncement()"
        >
          {{ presence.announcement.message }}
        </v-alert>

        <ErrorBoundary>
          <v-window
            v-model="activeTab"
            class="tab-content"
            transition="fade-transition"
            reverse-transition="fade-transition"
          >
            <v-window-item value="start">
              <v-container fluid class="pa-6 pa-md-10 start-page">
                <div class="text-center mb-8">
                  <h1 class="text-h4 font-weight-bold mb-2">
                    Womit möchtest du arbeiten?
                  </h1>
                  <p class="text-medium-emphasis">
                    Signal Lab bündelt zwei eigenständige Werkzeuge.
                  </p>
                </div>
                <v-row justify="center">
                  <v-col cols="12" sm="8" md="5">
                    <v-card
                      variant="outlined"
                      rounded="xl"
                      link
                      class="start-card pa-8 text-center h-100"
                      @click="selectTab('mt-import')"
                    >
                      <v-icon size="56" color="primary" class="mb-4"
                        >mdi-tools</v-icon
                      >
                      <h2 class="text-h5 font-weight-bold mb-2">Messtool</h2>
                      <p class="text-medium-emphasis">
                        LOGDATA-Messdateien importieren, filtern, analysieren,
                        vergleichen und exportieren.
                      </p>
                    </v-card>
                  </v-col>
                  <v-col cols="12" sm="8" md="5">
                    <v-card
                      variant="outlined"
                      rounded="xl"
                      link
                      class="start-card pa-8 text-center h-100"
                      @click="selectTab('overview')"
                    >
                      <v-icon size="56" color="secondary" class="mb-4"
                        >mdi-waveform</v-icon
                      >
                      <h2 class="text-h5 font-weight-bold mb-2">
                        Generier-Tool
                      </h2>
                      <p class="text-medium-emphasis">
                        Eigene Testsignale erzeugen, berechnen und als Sessions
                        verwalten.
                      </p>
                    </v-card>
                  </v-col>
                </v-row>
              </v-container>
            </v-window-item>

            <v-window-item value="overview"
              ><OverviewTab @navigate="activeTab = $event"
            /></v-window-item>
            <v-window-item value="signal"><SignalCreationTab /></v-window-item>
            <v-window-item value="calculator"><CalculatorTab /></v-window-item>
            <v-window-item value="comparison"><ComparisonTab /></v-window-item>
            <v-window-item value="sessions"
              ><SessionManagementTab
            /></v-window-item>
            <v-window-item value="settings"><SettingsTab /></v-window-item>
            <v-window-item value="admin"><AdminTab /></v-window-item>
            <v-window-item value="hilfe"><HilfeTab /></v-window-item>

            <!-- Messtool sub-pages (placeholders for now) -->
            <v-window-item value="mt-import">
              <MtImport @navigate="activeTab = $event" />
            </v-window-item>
            <v-window-item value="mt-filter">
              <MtFilter @navigate="activeTab = $event" />
            </v-window-item>
            <v-window-item value="mt-analyse">
              <MtAnalyse @navigate="activeTab = $event" />
            </v-window-item>
            <v-window-item value="mt-verarbeitung">
              <MtVerarbeitung @navigate="activeTab = $event" />
            </v-window-item>
            <v-window-item value="mt-vergleich">
              <MtVergleich @navigate="activeTab = $event" />
            </v-window-item>
            <v-window-item value="mt-export">
              <MtExport @navigate="activeTab = $event" />
            </v-window-item>
            <v-window-item value="mt-sessions">
              <MtSessions @navigate="activeTab = $event" />
            </v-window-item>
          </v-window>
        </ErrorBoundary>
      </v-main>

      <v-dialog v-model="showAbout" max-width="500">
        <v-card>
          <v-card-text class="pa-6">
            <div class="text-center mb-4">
              <v-icon size="56" color="primary">mdi-sine-wave</v-icon>
              <h2 class="text-h4 font-weight-bold mt-3">Signal Lab</h2>
            </div>
            <p class="text-body-1 text-center mb-6 text-medium-emphasis">
              Werkzeug für Signalgenerierung und Messdatenanalyse
            </p>
            <v-divider class="my-4"></v-divider>
            <v-list density="compact">
              <v-list-item
                prepend-icon="mdi-check-circle"
                title="Signalgenerierung (5 Kurvenformen)"
              ></v-list-item>
              <v-list-item
                prepend-icon="mdi-check-circle"
                title="FFT-Analyse & Visualisierung"
              ></v-list-item>
              <v-list-item
                prepend-icon="mdi-check-circle"
                title="Signal-Vergleich"
              ></v-list-item>
              <v-list-item
                prepend-icon="mdi-check-circle"
                title="Cloud-Sessions (geteilt)"
              ></v-list-item>
              <v-list-item
                prepend-icon="mdi-check-circle"
                title="Export (JSON/CSV)"
              ></v-list-item>
              <v-list-item
                prepend-icon="mdi-check-circle"
                title="Messtool: Import, Filter, Analyse, Anzeige, Export"
              ></v-list-item>
            </v-list>
            <v-divider class="my-4"></v-divider>
            <p class="text-caption text-center text-medium-emphasis">
              v1.0 • Vue 3 • Vuetify • Supabase
            </p>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" variant="flat" @click="showAbout = false"
              >Schliessen</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Command palette (Ctrl/Cmd+K) — jump straight to any page -->
      <CommandPalette
        v-model="showCommandPalette"
        :commands="commandPaletteItems"
        @select="onCommandPaletteSelect"
      />

      <!-- Keyboard shortcuts overlay (press '?' anywhere) -->
      <v-dialog v-model="showShortcuts" max-width="640">
        <v-card>
          <v-card-title class="d-flex align-center ga-2">
            <v-icon size="20">mdi-keyboard-outline</v-icon>
            Tastatur-Kürzel
          </v-card-title>
          <v-divider></v-divider>
          <v-table density="comfortable">
            <thead>
              <tr>
                <th>Kürzel</th>
                <th>Wirkung</th>
                <th>Gilt auf</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in keyboardShortcuts" :key="row.effect">
                <td class="py-2">
                  <span
                    v-for="(k, i) in row.keys"
                    :key="i"
                    class="d-inline-flex align-center"
                  >
                    <kbd class="key-badge">
                      <v-icon v-if="k.icon" size="14">{{ k.icon }}</v-icon>
                      <span v-else>{{ k.text }}</span>
                    </kbd>
                    <span
                      v-if="i < row.keys.length - 1"
                      class="mx-1 text-medium-emphasis"
                      >{{ row.keySep || "+" }}</span
                    >
                  </span>
                </td>
                <td>{{ row.effect }}</td>
                <td class="text-medium-emphasis">{{ row.scope }}</td>
              </tr>
            </tbody>
          </v-table>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" variant="flat" @click="showShortcuts = false"
              >Schliessen</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>

    <!-- Global toast notifications (src/composables/useToast.js) -->
    <v-snackbar
      v-model="toast.show"
      :color="toast.color"
      :timeout="toast.timeout"
      location="bottom right"
    >
      {{ toast.message }}
      <template #actions>
        <v-btn variant="text" size="small" @click="toast.show = false"
          >Schliessen</v-btn
        >
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import {
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
  defineAsyncComponent,
} from "vue";
import { keyboardShortcuts } from "./utils/keyboardShortcuts.js";
import { useTheme, useDisplay } from "vuetify";
import { useSignalStore } from "./stores/signalStore";
import { useAuthStore } from "./stores/authStore";
import { useUiStore } from "./stores/uiStore.js";
import { usePresenceStore } from "./stores/presenceStore.js";
import { useToast } from "./composables/useToast.js";

// Kept as regular (eager) imports: these three are either on the
// critical first-paint path (Login/Waiting screens show before anything
// else can) or, for Overview, the single most common landing page — no
// point trading a loading flicker there for a bundle-size win. Every
// other tab below is lazy: each one only downloads its JS the first time
// someone actually navigates to it, instead of all ~15 pages (charts,
// xlsx/pdf export code, the works) being bundled into one artifact that
// everyone pays for on first load regardless of which single tool they
// actually came to use.
import LoginScreen from "./views/LoginScreen.vue";
import WaitingScreen from "./views/WaitingScreen.vue";
import OverviewTab from "./views/OverviewTab.vue";
import ErrorBoundary from "./components/ErrorBoundary.vue";
import CommandPalette from "./components/CommandPalette.vue";

const SignalCreationTab = defineAsyncComponent(() => import("./views/SignalCreationTab.vue"));
const CalculatorTab = defineAsyncComponent(() => import("./views/CalculatorTab.vue"));
const ComparisonTab = defineAsyncComponent(() => import("./views/ComparisonTab.vue"));
const SessionManagementTab = defineAsyncComponent(() => import("./views/SessionManagementTab.vue"));
const SettingsTab = defineAsyncComponent(() => import("./views/SettingsTab.vue"));
const HilfeTab = defineAsyncComponent(() => import("./views/HilfeTab.vue"));
const AdminTab = defineAsyncComponent(() => import("./views/AdminTab.vue"));
const MtImport = defineAsyncComponent(() => import("./views/messtool/MtImport.vue"));
const MtAnalyse = defineAsyncComponent(() => import("./views/messtool/MtAnalyse.vue"));
const MtVerarbeitung = defineAsyncComponent(() => import("./views/messtool/MtVerarbeitung.vue"));
const MtFilter = defineAsyncComponent(() => import("./views/messtool/MtFilter.vue"));
const MtExport = defineAsyncComponent(() => import("./views/messtool/MtExport.vue"));
const MtVergleich = defineAsyncComponent(() => import("./views/messtool/MtVergleich.vue"));
const MtSessions = defineAsyncComponent(() => import("./views/messtool/MtSessions.vue"));

const theme = useTheme();
const store = useSignalStore();
const auth = useAuthStore();
const presence = usePresenceStore();
const { toast } = useToast();

// Join the shared presence channel once logged in + approved (so the
// Admin page can show who's online), leave it on logout — watching
// auth.user rather than doing this at mount time since login itself
// happens asynchronously after the app boots.
watch(
  () => auth.user,
  (user) => {
    if (user) presence.join(user);
    else presence.leave();
  },
  { immediate: true },
);
onBeforeUnmount(() => presence.leave());

const VALID_TABS = new Set([
  "start", "overview", "signal", "calculator", "comparison", "sessions",
  "settings", "admin", "hilfe",
  "mt-import", "mt-filter", "mt-analyse", "mt-verarbeitung", "mt-vergleich",
  "mt-export", "mt-sessions",
]);
const ACTIVE_TAB_KEY = "signallab.activeTab";

// Which page you're on was never saved anywhere — an accidental reload
// (or just hitting F5) always bounced back to the Start page even though
// the actual measurement data survives (see messtoolStore's IndexedDB
// session). localStorage is fine here: this is a single short string, not
// the multi-MB payload that forced IndexedDB for the file data itself.
function restoreActiveTab() {
  try {
    const saved = localStorage.getItem(ACTIVE_TAB_KEY);
    if (saved && VALID_TABS.has(saved) && (saved !== "admin" || auth.isAdmin)) {
      return saved;
    }
  } catch {
    // localStorage unavailable (private browsing, disabled, ...) — fine, just start on "start"
  }
  return "start";
}

const activeTab = ref(restoreActiveTab());
watch(activeTab, (tab) => {
  try {
    localStorage.setItem(ACTIVE_TAB_KEY, tab);
  } catch {
    // storage unavailable — not persisting the tab is not worth surfacing an error for
  }
});

// Any page's help icon (see HelpIconButton.vue) sets this via the ui
// store instead of needing its own "navigate" emit threaded through —
// App.vue just applies it here like any other tab switch.
const ui = useUiStore();
watch(
  () => ui.pendingTab,
  (tab) => {
    if (tab) {
      activeTab.value = tab;
      ui.pendingTab = null;
    }
  },
);

const showAbout = ref(false);
const showShortcuts = ref(false);

function isEditableTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

function onGlobalKeydown(e) {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === "k") {
    e.preventDefault();
    showCommandPalette.value = true;
    return;
  }
  if (e.key !== "?" || isEditableTarget(e.target)) return;
  e.preventDefault();
  showShortcuts.value = true;
}

onMounted(() => window.addEventListener("keydown", onGlobalKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onGlobalKeydown));
const { mobile } = useDisplay();
const drawer = ref(true);
const rail = ref(false);

// On mobile, the sidebar becomes an overlay (not permanent) and starts closed,
// so it doesn't eat screen space; the hamburger toggles it in/out.
watch(
  mobile,
  (isMobile) => {
    drawer.value = !isMobile;
    rail.value = false;
  },
  { immediate: true },
);

function toggleDrawer() {
  if (mobile.value) {
    drawer.value = !drawer.value;
  } else {
    rail.value = !rail.value;
  }
}

function selectTab(value) {
  activeTab.value = value;
  ensureGroupOpenFor(value);
  if (mobile.value) drawer.value = false;
}

// Clicking a group's own icon while the sidebar is railed (collapsed to a
// narrow strip) used to just toggle its open/closed state internally —
// invisible while railed, since sub-items are hidden then anyway (see the
// rail CSS below). Un-rail instead, so the user can actually see and pick
// a sub-item.
//
// The group's own built-in click-to-toggle handler *also* fires on this
// same click (it was already open, so toggling closes it) — racing
// against the un-rail. Force it back open a tick later so it reliably
// ends up expanded, whatever the toggle just did.
async function expandIfRailed(groupName) {
  if (mobile.value || !rail.value) return;
  rail.value = false;
  await nextTick();
  if (!openGroups.value.includes(groupName)) {
    openGroups.value = [...openGroups.value, groupName];
  }
}
const logoHover = ref(false);

const generierToolItems = [
  { value: "overview", label: "Dashboard", icon: "mdi-view-dashboard" },
  { value: "signal", label: "Generator", icon: "mdi-sine-wave" },
  { value: "calculator", label: "Rechner", icon: "mdi-calculator" },
  {
    value: "comparison",
    label: "Signal-Vergleich",
    icon: "mdi-chart-multiple",
  },
  { value: "sessions", label: "Sessions", icon: "mdi-folder-open" },
];

const messtoolItems = [
  { value: "mt-import", label: "Import", icon: "mdi-file-upload" },
  { value: "mt-filter", label: "Filter", icon: "mdi-tune-variant" },
  { value: "mt-analyse", label: "Analyse", icon: "mdi-chart-bell-curve" },
  { value: "mt-verarbeitung", label: "Verarbeitung", icon: "mdi-cog-transfer" },
  { value: "mt-vergleich", label: "Anzeige", icon: "mdi-chart-multiple" },
  { value: "mt-export", label: "Export", icon: "mdi-file-export" },
  {
    value: "mt-sessions",
    label: "Sessions",
    icon: "mdi-content-save-cog-outline",
  },
];

// Same list the sidebar already builds from, reused as the command
// palette's jump targets — one source of truth for "what pages exist"
// instead of a second hardcoded list that could drift out of sync.
const showCommandPalette = ref(false);
const commandPaletteItems = computed(() => {
  const items = [
    { value: "start", label: "Start", icon: "mdi-home-outline", group: "" },
    ...messtoolItems.map((i) => ({ ...i, group: "Messtool" })),
    { value: "signal", label: "Signal-Generator", icon: "mdi-waveform", group: "Generator" },
    { value: "comparison", label: "Signal-Vergleich", icon: "mdi-chart-multiple", group: "Generator" },
    { value: "sessions", label: "Sessions", icon: "mdi-content-save-cog-outline", group: "Generator" },
    { value: "calculator", label: "Rechner", icon: "mdi-calculator-variant-outline", group: "" },
    { value: "hilfe", label: "Bedienungsanleitung", icon: "mdi-help-circle-outline", group: "" },
    { value: "settings", label: "Einstellungen", icon: "mdi-cog-outline", group: "" },
  ];
  if (auth.isAdmin) items.push({ value: "admin", label: "Admin", icon: "mdi-shield-account-outline", group: "" });
  return items;
});
function onCommandPaletteSelect(value) {
  activeTab.value = value;
}

// Whichever group contains the currently active tab should be expanded —
// otherwise switching tabs (e.g. via a quick-nav link or session restore)
// could leave the highlighted item hidden inside a collapsed group.
function groupFor(value) {
  if (messtoolItems.some((i) => i.value === value)) return "messtool";
  if (generierToolItems.some((i) => i.value === value)) return "generiertool";
  return null; // top-level items like 'start' or 'admin' don't belong to either group
}
const openGroups = ref(
  groupFor(activeTab.value) ? [groupFor(activeTab.value)] : [],
);
function ensureGroupOpenFor(value) {
  const group = groupFor(value);
  if (group && !openGroups.value.includes(group)) {
    openGroups.value = [...openGroups.value, group];
  }
}

const isDark = computed({
  get: () => theme.global.current.value.dark,
  set: (val) => {
    theme.global.name.value = val ? "dark" : "light";
    store.updateSettings({ theme: val ? "dark" : "light" });
  },
});

function toggleTheme() {
  isDark.value = !isDark.value;
}

// Start auth check on load
auth.init();

// When the user becomes approved, load the shared sessions from Supabase.
watch(
  () => auth.approved,
  async (isApproved) => {
    if (isApproved && !store.loaded) {
      try {
        await store.loadSessions();
      } catch (e) {
        console.error("Failed to load sessions:", e);
      }
    }
  },
  { immediate: true },
);

// Apply saved theme
watch(
  () => store.settings.theme,
  (newTheme) => {
    theme.global.name.value = newTheme === "dark" ? "dark" : "light";
  },
  { immediate: true },
);
</script>

<style scoped>
.announcement-banner {
  position: sticky;
  top: 0;
  z-index: 5;
  margin-bottom: 0;
}
.boot-screen {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
}
.boot-spinner {
  width: 44px;
  height: 44px;
  border: 4px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Top bar with a smooth multi-stop gradient */
.app-header {
  background: linear-gradient(
    100deg,
    #0c4a5f 0%,
    #0e7490 45%,
    #0891b2 80%,
    #22d3ee 100%
  ) !important;
  color: white;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 0 6px;
}
.logo-svg {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  transition: transform 0.3s ease;
}
/* wiggle only on hover */
.logo-svg.wiggle {
  animation: wiggle 0.9s ease-in-out infinite;
}
@keyframes wiggle {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }
  25% {
    transform: rotate(-8deg) scale(1.08);
  }
  75% {
    transform: rotate(8deg) scale(1.08);
  }
}
.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: white;
  letter-spacing: -0.5px;
  white-space: nowrap;
}
.user-email {
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  margin-right: 8px;
}

.side-nav {
  border-right: 1px solid rgba(0, 0, 0, 0.06);
}
.nav-list {
  padding: 8px;
}
.nav-item {
  margin-bottom: 2px;
  min-height: 42px;
  border-left: 3px solid transparent;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.nav-item :deep(.v-list-item-title) {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nav-item :deep(.v-icon) {
  font-size: 20px;
}

/* A tinted background alone (Vuetify's default active treatment) reads
   pretty faint at a glance — an accent bar down the left edge, like
   Linear/Notion-style sidebars, makes "you are here" unambiguous without
   shouting. */
.nav-item.v-list-item--active {
  background: rgba(var(--v-theme-primary), 0.12) !important;
  border-left-color: rgb(var(--v-theme-primary));
}
.nav-item.v-list-item--active :deep(.v-list-item-title) {
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}
.nav-item.v-list-item--active :deep(.v-icon) {
  color: rgb(var(--v-theme-primary));
}

/* Vuetify reserves a fairly wide indent for nested v-list-group items by
   default (meant for deep, generic nav trees) — way more than a single
   level of Import/Filter/Analyse/... needs in a ~240px-wide drawer, and
   it was eating into the space labels had to render in. Pull it back to
   a small, consistent step instead. */
.nav-sub {
  padding-inline-start: 20px !important;
  min-height: 38px;
}
.nav-sub :deep(.v-list-item-title) {
  font-size: 13.5px;
  font-weight: 400;
}
.nav-sub :deep(.v-icon) {
  font-size: 18px;
}

/* Rail mode narrows the drawer to an icon-only strip. A group's
   sub-items still technically render then (Vuetify doesn't hide them on
   its own) — as a long flat, unlabeled icon stack with no visual
   hierarchy, easy to mistake for more top-level items. Hide them
   entirely while railed; clicking a group's own icon (see
   expandIfRailed) un-rails the drawer instead, so you can actually see
   and pick a specific sub-item. */
:deep(.v-navigation-drawer--rail) .nav-sub {
  display: none;
}

/* Group activator (e.g. "Messtool") row itself — same left edge as the
   top-level items, just the expand chevron sits at the far right. */
:deep(.v-list-group__items) {
  --indent-padding: 0px;
}

.tab-content {
  min-height: calc(100vh - 64px);
}

.key-badge {
  background-color: rgba(var(--v-theme-on-surface), 0.06);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.18);
  border-radius: 5px;
  padding: 3px 7px;
  font-family: monospace;
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  min-width: 24px;
  justify-content: center;
}

.start-page {
  max-width: 1000px;
  margin: 0 auto;
}
.start-card {
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}
.start-card:hover {
  transform: translateY(-4px);
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}
</style>

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
        <v-app-bar-nav-icon color="white" aria-label="Navigation ein-/ausblenden" @click="toggleDrawer">
          <v-icon>mdi-menu</v-icon>
        </v-app-bar-nav-icon>

        <div class="app-logo" @mouseenter="logoHover = true" @mouseleave="logoHover = false">
          <svg class="logo-svg" :class="{ wiggle: logoHover }" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="3" />
            <path d="M 18 50 Q 30 24 42 50 T 66 50 T 84 50" stroke="white" stroke-width="5"
                  fill="none" stroke-linecap="round" />
          </svg>
          <span class="logo-text">Signal Lab</span>
        </div>

        <v-spacer></v-spacer>

        <span class="user-email d-none d-sm-inline">{{ auth.user.email }}</span>

        <v-btn icon variant="text" @click="toggleTheme">
          <v-icon color="white">{{ isDark ? 'mdi-white-balance-sunny' : 'mdi-weather-night' }}</v-icon>
          <v-tooltip activator="parent" location="bottom">
            {{ isDark ? 'Light Mode' : 'Dark Mode' }}
          </v-tooltip>
        </v-btn>

        <v-btn icon variant="text" @click="showAbout = true">
          <v-icon color="white">mdi-information-outline</v-icon>
          <v-tooltip activator="parent" location="bottom">About</v-tooltip>
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
        <v-list v-model:opened="openGroups" nav density="comfortable" class="nav-list">
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
        <v-window v-model="activeTab" class="tab-content">
          <v-window-item value="overview"><OverviewTab @navigate="activeTab = $event" /></v-window-item>
          <v-window-item value="signal"><SignalCreationTab /></v-window-item>
          <v-window-item value="calculator"><CalculatorTab /></v-window-item>
          <v-window-item value="comparison"><ComparisonTab /></v-window-item>
          <v-window-item value="sessions"><SessionManagementTab /></v-window-item>
          <v-window-item value="settings"><SettingsTab /></v-window-item>
          <v-window-item value="admin"><AdminTab /></v-window-item>

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
      </v-main>

      <v-dialog v-model="showAbout" max-width="500">
        <v-card>
          <v-card-text class="pa-6">
            <div class="text-center mb-4">
              <v-icon size="56" color="primary">mdi-sine-wave</v-icon>
              <h2 class="text-h4 font-weight-bold mt-3">Signal Lab</h2>
            </div>
            <p class="text-body-1 text-center mb-6 text-medium-emphasis">
              Professional signal processing and analysis tool
            </p>
            <v-divider class="my-4"></v-divider>
            <v-list density="compact">
              <v-list-item prepend-icon="mdi-check-circle" title="Signal Generation (5 waveforms)"></v-list-item>
              <v-list-item prepend-icon="mdi-check-circle" title="FFT Analysis & Visualization"></v-list-item>
              <v-list-item prepend-icon="mdi-check-circle" title="Signal Comparison"></v-list-item>
              <v-list-item prepend-icon="mdi-check-circle" title="Cloud Sessions (shared)"></v-list-item>
              <v-list-item prepend-icon="mdi-check-circle" title="Export (JSON/CSV)"></v-list-item>
            </v-list>
            <v-divider class="my-4"></v-divider>
            <p class="text-caption text-center text-medium-emphasis">
              v1.0 • Vue 3 • Vuetify • Supabase
            </p>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" variant="flat" @click="showAbout = false">Close</v-btn>
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
        <v-btn variant="text" size="small" @click="toast.show = false">Schliessen</v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { useTheme, useDisplay } from "vuetify";
import { useSignalStore } from "./stores/signalStore";
import { useAuthStore } from "./stores/authStore";
import { useToast } from "./composables/useToast.js";

import LoginScreen from "./views/LoginScreen.vue";
import WaitingScreen from "./views/WaitingScreen.vue";
import OverviewTab from "./views/OverviewTab.vue";
import SignalCreationTab from "./views/SignalCreationTab.vue";
import CalculatorTab from "./views/CalculatorTab.vue";
import ComparisonTab from "./views/ComparisonTab.vue";
import SessionManagementTab from "./views/SessionManagementTab.vue";
import SettingsTab from "./views/SettingsTab.vue";
import AdminTab from "./views/AdminTab.vue";
import MtImport from "./views/messtool/MtImport.vue";
import MtAnalyse from "./views/messtool/MtAnalyse.vue";
import MtVerarbeitung from "./views/messtool/MtVerarbeitung.vue";
import MtFilter from "./views/messtool/MtFilter.vue";
import MtExport from "./views/messtool/MtExport.vue";
import MtVergleich from "./views/messtool/MtVergleich.vue";
import MtSessions from "./views/messtool/MtSessions.vue";

const theme = useTheme();
const store = useSignalStore();
const auth = useAuthStore();
const { toast } = useToast();

const activeTab = ref("overview");
const showAbout = ref(false);
const { mobile } = useDisplay();
const drawer = ref(true);
const rail = ref(false);

// On mobile, the sidebar becomes an overlay (not permanent) and starts closed,
// so it doesn't eat screen space; the hamburger toggles it in/out.
watch(mobile, (isMobile) => {
  drawer.value = !isMobile;
  rail.value = false;
}, { immediate: true });

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
  { value: "calculator", label: "Calculator", icon: "mdi-calculator" },
  { value: "comparison", label: "Compare", icon: "mdi-chart-multiple" },
  { value: "sessions", label: "Sessions", icon: "mdi-folder-open" },
  { value: "settings", label: "Settings", icon: "mdi-cog" },
];

const messtoolItems = [
  { value: "mt-import", label: "Import", icon: "mdi-file-upload" },
  { value: "mt-filter", label: "Filter", icon: "mdi-tune-variant" },
  { value: "mt-analyse", label: "Analyse", icon: "mdi-chart-bell-curve" },
  { value: "mt-verarbeitung", label: "Verarbeitung", icon: "mdi-cog-transfer" },
  { value: "mt-vergleich", label: "Anzeige", icon: "mdi-chart-multiple" },
  { value: "mt-export", label: "Export", icon: "mdi-file-export" },
  { value: "mt-sessions", label: "Sessions", icon: "mdi-content-save-cog-outline" },
];

// Whichever group contains the currently active tab should be expanded —
// otherwise switching tabs (e.g. via a quick-nav link or session restore)
// could leave the highlighted item hidden inside a collapsed group.
const openGroups = ref(
  messtoolItems.some((i) => i.value === activeTab.value) ? ["messtool"] : ["generiertool"],
);
function ensureGroupOpenFor(value) {
  const group = messtoolItems.some((i) => i.value === value) ? "messtool" : "generiertool";
  if (!openGroups.value.includes(group)) openGroups.value = [...openGroups.value, group];
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
  { immediate: true }
);

// Apply saved theme
watch(
  () => store.settings.theme,
  (newTheme) => {
    theme.global.name.value = newTheme === "dark" ? "dark" : "light";
  },
  { immediate: true }
);
</script>

<style scoped>
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
  to { transform: rotate(360deg); }
}

/* Top bar with a smooth multi-stop gradient */
.app-header {
  background: linear-gradient(100deg, #1e3a8a 0%, #2563eb 45%, #3b82f6 80%, #60a5fa 100%) !important;
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
  0%, 100% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(-8deg) scale(1.08); }
  75% { transform: rotate(8deg) scale(1.08); }
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
  transition: background-color 0.15s ease;
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
</style>

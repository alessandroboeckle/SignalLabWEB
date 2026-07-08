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
        <v-app-bar-nav-icon color="white" @click="rail = !rail">
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

      <!-- Permanent sidebar (collapses to rail) -->
      <v-navigation-drawer
        v-model="drawer"
        :rail="rail"
        permanent
        class="side-nav"
        width="220"
      >
        <v-list nav density="comfortable" class="nav-list">
          <v-list-item
            v-for="item in navItems"
            :key="item.value"
            :value="item.value"
            :active="activeTab === item.value"
            :prepend-icon="item.icon"
            :title="item.label"
            rounded="lg"
            class="nav-item"
            @click="activeTab = item.value"
          ></v-list-item>
        </v-list>
      </v-navigation-drawer>

      <!-- Main content -->
      <v-main class="main-area">
        <v-window v-model="activeTab" class="tab-content">
          <v-window-item value="overview"><OverviewTab /></v-window-item>
          <v-window-item value="signal"><SignalCreationTab /></v-window-item>
          <v-window-item value="calculator"><CalculatorTab /></v-window-item>
          <v-window-item value="comparison"><ComparisonTab /></v-window-item>
          <v-window-item value="sessions"><SessionManagementTab /></v-window-item>
          <v-window-item value="settings"><SettingsTab /></v-window-item>
          <v-window-item value="admin"><AdminTab /></v-window-item>
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
  </v-app>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useTheme } from "vuetify";
import { useSignalStore } from "./stores/signalStore";
import { useAuthStore } from "./stores/authStore";

import LoginScreen from "./views/LoginScreen.vue";
import WaitingScreen from "./views/WaitingScreen.vue";
import OverviewTab from "./views/OverviewTab.vue";
import SignalCreationTab from "./views/SignalCreationTab.vue";
import CalculatorTab from "./views/CalculatorTab.vue";
import ComparisonTab from "./views/ComparisonTab.vue";
import SessionManagementTab from "./views/SessionManagementTab.vue";
import SettingsTab from "./views/SettingsTab.vue";
import AdminTab from "./views/AdminTab.vue";

const theme = useTheme();
const store = useSignalStore();
const auth = useAuthStore();

const activeTab = ref("overview");
const showAbout = ref(false);
const drawer = ref(true);
const rail = ref(false);
const logoHover = ref(false);

const navItems = computed(() => {
  const items = [
    { value: "overview", label: "Dashboard", icon: "mdi-view-dashboard" },
    { value: "signal", label: "Generator", icon: "mdi-sine-wave" },
    { value: "calculator", label: "Calculator", icon: "mdi-calculator" },
    { value: "comparison", label: "Compare", icon: "mdi-chart-multiple" },
    { value: "sessions", label: "Sessions", icon: "mdi-folder-open" },
    { value: "settings", label: "Settings", icon: "mdi-cog" },
  ];
  if (auth.isAdmin) {
    items.push({ value: "admin", label: "Admin", icon: "mdi-shield-account" });
  }
  return items;
});

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
  margin-bottom: 4px;
  transition: all 0.2s ease;
}

.tab-content {
  min-height: calc(100vh - 64px);
}
</style>

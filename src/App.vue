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
      <v-app-bar color="primary" elevation="2" class="app-header">
        <template v-slot:prepend>
          <div class="app-logo">
            <v-icon size="32" color="white">mdi-sine-wave</v-icon>
            <span class="logo-text">Signal Lab</span>
          </div>
        </template>

        <v-spacer></v-spacer>

        <span class="user-email">{{ auth.user.email }}</span>

        <v-btn icon @click="toggleTheme" variant="text">
          <v-icon color="white">{{ isDark ? 'mdi-white-balance-sunny' : 'mdi-weather-night' }}</v-icon>
          <v-tooltip activator="parent" location="bottom">
            {{ isDark ? 'Light Mode' : 'Dark Mode' }}
          </v-tooltip>
        </v-btn>

        <v-btn icon @click="showAbout = true" variant="text">
          <v-icon color="white">mdi-information-outline</v-icon>
          <v-tooltip activator="parent" location="bottom">About</v-tooltip>
        </v-btn>

        <v-btn icon @click="auth.signOut()" variant="text">
          <v-icon color="white">mdi-logout</v-icon>
          <v-tooltip activator="parent" location="bottom">Abmelden</v-tooltip>
        </v-btn>
      </v-app-bar>

      <v-main>
        <v-tabs
          v-model="activeTab"
          bg-color="surface"
          color="primary"
          show-arrows
          class="tab-bar"
        >
          <v-tab value="overview"><v-icon start>mdi-view-dashboard</v-icon>Dashboard</v-tab>
          <v-tab value="signal"><v-icon start>mdi-sine-wave</v-icon>Generator</v-tab>
          <v-tab value="calculator"><v-icon start>mdi-calculator</v-icon>Calculator</v-tab>
          <v-tab value="comparison"><v-icon start>mdi-chart-multiple</v-icon>Compare</v-tab>
          <v-tab value="sessions"><v-icon start>mdi-folder-open</v-icon>Sessions</v-tab>
          <v-tab value="settings"><v-icon start>mdi-cog</v-icon>Settings</v-tab>
        </v-tabs>

        <v-window v-model="activeTab" class="tab-content">
          <v-window-item value="overview"><OverviewTab /></v-window-item>
          <v-window-item value="signal"><SignalCreationTab /></v-window-item>
          <v-window-item value="calculator"><CalculatorTab /></v-window-item>
          <v-window-item value="comparison"><ComparisonTab /></v-window-item>
          <v-window-item value="sessions"><SessionManagementTab /></v-window-item>
          <v-window-item value="settings"><SettingsTab /></v-window-item>
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

const theme = useTheme();
const store = useSignalStore();
const auth = useAuthStore();

const activeTab = ref("overview");
const showAbout = ref(false);

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

.app-header {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
}
.app-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: 8px;
}
.logo-text {
  font-size: 22px;
  font-weight: 700;
  color: white;
  letter-spacing: -0.5px;
}
.user-email {
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  margin-right: 8px;
}
.tab-bar {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 0;
  z-index: 10;
}
.tab-content {
  min-height: calc(100vh - 128px);
}
:deep(.v-tab) {
  text-transform: none;
  font-weight: 500;
  letter-spacing: 0.2px;
}
</style>

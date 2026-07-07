<template>
  <v-app>
    <!-- Modern Top Navigation -->
    <v-app-bar elevation="1" class="app-header">
      <template v-slot:prepend>
        <div class="app-logo">
          <svg
            class="logo-svg"
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
          >
            <!-- Background circle -->
            <circle
              cx="100"
              cy="100"
              r="95"
              fill="rgba(255,255,255,0.1)"
              stroke="white"
              stroke-width="2"
            />
            <!-- Sine wave -->
            <path
              d="M 30 100 Q 50 50 70 100 T 110 100 T 150 100 T 170 100"
              stroke="white"
              stroke-width="6"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span class="logo-text">Signal Lab</span>
        </div>
      </template>

      <v-spacer></v-spacer>

      <v-btn icon @click="toggleTheme" variant="text" color="white">
        <v-icon>{{
          isDark ? "mdi-white-balance-sunny" : "mdi-moon-waning-crescent"
        }}</v-icon>
        <v-tooltip activator="parent">{{
          isDark ? "Light Mode" : "Dark Mode"
        }}</v-tooltip>
      </v-btn>

      <v-btn icon @click="showAbout = true" variant="text" color="white">
        <v-icon>mdi-information-outline</v-icon>
        <v-tooltip activator="parent">About</v-tooltip>
      </v-btn>
    </v-app-bar>

    <!-- Main Content -->
    <v-main class="main-content">
      <!-- Modern Tab Navigation -->
      <div class="tab-navigation">
        <v-tabs v-model="activeTab" class="modern-tabs" show-arrows>
          <v-tab value="overview" class="modern-tab">
            <v-icon small class="mr-2">mdi-view-dashboard-outline</v-icon>
            Dashboard
          </v-tab>

          <v-tab value="signal" class="modern-tab">
            <v-icon small class="mr-2">mdi-sine-wave</v-icon>
            Generator
          </v-tab>

          <v-tab value="calculator" class="modern-tab">
            <v-icon small class="mr-2">mdi-calculator-variant-outline</v-icon>
            Calculator
          </v-tab>

          <v-tab value="comparison" class="modern-tab">
            <v-icon small class="mr-2">mdi-chart-multiple</v-icon>
            Compare
          </v-tab>

          <v-tab value="sessions" class="modern-tab">
            <v-icon small class="mr-2">mdi-folder-open-outline</v-icon>
            Sessions
          </v-tab>

          <v-tab value="settings" class="modern-tab">
            <v-icon small class="mr-2">mdi-cog-outline</v-icon>
            Settings
          </v-tab>
        </v-tabs>
      </div>

      <!-- Tab Content Container -->
      <v-window v-model="activeTab" class="tab-content">
        <v-window-item value="overview">
          <OverviewTab />
        </v-window-item>
        <v-window-item value="signal">
          <SignalCreationTab />
        </v-window-item>
        <v-window-item value="calculator">
          <CalculatorTab />
        </v-window-item>
        <v-window-item value="comparison">
          <ComparisonTab />
        </v-window-item>
        <v-window-item value="sessions">
          <SessionManagementTab />
        </v-window-item>
        <v-window-item value="settings">
          <SettingsTab />
        </v-window-item>
      </v-window>
    </v-main>

    <!-- Modern About Dialog -->
    <v-dialog v-model="showAbout" max-width="500">
      <v-card class="modern-card">
        <v-card-text class="pa-6">
          <div class="text-center mb-4">
            <v-icon size="48" color="primary" class="mb-3"
              >mdi-sine-wave</v-icon
            >
            <h2 class="text-h4 font-weight-bold">Signal Lab</h2>
          </div>

          <p class="text-body1 text-center mb-6 text-secondary">
            Professional signal processing and analysis tool
          </p>

          <v-divider class="my-4"></v-divider>

          <div class="feature-list">
            <div class="feature-item">
              <v-icon small color="success">mdi-check-circle</v-icon>
              <span class="ml-2">Signal Generation (5 waveforms)</span>
            </div>
            <div class="feature-item">
              <v-icon small color="success">mdi-check-circle</v-icon>
              <span class="ml-2">FFT Analysis & Visualization</span>
            </div>
            <div class="feature-item">
              <v-icon small color="success">mdi-check-circle</v-icon>
              <span class="ml-2">Signal Comparison</span>
            </div>
            <div class="feature-item">
              <v-icon small color="success">mdi-check-circle</v-icon>
              <span class="ml-2">Session Management</span>
            </div>
            <div class="feature-item">
              <v-icon small color="success">mdi-check-circle</v-icon>
              <span class="ml-2">Export (JSON/CSV)</span>
            </div>
          </div>

          <v-divider class="my-4"></v-divider>

          <p class="text-caption text-disabled text-center">
            v1.0 • Vue 3 • Vuetify • Chart.js
          </p>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="flat" @click="showAbout = false">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useTheme } from "vuetify";
import { useSignalStore } from "./stores/signalStore";

import OverviewTab from "./views/OverviewTab.vue";
import SignalCreationTab from "./views/SignalCreationTab.vue";
import CalculatorTab from "./views/CalculatorTab.vue";
import ComparisonTab from "./views/ComparisonTab.vue";
import SessionManagementTab from "./views/SessionManagementTab.vue";
import SettingsTab from "./views/SettingsTab.vue";

const theme = useTheme();
const store = useSignalStore();

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

watch(
  () => store.settings.theme,
  (newTheme) => {
    theme.global.name.value = newTheme === "dark" ? "dark" : "light";
  },
  { immediate: true },
);

store.loadSessions();
if (store.allSessions.length > 0) {
  store.setCurrentSession(store.allSessions[0].id);
} else {
  store.createSession("Default Session");
}
</script>

<style scoped>
.app-header {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding: 0 24px;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
}

.dark .app-header {
  background: linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%) !important;
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: transform 0.2s ease;
  padding: 6px 12px;
  border-radius: 8px;
}

.app-logo:hover {
  transform: scale(1.08);
  background: rgba(255, 255, 255, 0.1);
}

.logo-svg {
  width: 40px;
  height: 40px;
  min-width: 40px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: white;
  letter-spacing: -0.5px;
  white-space: nowrap;
}

.main-content {
  background: linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%);
  padding: 0;
}

.dark .main-content {
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
}

.tab-navigation {
  background: white;
  border-bottom: 2px solid #e5e7eb;
  padding: 0 16px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.dark .tab-navigation {
  background: #1f2937;
  border-bottom-color: #374151;
}

.modern-tabs {
  padding: 0 8px;
}

.modern-tab {
  text-transform: none !important;
  font-weight: 500;
  font-size: 14px;
  letter-spacing: 0.3px;
  transition: all 0.3s ease;
  color: #6b7280;
}

.dark .modern-tab {
  color: #9ca3af;
}

.modern-tab:hover {
  color: #2563eb;
}

.dark .modern-tab:hover {
  color: #60a5fa;
}

.tab-content {
  padding: 0;
  max-width: none;
  margin: 0;
}

.modern-card {
  border-radius: 12px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.dark .modern-card {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.3),
    0 2px 4px -1px rgba(0, 0, 0, 0.2);
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feature-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  font-size: 14px;
  color: #374151;
}

.dark .feature-item {
  color: #d1d5db;
}

.text-secondary {
  color: #6b7280;
}

.dark .text-secondary {
  color: #cbd5e1;
}

.text-disabled {
  color: #9ca3af;
}

.dark .text-disabled {
  color: #6b7280;
}
</style>

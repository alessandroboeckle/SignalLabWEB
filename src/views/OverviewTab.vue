<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <div class="mb-8">
      <h2 class="text-h4 font-weight-bold text-primary mb-2">Dashboard</h2>
      <p class="text-secondary">Overview of your signal processing workspace</p>
    </div>

    <!-- Statistics Cards with SVG Icons -->
    <v-row class="mb-8">
      <v-col cols="12" sm="6" md="3">
        <v-card class="modern-card stat-card">
          <v-card-text>
            <div class="stat-icon success">📁</div>
            <div class="text-caption text-secondary mb-2">Total Sessions</div>
            <div class="text-h5 font-weight-bold text-primary">
              {{ store.allSessions.length }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="modern-card stat-card">
          <v-card-text>
            <div class="stat-icon info">🌊</div>
            <div class="text-caption text-secondary mb-2">Total Signals</div>
            <div class="text-h5 font-weight-bold text-primary">
              {{ totalSignals }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="modern-card stat-card">
          <v-card-text>
            <div class="stat-icon warning">📂</div>
            <div class="text-caption text-secondary mb-2">Current Session</div>
            <div class="text-h6 font-weight-bold text-truncate">
              {{ store.currentSession.name }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="modern-card stat-card">
          <v-card-text>
            <div class="stat-icon error">💾</div>
            <div class="text-caption text-secondary mb-2">Storage Usage</div>
            <div class="text-h6 font-weight-bold">
              {{ storageInfo.percent }}%
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Main Content -->
    <v-row class="mb-8">
      <!-- Recent Signals -->
      <v-col cols="12" md="6">
        <v-card class="modern-card">
          <div class="card-header">
            <div
              class="flex-between"
              style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb"
            >
              <div>
                <h3 class="text-h6 font-weight-600">Recent Signals</h3>
                <p class="text-caption text-secondary">
                  {{ recentSignals.length }} signals in session
                </p>
              </div>
              <span style="font-size: 24px">🌊</span>
            </div>
          </div>
          <v-card-text class="pa-0">
            <div v-if="recentSignals.length > 0">
              <div
                v-for="(signal, idx) in recentSignals"
                :key="signal.id"
                class="recent-item"
              >
                <div class="flex-between" style="padding: 12px 20px">
                  <div class="flex-start" style="width: 100%">
                    <span style="font-size: 24px">🌊</span>
                    <div style="flex: 1; margin-left: 12px">
                      <div class="font-weight-600 text-primary">
                        {{ signal.name }}
                      </div>
                      <div class="text-caption text-secondary">
                        {{ signal.waveType }} @ {{ signal.frequency }}Hz •
                        {{ signal.amplitude }}A
                      </div>
                    </div>
                  </div>
                  <div class="flex-center gap-2">
                    <v-btn
                      icon
                      size="small"
                      variant="text"
                      @click="loadSignal(signal.id)"
                      color="primary"
                    >
                      👁️
                      <v-tooltip activator="parent">View Signal</v-tooltip>
                    </v-btn>
                  </div>
                </div>
                <v-divider v-if="idx < recentSignals.length - 1"></v-divider>
              </div>
            </div>
            <div v-else class="empty-state">
              <span style="font-size: 48px">🌊</span>
              <p class="text-secondary mt-3">No signals yet</p>
              <p class="text-caption text-tertiary">
                Create your first signal to get started!
              </p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Quick Actions -->
      <v-col cols="12" md="6">
        <v-card class="modern-card">
          <div class="card-header">
            <div
              class="flex-between"
              style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb"
            >
              <div>
                <h3 class="text-h6 font-weight-600">Quick Actions</h3>
                <p class="text-caption text-secondary">Common tasks</p>
              </div>
              <span style="font-size: 24px">⚡</span>
            </div>
          </div>
          <v-card-text class="pa-4">
            <div class="action-buttons">
              <v-btn
                block
                color="primary"
                variant="flat"
                prepend-icon="mdi-plus-circle"
                class="mb-2 modern-button"
                height="48"
              >
                ✨ New Session
              </v-btn>
              <v-btn
                block
                color="primary"
                variant="outlined"
                prepend-icon="mdi-sine-wave"
                class="mb-2 modern-button"
                height="48"
              >
                🌊 Generate Signal
              </v-btn>
              <v-btn
                block
                color="primary"
                variant="outlined"
                prepend-icon="mdi-download"
                class="mb-2 modern-button"
                height="48"
              >
                📥 Export Data
              </v-btn>
              <v-btn
                block
                color="error"
                variant="outlined"
                prepend-icon="mdi-trash-can-outline"
                class="modern-button"
                height="48"
              >
                🗑️ Clear All
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Signal Preview -->
    <v-row v-if="store.currentSignal.timeData.length > 0" class="mb-8">
      <v-col cols="12">
        <v-card class="modern-card">
          <div class="card-header">
            <div
              class="flex-between"
              style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb"
            >
              <div>
                <h3 class="text-h6 font-weight-600">Signal Preview</h3>
                <p class="text-caption text-secondary">
                  {{ store.currentSignal.name }}
                </p>
              </div>
              <v-chip :label="true" color="primary" variant="flat" size="small">
                {{ store.currentSignal.waveType }}
              </v-chip>
            </div>
          </div>
          <v-card-text class="pa-6">
            <canvas id="previewChart"></canvas>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Help Section -->
    <v-row>
      <v-col cols="12">
        <v-alert
          variant="tonal"
          type="info"
          icon="mdi-information-outline"
          color="info"
          title="Getting Started"
          class="modern-card"
        >
          <div class="text-body2">
            ℹ️ Start by creating a new signal in the
            <strong>Generator</strong> tab, analyze it with
            <strong>FFT</strong>, compare multiple signals, and export your
            results!
          </div>
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useSignalStore } from "../stores/signalStore";
import * as storage from "../utils/storage";
import Chart from "chart.js/auto";

const store = useSignalStore();
let chartInstance = null;

// Total signals count
const totalSignals = computed(() => {
  return store.allSessions.reduce((sum, session) => {
    const signals = storage.loadSessionSignals(session.id);
    return sum + signals.length;
  }, 0);
});

// Recent signals - FIX: Load fresh signals from storage
const recentSignals = computed(() => {
  if (!store.currentSession.id) return [];

  // Load fresh signals from storage
  const signals = storage.loadSessionSignals(store.currentSession.id);

  // Return last 5, reversed
  return signals.slice(-5).reverse();
});

// Storage info
const storageInfo = computed(() => {
  const used = new Blob(Object.values(localStorage).map((v) => v.toString()))
    .size;
  const limit = 5242880; // 5MB typical limit
  const percent = Math.round((used / limit) * 100);

  return {
    used: (used / 1024).toFixed(2),
    limit: (limit / 1024).toFixed(2),
    percent: Math.min(percent, 100),
    storageUsage: `${percent}%`,
  };
});

function loadSignal(signalId) {
  store.loadSignal(signalId);
}

function drawChart() {
  try {
    const canvas = document.getElementById("previewChart");
    if (!canvas) {
      console.warn("Canvas element not found");
      return;
    }

    // Destroy old chart
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    const signal = store.currentSignal;
    if (!signal.timeData || signal.timeData.length === 0) {
      console.log("No signal data to display");
      return;
    }

    // Sample data for display (max 500 points)
    const sampleRate = Math.ceil(signal.timeData.length / 500);
    const sampledTime = signal.timeData.filter((_, i) => i % sampleRate === 0);
    const sampledAmplitude = signal.amplitudeData.filter(
      (_, i) => i % sampleRate === 0,
    );

    const isDark = document.documentElement.classList.contains("dark");
    const textColor = isDark ? "#cbd5e1" : "#6b7280";
    const gridColor = isDark
      ? "rgba(100, 116, 139, 0.2)"
      : "rgba(0, 0, 0, 0.1)";

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Canvas context not available");
      return;
    }

    chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: sampledTime.map((t) => t.toFixed(3)),
        datasets: [
          {
            label: signal.name || "Signal",
            data: sampledAmplitude,
            borderColor: "#2563EB",
            backgroundColor: "rgba(37, 99, 235, 0.1)",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            labels: {
              usePointStyle: true,
              padding: 15,
              color: textColor,
            },
          },
        },
        scales: {
          y: {
            grid: {
              color: gridColor,
            },
            ticks: {
              color: textColor,
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: textColor,
            },
          },
        },
      },
    });

    console.log("Chart drawn successfully");
  } catch (error) {
    console.error("Error drawing chart:", error);
  }
}

onMounted(() => {
  setTimeout(() => {
    drawChart();
  }, 100);
});

watch(
  () => store.currentSignal.timeData.length,
  () => {
    drawChart();
  },
  { immediate: true },
);
</script>

<style scoped>
.stat-card {
  position: relative;
  overflow: hidden;
}

.stat-icon {
  font-size: 42px;
  margin-bottom: 12px;
  display: block;
}

.stat-icon.success {
  filter: hue-rotate(120deg) brightness(1.1);
}

.stat-icon.info {
  filter: hue-rotate(240deg) brightness(1.1);
}

.stat-icon.warning {
  filter: hue-rotate(35deg) brightness(1.1);
}

.stat-icon.error {
  filter: hue-rotate(0deg) brightness(1.1);
}

.card-header {
  background: var(--bg-secondary, #f9fafb);
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.dark .card-header {
  background: var(--bg-tertiary, #334155);
}

.recent-item {
  transition: background 0.2s ease;
}

.recent-item:hover {
  background: var(--bg-secondary, #f9fafb);
}

.dark .recent-item:hover {
  background: var(--bg-tertiary, #334155);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.flex-start {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.gap-2 {
  gap: 8px;
}

canvas {
  max-height: 400px;
}

.text-primary {
  color: var(--color-primary, #2563eb);
}

.text-secondary {
  color: var(--text-secondary, #6b7280);
}

.text-tertiary {
  color: var(--text-tertiary, #9ca3af);
}

.dark .text-secondary {
  color: var(--text-secondary, #cbd5e1);
}

.dark .text-tertiary {
  color: var(--text-tertiary, #94a3af);
}
</style>

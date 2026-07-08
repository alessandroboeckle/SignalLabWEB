<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <h2 class="text-h5 font-weight-bold mb-4">Dashboard</h2>
      </v-col>
    </v-row>

    <v-row>
      <!-- Statistics Cards -->
      <v-col cols="12" sm="6" md="3">
        <v-card class="elevation-2">
          <v-card-text>
            <div class="text-disabled text-caption mb-2">Total Sessions</div>
            <div class="text-h4 font-weight-bold">
              {{ store.allSessions.length }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="elevation-2">
          <v-card-text>
            <div class="text-disabled text-caption mb-2">Total Signals</div>
            <div class="text-h4 font-weight-bold">{{ totalSignals }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="elevation-2">
          <v-card-text>
            <div class="text-disabled text-caption mb-2">Current Session</div>
            <div class="text-h6 font-weight-bold text-truncate">
              {{ store.currentSession.name }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="elevation-2">
          <v-card-text>
            <div class="text-disabled text-caption mb-2">Storage Usage</div>
            <div class="text-h6 font-weight-bold">
              {{ storageInfo.storageUsage }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <v-card class="elevation-2">
          <v-card-title>Recent Signals</v-card-title>
          <v-card-text>
            <v-list v-if="recentSignals.length > 0" density="compact">
              <v-list-item v-for="signal in recentSignals" :key="signal.id">
                <template v-slot:prepend>
                  <v-icon small color="primary">mdi-sine-wave</v-icon>
                </template>
                <v-list-item-title>{{ signal.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ signal.waveType }} @ {{ signal.frequency }}Hz
                </v-list-item-subtitle>
                <template v-slot:append>
                  <v-btn icon size="small" @click="loadSignal(signal.id)">
                    <v-icon small>mdi-eye</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
            <div v-else class="text-center text-disabled py-4">
              No signals yet. Create one to get started!
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="elevation-2">
          <v-card-title>Quick Actions</v-card-title>
          <v-card-text>
            <v-btn class="mb-2 w-100" color="primary" prepend-icon="mdi-plus" @click="quickNewSession">
              New Session
            </v-btn>
            <v-btn
              class="mb-2 w-100"
              color="primary"
              variant="outlined"
              prepend-icon="mdi-sine-wave"
              @click="emit('navigate', 'signal')"
            >
              Generate Signal
            </v-btn>
            <v-btn
              class="mb-2 w-100"
              color="primary"
              variant="outlined"
              prepend-icon="mdi-download"
              @click="emit('navigate', 'settings')"
            >
              Export Data
            </v-btn>
            <v-btn
              class="w-100"
              color="primary"
              variant="outlined"
              prepend-icon="mdi-delete"
              @click="emit('navigate', 'settings')"
            >
              Clear All
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Last Generated Signal Preview -->
    <v-row v-if="store.currentSignal.timeData.length > 0" class="mt-4">
      <v-col cols="12">
        <v-card class="elevation-2">
          <v-card-title>Signal Preview</v-card-title>
          <v-card-text>
            <canvas id="previewChart"></canvas>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useSignalStore } from "../stores/signalStore";
import * as storage from "../utils/storage.js";
import Chart from "chart.js/auto";

const store = useSignalStore();
let chart = null;

const emit = defineEmits(["navigate"]);

async function quickNewSession() {
  try {
    await store.createSession("Neue Session");
    emit("navigate", "sessions");
  } catch (e) {
    console.error("New session failed:", e);
  }
}

const totalSignals = computed(() => {
  return store.allSessions.reduce((sum, session) => {
    return sum + storage.loadSessionSignals(session.id).length;
  }, 0);
});

const storageInfo = computed(() => {
  return storage.getStorageInfo();
});

const recentSignals = computed(() => {
  return store.currentSession.signals.slice(-5).reverse();
});

function loadSignal(signalId) {
  store.loadSignal(signalId);
}

function drawChart() {
  const canvas = document.getElementById("previewChart");
  if (!canvas) return;

  if (chart) {
    chart.destroy();
  }

  const signal = store.currentSignal;
  if (signal.timeData.length === 0) return;

  // Sample data for display (max 1000 points)
  const sampleRate = Math.ceil(signal.timeData.length / 1000);
  const sampledTime = signal.timeData.filter((_, i) => i % sampleRate === 0);
  const sampledAmplitude = signal.amplitudeData.filter(
    (_, i) => i % sampleRate === 0,
  );

  chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: sampledTime.map((t) => t.toFixed(3)),
      datasets: [
        {
          label: signal.name,
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
          },
        },
      },
      scales: {
        y: {
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    },
  });
}

onMounted(() => {
  drawChart();
});

watch(
  () => store.currentSignal.timeData.length,
  () => {
    drawChart();
  },
);
</script>

<style scoped>
canvas {
  max-height: 400px;
}
</style>

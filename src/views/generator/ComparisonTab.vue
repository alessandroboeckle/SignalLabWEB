<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <h2 class="text-h5 font-weight-bold mb-4">Signal-Vergleich</h2>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="3">
        <v-card class="elevation-2">
          <v-card-title class="text-h6">Signale auswählen</v-card-title>
          <v-card-text>
            <v-list dense>
              <v-list-item
                v-for="signal in availableSignals"
                :key="signal.id"
                @click="toggleSignalSelection(signal.id)"
                :class="{
                  'bg-primary-light': selectedSignals.includes(signal.id),
                }"
                class="mb-2"
              >
                <template v-slot:prepend>
                  <v-checkbox
                    :model-value="selectedSignals.includes(signal.id)"
                    @click.stop="toggleSignalSelection(signal.id)"
                  ></v-checkbox>
                </template>
                <v-list-item-title class="text-body2">
                  {{ signal.name }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ signal.waveType }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>

            <div
              v-if="availableSignals.length === 0"
              class="text-center text-disabled py-4 text-caption"
            >
              Keine Signale zum Vergleichen vorhanden. Zuerst welche erstellen!
            </div>

            <v-btn
              block
              color="primary"
              class="mt-4"
              :disabled="selectedSignals.length === 0"
              @click="compareSelected"
            >
              Ausgewählte vergleichen
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="9">
        <v-card v-if="comparisonData.length > 0" class="elevation-2">
          <v-card-title class="d-flex align-center">
            Vergleichsergebnisse
            <v-spacer></v-spacer>
            <v-btn size="small" variant="text" prepend-icon="mdi-restore" @click="resetZoomComparison">
              Zoom zurücksetzen
            </v-btn>
          </v-card-title>
          <v-card-text>
            <p class="text-caption text-medium-emphasis mb-2">
              Mausrad = Zoom · Rechteck ziehen = Bereich · Ziehen mit gedrückter Umschalt = verschieben
            </p>
            <canvas id="comparisonChart"></canvas>
          </v-card-text>
        </v-card>

        <v-card v-else class="elevation-2">
          <v-card-text class="text-center text-disabled py-8">
            Signale auswählen und auf "Ausgewählte vergleichen" klicken, um Ergebnisse zu sehen
          </v-card-text>
        </v-card>

        <!-- Statistics Table -->
        <v-card v-if="selectedSignals.length > 0" class="elevation-2 mt-4">
          <v-card-title>Statistik</v-card-title>
          <v-card-text>
            <v-data-table
              :headers="comparisonHeaders"
              :items="selectedSignalObjects"
              density="comfortable"
              items-per-page="-1"
              hide-default-footer
            >
              <template #item.name="{ item }"><strong>{{ item.name }}</strong></template>
              <template #item.meta.rms="{ item }">{{ formatNumber(item.meta?.rms || 0) }}</template>
              <template #item.meta.peak="{ item }">{{ formatNumber(item.meta?.peak || 0) }}</template>
              <template #item.meta.peakToPeak="{ item }">{{ formatNumber(item.meta?.peakToPeak || 0) }}</template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { useSignalStore } from "../../stores/signalStore";
import * as storage from "../../utils/storage";
import Chart from "../../utils/chartSetup.js";
import { applyZoomLimits } from "../../utils/chartInteractionMath.js";

const store = useSignalStore();
const selectedSignals = ref([]);
const comparisonData = ref([]);
let comparisonChart = null;

const availableSignals = computed(() => {
  return store.currentSession.signals;
});

const selectedSignalObjects = computed(() => {
  return selectedSignals.value
    .map((id) => storage.loadSignal(id))
    .filter(Boolean);
});

const colors = [
  "#2563EB",
  "#FF6B35",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
];

function toggleSignalSelection(signalId) {
  const index = selectedSignals.value.indexOf(signalId);
  if (index >= 0) {
    selectedSignals.value.splice(index, 1);
  } else {
    selectedSignals.value.push(signalId);
  }
}

async function compareSelected() {
  const signals = store.compareSignals(selectedSignals.value);
  comparisonData.value = signals;
  // The canvas only exists once Vue has actually rendered the v-if block
  // above (which depends on comparisonData) — drawing immediately after
  // setting the data would find no canvas yet and silently do nothing.
  await nextTick();
  drawComparisonChart();
}

function drawComparisonChart() {
  const canvas = document.getElementById("comparisonChart");
  if (!canvas) return;

  if (comparisonChart) {
    comparisonChart.destroy();
  }

  if (comparisonData.value.length === 0) return;

  // Use the first signal as time reference
  const timeData = comparisonData.value[0].timeData;
  const sampleRate = Math.ceil(timeData.length / 500);
  const sampledTime = timeData.filter((_, i) => i % sampleRate === 0);

  const datasets = comparisonData.value.map((signal, idx) => {
    const sampledAmplitude = signal.amplitudeData.filter(
      (_, i) => i % sampleRate === 0,
    );
    return {
      label: signal.name,
      data: sampledTime.map((t, i) => ({ x: t, y: sampledAmplitude[i] })),
      borderColor: colors[idx % colors.length],
      backgroundColor: "transparent",
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.4,
    };
  });

  comparisonChart = new Chart(canvas, {
    type: "line",
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: false,
      parsing: false,
      plugins: {
        legend: {
          display: true,
          labels: { usePointStyle: true },
        },
        zoom: {
          wheel: { enabled: true },
          drag: { enabled: true, backgroundColor: "rgba(37,99,235,0.15)" },
          mode: "x",
          limits: { x: {} },
        },
        pan: {
          enabled: true,
          mode: "x",
          modifierKey: "shift",
        },
      },
      scales: {
        y: {
          title: {
            display: true,
            text: "Amplitude",
          },
        },
        x: {
          type: "linear",
          title: {
            display: true,
            text: "Zeit [s]",
          },
        },
      },
    },
  });
  applyZoomLimits(comparisonChart);
}

function resetZoomComparison() {
  if (comparisonChart) comparisonChart.resetZoom();
}

const comparisonHeaders = [
  { title: "Signalname", key: "name" },
  { title: "Typ", key: "waveType" },
  { title: "Frequenz (Hz)", key: "frequency", align: "end" },
  { title: "RMS", key: "meta.rms", align: "end" },
  { title: "Spitzenwert", key: "meta.peak", align: "end" },
  { title: "Spitze-Spitze", key: "meta.peakToPeak", align: "end" },
];

function formatNumber(num) {
  return typeof num === "number" ? num.toFixed(3) : "0";
}

watch(
  selectedSignals,
  () => {
    if (selectedSignals.value.length === 0) {
      comparisonData.value = [];
    }
  },
  { deep: true },
);
</script>

<style scoped>
canvas {
  max-height: 400px;
}

.bg-primary-light {
  background-color: rgba(37, 99, 235, 0.1);
}
</style>

<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-chart-bell-curve</v-icon>
      <h2 class="text-h4 font-weight-bold">Analyse</h2>
    </div>
    <p class="text-medium-emphasis mb-6">Statistik, Ableitung, Integral & FFT</p>

    <!-- No data loaded -->
    <v-card v-if="!mtStore.parsed" variant="outlined" rounded="lg" class="pa-8 text-center">
      <v-icon size="56" color="grey-lighten-1" class="mb-3">mdi-file-question-outline</v-icon>
      <h3 class="text-h6 mb-2">Keine Messdatei geladen</h3>
      <p class="text-medium-emphasis">Lade zuerst im Bereich <strong>Import</strong> eine Datei.</p>
    </v-card>

    <template v-else>
      <!-- Signal + options -->
      <v-row class="mb-2">
        <v-col cols="12" md="6">
          <v-select
            v-model="selectedIdx"
            :items="signalOptions"
            label="Signal"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-sine-wave"
          ></v-select>
        </v-col>
        <v-col cols="12" md="6">
          <v-select
            v-model="windowType"
            :items="windowOptions"
            label="FFT-Fenster"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-window-maximize"
          ></v-select>
        </v-col>
      </v-row>

      <!-- Stats -->
      <v-row class="mb-4">
        <v-col v-for="stat in stats" :key="stat.label" cols="6" sm="4" md="2">
          <v-card variant="tonal" color="primary" class="pa-3 text-center">
            <div class="text-h6 font-weight-bold">{{ stat.value }}</div>
            <div class="text-caption">{{ stat.label }}</div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Charts -->
      <v-row>
        <v-col cols="12" md="6">
          <v-card variant="outlined" rounded="lg" class="mb-4">
            <v-card-title class="text-subtitle-1">Signal & Ableitung</v-card-title>
            <v-divider></v-divider>
            <v-card-text><canvas ref="derivCanvas" height="260"></canvas></v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card variant="outlined" rounded="lg" class="mb-4">
            <v-card-title class="text-subtitle-1">Integral</v-card-title>
            <v-divider></v-divider>
            <v-card-text><canvas ref="integralCanvas" height="260"></canvas></v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12">
          <v-card variant="outlined" rounded="lg">
            <v-card-title class="text-subtitle-1">Frequenzspektrum (FFT)</v-card-title>
            <v-divider></v-divider>
            <v-card-text><canvas ref="fftCanvas" height="220"></canvas></v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import Chart from "chart.js/auto";
import { useMesstoolStore } from "../../stores/messtoolStore.js";
import * as A from "../../utils/messtoolAnalysis.js";

const mtStore = useMesstoolStore();

const selectedIdx = ref(0);
const windowType = ref("hann");
const derivCanvas = ref(null);
const integralCanvas = ref(null);
const fftCanvas = ref(null);
let charts = { deriv: null, integral: null, fft: null };

const windowOptions = [
  { title: "Hann", value: "hann" },
  { title: "Hamming", value: "hamming" },
  { title: "Rechteck (keins)", value: "none" },
];

const signalOptions = computed(() => {
  if (!mtStore.parsed) return [];
  return mtStore.parsed.signals.map((s, i) => ({
    title: `${s.name} [${s.unit || "-"}]`,
    value: i,
  }));
});

const sig = computed(() =>
  mtStore.parsed ? mtStore.parsed.signals[selectedIdx.value] : null,
);
const time = computed(() => (mtStore.parsed ? mtStore.parsed.time : []));

const stats = computed(() => {
  if (!sig.value) return [];
  const y = sig.value.data.filter((v) => v != null && Number.isFinite(v));
  const mm = A.minMax(y);
  const u = sig.value.unit || "";
  const f = (v) => (v == null ? "-" : v.toFixed(3));
  return [
    { label: `Mittel [${u}]`, value: f(A.mean(y)) },
    { label: `RMS [${u}]`, value: f(A.rms(y)) },
    { label: `Std [${u}]`, value: f(A.stddev(y)) },
    { label: `Varianz`, value: f(A.variance(y)) },
    { label: `Min [${u}]`, value: f(mm.min) },
    { label: `Max [${u}]`, value: f(mm.max) },
  ];
});

// downsample helper for plotting
function down(arr, xs) {
  const step = Math.max(1, Math.ceil(arr.length / 800));
  const rx = [], ry = [];
  for (let i = 0; i < arr.length; i += step) {
    rx.push(xs[i]);
    ry.push(arr[i]);
  }
  return { rx, ry };
}

function destroyCharts() {
  for (const k of Object.keys(charts)) {
    if (charts[k]) { charts[k].destroy(); charts[k] = null; }
  }
}

function drawAll() {
  if (!sig.value) return;
  destroyCharts();

  const y = sig.value.data.map((v) => (v == null ? 0 : v));
  const t = time.value;
  const unit = sig.value.unit || "";

  // Signal + derivative (two y-axes)
  const deriv = A.derivative(y, t);
  const sD = down(y, t);
  const dD = down(deriv, t);
  charts.deriv = new Chart(derivCanvas.value.getContext("2d"), {
    type: "line",
    data: {
      labels: sD.rx,
      datasets: [
        { label: `Signal [${unit}]`, data: sD.ry, borderColor: "#2563EB", borderWidth: 1.5, pointRadius: 0, yAxisID: "y" },
        { label: `Ableitung [${unit}/s]`, data: dD.ry, borderColor: "#FF6B35", borderWidth: 1, pointRadius: 0, yAxisID: "y1" },
      ],
    },
    options: {
      responsive: true, animation: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: { title: { display: true, text: "Zeit [s]" }, ticks: { maxTicksLimit: 8 } },
        y: { position: "left", title: { display: true, text: unit } },
        y1: { position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: `${unit}/s` } },
      },
    },
  });

  // Integral
  const integ = A.integral(y, t);
  const iD = down(integ, t);
  charts.integral = new Chart(integralCanvas.value.getContext("2d"), {
    type: "line",
    data: {
      labels: iD.rx,
      datasets: [{ label: `∫ [${unit}·s]`, data: iD.ry, borderColor: "#10B981", backgroundColor: "rgba(16,185,129,0.08)", borderWidth: 1.5, pointRadius: 0, fill: true }],
    },
    options: {
      responsive: true, animation: false,
      scales: {
        x: { title: { display: true, text: "Zeit [s]" }, ticks: { maxTicksLimit: 8 } },
        y: { title: { display: true, text: `${unit}·s` } },
      },
    },
  });

  // FFT
  const { freq, amp } = A.fft(y, t, { windowType: windowType.value, normalize: true });
  const fD = down(amp, freq);
  charts.fft = new Chart(fftCanvas.value.getContext("2d"), {
    type: "line",
    data: {
      labels: fD.rx.map((f) => f.toFixed(1)),
      datasets: [{ label: "Amplitude", data: fD.ry, borderColor: "#7C3AED", backgroundColor: "rgba(124,58,237,0.08)", borderWidth: 1, pointRadius: 0, fill: true }],
    },
    options: {
      responsive: true, animation: false,
      scales: {
        x: { title: { display: true, text: "Frequenz [Hz]" }, ticks: { maxTicksLimit: 12 } },
        y: { title: { display: true, text: `Amplitude [${unit}]` } },
      },
    },
  });
}

watch([selectedIdx, windowType], async () => { await nextTick(); drawAll(); });
watch(() => mtStore.parsed, async () => { selectedIdx.value = 0; await nextTick(); drawAll(); });

onMounted(async () => { await nextTick(); drawAll(); });
onBeforeUnmount(destroyCharts);
</script>

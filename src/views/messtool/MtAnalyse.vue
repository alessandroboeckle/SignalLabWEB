<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-chart-bell-curve</v-icon>
      <h2 class="text-h4 font-weight-bold">Analyse</h2>
    </div>
    <p class="text-medium-emphasis mb-6">Statistik, Ableitung, Integral & FFT</p>

    <v-card v-if="!mtStore.parsed" variant="outlined" rounded="lg" class="pa-8 text-center">
      <v-icon size="56" color="grey-lighten-1" class="mb-3">mdi-file-question-outline</v-icon>
      <h3 class="text-h6 mb-2">Keine Messdatei geladen</h3>
      <p class="text-medium-emphasis">Lade zuerst im Bereich <strong>Import</strong> eine Datei.</p>
    </v-card>

    <template v-else>
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

      <v-row class="mb-4">
        <v-col v-for="stat in stats" :key="stat.label" cols="6" sm="4" md="2">
          <v-card variant="tonal" color="primary" class="pa-3 text-center">
            <div class="text-h6 font-weight-bold">{{ stat.value }}</div>
            <div class="text-caption">{{ stat.label }}</div>
          </v-card>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" md="6">
          <ChartCard title="Signal & Ableitung" :config="derivConfig" :height="260" />
        </v-col>
        <v-col cols="12" md="6">
          <ChartCard title="Integral" :config="integralConfig" :height="260" />
        </v-col>
        <v-col cols="12">
          <ChartCard title="Frequenzspektrum (FFT)" :config="fftConfig" :height="240" />
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { ref, computed } from "vue";
import { useMesstoolStore } from "../../stores/messtoolStore.js";
import * as A from "../../utils/messtoolAnalysis.js";
import ChartCard from "./ChartCard.vue";
import { downsample } from "../../utils/downsample.js";

const mtStore = useMesstoolStore();

const selectedIdx = ref(0);
const windowType = ref(mtStore.fftWindowDefault || "hann");

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

function down(arr, xs, mode) {
  return downsample(arr, xs, mode ? 'minmax' : 'simple', 800);
}

// Each config is a computed returning a FRESH function.
// When signal/window/data changes, the function identity changes and
// ChartCard rebuilds automatically.

const derivConfig = computed(() => {
  const s = sig.value, t = time.value;
  return (peakMode) => {
    if (!s) return { type: "line", data: { labels: [], datasets: [] } };
    const y = s.data.map((v) => (v == null ? 0 : v));
    const unit = s.unit || "";
    const deriv = A.derivative(y, t);
    const sD = down(y, t, peakMode), dD = down(deriv, t, peakMode);
    return {
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
    };
  };
});

const integralConfig = computed(() => {
  const s = sig.value, t = time.value;
  return (peakMode) => {
    if (!s) return { type: "line", data: { labels: [], datasets: [] } };
    const y = s.data.map((v) => (v == null ? 0 : v));
    const unit = s.unit || "";
    const integ = A.integral(y, t);
    const iD = down(integ, t, peakMode);
    return {
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
    };
  };
});

const fftConfig = computed(() => {
  const s = sig.value, t = time.value, wt = windowType.value;
  return (peakMode) => {
    if (!s) return { type: "line", data: { labels: [], datasets: [] } };
    const y = s.data.map((v) => (v == null ? 0 : v));
    const unit = s.unit || "";
    const { freq, amp } = A.fft(y, t, { windowType: wt, normalize: true });
    const fD = down(amp, freq, peakMode);
    return {
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
    };
  };
});
</script>

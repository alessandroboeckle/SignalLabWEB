<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-chart-bell-curve</v-icon>
      <h2 class="text-h5 font-weight-bold">Analyse</h2>
    </div>
    <p class="text-medium-emphasis mb-6">Statistik, Ableitung, Integral & FFT</p>

    <v-card v-if="!mtStore.parsed" variant="outlined" rounded="lg" class="pa-8 text-center">
      <v-icon size="56" color="grey-lighten-1" class="mb-3">mdi-file-question-outline</v-icon>
      <h3 class="text-h6 mb-2">Keine Messdatei geladen</h3>
      <p class="text-medium-emphasis mb-4">Lade zuerst im Bereich <strong>Import</strong> eine Datei.</p>
      <v-btn size="small" color="primary" variant="tonal" prepend-icon="mdi-file-upload" @click="$emit('navigate', 'mt-import')">
        Zu Import
      </v-btn>
    </v-card>

    <template v-else>
      <MtQuickNav
        :items="[
          { target: 'mt-verarbeitung', label: 'Verarbeitung', icon: 'mdi-cog-transfer' },
          { target: 'mt-filter', label: 'Filter', icon: 'mdi-tune-variant' },
        ]"
        @navigate="$emit('navigate', $event)"
      />
      <v-row class="mb-2">
        <v-col cols="12" md="6">
          <v-autocomplete
            v-model="selectedIdx"
            :items="signalOptions"
            label="Signal"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-sine-wave"
            hint="↑ / ↓ zum Durchblättern"
            persistent-hint
          ></v-autocomplete>
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

      <v-row dense class="mb-2 align-center">
        <v-col cols="6" sm="3">
          <v-text-field
            v-model.number="zeitbereichStart"
            type="number"
            label="Zeitbereich Start [s]"
            placeholder="Anfang"
            variant="outlined"
            density="compact"
            hide-details
          ></v-text-field>
        </v-col>
        <v-col cols="6" sm="3">
          <v-text-field
            v-model.number="zeitbereichEnd"
            type="number"
            label="Zeitbereich Ende [s]"
            placeholder="Ende"
            variant="outlined"
            density="compact"
            hide-details
          ></v-text-field>
        </v-col>
        <v-col cols="12" sm="6" class="d-flex align-center ga-2">
          <v-btn
            v-if="zeitbereichStart != null || zeitbereichEnd != null"
            size="small"
            variant="text"
            prepend-icon="mdi-backup-restore"
            @click="zeitbereichStart = null; zeitbereichEnd = null"
          >
            Ganze Datei
          </v-btn>
          <span v-if="zeitbereichStart != null || zeitbereichEnd != null" class="text-caption text-medium-emphasis">
            Statistik/Ableitung/Integral/FFT gelten nur für diesen Zeitbereich
          </span>
        </v-col>
      </v-row>

      <v-row dense class="mb-2">
        <v-col cols="auto">
          <v-switch v-model="showAvgLine" color="success" density="compact" hide-details label="Mittelwert-Linie"></v-switch>
        </v-col>
        <v-col cols="auto">
          <v-switch v-model="showRmsLine" color="secondary" density="compact" hide-details label="RMS-Linie"></v-switch>
        </v-col>
        <v-col cols="auto">
          <v-switch v-model="showStdBand" color="primary" density="compact" hide-details label="±1σ-Band"></v-switch>
        </v-col>
      </v-row>

      <v-card variant="outlined" rounded="lg" class="mb-4">
        <v-card-title class="d-flex align-center ga-2">
          <v-icon size="20">mdi-target</v-icon>
          Automatische Ereignis-Erkennung
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-row dense align="center">
            <v-col cols="6" sm="3">
              <v-text-field
                v-model.number="eventThreshold"
                type="number"
                label="Schwellwert"
                variant="outlined"
                density="compact"
                hide-details
              ></v-text-field>
            </v-col>
            <v-col cols="6" sm="3">
              <v-select
                v-model="eventMode"
                :items="[
                  { title: 'Betrag über', value: 'abs' },
                  { title: 'Über', value: 'above' },
                  { title: 'Unter', value: 'below' },
                ]"
                label="Modus"
                variant="outlined"
                density="compact"
                hide-details
              ></v-select>
            </v-col>
            <v-col cols="12" sm="6">
              <v-btn color="primary" variant="tonal" prepend-icon="mdi-magnify-scan" @click="runEventDetection">
                Ereignisse finden
              </v-btn>
              <v-btn
                v-if="foundEvents.length"
                variant="text"
                prepend-icon="mdi-map-marker-multiple-outline"
                class="ml-2"
                @click="markAllEvents"
              >
                Alle als Marker setzen
              </v-btn>
            </v-col>
          </v-row>

          <v-alert v-if="eventSearchDone && foundEvents.length === 0" type="info" variant="tonal" density="compact" class="mt-3">
            Keine Ereignisse über diesem Schwellwert gefunden.
          </v-alert>

          <v-table v-if="foundEvents.length" density="compact" class="mt-3">
            <thead>
              <tr>
                <th>Start [s]</th>
                <th>Ende [s]</th>
                <th>Dauer [s]</th>
                <th>Spitzenwert</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(ev, i) in foundEvents" :key="i">
                <td>{{ ev.startTime.toFixed(2) }}</td>
                <td>{{ ev.endTime.toFixed(2) }}</td>
                <td>{{ ev.durationSec.toFixed(2) }}</td>
                <td>{{ ev.peakValue.toFixed(3) }}</td>
                <td>
                  <v-btn size="x-small" variant="text" prepend-icon="mdi-map-marker-outline" @click="markEvent(ev, i)">
                    Marker
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>

      <v-row class="mb-4">
        <v-col v-for="stat in stats" :key="stat.label" cols="6" sm="4" md="2">
          <v-card variant="tonal" color="primary" class="pa-3 text-center">
            <div class="text-h6 font-weight-bold">{{ stat.value }}</div>
            <div class="text-caption">{{ stat.label }}</div>
          </v-card>
        </v-col>
      </v-row>

      <v-expansion-panels class="mb-4" variant="accordion">
        <v-expansion-panel>
          <v-expansion-panel-title>
            <v-icon class="mr-2" size="20">mdi-table-eye</v-icon>
            Signal-Übersicht — alle {{ mtStore.parsed.signals.length }} Signale auf einen Blick
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-data-table
              :headers="overviewHeaders"
              :items="allSignalStats"
              density="compact"
              items-per-page="10"
              @click:row="onOverviewRowClick"
            >
              <template #item.name="{ item }">
                <span :class="{ 'font-weight-bold text-primary': item.idx === selectedIdx }">
                  {{ item.name }}
                </span>
              </template>
            </v-data-table>
            <p class="text-caption text-medium-emphasis mt-2">
              Auf eine Zeile klicken, um dieses Signal oben auszuwählen.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <v-row>
        <v-col cols="12" md="6">
          <ChartCard title="Signal & Ableitung" :config="derivConfig" :height="260" sync-group="analyse-zeit" />
        </v-col>
        <v-col cols="12" md="6">
          <ChartCard title="Integral" :config="integralConfig" :height="260" sync-group="analyse-zeit" />
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
import { useSignalNavigationShortcuts } from "../../composables/useSignalNavigation.js";
import * as A from "../../utils/messtoolAnalysis.js";
import { findWindowBounds } from "../../utils/timeWindow.js";
import { findEvents } from "../../utils/eventDetection.js";
import ChartCard from "./ChartCard.vue";
import MtQuickNav from "./MtQuickNav.vue";
import { downsample } from "../../utils/downsample.js";

defineEmits(["navigate"]);

const mtStore = useMesstoolStore();
useSignalNavigationShortcuts(mtStore);

const overviewHeaders = [
  { title: "Signal", key: "name" },
  { title: "Einheit", key: "unit" },
  { title: "Mittel", key: "mean", align: "end" },
  { title: "RMS", key: "rms", align: "end" },
  { title: "Std", key: "std", align: "end" },
  { title: "Min", key: "min", align: "end" },
  { title: "Max", key: "max", align: "end" },
];

// Computed once per loaded file (Vue memoizes this — it only re-runs when
// mtStore.parsed changes, not on every render), so opening the panel is
// instant even though it covers every signal in the file.
const allSignalStats = computed(() => {
  if (!mtStore.parsed) return [];
  return mtStore.parsed.signals.map((s, idx) => {
    const y = s.data.filter((v) => v != null && Number.isFinite(v));
    const mm = A.minMax(y);
    const fmt = (v) => (v == null ? "-" : v.toFixed(3));
    return {
      idx,
      name: s.name,
      unit: s.unit || "-",
      mean: fmt(A.mean(y)),
      rms: fmt(A.rms(y)),
      std: fmt(A.stddev(y)),
      min: fmt(mm.min),
      max: fmt(mm.max),
    };
  });
});

function onOverviewRowClick(_event, { item }) {
  selectedIdx.value = item.idx;
}

// Shared across Analyse/Filter/Verarbeitung/Export so switching pages
// keeps showing the same signal instead of resetting to the first one.
const selectedIdx = computed({
  get: () => mtStore.selectedSignalIdx,
  set: (v) => { mtStore.selectedSignalIdx = v; },
});
const windowType = ref(mtStore.fftWindowDefault || "hann");

const windowOptions = [
  { title: "Hann", value: "hann" },
  { title: "Hamming", value: "hamming" },
  { title: "Blackman", value: "blackman" },
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

// Optional time window (seconds) restricting stats/derivative/integral/FFT
// to a slice of the recording instead of always the whole file — e.g.
// "just the braking event between t=10s and t=25s".
const zeitbereichStart = ref(null);
const zeitbereichEnd = ref(null);
const showAvgLine = ref(false);
const showRmsLine = ref(false);
const showStdBand = ref(false);

const eventThreshold = ref(null);
const eventMode = ref("abs");
const foundEvents = ref([]);
const eventSearchDone = ref(false);

function runEventDetection() {
  eventSearchDone.value = true;
  foundEvents.value = [];
  if (!sig.value || eventThreshold.value == null) return;
  const { y, t } = windowedYT(sig.value, time.value);
  foundEvents.value = findEvents(y, t, eventThreshold.value, { mode: eventMode.value });
}

function markEvent(ev, i) {
  mtStore.addMarker(ev.peakTime, `Ereignis ${i + 1}: Spitze ${ev.peakValue.toFixed(2)}`);
}

function markAllEvents() {
  foundEvents.value.forEach((ev, i) => markEvent(ev, i));
}

// Slices a signal's data + the shared time array down to the current
// Zeitbereich window (or returns them unchanged if no window is set).
function windowedYT(s, t) {
  const [i0, i1] = findWindowBounds(t, zeitbereichStart.value, zeitbereichEnd.value);
  return { y: s.data.slice(i0, i1).map((v) => (v == null ? 0 : v)), t: t.slice(i0, i1) };
}

const stats = computed(() => {
  if (!sig.value) return [];
  const [i0, i1] = findWindowBounds(time.value, zeitbereichStart.value, zeitbereichEnd.value);
  const y = sig.value.data.slice(i0, i1).filter((v) => v != null && Number.isFinite(v));
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
  // read here (not just inside the returned function below) so changing
  // the Zeitbereich actually triggers ChartCard to rebuild
  void zeitbereichStart.value; void zeitbereichEnd.value;
  void showAvgLine.value; void showRmsLine.value; void showStdBand.value;
  return (peakMode) => {
    if (!s) return { type: "line", data: { labels: [], datasets: [] } };
    const { y, t: wt } = windowedYT(s, t);
    const unit = s.unit || "";
    const deriv = A.derivative(y, wt);
    const sD = down(y, wt, peakMode), dD = down(deriv, wt, peakMode);

    const validY = y.filter((v) => Number.isFinite(v));
    const meanVal = A.mean(validY);
    const rmsVal = A.rms(validY);
    const stdVal = A.stddev(validY);

    const datasets = [];
    // ±1σ band drawn first (as two filled boundary lines) so the signal
    // line renders on top of it, not hidden underneath.
    if (showStdBand.value && meanVal != null && stdVal != null) {
      datasets.push({
        label: "Mittel + 1σ", data: sD.rx.map(() => meanVal + stdVal),
        borderColor: "rgba(37,99,235,0.25)", borderWidth: 1, pointRadius: 0,
        yAxisID: "y", fill: "+1",
        backgroundColor: "rgba(37,99,235,0.1)",
      });
      datasets.push({
        label: "Mittel − 1σ", data: sD.rx.map(() => meanVal - stdVal),
        borderColor: "rgba(37,99,235,0.25)", borderWidth: 1, pointRadius: 0,
        yAxisID: "y", fill: false,
      });
    }
    datasets.push({ label: `Signal [${unit}]`, data: sD.ry, borderColor: "#2563EB", borderWidth: 1.5, pointRadius: 0, yAxisID: "y" });
    datasets.push({ label: `Ableitung [${unit}/s]`, data: dD.ry, borderColor: "#FF6B35", borderWidth: 1, pointRadius: 0, yAxisID: "y1" });
    if (showAvgLine.value && meanVal != null) {
      datasets.push({
        label: `Mittelwert [${unit}]`, data: sD.rx.map(() => meanVal),
        borderColor: "#10B981", borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0, yAxisID: "y",
      });
    }
    if (showRmsLine.value && rmsVal != null) {
      datasets.push({
        label: `RMS [${unit}]`, data: sD.rx.map(() => rmsVal),
        borderColor: "#DB2777", borderWidth: 1.5, borderDash: [2, 3], pointRadius: 0, yAxisID: "y",
      });
    }

    return {
      type: "line",
      data: { labels: sD.rx, datasets },
      options: {
        responsive: true, animation: false,
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
  void zeitbereichStart.value; void zeitbereichEnd.value;
  return (peakMode) => {
    if (!s) return { type: "line", data: { labels: [], datasets: [] } };
    const { y, t: wt2 } = windowedYT(s, t);
    const unit = s.unit || "";
    const integ = A.integral(y, wt2);
    const iD = down(integ, wt2, peakMode);
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
  void zeitbereichStart.value; void zeitbereichEnd.value;
  return (peakMode) => {
    if (!s) return { type: "line", data: { labels: [], datasets: [] } };
    const { y, t: wt3 } = windowedYT(s, t);
    const unit = s.unit || "";
    const { freq, amp } = A.fft(y, wt3, { windowType: wt, normalize: true });
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

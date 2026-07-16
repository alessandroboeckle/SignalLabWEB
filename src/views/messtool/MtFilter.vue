<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-tune-variant</v-icon>
      <h2 class="text-h5 font-weight-bold">Filter</h2>
    </div>
    <p class="text-medium-emphasis mb-6">Digitale Filter – Butterworth, Chebyshev I, Bessel · nullphasig</p>

    <v-card v-if="!mtStore.parsed" variant="outlined" rounded="lg" class="pa-8 text-center">
      <v-icon size="56" color="grey-lighten-1" class="mb-3">mdi-file-question-outline</v-icon>
      <h3 class="text-h6 mb-2">Keine Messdatei geladen</h3>
      <p class="text-medium-emphasis">Lade zuerst im Bereich <strong>Import</strong> eine Datei.</p>
    </v-card>

    <template v-else>
      <v-row>
        <v-col cols="12" md="4">
          <v-card variant="outlined" rounded="lg" class="pa-4">
            <div class="d-flex flex-wrap ga-2 mb-3">
              <v-btn size="small" variant="outlined" prepend-icon="mdi-file-delimited-outline" :disabled="!sig" @click="exportCsv">
                CSV
              </v-btn>
            </div>

            <v-alert type="info" variant="tonal" density="compact" class="text-caption mb-3">
              Diese Einstellungen gehören zur aktuellen Datei und bleiben beim Seitenwechsel
              erhalten. Auf der Seite <strong>Sessions</strong> kannst du sie zusammen mit der
              Datei benannt speichern (auch geteilt mit Kollegen).
            </v-alert>

            <v-autocomplete
              v-model="selectedIdx"
              :items="signalOptions"
              label="Signal"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-sine-wave"
              class="mb-3"
              hint="↑ / ↓ zum Durchblättern"
              persistent-hint
            ></v-autocomplete>

            <v-select
              v-model="characteristic"
              :items="charOptions"
              label="Charakteristik"
              variant="outlined"
              density="comfortable"
              class="mb-3"
            ></v-select>

            <v-select
              v-model="btype"
              :items="btypeOptions"
              label="Filtertyp"
              variant="outlined"
              density="comfortable"
              class="mb-3"
            ></v-select>

            <v-text-field
              v-if="characteristic === 'elliptic'"
              v-model.number="stopbandDb"
              type="number"
              label="Sperrdämpfung [dB]"
              variant="outlined"
              density="comfortable"
              class="mb-3"
            ></v-text-field>

            <v-select
              v-model="order"
              :items="[2,3,4,5,6,8]"
              label="Ordnung"
              variant="outlined"
              density="comfortable"
              class="mb-3"
            ></v-select>

            <v-text-field
              v-model.number="cutoff"
              type="number"
              :label="btype === 'band' ? 'Untere Grenzfrequenz [Hz]' : 'Grenzfrequenz [Hz]'"
              variant="outlined"
              density="comfortable"
              class="mb-3"
            ></v-text-field>

            <v-text-field
              v-if="btype === 'band'"
              v-model.number="cutoff2"
              type="number"
              label="Obere Grenzfrequenz [Hz]"
              variant="outlined"
              density="comfortable"
              class="mb-3"
            ></v-text-field>

            <v-alert type="info" variant="tonal" density="compact" class="text-caption mb-2">
              Abtastrate: {{ sampleRate.toFixed(1) }} Hz · Nyquist: {{ (sampleRate/2).toFixed(1) }} Hz
            </v-alert>

            <v-alert
              v-if="cutoffWarning"
              type="warning"
              variant="tonal"
              density="compact"
              class="text-caption"
            >
              {{ cutoffWarning }}
            </v-alert>
          </v-card>
        </v-col>

        <v-col cols="12" md="8">
          <ChartCard title="Original vs. Gefiltert" :config="filterConfig" :height="440" />
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useMesstoolStore } from "../../stores/messtoolStore.js";
import { useSignalNavigationShortcuts } from "../../composables/useSignalNavigation.js";
import { applyFilter } from "../../utils/messtoolFilter.js";
import { buildCsv, downloadCsv } from "../../utils/csvExport.js";
import { showToast } from "../../composables/useToast.js";
import ChartCard from "./ChartCard.vue";
import { downsample } from "../../utils/downsample.js";

const mtStore = useMesstoolStore();
useSignalNavigationShortcuts(mtStore);

// Shared across Analyse/Filter/Verarbeitung/Export so switching pages
// keeps showing the same signal instead of resetting to the first one.
const selectedIdx = computed({
  get: () => mtStore.selectedSignalIdx,
  set: (v) => { mtStore.selectedSignalIdx = v; },
});

// Filter settings live locally (v-model needs plain refs for the sliders/
// selects) but are seeded from — and kept in sync with — the shared store,
// so they survive page switches and get picked up by Sessions.
const fs0 = mtStore.filterSettings;
const characteristic = ref(fs0.characteristic);
const btype = ref(fs0.btype);
const order = ref(fs0.order);
const cutoff = ref(fs0.cutoff);
const cutoff2 = ref(fs0.cutoff2);
const stopbandDb = ref(fs0.stopbandDb);

let applyingExternal = false;
watch([characteristic, btype, order, cutoff, cutoff2, stopbandDb], () => {
  if (applyingExternal) return;
  mtStore.filterSettings = {
    characteristic: characteristic.value, btype: btype.value, order: order.value,
    cutoff: cutoff.value, cutoff2: cutoff2.value, stopbandDb: stopbandDb.value,
  };
});
// Re-seed if something else (a Session load) replaces the shared settings
// while this page happens to already be open.
watch(() => mtStore.filterSettings, (s) => {
  applyingExternal = true;
  characteristic.value = s.characteristic;
  btype.value = s.btype;
  order.value = s.order;
  cutoff.value = s.cutoff;
  cutoff2.value = s.cutoff2;
  stopbandDb.value = s.stopbandDb;
  applyingExternal = false;
});

function exportCsv() {
  if (!sig.value) return;
  const s = sig.value, t = time.value;
  const y = s.data.map((v) => (v == null ? 0 : v));
  let filtered;
  try {
    filtered = applyFilter(y, {
      order: order.value, cutoffHz: cutoff.value, cutoff2Hz: cutoff2.value,
      sampleRate: sampleRate.value, btype: btype.value,
      characteristic: characteristic.value, rs: stopbandDb.value,
    });
  } catch {
    filtered = y.slice();
  }
  const csv = buildCsv(t, [
    { name: "Original", unit: s.unit, data: y },
    { name: "Gefiltert", unit: s.unit, data: filtered },
  ]);
  downloadCsv(csv, `${s.name.replace(/[^\w.-]+/g, "_")}_gefiltert.csv`);
  showToast("CSV heruntergeladen.");
}

const charOptions = [
  { title: "Butterworth", value: "butterworth" },
  { title: "Chebyshev I", value: "cheby1" },
  { title: "Bessel", value: "bessel" },
  { title: "Elliptic (Cauer)", value: "elliptic" },
];

const btypeOptions = [
  { title: "Tiefpass", value: "low" },
  { title: "Hochpass", value: "high" },
  { title: "Bandpass", value: "band" },
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

const sampleRate = computed(() => {
  const t = time.value;
  if (!t || t.length < 2) return 1;
  return (t.length - 1) / (t[t.length - 1] - t[0]);
});

// Warn when a cutoff is at/above Nyquist (filter can't work there).
const cutoffWarning = computed(() => {
  const nyq = sampleRate.value / 2;
  const maxHz = (nyq * 0.95).toFixed(2); // safe practical max
  if (btype.value === "band") {
    if (cutoff2.value >= nyq || cutoff.value >= nyq) {
      return `Grenzfrequenz zu hoch! Bei dieser Datei muss sie unter der Nyquist-Frequenz (${nyq.toFixed(2)} Hz) liegen. Empfohlen: max. ${maxHz} Hz.`;
    }
    if (cutoff.value >= cutoff2.value) {
      return "Untere Grenzfrequenz muss kleiner als die obere sein.";
    }
  } else {
    if (cutoff.value >= nyq) {
      return `Grenzfrequenz zu hoch! Bei dieser Datei muss sie unter der Nyquist-Frequenz (${nyq.toFixed(2)} Hz) liegen. Empfohlen: max. ${maxHz} Hz. — Der Filter macht sonst nichts.`;
    }
  }
  return "";
});

function down(arr, xs, mode) {
  return downsample(arr, xs, mode ? 'minmax' : 'simple', 800);
}

const filterConfig = computed(() => {
  const s = sig.value, t = time.value, fs = sampleRate.value;
  const bt = btype.value, ord = order.value, c1 = cutoff.value, c2 = cutoff2.value;
  const char = characteristic.value, rs = stopbandDb.value;
  return (peakMode) => {
    if (!s) return { type: "line", data: { labels: [], datasets: [] } };
    const y = s.data.map((v) => (v == null ? 0 : v));
    const unit = s.unit || "";
    let filtered;
    try {
      filtered = applyFilter(y, {
        order: ord, cutoffHz: c1, cutoff2Hz: c2, sampleRate: fs, btype: bt, characteristic: char, rs,
      });
    } catch {
      filtered = y.slice();
    }
    const oD = down(y, t, peakMode);
    const fD = down(filtered, t, peakMode);
    return {
      type: "line",
      data: {
        labels: oD.rx,
        datasets: [
          { label: `Original [${unit}]`, data: oD.ry, borderColor: "#94A3B8", borderWidth: 1, pointRadius: 0 },
          { label: `Gefiltert [${unit}]`, data: fD.ry, borderColor: "#2563EB", borderWidth: 1.5, pointRadius: 0 },
        ],
      },
      options: {
        responsive: true, animation: false,
        scales: {
          x: { title: { display: true, text: "Zeit [s]" }, ticks: { maxTicksLimit: 10 } },
          y: { title: { display: true, text: unit } },
        },
      },
    };
  };
});
</script>

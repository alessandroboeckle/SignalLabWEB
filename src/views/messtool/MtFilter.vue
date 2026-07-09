<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-tune-variant</v-icon>
      <h2 class="text-h4 font-weight-bold">Filter</h2>
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
            <v-select
              v-model="selectedIdx"
              :items="signalOptions"
              label="Signal"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-sine-wave"
              class="mb-3"
            ></v-select>

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

            <v-alert type="info" variant="tonal" density="compact" class="text-caption">
              Abtastrate: {{ sampleRate.toFixed(1) }} Hz · Nyquist: {{ (sampleRate/2).toFixed(1) }} Hz
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
import { ref, computed } from "vue";
import { useMesstoolStore } from "../../stores/messtoolStore.js";
import { applyFilter } from "../../utils/messtoolFilter.js";
import ChartCard from "./ChartCard.vue";

const mtStore = useMesstoolStore();

const selectedIdx = ref(0);
const characteristic = ref("butterworth");
const btype = ref("low");
const order = ref(4);
const cutoff = ref(5);
const cutoff2 = ref(20);

const charOptions = [
  { title: "Butterworth", value: "butterworth" },
  { title: "Chebyshev I", value: "cheby1" },
  { title: "Bessel", value: "bessel" },
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

function down(arr, xs) {
  const step = Math.max(1, Math.ceil(arr.length / 800));
  const rx = [], ry = [];
  for (let i = 0; i < arr.length; i += step) { rx.push(xs[i]); ry.push(arr[i]); }
  return { rx, ry };
}

const filterConfig = computed(() => {
  const s = sig.value, t = time.value, fs = sampleRate.value;
  const bt = btype.value, ord = order.value, c1 = cutoff.value, c2 = cutoff2.value;
  const char = characteristic.value;
  return () => {
    if (!s) return { type: "line", data: { labels: [], datasets: [] } };
    const y = s.data.map((v) => (v == null ? 0 : v));
    const unit = s.unit || "";
    let filtered;
    try {
      filtered = applyFilter(y, {
        order: ord, cutoffHz: c1, cutoff2Hz: c2, sampleRate: fs, btype: bt, characteristic: char,
      });
    } catch {
      filtered = y.slice();
    }
    const oD = down(y, t);
    const fD = down(filtered, t);
    return {
      type: "line",
      data: {
        labels: oD.rx,
        datasets: [
          { label: `Original [${unit}]`, data: oD.ry, borderColor: "#CBD5E1", borderWidth: 1, pointRadius: 0 },
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

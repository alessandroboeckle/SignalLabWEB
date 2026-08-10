<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-chart-bell-curve</v-icon>
      <h2 class="text-h5 font-weight-bold">Analyse</h2>
    
      <v-spacer></v-spacer>
      <HelpIconButton section="messtool-analyse" label="Analyse" />
    </div>
    <p class="text-medium-emphasis mb-6">Statistik, Ableitung, Integral & FFT</p>

    <EmptyState
      v-if="!mtStore.parsed"
      title="Keine Messdatei geladen"
      description="Lade zuerst im Bereich Import eine Datei."
      action-label="Zu Import"
      action-icon="mdi-file-upload"
      @action="$emit('navigate', 'mt-import')"
    />

    <template v-else>
      <div class="d-flex align-center flex-wrap ga-2 mb-2">
        <MtQuickNav
          :items="[
            { target: 'mt-verarbeitung', label: 'Verarbeitung', icon: 'mdi-cog-transfer' },
            { target: 'mt-filter', label: 'Filter', icon: 'mdi-tune-variant' },
          ]"
          @navigate="$emit('navigate', $event)"
        />
        <v-spacer></v-spacer>
        <v-menu :close-on-content-click="false">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" size="small" variant="outlined" prepend-icon="mdi-view-grid-outline">
              Abschnitte
            </v-btn>
          </template>
          <v-card min-width="300" class="pa-4">
            <div class="text-subtitle-2 font-weight-bold mb-2">Abschnitte auf der Seite</div>
            <v-checkbox v-model="sectionsVisible.stats" label="Statistik-Kacheln" density="comfortable" hide-details class="mb-1"></v-checkbox>
            <v-checkbox v-model="sectionsVisible.overview" label="Signal-Übersicht (alle Signale)" density="comfortable" hide-details class="mb-1"></v-checkbox>
            <v-checkbox v-model="sectionsVisible.events" label="Automatische Ereignis-Erkennung" density="comfortable" hide-details class="mb-1"></v-checkbox>
            <v-checkbox v-model="sectionsVisible.derivative" label="Signal & Ableitung" density="comfortable" hide-details class="mb-1"></v-checkbox>
            <v-checkbox v-model="sectionsVisible.integral" label="Integral" density="comfortable" hide-details class="mb-1"></v-checkbox>
            <v-checkbox v-model="sectionsVisible.fft" label="Frequenzspektrum (FFT)" density="comfortable" hide-details></v-checkbox>
            <v-checkbox v-model="sectionsVisible.group" label="Gruppen-Analyse (mehrere Signale)" density="comfortable" hide-details></v-checkbox>
            <div class="d-flex ga-2 mt-3">
              <v-btn size="small" variant="tonal" block @click="showOnlyStats">Nur Statistik</v-btn>
              <v-btn size="small" variant="text" block @click="showAllSections">Alles zeigen</v-btn>
            </div>
          </v-card>
        </v-menu>
      </div>
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

      <v-card v-if="sectionsVisible.events" variant="outlined" rounded="lg" class="mb-4">
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

          <v-alert v-if="eventNoThreshold" type="warning" variant="tonal" density="compact" class="mt-3">
            Bitte zuerst einen Schwellwert eingeben.
          </v-alert>
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

      <v-row v-if="sectionsVisible.stats" class="mb-4">
        <v-col v-for="stat in stats" :key="stat.label" cols="6" sm="4" md="2">
          <v-card variant="tonal" color="primary" class="pa-3 text-center">
            <div class="text-h6 font-weight-bold">{{ stat.value }}</div>
            <div class="text-caption">{{ stat.label }}</div>
          </v-card>
        </v-col>
      </v-row>

      <v-expansion-panels v-if="sectionsVisible.overview" class="mb-4" variant="accordion">
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
        <v-col v-if="sectionsVisible.derivative" cols="12" md="6">
          <ChartCard title="Signal & Ableitung" :config="derivConfig" :height="260" sync-group="analyse-zeit">
            <template #extra-toolbar>
              <v-menu :close-on-content-click="false">
                <template #activator="{ props: lineMenuProps }">
                  <v-btn v-bind="lineMenuProps" size="small" variant="text" icon="mdi-tune-variant" aria-label="Linien-Optionen">
                    <v-icon>mdi-tune-variant</v-icon>
                    <v-tooltip activator="parent" location="bottom">Linien-Optionen</v-tooltip>
                  </v-btn>
                </template>
                <v-card min-width="280" class="pa-4">
                  <div class="text-subtitle-2 font-weight-bold mb-2">Linien im Signal-Chart</div>
                  <v-checkbox v-model="showAvgLine" label="Mittelwert-Linie" density="comfortable" hide-details class="mb-1"></v-checkbox>
                  <v-checkbox v-model="showRmsLine" label="RMS-Linie" density="comfortable" hide-details class="mb-1"></v-checkbox>
                  <v-checkbox v-model="showStdBand" label="±1σ-Band" density="comfortable" hide-details class="mb-1"></v-checkbox>
                  <v-checkbox v-model="showDerivativeLine" label="Ableitung im Chart zeigen" density="comfortable" hide-details class="mb-1"></v-checkbox>
                  <v-checkbox v-model="smoothDeriv" label="Ableitung glätten" density="comfortable" hide-details></v-checkbox>
                  <v-text-field
                    v-if="smoothDeriv"
                    v-model.number="smoothDerivWindow"
                    type="number"
                    label="Glättungs-Fensterlänge"
                    variant="outlined"
                    density="compact"
                    hide-details
                    min="3"
                    class="mt-2"
                  ></v-text-field>
                </v-card>
              </v-menu>
            </template>
          </ChartCard>
        </v-col>
        <v-col v-if="sectionsVisible.integral" cols="12" md="6">
          <ChartCard title="Integral" :config="integralConfig" :height="260" sync-group="analyse-zeit" />
        </v-col>
        <v-col v-if="sectionsVisible.fft" cols="12">
          <ChartCard title="Frequenzspektrum (FFT)" :config="fftConfig" :height="240" hide-playback />
        </v-col>
      </v-row>

      <v-card v-if="sectionsVisible.group" variant="outlined" rounded="lg" class="mb-4">
        <v-card-title class="d-flex align-center ga-2">
          <v-icon size="20">mdi-chart-multiple</v-icon>
          Gruppen-Analyse — mehrere Signale zusammen auswerten
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-row dense class="mb-2">
            <v-col cols="12">
              <v-autocomplete
                v-model="groupSelectedIdxs"
                :items="groupPoolOptions"
                label="Signale für die Gruppe wählen"
                variant="outlined"
                density="comfortable"
                multiple
                chips
                closable-chips
                prepend-inner-icon="mdi-checkbox-multiple-marked-outline"
                :hint="mtStore.compareFiles.length ? 'Auch Signale aus zu Vergleich hinzugefügten Dateien wählbar — nutzt denselben Zeitbereich wie oben' : 'Nutzt denselben Zeitbereich wie oben'"
                persistent-hint
              ></v-autocomplete>
            </v-col>
          </v-row>

          <v-alert v-if="groupSelectedIdxs.length < 2" type="info" variant="tonal" density="compact">
            Mindestens 2 Signale wählen, um sie gemeinsam auszuwerten.
          </v-alert>

          <template v-else>
            <v-table density="compact" class="mb-4">
              <thead>
                <tr>
                  <th>Signal</th>
                  <th>Einheit</th>
                  <th class="text-right">Mittel</th>
                  <th class="text-right">RMS</th>
                  <th class="text-right">Std</th>
                  <th class="text-right">Min</th>
                  <th class="text-right">Max</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in groupStats" :key="row.idx">
                  <td>{{ row.name }}</td>
                  <td>{{ row.unit }}</td>
                  <td class="text-right">{{ row.mean }}</td>
                  <td class="text-right">{{ row.rms }}</td>
                  <td class="text-right">{{ row.std }}</td>
                  <td class="text-right">{{ row.min }}</td>
                  <td class="text-right">{{ row.max }}</td>
                </tr>
              </tbody>
            </v-table>

            <v-row>
              <v-col cols="12" md="6">
                <ChartCard title="Signale überlagert" :config="groupOverlayConfig" :height="280" sync-group="analyse-gruppe" />
              </v-col>
              <v-col cols="12" md="6">
                <ChartCard title="FFT überlagert" :config="groupFftConfig" :height="280" hide-playback />
              </v-col>
            </v-row>
          </template>
        </v-card-text>
      </v-card>
    </template>
  </v-container>
</template>

<script setup>
import { ref, computed, reactive } from "vue";
import EmptyState from "../../components/EmptyState.vue";
import { useMesstoolStore } from "../../stores/messtoolStore.js";
import { useSignalNavigationShortcuts } from "../../composables/useSignalNavigation.js";
import * as A from "../../utils/messtoolAnalysis.js";
import { SmoothOp } from "../../utils/messtoolProcessing.js";
import { findWindowBounds } from "../../utils/timeWindow.js";
import { findEvents } from "../../utils/eventDetection.js";
import ChartCard from "./ChartCard.vue";
import HelpIconButton from "../../components/HelpIconButton.vue";
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
const showDerivativeLine = ref(true);
const smoothDeriv = ref(false);
const smoothDerivWindow = ref(11);

const sectionsVisible = reactive({
  stats: true,
  overview: true,
  events: true,
  derivative: true,
  integral: true,
  fft: true,
  group: false,
});

function showOnlyStats() {
  sectionsVisible.stats = true;
  sectionsVisible.overview = false;
  sectionsVisible.events = false;
  sectionsVisible.derivative = false;
  sectionsVisible.integral = false;
  sectionsVisible.fft = false;
  sectionsVisible.group = false;
}
function showAllSections() {
  sectionsVisible.stats = true;
  sectionsVisible.overview = true;
  sectionsVisible.events = true;
  sectionsVisible.derivative = true;
  sectionsVisible.integral = true;
  sectionsVisible.fft = true;
  sectionsVisible.group = true;
}

// ---- Gruppen-Analyse: mehrere Signale gemeinsam auswerten (AVG/RMS/Std
// je Signal nebeneinander + überlagerte Zeit- und FFT-Charts), analog zu
// Messtool_Antrieb's create_group_analysis_tab / *_multi_anwendung.
//
// Pool umfasst NICHT nur die aktuell aktive Datei, sondern auch alle
// Dateien, die schon zu "Anzeige/Vergleich" hinzugefügt wurden — analog zu
// Python's Mehrfachdatei-Ablauf, wo alle Signale aller geladenen Dateien
// gemeinsam in einem Signalauswahl-Fenster landen (jedes Signal behält
// dabei seine eigene Zeitachse). ----
const groupPool = computed(() => {
  const entries = [];
  const multiSource = mtStore.compareFiles.length > 0;
  if (mtStore.parsed) {
    mtStore.parsed.signals.forEach((s, idx) => {
      entries.push({
        key: `active:${idx}`,
        label: multiSource
          ? `${mtStore.fileName || "Aktuelle Datei"} — ${s.name} [${s.unit || "-"}]`
          : `${s.name} [${s.unit || "-"}]`,
        sig: s,
        t: mtStore.parsed.time,
      });
    });
  }
  for (const f of mtStore.compareFiles) {
    f.parsed.signals.forEach((s, idx) => {
      entries.push({
        key: `${f.id}:${idx}`,
        label: `${f.name} — ${s.name} [${s.unit || "-"}]`,
        sig: s,
        t: f.parsed.time,
      });
    });
  }
  return entries;
});

const groupSelectedIdxs = ref([]);

const groupPoolOptions = computed(() =>
  groupPool.value.map((e) => ({ title: e.label, value: e.key })),
);

const groupSignals = computed(() => {
  const pool = groupPool.value;
  return groupSelectedIdxs.value
    .map((key) => pool.find((e) => e.key === key))
    .filter(Boolean);
});

const GROUP_COLORS = ["#2563EB", "#FF6B35", "#10B981", "#7C3AED", "#DC2626", "#059669", "#D97706", "#DB2777"];

const groupStats = computed(() => {
  return groupSignals.value.map(({ key, label, sig: s, t }) => {
    const { y } = windowedYT(s, t);
    const yValid = y.filter((v) => v != null && Number.isFinite(v));
    const mm = A.minMax(yValid);
    const u = s.unit || "";
    const f = (v) => (v == null ? "-" : v.toFixed(3));
    return {
      idx: key,
      name: label,
      unit: u,
      mean: f(A.mean(yValid)),
      rms: f(A.rms(yValid)),
      std: f(A.stddev(yValid)),
      min: f(mm.min),
      max: f(mm.max),
    };
  });
});

// Overlay/FFT charts use {x,y} point datasets on a linear x-axis (like
// MtImport's quickCompareConfig) rather than a single shared "labels"
// array — needed because pooled signals can come from different files,
// each with its own time axis / sample count.
const groupOverlayConfig = computed(() => {
  const entries = groupSignals.value;
  void zeitbereichStart.value; void zeitbereichEnd.value;
  return (peakMode) => {
    if (!entries.length) return { type: "line", data: { datasets: [] } };
    const datasets = entries.map(({ label, sig: s, t }, i) => {
      const { y, t: wt } = windowedYT(s, t);
      const d = down(y, wt, peakMode);
      const points = d.rx.map((x, j) => ({ x, y: d.ry[j] }));
      return {
        label, data: points, borderColor: GROUP_COLORS[i % GROUP_COLORS.length],
        borderWidth: 1.5, pointRadius: 0,
      };
    });
    return {
      type: "line",
      data: { datasets },
      options: {
        responsive: true, animation: false, parsing: false,
        scales: {
          x: { type: "linear", title: { display: true, text: "Zeit [s]" }, ticks: { maxTicksLimit: 8 } },
          y: { title: { display: true, text: "Wert" } },
        },
      },
    };
  };
});

const groupFftConfig = computed(() => {
  const entries = groupSignals.value, wt = windowType.value;
  void zeitbereichStart.value; void zeitbereichEnd.value;
  return (peakMode) => {
    if (!entries.length) return { type: "line", data: { datasets: [] } };
    const datasets = entries.map(({ label, sig: s, t }, i) => {
      const { y, t: wt2 } = windowedYT(s, t);
      const { freq, amp } = A.fft(y, wt2, { windowType: wt, normalize: true });
      const d = down(amp, freq, peakMode);
      const points = d.rx.map((x, j) => ({ x, y: d.ry[j] }));
      return {
        label, data: points, borderColor: GROUP_COLORS[i % GROUP_COLORS.length],
        borderWidth: 1, pointRadius: 0,
      };
    });
    return {
      type: "line",
      data: { datasets },
      options: {
        responsive: true, animation: false, parsing: false,
        scales: {
          x: { type: "linear", title: { display: true, text: "Frequenz [Hz]" }, ticks: { maxTicksLimit: 12 } },
          y: { title: { display: true, text: "Amplitude" } },
        },
      },
    };
  };
});

const eventThreshold = ref(null);
const eventMode = ref("abs");
const foundEvents = ref([]);
const eventSearchDone = ref(false);
const eventNoThreshold = ref(false);

function runEventDetection() {
  foundEvents.value = [];
  if (!sig.value) return;
  if (eventThreshold.value == null || eventThreshold.value === "") {
    eventSearchDone.value = false;
    eventNoThreshold.value = true;
    return;
  }
  eventNoThreshold.value = false;
  eventSearchDone.value = true;
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
  void smoothDeriv.value; void smoothDerivWindow.value; void showDerivativeLine.value;
  return (peakMode) => {
    if (!s) return { type: "line", data: { labels: [], datasets: [] } };
    const { y, t: wt } = windowedYT(s, t);
    const unit = s.unit || "";
    const deriv = A.derivative(y, wt);
    const derivForDisplay = smoothDeriv.value
      ? new SmoothOp({ windowLen: smoothDerivWindow.value }).apply(deriv)
      : deriv;
    const sD = down(y, wt, peakMode), dD = down(derivForDisplay, wt, peakMode);

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
    if (showDerivativeLine.value) {
      datasets.push({ label: `Ableitung [${unit}/s]`, data: dD.ry, borderColor: "#FF6B35", borderWidth: 1, pointRadius: 0, yAxisID: "y1" });
    }
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
          y1: { display: showDerivativeLine.value, position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: `${unit}/s` } },
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

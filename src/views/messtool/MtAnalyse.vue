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
            ...(auth.isAdmin ? [{ target: 'mt-verarbeitung', label: 'Verarbeitung', icon: 'mdi-cog-transfer' }] : []),
            { target: 'mt-filter', label: 'Filter', icon: 'mdi-tune-variant' },
          ]"
          @navigate="$emit('navigate', $event)"
        />
        <v-spacer></v-spacer>
        <v-switch
          v-model="fullWidthPlots"
          color="primary"
          density="compact"
          hide-details
          label="Volle Breite"
        ></v-switch>
        <v-menu :close-on-content-click="false">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" size="small" variant="outlined" prepend-icon="mdi-view-grid-outline">
              Anzeigeoptionen
            </v-btn>
          </template>
          <v-card min-width="300" class="pa-4">
            <div class="text-subtitle-2 font-weight-bold mb-2">Abschnitte auf der Seite</div>
            <v-checkbox v-model="sectionsVisible.stats" label="Statistik-Kacheln" density="comfortable" hide-details class="mb-1"></v-checkbox>
            <v-checkbox v-model="sectionsVisible.overview" label="Signal-Übersicht (alle Signale)" density="comfortable" hide-details class="mb-1"></v-checkbox>
            <v-checkbox v-model="sectionsVisible.events" label="Automatische Ereignis-Erkennung" density="comfortable" hide-details class="mb-1"></v-checkbox>
            <v-checkbox v-model="sectionsVisible.derivative" label="Signal & Ableitung" density="comfortable" hide-details class="mb-1"></v-checkbox>
            <v-checkbox v-model="sectionsVisible.integral" label="Integral" density="comfortable" hide-details class="mb-1"></v-checkbox>
            <v-checkbox v-model="sectionsVisible.rollingRms" label="RMS über Zeit" density="comfortable" hide-details class="mb-1"></v-checkbox>
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
            <v-col cols="6" sm="3">
              <v-text-field
                v-model.number="eventMinDuration"
                type="number"
                step="0.001"
                min="0"
                label="Mindestdauer [s]"
                variant="outlined"
                density="compact"
                hide-details
              ></v-text-field>
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
          <v-alert v-if="eventTruncated" type="warning" variant="tonal" density="compact" class="mt-3">
            Sehr viele Treffer ({{ MAX_DISPLAYED_EVENTS }}+) — nur die ersten {{ MAX_DISPLAYED_EVENTS }} werden angezeigt.
            Schwellwert erhöhen oder Mindestdauer verlängern für ein sinnvolleres Ergebnis.
          </v-alert>
          <v-alert v-if="eventSearchDone && foundEvents.length === 0" type="info" variant="tonal" density="compact" class="mt-3">
            Keine Ereignisse über diesem Schwellwert gefunden.
          </v-alert>

          <v-data-table
            v-if="foundEvents.length"
            :headers="eventHeaders"
            :items="foundEvents"
            density="compact"
            items-per-page="10"
            class="mt-3"
          >
            <template #item.startTime="{ item }">{{ item.startTime.toFixed(2) }}</template>
            <template #item.endTime="{ item }">{{ item.endTime.toFixed(2) }}</template>
            <template #item.durationSec="{ item }">{{ item.durationSec.toFixed(2) }}</template>
            <template #item.peakValue="{ item }">{{ item.peakValue.toFixed(3) }}</template>
            <template #item.actions="{ item, index }">
              <v-btn size="x-small" variant="text" prepend-icon="mdi-map-marker-outline" @click="markEvent(item, index)">
                Marker
              </v-btn>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>

      <div v-if="sectionsVisible.stats" class="d-flex flex-nowrap ga-2 mb-4 stat-strip">
        <v-card
          v-for="stat in stats"
          :key="stat.label"
          variant="outlined"
          class="pa-3 text-center stat-card"
        >
          <div class="text-overline text-medium-emphasis stat-card__label">{{ stat.label }}</div>
          <div class="text-h5 font-weight-bold font-mono stat-card__value">{{ stat.value }}</div>
        </v-card>
      </div>

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
              <template #item.mean="{ item }">{{ item.mean == null ? "-" : item.mean.toFixed(3) }}</template>
              <template #item.rms="{ item }">{{ item.rms == null ? "-" : item.rms.toFixed(3) }}</template>
              <template #item.std="{ item }">{{ item.std == null ? "-" : item.std.toFixed(3) }}</template>
              <template #item.min="{ item }">{{ item.min == null ? "-" : item.min.toFixed(3) }}</template>
              <template #item.max="{ item }">{{ item.max == null ? "-" : item.max.toFixed(3) }}</template>
            </v-data-table>
            <p class="text-caption text-medium-emphasis mt-2">
              Auf eine Zeile klicken, um dieses Signal oben auszuwählen.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <v-row>
        <v-col v-if="sectionsVisible.derivative" :cols="12" :md="fullWidthPlots ? 12 : 6">
          <ChartCard title="Signal" :config="signalConfig" :height="260" sync-group="analyse-zeit">
            <template #extra-toolbar>
              <v-menu :close-on-content-click="false">
                <template #activator="{ props: lineMenuProps }">
                  <v-tooltip location="bottom">
                    <template #activator="{ props: tooltipProps }">
                      <v-btn
                        v-bind="{ ...lineMenuProps, ...tooltipProps }"
                        size="small" variant="text" icon="mdi-tune-variant" aria-label="Linien-Optionen"
                      ></v-btn>
                    </template>
                    Linien-Optionen
                  </v-tooltip>
                </template>
                <v-card min-width="280" class="pa-4">
                  <div class="text-subtitle-2 font-weight-bold mb-2">Linien im Signal-Chart</div>
                  <v-checkbox v-model="showAvgLine" label="Mittelwert-Linie" density="comfortable" hide-details class="mb-1"></v-checkbox>
                  <v-checkbox v-model="showRmsLine" label="RMS-Linie" density="comfortable" hide-details class="mb-1"></v-checkbox>
                  <v-checkbox v-model="showStdBand" label="±1σ-Band" density="comfortable" hide-details></v-checkbox>
                </v-card>
              </v-menu>
            </template>
          </ChartCard>
        </v-col>
        <v-col v-if="sectionsVisible.derivative" :cols="12" :md="fullWidthPlots ? 12 : 6">
          <ChartCard title="Ableitung" :config="derivConfig" :height="260" sync-group="analyse-zeit" />
        </v-col>
        <v-col v-if="sectionsVisible.integral" :cols="12" :md="fullWidthPlots ? 12 : 6">
          <ChartCard title="Integral" :config="integralConfig" :height="260" sync-group="analyse-zeit" />
        </v-col>
        <v-col v-if="sectionsVisible.rollingRms" :cols="12" :md="fullWidthPlots ? 12 : 6">
          <ChartCard title="RMS über Zeit" :config="rollingRmsConfig" :height="260" sync-group="analyse-zeit">
            <template #extra-toolbar>
              <v-menu :close-on-content-click="false">
                <template #activator="{ props: rmsMenuProps }">
                  <v-tooltip location="bottom">
                    <template #activator="{ props: tooltipProps }">
                      <v-btn
                        v-bind="{ ...rmsMenuProps, ...tooltipProps }"
                        size="small" variant="text" icon="mdi-tune-variant" aria-label="RMS-Fenster-Optionen"
                      ></v-btn>
                    </template>
                    Fenster-Optionen
                  </v-tooltip>
                </template>
                <v-card min-width="260" class="pa-4">
                  <div class="text-subtitle-2 font-weight-bold mb-2">Gleitendes RMS-Fenster</div>
                  <v-text-field
                    v-model.number="rmsWindowSec"
                    type="number"
                    label="Fensterlänge [s]"
                    variant="outlined"
                    density="compact"
                    hide-details
                    min="0.001"
                    step="0.1"
                    class="mb-3"
                  ></v-text-field>
                  <v-text-field
                    v-model.number="rmsOverlapPct"
                    type="number"
                    label="Überlappung [%]"
                    variant="outlined"
                    density="compact"
                    hide-details
                    min="0"
                    max="95"
                  ></v-text-field>
                  <p class="text-caption text-medium-emphasis mt-2 mb-0">
                    Höhere Überlappung = mehr, feiner aufgelöste Punkte entlang der Zeitachse.
                  </p>
                </v-card>
              </v-menu>
            </template>
          </ChartCard>
        </v-col>
        <v-col v-if="sectionsVisible.rollingRms" :cols="12" :md="fullWidthPlots ? 12 : 6">
          <ChartCard title="Fenster-Überlappung" :config="rmsWindowsOverlayConfig" :height="260" sync-group="analyse-zeit" />
        </v-col>
        <v-col v-if="sectionsVisible.fft" :cols="12" :md="fullWidthPlots ? 12 : 6">
          <ChartCard title="Frequenzspektrum (FFT)" :config="fftConfig" :height="240" hide-playback />
        </v-col>
        <v-col v-if="sectionsVisible.fft" :cols="12" :md="fullWidthPlots ? 12 : 6">
          <ChartCard title="Phase" :config="phaseConfig" :height="240" hide-playback />
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
            <v-data-table
              :headers="groupStatsHeaders"
              :items="groupStats"
              density="compact"
              items-per-page="-1"
              hide-default-footer
              class="mb-4"
            >
              <template #item.mean="{ item }">{{ item.mean == null ? "-" : item.mean.toFixed(3) }}</template>
              <template #item.rms="{ item }">{{ item.rms == null ? "-" : item.rms.toFixed(3) }}</template>
              <template #item.std="{ item }">{{ item.std == null ? "-" : item.std.toFixed(3) }}</template>
              <template #item.min="{ item }">{{ item.min == null ? "-" : item.min.toFixed(3) }}</template>
              <template #item.max="{ item }">{{ item.max == null ? "-" : item.max.toFixed(3) }}</template>
            </v-data-table>

            <v-row>
              <v-col :cols="12" :md="fullWidthPlots ? 12 : 6">
                <ChartCard title="Signale überlagert" :config="groupOverlayConfig" :height="280" sync-group="analyse-gruppe" />
              </v-col>
              <v-col :cols="12" :md="fullWidthPlots ? 12 : 6">
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
import { useAuthStore } from "../../stores/authStore.js";
import { useSignalNavigationShortcuts } from "../../composables/useSignalNavigation.js";
import * as A from "../../utils/messtoolAnalysis.js";
import { findWindowBounds } from "../../utils/timeWindow.js";
import { findEvents } from "../../utils/eventDetection.js";
import ChartCard from "./ChartCard.vue";
import HelpIconButton from "../../components/HelpIconButton.vue";
import MtQuickNav from "./MtQuickNav.vue";
import { downsample } from "../../utils/downsample.js";
import { buildLineChartConfig, emptyLineChartConfig } from "../../utils/lineChartConfig.js";

defineEmits(["navigate"]);

const mtStore = useMesstoolStore();
const auth = useAuthStore();
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

const eventHeaders = [
  { title: "Start [s]", key: "startTime" },
  { title: "Ende [s]", key: "endTime" },
  { title: "Dauer [s]", key: "durationSec" },
  { title: "Spitzenwert", key: "peakValue" },
  { title: "", key: "actions", sortable: false, align: "end" },
];

const groupStatsHeaders = [
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
    return {
      idx,
      name: s.name,
      unit: s.unit || "-",
      // Raw numbers so v-data-table sorts numerically, not lexically —
      // formatted for display via the #item.mean etc. templates.
      mean: A.mean(y),
      rms: A.rms(y),
      std: A.stddev(y),
      min: mm.min,
      max: mm.max,
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
const rmsWindowSec = ref(1);
const rmsOverlapPct = ref(50);

// Stack charts full-width (one per row) instead of two side by side —
// handy on a big monitor when a plot's fine details are hard to read at
// half width.
const fullWidthPlots = ref(false);

const sectionsVisible = reactive({
  stats: true,
  overview: true,
  events: true,
  derivative: true,
  integral: true,
  rollingRms: true,
  fft: true,
  group: false,
});

function showOnlyStats() {
  sectionsVisible.stats = true;
  sectionsVisible.overview = false;
  sectionsVisible.events = false;
  sectionsVisible.derivative = false;
  sectionsVisible.integral = false;
  sectionsVisible.rollingRms = false;
  sectionsVisible.fft = false;
  sectionsVisible.group = false;
}
function showAllSections() {
  sectionsVisible.stats = true;
  sectionsVisible.overview = true;
  sectionsVisible.events = true;
  sectionsVisible.derivative = true;
  sectionsVisible.integral = true;
  sectionsVisible.rollingRms = true;
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
    return {
      idx: key,
      name: label,
      unit: u,
      // Raw numbers, not pre-formatted strings — v-data-table's default
      // sort is lexical (string) unless the values are actual numbers,
      // so keeping "10.5" as a string would sort it before "9.2".
      // Formatted for display via the #item.mean etc. templates below.
      mean: A.mean(yValid),
      rms: A.rms(yValid),
      std: A.stddev(yValid),
      min: mm.min,
      max: mm.max,
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
    if (!entries.length) return emptyLineChartConfig(false);
    const datasets = entries.map(({ label, sig: s, t }, i) => {
      const { y, t: wt } = windowedYT(s, t);
      const d = down(y, wt, peakMode);
      const points = d.rx.map((x, j) => ({ x, y: d.ry[j] }));
      return {
        label, data: points, borderColor: GROUP_COLORS[i % GROUP_COLORS.length],
        borderWidth: 1.5, pointRadius: 0,
      };
    });
    return buildLineChartConfig({
      datasets,
      parsing: false,
      xTitle: "Zeit [s]",
      xScale: { type: "linear", ticks: { maxTicksLimit: 8 } },
      yTitle: "Wert",
    });
  };
});

const groupFftConfig = computed(() => {
  const entries = groupSignals.value, wt = windowType.value;
  void zeitbereichStart.value; void zeitbereichEnd.value;
  return (peakMode) => {
    if (!entries.length) return emptyLineChartConfig(false);
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
    return buildLineChartConfig({
      datasets,
      parsing: false,
      xTitle: "Frequenz [Hz]",
      xScale: { type: "linear", ticks: { maxTicksLimit: 12 } },
      yTitle: "Amplitude",
    });
  };
});

const eventThreshold = ref(null);
const eventMode = ref("abs");
const eventMinDuration = ref(0.05); // filters sample-to-sample noise chatter around the threshold
const foundEvents = ref([]);
const eventSearchDone = ref(false);
const eventNoThreshold = ref(false);
const eventTruncated = ref(false);

const MAX_DISPLAYED_EVENTS = 500; // safety cap so a badly-chosen threshold can't freeze the table

function runEventDetection() {
  foundEvents.value = [];
  eventTruncated.value = false;
  if (!sig.value) return;
  if (eventThreshold.value == null || eventThreshold.value === "") {
    eventSearchDone.value = false;
    eventNoThreshold.value = true;
    return;
  }
  eventNoThreshold.value = false;
  eventSearchDone.value = true;
  const { y, t } = windowedYT(sig.value, time.value);
  const results = findEvents(y, t, eventThreshold.value, {
    mode: eventMode.value,
    minDurationSec: eventMinDuration.value || 0,
  });
  if (results.length > MAX_DISPLAYED_EVENTS) {
    eventTruncated.value = true;
    foundEvents.value = results.slice(0, MAX_DISPLAYED_EVENTS);
  } else {
    foundEvents.value = results;
  }
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

// Compact dt/df/N readout for the currently selected time window — dt is
// the sample interval, df the FFT frequency resolution (1/(N·dt)), N the
// number of samples that'll actually go into the FFT. Lets you sanity-check
// frequency resolution before reading the spectrum, instead of guessing.
const windowInfo = computed(() => {
  if (!sig.value) return null;
  const [i0, i1] = findWindowBounds(time.value, zeitbereichStart.value, zeitbereichEnd.value);
  const t = time.value.slice(i0, i1);
  const n = t.length;
  if (n < 2) return null;
  const dt = (t[t.length - 1] - t[0]) / (n - 1);
  if (!(dt > 0)) return null;
  const df = 1 / (n * dt);
  return { dt: dt.toFixed(4), df: df.toFixed(4), n };
});

const stats = computed(() => {
  if (!sig.value) return [];
  const [i0, i1] = findWindowBounds(time.value, zeitbereichStart.value, zeitbereichEnd.value);
  const y = sig.value.data.slice(i0, i1).filter((v) => v != null && Number.isFinite(v));
  const mm = A.minMax(y);
  const u = sig.value.unit || "";
  const f = (v) => (v == null ? "-" : v.toFixed(3));
  const wi = windowInfo.value;
  return [
    { label: `Mittel [${u}]`, value: f(A.mean(y)) },
    { label: `RMS [${u}]`, value: f(A.rms(y)) },
    { label: `Std [${u}]`, value: f(A.stddev(y)) },
    { label: `Varianz`, value: f(A.variance(y)) },
    { label: `Min [${u}]`, value: f(mm.min) },
    { label: `Max [${u}]`, value: f(mm.max) },
    { label: `dt [s]`, value: wi ? wi.dt : "-" },
    { label: `df [Hz]`, value: wi ? wi.df : "-" },
    { label: `N [Samples]`, value: wi ? String(wi.n) : "-" },
  ];
});

function down(arr, xs, mode) {
  return downsample(arr, xs, mode ? 'minmax' : 'simple', 800);
}

// Each config is a computed returning a FRESH function.
// When signal/window/data changes, the function identity changes and
// ChartCard rebuilds automatically.

const signalConfig = computed(() => {
  const s = sig.value, t = time.value;
  void zeitbereichStart.value; void zeitbereichEnd.value;
  void showAvgLine.value; void showRmsLine.value; void showStdBand.value;
  return (peakMode) => {
    if (!s) return emptyLineChartConfig();
    const { y, t: wt } = windowedYT(s, t);
    const unit = s.unit || "";
    const sD = down(y, wt, peakMode);

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

    return buildLineChartConfig({
      datasets,
      labels: sD.rx,
      xTitle: "Zeit [s]",
      xScale: { ticks: { maxTicksLimit: 8 } },
      yTitle: unit,
    });
  };
});

const derivConfig = computed(() => {
  const s = sig.value, t = time.value;
  void zeitbereichStart.value; void zeitbereichEnd.value;
  return (peakMode) => {
    if (!s) return emptyLineChartConfig();
    const { y, t: wt } = windowedYT(s, t);
    const unit = s.unit || "";
    const deriv = A.derivative(y, wt);
    const dD = down(deriv, wt, peakMode);

    return buildLineChartConfig({
      datasets: [{ label: `Ableitung [${unit}/s]`, data: dD.ry, borderColor: "#FF6B35", borderWidth: 1.5, pointRadius: 0 }],
      labels: dD.rx,
      xTitle: "Zeit [s]",
      xScale: { ticks: { maxTicksLimit: 8 } },
      yTitle: `${unit}/s`,
    });
  };
});

const integralConfig = computed(() => {
  const s = sig.value, t = time.value;
  void zeitbereichStart.value; void zeitbereichEnd.value;
  return (peakMode) => {
    if (!s) return emptyLineChartConfig();
    const { y, t: wt2 } = windowedYT(s, t);
    const unit = s.unit || "";
    const integ = A.integral(y, wt2);
    const iD = down(integ, wt2, peakMode);
    return buildLineChartConfig({
      labels: iD.rx,
      datasets: [{ label: `∫ [${unit}·s]`, data: iD.ry, borderColor: "#10B981", backgroundColor: "rgba(16,185,129,0.08)", borderWidth: 1.5, pointRadius: 0, fill: true }],
      xTitle: "Zeit [s]",
      xScale: { ticks: { maxTicksLimit: 8 } },
      yTitle: `${unit}·s`,
    });
  };
});

const rollingRmsConfig = computed(() => {
  const s = sig.value, t = time.value;
  void zeitbereichStart.value; void zeitbereichEnd.value;
  void rmsWindowSec.value; void rmsOverlapPct.value;
  return (peakMode) => {
    if (!s) return emptyLineChartConfig();
    const { y, t: wt } = windowedYT(s, t);
    const unit = s.unit || "";
    const { t: rt, rms: rr } = A.rollingRms(y, wt, rmsWindowSec.value, rmsOverlapPct.value);
    const rD = down(rr, rt, peakMode);
    return buildLineChartConfig({
      labels: rD.rx,
      datasets: [{
        label: `RMS (${rmsWindowSec.value}s, ${rmsOverlapPct.value}% Überlappung) [${unit}]`,
        data: rD.ry, borderColor: "#EC4899", backgroundColor: "rgba(236,72,153,0.08)",
        borderWidth: 1.5, pointRadius: 0, fill: true,
      }],
      xTitle: "Zeit [s]",
      xScale: { ticks: { maxTicksLimit: 8 } },
      yTitle: unit,
    });
  };
});

// Signal with each sliding RMS window drawn as a shaded band behind it —
// makes the actual overlap between neighboring windows visible instead of
// only seeing the resulting RMS-over-time trend. With heavy overlap there
// can be hundreds of windows; drawing all of them would be an unreadable
// smear and would tank rendering performance, so this samples down to a
// manageable number of representative bands, evenly spread across time —
// the RMS *calculation* itself (in rollingRmsConfig above) always uses
// every window regardless, this display cap only affects this picture.
const MAX_DISPLAYED_WINDOWS = 40;
const rmsWindowsOverlayConfig = computed(() => {
  const s = sig.value, t = time.value;
  void zeitbereichStart.value; void zeitbereichEnd.value;
  void rmsWindowSec.value; void rmsOverlapPct.value;
  return (peakMode) => {
    if (!s) return emptyLineChartConfig();
    const { y, t: wt } = windowedYT(s, t);
    const unit = s.unit || "";
    const sD = down(y, wt, peakMode);

    const validY = y.filter((v) => Number.isFinite(v));
    const mm = A.minMax(validY);
    const pad = (mm.max - mm.min) * 0.05 || 1;
    const yMax = mm.max + pad, yMin = mm.min - pad;

    const allRanges = A.rmsWindowRanges(wt, rmsWindowSec.value, rmsOverlapPct.value);
    let ranges = allRanges;
    if (allRanges.length > MAX_DISPLAYED_WINDOWS) {
      const step = allRanges.length / MAX_DISPLAYED_WINDOWS;
      ranges = Array.from({ length: MAX_DISPLAYED_WINDOWS }, (_, i) => allRanges[Math.floor(i * step)]);
    }

    const bandDatasets = ranges.map((r, i) => ({
      label: i === 0 ? "Zeitfenster" : undefined, // one legend entry is enough, not one per band
      data: [{ x: r.start, y: yMax }, { x: r.end, y: yMax }],
      fill: { target: { value: yMin } },
      backgroundColor: i % 2 === 0 ? "rgba(37,99,235,0.10)" : "rgba(236,72,153,0.10)",
      borderWidth: 0,
      pointRadius: 0,
      order: 10, // bands drawn first (Chart.js: lower order = on top), signal line stays visible above them
    }));

    return buildLineChartConfig({
      labels: sD.rx,
      datasets: [
        ...bandDatasets,
        { label: `Signal [${unit}]`, data: sD.ry, borderColor: "#2563EB", borderWidth: 1.5, pointRadius: 0, order: 0 },
      ],
      plugins: {
        legend: {
          labels: {
            // Chart.js can't dedupe legend entries on its own — hide the
            // per-band "undefined"-labeled ones by filtering here instead.
            filter: (item) => item.text != null,
          },
        },
      },
      xTitle: "Zeit [s]",
      xScale: { type: "linear", ticks: { maxTicksLimit: 8 } },
      yTitle: unit,
      yScale: { min: yMin, max: yMax },
    });
  };
});

const fftConfig = computed(() => {
  const s = sig.value, t = time.value, wt = windowType.value;
  void zeitbereichStart.value; void zeitbereichEnd.value;
  return (peakMode) => {
    if (!s) return emptyLineChartConfig();
    const { y, t: wt3 } = windowedYT(s, t);
    const unit = s.unit || "";
    const { freq, amp } = A.fft(y, wt3, { windowType: wt, normalize: true });
    const fD = down(amp, freq, peakMode);
    return buildLineChartConfig({
      labels: fD.rx.map((f) => f.toFixed(1)),
      datasets: [{ label: "Amplitude", data: fD.ry, borderColor: "#7C3AED", backgroundColor: "rgba(124,58,237,0.08)", borderWidth: 1, pointRadius: 0, fill: true }],
      xTitle: "Frequenz [Hz]",
      xScale: { ticks: { maxTicksLimit: 12 } },
      yTitle: `Amplitude [${unit}]`,
    });
  };
});

// Phase spectrum — A.fft already computes phaseDeg alongside amp, this
// was just never plotted. Bins where the amplitude is negligible have an
// essentially random/meaningless phase (numerical noise dominates), so
// those are filtered out rather than cluttering the plot with noise.
const phaseConfig = computed(() => {
  const s = sig.value, t = time.value, wt = windowType.value;
  void zeitbereichStart.value; void zeitbereichEnd.value;
  return (peakMode) => {
    if (!s) return emptyLineChartConfig();
    const { y, t: wt4 } = windowedYT(s, t);
    const { freq, amp, phaseDeg } = A.fft(y, wt4, { windowType: wt, normalize: true });
    const ampMax = Math.max(0, ...amp.filter((v) => Number.isFinite(v)));
    const threshold = ampMax * 0.01; // below 1% of peak amplitude, phase is just noise
    const freqF = [], phaseF = [];
    for (let i = 0; i < freq.length; i++) {
      if (amp[i] >= threshold) { freqF.push(freq[i]); phaseF.push(phaseDeg[i]); }
    }
    const fD = down(phaseF, freqF, peakMode);
    return buildLineChartConfig({
      labels: fD.rx.map((f) => f.toFixed(1)),
      datasets: [{ label: "Phase", data: fD.ry, borderColor: "#F59E0B", borderWidth: 1, pointRadius: 0 }],
      xTitle: "Frequenz [Hz]",
      xScale: { ticks: { maxTicksLimit: 12 } },
      yTitle: "Phase [°]",
      yScale: { min: -180, max: 180 },
    });
  };
});
</script>

<style scoped>
/* Stat tiles in one horizontally-scrollable row instead of wrapping onto
   a second line — with a variable number of tiles (6 normally, 9 once
   dt/df/N are included) a wrapping grid left an awkward half-empty
   second row. Each tile keeps a sane minimum width so labels/values
   stay readable; if there genuinely isn't room for all of them the
   strip scrolls horizontally instead of squeezing text unreadably. */
.stat-strip {
  overflow-x: auto;
  padding-bottom: 4px; /* keeps the scrollbar from touching the card border */
}
.stat-strip .stat-card {
  flex: 1 1 150px; /* grow to fill available width when there's room, shrink down to the floor below */
  min-width: 150px; /* below this, the strip scrolls instead of squeezing labels unreadable */
}
</style>

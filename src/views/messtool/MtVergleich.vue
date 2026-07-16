<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-chart-multiple</v-icon>
      <h2 class="text-h5 font-weight-bold">Vergleich</h2>
    </div>
    <p class="text-medium-emphasis mb-6">Mehrere Messungen überlagern und vergleichen</p>

    <!-- Add files -->
    <v-card variant="outlined" rounded="lg" class="mb-4">
      <v-card-text class="d-flex flex-wrap ga-3 align-center">
        <v-btn
          variant="outlined"
          prepend-icon="mdi-file-plus-outline"
          :disabled="!mtStore.parsed"
          @click="addCurrent"
        >
          Aktuelle Datei hinzufügen
        </v-btn>
        <v-btn variant="outlined" prepend-icon="mdi-upload" @click="fileInput?.click()">
          Datei hochladen
        </v-btn>
        <v-btn variant="outlined" prepend-icon="mdi-cloud" @click="openCloudDialog">
          Aus Cloud hinzufügen
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          v-if="mtStore.compareFiles.length"
          variant="text"
          color="error"
          prepend-icon="mdi-delete-sweep"
          @click="mtStore.clearCompare()"
        >
          Alle entfernen
        </v-btn>
        <input ref="fileInput" type="file" accept=".csv" class="d-none" @change="onFileSelect" />
      </v-card-text>
    </v-card>

    <v-alert v-if="errorMsg" type="error" variant="tonal" density="compact" class="mb-4" closable @click:close="errorMsg = ''">
      {{ errorMsg }}
    </v-alert>

    <v-card v-if="mtStore.compareFiles.length === 0" variant="outlined" rounded="lg" class="pa-8 text-center">
      <v-icon size="56" color="grey-lighten-1" class="mb-3">mdi-chart-multiple</v-icon>
      <h3 class="text-h6 mb-2">Noch keine Dateien zum Vergleich hinzugefügt</h3>
      <p class="text-medium-emphasis">
        Füge die aktuell geladene Datei, eine neue Datei oder eine aus der Cloud hinzu.
      </p>
    </v-card>

    <template v-else>
      <!-- Per-file signal selection -->
      <v-card variant="outlined" rounded="lg" class="mb-4">
        <v-list density="comfortable">
          <v-list-item v-for="(f, idx) in mtStore.compareFiles" :key="f.id">
            <template #prepend>
              <v-icon color="grey" class="mr-1">mdi-file-outline</v-icon>
            </template>
            <v-row align="center" dense class="ml-1">
              <v-col cols="12" sm="3">
                <div class="text-body-2 font-weight-medium">{{ f.name }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ f.parsed.signals.length }} Signale · {{ f.parsed.time.length }} Punkte
                </div>
              </v-col>
              <v-col cols="12" sm="5">
                <v-autocomplete
                  v-model="f.selectedIndices"
                  :items="signalOptions(f)"
                  label="Signale (mehrere möglich)"
                  variant="outlined"
                  density="compact"
                  multiple
                  chips
                  closable-chips
                  hide-details
                >
                  <template #chip="{ item, props: chipProps }">
                    <v-chip
                      v-bind="chipProps"
                      :color="colorForSeries(f.id, item.value)"
                      variant="flat"
                      size="small"
                    ></v-chip>
                  </template>
                </v-autocomplete>
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field
                  v-model.number="f.offsetSec"
                  type="number"
                  step="0.1"
                  label="Zeit-Offset [s]"
                  variant="outlined"
                  density="compact"
                  hide-details
                  prepend-inner-icon="mdi-arrow-left-right"
                >
                  <template #append-inner>
                    <v-btn
                      v-if="f.offsetSec"
                      size="x-small" variant="text"
                      aria-label="Offset zurücksetzen"
                      @click="f.offsetSec = 0"
                    >
                      <v-icon size="16">mdi-backup-restore</v-icon>
                      <v-tooltip activator="parent" location="bottom">Offset zurücksetzen</v-tooltip>
                    </v-btn>
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="12" sm="1" class="text-right">
                <v-btn size="small" variant="text" color="error" icon="mdi-delete" :aria-label="`${f.name} aus Vergleich entfernen`" @click="mtStore.removeCompareFile(f.id)"></v-btn>
              </v-col>
              <v-col cols="12" class="d-flex flex-wrap ga-4 pt-0">
                <v-switch
                  v-model="f.useSecondAxis"
                  color="primary"
                  density="compact"
                  hide-details
                  label="Zweite Y-Achse"
                ></v-switch>
                <v-switch
                  v-if="idx > 0"
                  v-model="f.autoAlign"
                  color="primary"
                  density="compact"
                  hide-details
                  label="Automatisch ausrichten (Kreuzkorrelation)"
                  @update:model-value="(v) => v && autoAlignFile(f)"
                ></v-switch>
                <v-btn
                  v-if="idx > 0 && f.autoAlign"
                  size="x-small"
                  variant="text"
                  icon="mdi-refresh"
                  aria-label="Ausrichtung neu berechnen"
                  @click="autoAlignFile(f)"
                ></v-btn>
                <span v-if="idx > 0 && f.autoAlign && alignConfidence[f.id] !== undefined" class="text-caption text-medium-emphasis">
                  Übereinstimmung: {{ (alignConfidence[f.id] * 100).toFixed(0) }}%
                  <template v-if="alignConfidence[f.id] < 0.2">
                    — unsicher, Signale wirken nicht ähnlich
                  </template>
                </span>
              </v-col>
            </v-row>
          </v-list-item>
        </v-list>
      </v-card>

      <!-- Overlay chart -->
      <ChartCard title="Überlagerte Signale" :config="overlayConfig" :height="380" />

      <!-- Stat comparison -->
      <v-card variant="outlined" rounded="lg" class="mt-4">
        <v-card-title class="text-subtitle-1">Statistik-Vergleich</v-card-title>
        <v-divider></v-divider>
        <v-table density="comfortable">
          <thead>
            <tr>
              <th>Datei</th>
              <th>Signal</th>
              <th class="text-right">Mittel</th>
              <th class="text-right">RMS</th>
              <th class="text-right">Std</th>
              <th class="text-right">Min</th>
              <th class="text-right">Max</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in statRows" :key="row.id">
              <td><v-avatar :color="row.color" size="10" class="mr-2"></v-avatar>{{ row.name }}</td>
              <td>{{ row.signalLabel }}</td>
              <td class="text-right">{{ row.mean }}</td>
              <td class="text-right">{{ row.rms }}</td>
              <td class="text-right">{{ row.std }}</td>
              <td class="text-right">{{ row.min }}</td>
              <td class="text-right">{{ row.max }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </template>

    <!-- Cloud file picker -->
    <v-dialog v-model="cloudDialog" max-width="560">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-cloud</v-icon>
          Aus Cloud hinzufügen
        </v-card-title>
        <v-divider></v-divider>
        <v-list v-if="cloudFiles.length" density="comfortable">
          <v-list-item v-for="f in cloudFiles" :key="f.id">
            <v-list-item-title>{{ f.name }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ f.signal_count }} Signale · {{ (f.size_bytes / 1024).toFixed(0) }} KB
            </v-list-item-subtitle>
            <template #append>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-plus"
                :loading="cloudBusyId === f.id"
                :disabled="mtStore.compareFiles.some((c) => c.name === f.name)"
                @click="addFromCloud(f)"
              >
                {{ mtStore.compareFiles.some((c) => c.name === f.name) ? "Hinzugefügt" : "Hinzufügen" }}
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
        <v-card-text v-else class="text-center text-medium-emphasis pa-6">
          Keine Dateien in der Cloud.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="cloudDialog = false">Schließen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from "vue";
import { useMesstoolStore } from "../../stores/messtoolStore.js";
import * as A from "../../utils/messtoolAnalysis.js";
import { parseMesstoolCsv } from "../../utils/messtoolParser.js";
import { downsample } from "../../utils/downsample.js";
import { findBestOffset } from "../../utils/crossCorrelate.js";
import * as mtStorage from "../../utils/messtoolStorage.js";
import ChartCard from "./ChartCard.vue";

const mtStore = useMesstoolStore();

const fileInput = ref(null);
const errorMsg = ref("");
const alignConfidence = ref({}); // { [fileId]: score } from the last auto-align run
const cloudDialog = ref(false);
const cloudFiles = ref([]);
const cloudBusyId = ref(null);

function decodeLatin1(buffer) {
  return new TextDecoder("iso-8859-1").decode(buffer);
}

function addCurrent() {
  if (!mtStore.parsed) return;
  const name = mtStore.fileName || "Aktuelle Datei";
  const added = mtStore.addCompareFile(name, mtStore.parsed, {
    messfileId: mtStore.messfileId,
    storagePath: mtStore.messfileStoragePath,
  });
  if (!added) errorMsg.value = `"${name}" ist bereits in der Liste.`;
}

async function onFileSelect(e) {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;
  try {
    const buffer = await file.arrayBuffer();
    const text = decodeLatin1(buffer);
    const result = await parseMesstoolCsv(text, {});
    if (result.signals.length === 0) throw new Error("Keine Signale gefunden.");
    const added = mtStore.addCompareFile(file.name, result);
    if (!added) errorMsg.value = `"${file.name}" ist bereits in der Liste.`;
  } catch (err) {
    errorMsg.value = err.message || "Datei konnte nicht gelesen werden.";
  }
}

async function openCloudDialog() {
  cloudDialog.value = true;
  try {
    cloudFiles.value = await mtStorage.listMessfiles();
  } catch (err) {
    errorMsg.value = err.message || "Cloud-Liste konnte nicht geladen werden.";
  }
}

async function addFromCloud(f) {
  cloudBusyId.value = f.id;
  try {
    const buffer = await mtStorage.downloadMessfile(f.storage_path);
    const text = decodeLatin1(buffer);
    const result = await parseMesstoolCsv(text, {});
    mtStore.addCompareFile(f.name, result, { messfileId: f.id, storagePath: f.storage_path });
  } catch (err) {
    errorMsg.value = err.message || "Datei konnte nicht geladen werden.";
  } finally {
    cloudBusyId.value = null;
  }
}

// Auto-align (via cross-correlation) a file's time offset against the
// *first* file in the list, using each one's first selected signal as
// the representative "shape" to match on. Low-confidence matches (the
// two signals don't share a recognizable common event) get flagged
// instead of silently applying a probably-meaningless offset.
function autoAlignFile(f) {
  const ref = mtStore.compareFiles[0];
  if (!ref || ref.id === f.id) return;
  const refSig = ref.parsed.signals[ref.selectedIndices[0]];
  const targetSig = f.parsed.signals[f.selectedIndices[0]];
  if (!refSig || !targetSig) return;

  const { offsetSec, confidence } = findBestOffset(
    ref.parsed.time, refSig.data.map((v) => v ?? 0),
    f.parsed.time, targetSig.data.map((v) => v ?? 0),
  );
  f.offsetSec = +offsetSec.toFixed(2);
  alignConfidence.value = { ...alignConfidence.value, [f.id]: confidence };
}

function signalOptions(f) {
  return f.parsed.signals.map((s, i) => ({ title: `${s.name} [${s.unit || "-"}]`, value: i }));
}

// Looks up the color a given (file, signal-index) pair got assigned in
// mtStore.compareSeries, so the chips in the multi-select match the
// chart/stats colors exactly.
function colorForSeries(fileId, idx) {
  const found = mtStore.compareSeries.find((s) => s.fileId === fileId && s.signalIdx === idx);
  return found ? found.color : "grey";
}

// Overlay chart: linear x-axis with {x,y} points per dataset, so series
// with different durations/sample counts still line up correctly on time.
// One dataset per (file, signal) pair from compareSeries — so two signals
// picked from the same file each get their own line here too.
const overlayConfig = computed(() => {
  const series = mtStore.compareSeries;
  return (peakMode) => {
    const datasets = series.map((s) => {
      const y = s.signal.data.map((v) => (v == null ? null : v));
      const d = downsample(y, s.time, peakMode ? "minmax" : "simple", 800);
      const off = s.offsetSec || 0;
      const points = d.rx.map((x, i) => ({ x: x + off, y: d.ry[i] }));
      const offsetSuffix = off ? ` (${off > 0 ? "+" : ""}${off}s)` : "";
      const axisSuffix = s.useSecondAxis ? " ▸ rechte Achse" : "";
      const label = `${s.fileName} — ${s.signal.name} [${s.signal.unit || "-"}]${offsetSuffix}${axisSuffix}`;
      return {
        label,
        data: points,
        borderColor: s.color,
        backgroundColor: s.color,
        borderWidth: 1.5,
        pointRadius: 0,
        yAxisID: s.useSecondAxis ? "y1" : "y",
      };
    });

    const scales = {
      x: { type: "linear", title: { display: true, text: "Zeit [s]" } },
      y: { title: { display: true, text: "Wert" } },
    };
    // Only add the right-hand axis if at least one series actually uses
    // it — otherwise an empty second axis would just clutter the chart.
    if (series.some((s) => s.useSecondAxis)) {
      scales.y1 = {
        position: "right",
        title: { display: true, text: "Wert (rechte Achse)" },
        grid: { drawOnChartArea: false }, // avoid a doubled-up gridline mess
      };
    }

    return {
      type: "line",
      data: { datasets },
      options: {
        responsive: true,
        animation: false,
        parsing: false,
        scales,
      },
    };
  };
});

const statRows = computed(() =>
  mtStore.compareSeries.map((s) => {
    const y = s.signal.data.filter((v) => v != null && Number.isFinite(v));
    const mm = A.minMax(y);
    const fmt = (v) => (v == null ? "-" : v.toFixed(3));
    return {
      id: s.key,
      name: s.fileName,
      color: s.color,
      signalLabel: `${s.signal.name} [${s.signal.unit || "-"}]`,
      mean: fmt(A.mean(y)),
      rms: fmt(A.rms(y)),
      std: fmt(A.stddev(y)),
      min: fmt(mm.min),
      max: fmt(mm.max),
    };
  }),
);

onBeforeUnmount(() => {
  errorMsg.value = "";
});
</script>

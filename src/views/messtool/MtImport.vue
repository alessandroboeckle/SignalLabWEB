<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-file-upload</v-icon>
      <h2 class="text-h5 font-weight-bold">Import</h2>
    </div>
    <p class="text-medium-emphasis mb-6">Messdatei laden (Stadler LOGDATA / CSV)</p>

    <!-- Dropzone -->
    <v-card
      variant="outlined"
      rounded="lg"
      class="dropzone pa-8 text-center mb-4"
      :class="{ dragging: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
      @click="fileInput?.click()"
    >
      <v-icon size="56" color="primary" class="mb-3">mdi-cloud-upload-outline</v-icon>
      <h3 class="text-h6 mb-1">Datei hierher ziehen oder klicken</h3>
      <p class="text-medium-emphasis text-caption">CSV im Stadler-Messformat</p>
      <input
        ref="fileInput"
        type="file"
        accept=".csv"
        class="d-none"
        @change="onFileSelect"
      />
    </v-card>

    <!-- Advanced import settings -->
    <v-card variant="outlined" rounded="lg" class="mb-6">
      <v-card-title class="d-flex align-center py-2">
        <v-icon class="mr-2" size="20">mdi-tune</v-icon>
        <span class="text-body-1">Erweiterte Einstellungen</span>
        <v-spacer></v-spacer>
        <v-switch
          v-model="advancedMode"
          color="primary"
          density="compact"
          hide-details
          @click.stop
        ></v-switch>
      </v-card-title>
      <v-expand-transition>
        <div v-if="advancedMode">
          <v-divider></v-divider>
          <v-card-text>
            <p class="text-caption text-medium-emphasis mb-3">
              Ohne Angabe wird wie bisher die ganze Datei mit automatischer Zeitachse geladen.
            </p>
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="startRow"
                  label="Start Reihe"
                  placeholder="z.B. 1"
                  variant="outlined"
                  density="comfortable"
                  type="number"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="endRow"
                  label="End Reihe"
                  placeholder="z.B. 10000"
                  variant="outlined"
                  density="comfortable"
                  type="number"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="startCol"
                  label="Start Spalte"
                  placeholder="z.B. 1 / A"
                  variant="outlined"
                  density="comfortable"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="endCol"
                  label="End Spalte"
                  placeholder="z.B. 100 / CC"
                  variant="outlined"
                  density="comfortable"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="sampleFrequenz"
                  label="Samplefrequenz"
                  placeholder="z.B. 20 (leer = aus Zeitstempel)"
                  variant="outlined"
                  density="comfortable"
                  type="number"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="windowTypeImport"
                  :items="windowOptions"
                  label="Fenstertyp (FFT, für Analyse)"
                  variant="outlined"
                  density="comfortable"
                ></v-select>
              </v-col>
            </v-row>
          </v-card-text>
        </div>
      </v-expand-transition>
    </v-card>

    <!-- Parsing indicator -->
    <v-card v-if="parsing" variant="tonal" color="primary" class="pa-4 mb-6">
      <div class="d-flex align-center">
        <v-progress-circular indeterminate size="24" class="mr-3"></v-progress-circular>
        <span>Datei wird geparst …</span>
      </div>
    </v-card>

    <!-- Error -->
    <v-alert v-if="errorMsg" type="error" variant="tonal" class="mb-6" closable @click:close="errorMsg = ''">
      {{ errorMsg }}
    </v-alert>

    <!-- Cloud files (shared) -->
    <v-card variant="outlined" rounded="lg" class="mb-6">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-cloud</v-icon>
        Gespeicherte Messdateien
        <v-spacer></v-spacer>
        <v-btn size="small" variant="text" icon="mdi-refresh" :loading="loadingList" @click="loadList"></v-btn>
      </v-card-title>
      <v-divider></v-divider>
      <div v-if="cloudFiles.length === 0" class="pa-6 text-center text-medium-emphasis">
        Noch keine Dateien in der Cloud.
      </div>
      <v-list v-else density="compact">
        <v-list-item v-for="f in cloudFiles" :key="f.id">
          <template #prepend>
            <v-icon color="primary">mdi-file-chart</v-icon>
          </template>
          <v-list-item-title class="font-weight-medium">{{ f.name }}</v-list-item-title>
          <v-list-item-subtitle>
            {{ f.signal_count }} Signale • {{ f.row_count?.toLocaleString() }} Punkte •
            {{ (f.size_bytes / 1048576).toFixed(1) }} MB • {{ formatDate(f.created_at) }}
          </v-list-item-subtitle>
          <template #append>
            <v-btn size="small" variant="text" prepend-icon="mdi-download" :loading="busyId === f.id" @click="openCloudFile(f)">
              Öffnen
            </v-btn>
            <v-btn size="small" variant="text" color="error" icon="mdi-delete" @click="removeCloudFile(f)"></v-btn>
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <!-- Result -->
    <template v-if="parsed">
      <div class="d-flex align-center mb-4">
        <h3 class="text-h6">Geladen: {{ fileName }}</h3>
        <v-spacer></v-spacer>
        <v-btn
          v-if="lastFile"
          color="primary"
          prepend-icon="mdi-cloud-upload"
          :loading="uploading"
          @click="saveToCloud"
        >
          In Cloud speichern
        </v-btn>
      </div>

      <v-row class="mb-4">
        <v-col cols="6" sm="3">
          <v-card variant="tonal" color="primary" class="pa-3 text-center">
            <div class="text-h5 font-weight-bold">{{ parsed.meta.signalCount }}</div>
            <div class="text-caption">Signale</div>
          </v-card>
        </v-col>        <v-col cols="6" sm="3">
          <v-card variant="tonal" color="primary" class="pa-3 text-center">
            <div class="text-h5 font-weight-bold">{{ parsed.meta.rowCount.toLocaleString() }}</div>
            <div class="text-caption">Messpunkte</div>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card variant="tonal" color="primary" class="pa-3 text-center">
            <div class="text-h5 font-weight-bold">{{ formatDuration(parsed.meta.duration) }}</div>
            <div class="text-caption">Dauer</div>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card variant="tonal" color="primary" class="pa-3 text-center">
            <div class="text-h6 font-weight-bold text-truncate">{{ fileName }}</div>
            <div class="text-caption">Datei</div>
          </v-card>
        </v-col>
      </v-row>

      <v-alert
        v-if="parsed.meta.sampleRateInfo && parsed.meta.sampleRateInfo.gapCount > 0"
        type="warning"
        variant="tonal"
        density="comfortable"
        class="mb-4"
      >
        <div class="font-weight-medium mb-1">
          Unregelmässige Zeitstempel entdeckt ({{ parsed.meta.sampleRateInfo.gapCount }}
          {{ parsed.meta.sampleRateInfo.gapCount === 1 ? "Lücke" : "Lücken" }})
        </div>
        <div class="text-caption">
          Erkannte Samplerate ~{{ parsed.meta.sampleRateInfo.detectedFs ?? "?" }} Hz (Median-Δt).
          Erste Lücke bei Zeile {{ parsed.meta.sampleRateInfo.gaps[0]?.atRow }}
          (Δt = {{ parsed.meta.sampleRateInfo.gaps[0]?.dt }}s).
          Falls das die Analyse/Filterung verfälscht, ggf. in "Erweiterte Einstellungen"
          eine feste Samplefrequenz vorgeben.
        </div>
      </v-alert>

      <v-row>
        <!-- Signal list -->
        <v-col cols="12" md="5">
          <v-card variant="outlined" rounded="lg">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
              Signale
            </v-card-title>
            <v-divider></v-divider>
            <v-list density="compact" class="signal-list">
              <v-list-item
                v-for="(sig, idx) in parsed.signals"
                :key="idx"
                :active="selectedIdx === idx"
                @click="selectedIdx = idx"
              >
                <v-list-item-title>{{ sig.name }}</v-list-item-title>
                <template #append>
                  <v-chip size="x-small" variant="tonal">{{ sig.unit || "-" }}</v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- Preview chart -->
        <v-col cols="12" md="7">
          <ChartCard
            :title="`Vorschau: ${selectedSignal?.name || ''}`"
            :config="previewConfig"
            :height="300"
          />
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { parseMesstoolCsv, decodeLatin1 } from "../../utils/messtoolParser.js";
import * as mtStorage from "../../utils/messtoolStorage.js";
import { useMesstoolStore } from "../../stores/messtoolStore.js";
import ChartCard from "./ChartCard.vue";
import { downsample } from "../../utils/downsample.js";

const mtStore = useMesstoolStore();

const fileInput = ref(null);
const isDragging = ref(false);
const parsing = ref(false);
const errorMsg = ref("");
const parsed = ref(null);
const fileName = ref("");
const selectedIdx = ref(0);
const lastFile = ref(null); // the raw File, kept for uploading

// advanced import settings (all optional; empty = behave exactly as before)
const advancedMode = ref(false);
const startRow = ref(null);
const endRow = ref(null);
const startCol = ref(null);
const endCol = ref(null);
const sampleFrequenz = ref(null);
const windowTypeImport = ref("hann");
const windowOptions = [
  { title: "Hann", value: "hann" },
  { title: "Hamming", value: "hamming" },
  { title: "Rechteck (keins)", value: "none" },
];

function buildParseOptions() {
  if (!advancedMode.value) return {};
  const opts = {};
  if (startRow.value) opts.startRow = Number(startRow.value);
  if (endRow.value) opts.endRow = Number(endRow.value);
  if (startCol.value) opts.startCol = startCol.value;
  if (endCol.value) opts.endCol = endCol.value;
  if (sampleFrequenz.value) opts.sampleFrequenz = Number(sampleFrequenz.value);
  return opts;
}

// cloud state
const cloudFiles = ref([]);
const loadingList = ref(false);
const uploading = ref(false);
const busyId = ref(null);

const selectedSignal = computed(() =>
  parsed.value ? parsed.value.signals[selectedIdx.value] : null,
);

// config for the preview ChartCard (fresh function when signal changes)
const previewConfig = computed(() => {
  const p = parsed.value;
  const idx = selectedIdx.value;
  return (peakMode) => {
    if (!p) return { type: "line", data: { labels: [], datasets: [] } };
    const s = p.signals[idx];
    const time = p.time;
    const { rx: labels, ry: values } = downsample(s.data, time, peakMode ? "minmax" : "simple", 800);
    return {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: `${s.name} [${s.unit || "-"}]`,
          data: values,
          borderColor: "#2563EB",
          backgroundColor: "rgba(37,99,235,0.08)",
          borderWidth: 1.5, pointRadius: 0, tension: 0.1, fill: true,
        }],
      },
      options: {
        responsive: true, animation: false,
        scales: {
          x: { title: { display: true, text: "Zeit [s]" }, ticks: { maxTicksLimit: 10 } },
          y: { title: { display: true, text: s.unit || "" } },
        },
      },
    };
  };
});

function onFileSelect(e) {
  const file = e.target.files?.[0];
  if (file) handleFile(file);
}

function onDrop(e) {
  isDragging.value = false;
  const file = e.dataTransfer.files?.[0];
  if (file) handleFile(file);
}

async function handleFile(file) {
  errorMsg.value = "";
  parsed.value = null;
  parsing.value = true;
  fileName.value = file.name;
  lastFile.value = file;

  try {
    const buffer = await file.arrayBuffer();
    const text = decodeLatin1(buffer);
    await new Promise((r) => setTimeout(r, 20));
    const result = parseMesstoolCsv(text, buildParseOptions());
    if (result.signals.length === 0) {
      throw new Error("Keine Signale in der Datei gefunden.");
    }
    parsed.value = result;
    mtStore.setData(result, file.name);
    mtStore.fftWindowDefault = advancedMode.value ? windowTypeImport.value : null;
    selectedIdx.value = 0;
  } catch (err) {
    errorMsg.value = "Konnte Datei nicht parsen: " + (err.message || err);
  } finally {
    parsing.value = false;
  }
}

// ---- cloud ----

async function loadList() {
  loadingList.value = true;
  try {
    cloudFiles.value = await mtStorage.listMessfiles();
  } catch (e) {
    errorMsg.value = "Liste konnte nicht geladen werden: " + (e.message || e);
  }
  loadingList.value = false;
}

async function saveToCloud() {
  if (!lastFile.value || !parsed.value) return;
  uploading.value = true;
  errorMsg.value = "";
  try {
    await mtStorage.uploadMessfile(lastFile.value, parsed.value.meta);
    await loadList();
  } catch (e) {
    errorMsg.value = "Upload fehlgeschlagen: " + (e.message || e);
  }
  uploading.value = false;
}

async function openCloudFile(f) {
  busyId.value = f.id;
  errorMsg.value = "";
  try {
    const buffer = await mtStorage.downloadMessfile(f.storage_path);
    const text = decodeLatin1(buffer);
    const result = parseMesstoolCsv(text, buildParseOptions());
    parsed.value = result;
    mtStore.setData(result, f.name);
    mtStore.fftWindowDefault = advancedMode.value ? windowTypeImport.value : null;
    fileName.value = f.name;
    lastFile.value = null; // came from cloud, no re-upload
    selectedIdx.value = 0;
  } catch (e) {
    errorMsg.value = "Öffnen fehlgeschlagen: " + (e.message || e);
  }
  busyId.value = null;
}

async function removeCloudFile(f) {
  if (!confirm(`Datei "${f.name}" wirklich löschen?`)) return;
  try {
    await mtStorage.deleteMessfile(f);
    await loadList();
  } catch (e) {
    errorMsg.value = "Löschen fehlgeschlagen: " + (e.message || e);
  }
}

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

onMounted(loadList);

function formatDuration(sec) {
  if (sec < 60) return `${sec.toFixed(0)} s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")} min`;
}
</script>

<style scoped>
.dropzone {
  cursor: pointer;
  border-style: dashed !important;
  border-width: 2px !important;
  transition: all 0.2s ease;
}
.dropzone:hover,
.dropzone.dragging {
  border-color: #2563eb !important;
  background: rgba(37, 99, 235, 0.04);
}
.signal-list {
  max-height: 360px;
  overflow-y: auto;
}
</style>

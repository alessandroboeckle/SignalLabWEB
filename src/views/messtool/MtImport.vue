<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-file-upload</v-icon>
      <h2 class="text-h5 font-weight-bold">Import</h2>
    </div>
    <p class="text-medium-emphasis mb-6">Messdatei laden (LOGDATA / CSV)</p>

    <v-alert
      v-if="mtStore.sessionRestored"
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-4"
      closable
      @click:close="mtStore.dismissRestoredNotice()"
    >
      Sitzung wiederhergestellt: <strong>{{ mtStore.fileName }}</strong> war noch geladen
      (z.B. nach einem versehentlichen Neuladen der Seite). Zum Verwerfen einfach eine neue
      Datei laden oder diesen Hinweis schliessen.
    </v-alert>
    <v-alert
      v-if="mtStore.sessionTooLargeToPersist"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      Diese Datei ist zu gross, um automatisch gesichert zu werden — bei einem Neuladen der
      Seite müsstest du sie erneut importieren.
    </v-alert>

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
      <h3 class="text-h6 mb-1">Datei(en) hierher ziehen oder klicken</h3>
      <p class="text-medium-emphasis text-caption">
        CSV im LOGDATA-Messformat · mehrere auf einmal möglich — die erste wird geöffnet,
        weitere werden direkt in die Cloud hochgeladen
      </p>
      <input
        ref="fileInput"
        type="file"
        accept=".csv"
        multiple
        class="d-none"
        @change="onFileSelect"
      />
    </v-card>

    <!-- Batch upload of the extra files (beyond the first) -->
    <v-card v-if="batchUpload.active || batchUpload.done > 0" variant="tonal" color="primary" class="pa-4 mb-4">
      <div class="d-flex align-center mb-2">
        <v-progress-circular v-if="batchUpload.active" indeterminate size="20" class="mr-3"></v-progress-circular>
        <v-icon v-else class="mr-3">mdi-cloud-check-outline</v-icon>
        <span>
          <template v-if="batchUpload.active">
            Lade weitere Dateien in die Cloud hoch … ({{ batchUpload.done }}/{{ batchUpload.total }})
          </template>
          <template v-else>
            {{ batchUpload.done }}/{{ batchUpload.total }} weitere Datei(en) in die Cloud hochgeladen
          </template>
        </span>
      </div>
      <v-progress-linear
        v-if="batchUpload.total"
        :model-value="(batchUpload.done / batchUpload.total) * 100"
        height="6" rounded color="primary"
      ></v-progress-linear>
      <div v-if="!batchUpload.active && batchUpload.failed.length" class="text-caption mt-2">
        Fehlgeschlagen: {{ batchUpload.failed.join(", ") }}
      </div>
      <v-btn
        v-if="!batchUpload.active && batchUpload.uploadedFiles.length"
        size="small"
        color="primary"
        variant="flat"
        prepend-icon="mdi-chart-multiple"
        class="mt-2"
        @click="compareBatchFiles"
      >
        Diese Dateien vergleichen
      </v-btn>
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
      <div class="d-flex align-center mb-2">
        <v-progress-circular
          v-if="importProgress === 0"
          indeterminate
          size="24"
          class="mr-3"
        ></v-progress-circular>
        <span>Datei wird geparst{{ importProgress > 0 ? ` … ${importProgress}%` : " …" }}</span>
      </div>
      <v-progress-linear
        v-if="importProgress > 0"
        :model-value="importProgress"
        height="6"
        rounded
        color="primary"
      ></v-progress-linear>
    </v-card>

    <!-- Error -->
    <v-alert v-if="errorMsg" type="error" variant="tonal" class="mb-6" closable @click:close="errorMsg = ''">
      {{ errorMsg }}
    </v-alert>

    <!-- Result -->
    <template v-if="parsed">
      <div class="d-flex align-center mb-2 flex-wrap ga-2">
        <h3 class="text-h6">Geladen: {{ fileName }}</h3>
        <v-spacer></v-spacer>
        <v-btn
          variant="outlined"
          prepend-icon="mdi-chart-multiple-outline"
          class="mr-2"
          :disabled="mtStore.compareFiles.some((f) => f.name === fileName)"
          @click="addCurrentToCompare"
        >
          {{ mtStore.compareFiles.some((f) => f.name === fileName) ? "Im Vergleich" : "Zu Vergleich hinzufügen" }}
        </v-btn>
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

      <div v-if="batchUpload.uploadedFiles.length > 0" class="d-flex align-center mb-3">
        <v-switch
          v-model="combinedStats"
          color="primary"
          density="compact"
          hide-details
          class="flex-grow-0"
        ></v-switch>
        <span class="text-caption text-medium-emphasis">
          Messpunkte/Dauer für alle {{ batchUpload.uploadedFiles.length + 1 }} gerade geladenen
          Dateien zusammenzählen (statt nur {{ fileName }})
        </span>
      </div>

      <v-row class="mb-4">
        <v-col cols="6" sm="3">
          <v-card variant="tonal" color="primary" class="pa-3 text-center">
            <div class="text-h5 font-weight-bold">{{ parsed.meta.signalCount }}</div>
            <div class="text-caption">Signale</div>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card variant="tonal" color="primary" class="pa-3 text-center">
            <div class="text-h5 font-weight-bold">{{ combinedRowCount.toLocaleString() }}</div>
            <div class="text-caption">Messpunkte{{ combinedStats ? " (kombiniert)" : "" }}</div>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card variant="tonal" color="primary" class="pa-3 text-center">
            <div class="text-h5 font-weight-bold">{{ formatDuration(combinedDuration) }}</div>
            <div class="text-caption">Dauer{{ combinedStats ? " (kombiniert)" : "" }}</div>
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
        v-if="parsed.meta.qualityWarnings && parsed.meta.qualityWarnings.suspicious"
        type="warning"
        variant="tonal"
        density="comfortable"
        class="mb-4"
      >
        <div class="font-weight-medium mb-1">
          Auffällig viele Signale ohne Daten
          ({{ parsed.meta.qualityWarnings.allNullSignals.length }} leer,
          {{ parsed.meta.qualityWarnings.constantSignals.length }} konstant,
          von {{ parsed.meta.signalCount }} Signalen)
        </div>
        <div class="text-caption">
          Das kann bei einzelnen, wirklich unbenutzten Kanälen normal sein — bei diesem Anteil
          lohnt sich aber ein Blick, ob der Export vom Desktop-Tool vollständig war.
        </div>
      </v-alert>

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
            <v-text-field
              v-model="signalSearch"
              placeholder="Signal suchen …"
              variant="plain"
              density="compact"
              hide-details
              prepend-inner-icon="mdi-magnify"
              clearable
              class="px-3 pt-2"
            ></v-text-field>
            <v-divider></v-divider>
            <v-list density="compact" class="signal-list">
              <v-list-item
                v-for="item in filteredSignals"
                :key="item.idx"
                :active="selectedIdx === item.idx"
                @click="selectedIdx = item.idx"
              >
                <v-list-item-title :class="{ 'text-medium-emphasis': item.flagged }">
                  <v-icon v-if="item.flagged" size="14" color="warning" class="mr-1">mdi-alert-circle-outline</v-icon>
                  {{ item.sig.name }}
                </v-list-item-title>
                <template #append>
                  <v-chip size="x-small" variant="tonal">{{ item.sig.unit || "-" }}</v-chip>
                </template>
              </v-list-item>
              <v-list-item v-if="filteredSignals.length === 0" disabled title="Kein Signal gefunden"></v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- Preview chart -->
        <v-col cols="12" md="7">
          <ChartCard
            :title="`Vorschau: ${selectedSignal?.name || ''}`"
            :config="previewConfig"
            :height="340"
          />
          <v-row v-if="selectedSignal" dense class="mt-1">
            <v-col cols="6" sm="3">
              <v-card variant="outlined" class="pa-2 text-center">
                <div class="text-body-2 font-weight-bold">{{ previewStats.mean }}</div>
                <div class="text-caption text-medium-emphasis">Mittel</div>
              </v-card>
            </v-col>
            <v-col cols="6" sm="3">
              <v-card variant="outlined" class="pa-2 text-center">
                <div class="text-body-2 font-weight-bold">{{ previewStats.rms }}</div>
                <div class="text-caption text-medium-emphasis">RMS</div>
              </v-card>
            </v-col>
            <v-col cols="6" sm="3">
              <v-card variant="outlined" class="pa-2 text-center">
                <div class="text-body-2 font-weight-bold">{{ previewStats.min }}</div>
                <div class="text-caption text-medium-emphasis">Min</div>
              </v-card>
            </v-col>
            <v-col cols="6" sm="3">
              <v-card variant="outlined" class="pa-2 text-center">
                <div class="text-body-2 font-weight-bold">{{ previewStats.max }}</div>
                <div class="text-caption text-medium-emphasis">Max</div>
              </v-card>
            </v-col>
          </v-row>
        </v-col>
      </v-row>

      <!-- Quick compare preview: fast overlay right here, no page switch.
           Full controls (offset, stats table, batch export, multi-signal
           picking) live on the Vergleich page — this is just a fast look. -->
      <div v-if="mtStore.compareFiles.length > 1" class="mt-2">
        <div class="d-flex align-center flex-wrap ga-2 mb-2">
          <span class="text-subtitle-2">
            Schnellvorschau: {{ mtStore.compareFiles.length }} Datei(en) im Vergleich
          </span>
          <v-spacer></v-spacer>
          <v-btn size="small" color="primary" variant="tonal" prepend-icon="mdi-open-in-new" @click="emit('navigate', 'mt-vergleich')">
            Alle Funktionen im Vergleich öffnen
          </v-btn>
        </div>
        <ChartCard title="Überlagert" :config="quickCompareConfig" :height="260" />
      </div>
    </template>

    <!-- Vergleich shortcut -->
    <v-alert
      v-if="mtStore.compareFiles.length > 0"
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-4"
    >
      <div class="d-flex align-center flex-wrap ga-2">
        <span>
          {{ mtStore.compareFiles.length }} Datei(en) für den Vergleich vorgemerkt.
        </span>
        <v-spacer></v-spacer>
        <v-btn size="small" color="primary" variant="flat" prepend-icon="mdi-chart-multiple" @click="emit('navigate', 'mt-vergleich')">
          Zum Vergleich
        </v-btn>
      </div>
    </v-alert>

    <!-- Cloud files (shared) -->
    <v-card variant="outlined" rounded="lg" class="mb-6">
      <v-card-title class="d-flex align-center flex-wrap ga-2">
        <v-icon class="mr-2">mdi-cloud</v-icon>
        Gespeicherte Messdateien
        <v-spacer></v-spacer>
        <template v-if="selectedCloudIds.length > 0">
          <span class="text-caption text-medium-emphasis mr-2">{{ selectedCloudIds.length }} ausgewählt</span>
          <v-btn
            size="small" color="primary" variant="flat" prepend-icon="mdi-chart-multiple"
            :loading="bulkAddingCompare"
            class="mr-2"
            @click="addSelectedToCompare"
          >
            Zu Vergleich hinzufügen
          </v-btn>
          <v-btn size="small" variant="text" @click="selectedCloudIds = []">Auswahl aufheben</v-btn>
        </template>
        <v-btn size="small" variant="text" icon="mdi-refresh" :loading="loadingList" @click="loadList"></v-btn>
      </v-card-title>
      <v-divider></v-divider>
      <div v-if="cloudFiles.length === 0" class="pa-6 text-center text-medium-emphasis">
        Noch keine Dateien in der Cloud.
      </div>
      <v-list v-else density="compact">
        <v-list-item v-for="f in cloudFiles" :key="f.id">
          <template #prepend>
            <v-checkbox-btn
              :model-value="selectedCloudIds.includes(f.id)"
              class="mr-1"
              @update:model-value="toggleCloudSelection(f.id)"
            ></v-checkbox-btn>
            <v-icon color="primary">mdi-file-chart</v-icon>
          </template>
          <v-list-item-title class="font-weight-medium">{{ f.name }}</v-list-item-title>
          <v-list-item-subtitle>
            {{ f.signal_count }} Signale • {{ f.row_count?.toLocaleString() }} Punkte •
            {{ (f.size_bytes / 1048576).toFixed(1) }} MB • {{ formatDate(f.created_at) }}
          </v-list-item-subtitle>
          <template #append>
            <v-btn
              size="small" variant="text" icon="mdi-chart-multiple-outline"
              :loading="compareAddingId === f.id"
              @click="addCloudFileToCompare(f)"
            >
              <v-icon>mdi-chart-multiple-outline</v-icon>
              <v-tooltip activator="parent" location="bottom">Zu Vergleich hinzufügen</v-tooltip>
            </v-btn>
            <v-btn size="small" variant="text" prepend-icon="mdi-download" :loading="busyId === f.id" @click="openCloudFile(f)">
              Öffnen
            </v-btn>
            <v-btn size="small" variant="text" color="error" icon="mdi-delete" @click="removeCloudFile(f)"></v-btn>
          </template>
        </v-list-item>
      </v-list>
    </v-card>

  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { parseMesstoolCsv, decodeLatin1 } from "../../utils/messtoolParser.js";
import * as mtStorage from "../../utils/messtoolStorage.js";
import * as A from "../../utils/messtoolAnalysis.js";
import { useMesstoolStore } from "../../stores/messtoolStore.js";
import { showToast } from "../../composables/useToast.js";
import ChartCard from "./ChartCard.vue";
import { downsample } from "../../utils/downsample.js";

const emit = defineEmits(["navigate"]);

const mtStore = useMesstoolStore();

const fileInput = ref(null);
const isDragging = ref(false);
const parsing = ref(false);
const importProgress = ref(0);
const batchUpload = reactive({ active: false, total: 0, done: 0, failed: [], uploadedFiles: [] });
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

const signalSearch = ref("");
const filteredSignals = computed(() => {
  if (!parsed.value) return [];
  const q = (signalSearch.value || "").trim().toLowerCase();
  const flagged = new Set([
    ...(parsed.value.meta.qualityWarnings?.allNullSignals || []),
    ...(parsed.value.meta.qualityWarnings?.constantSignals || []),
  ]);
  return parsed.value.signals
    .map((sig, idx) => ({ sig, idx, flagged: flagged.has(sig.name) }))
    .filter((item) => !q || item.sig.name.toLowerCase().includes(q));
});

const previewStats = computed(() => {
  const s = selectedSignal.value;
  if (!s) return { mean: "-", rms: "-", min: "-", max: "-" };
  const y = s.data.filter((v) => v != null && Number.isFinite(v));
  const mm = A.minMax(y);
  const fmt = (v) => (v == null ? "-" : v.toFixed(3));
  return { mean: fmt(A.mean(y)), rms: fmt(A.rms(y)), min: fmt(mm.min), max: fmt(mm.max) };
});

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
  const files = Array.from(e.target.files || []);
  e.target.value = ""; // allow re-selecting the same file(s) later
  if (files.length) handleFiles(files);
}

function onDrop(e) {
  isDragging.value = false;
  const files = Array.from(e.dataTransfer.files || []);
  if (files.length) handleFiles(files);
}

// First file becomes the active file (existing single-file behavior).
// Any further files can't also be "active" — the whole app works off one
// loaded file at a time — so they're uploaded straight to the cloud
// instead, ready to be opened individually or pulled into Vergleich later.
function handleFiles(files) {
  const [first, ...rest] = files;
  handleFile(first);
  if (rest.length) uploadExtraFiles(rest);
}

async function uploadExtraFiles(files) {
  batchUpload.active = true;
  batchUpload.total = files.length;
  batchUpload.done = 0;
  batchUpload.failed = [];
  batchUpload.uploadedFiles = [];
  for (const file of files) {
    try {
      const buffer = await file.arrayBuffer();
      const text = decodeLatin1(buffer);
      const result = await parseMesstoolCsv(text, {});
      const row = await mtStorage.uploadMessfile(file, result.meta);
      batchUpload.uploadedFiles.push({
        name: file.name,
        parsed: result,
        messfileId: row.id,
        storagePath: row.storage_path,
      });
    } catch {
      batchUpload.failed.push(file.name);
    }
    batchUpload.done++;
  }
  batchUpload.active = false;
  await loadList();
}

function addCurrentToCompare() {
  if (!parsed.value) return;
  mtStore.addCompareFile(fileName.value, parsed.value, {
    messfileId: mtStore.messfileId,
    storagePath: mtStore.messfileStoragePath,
  });
  showToast(`${fileName.value} zu Vergleich hinzugefügt.`, { color: "info" });
}

const combinedStats = ref(false);

const combinedRowCount = computed(() => {
  if (!parsed.value) return 0;
  if (!combinedStats.value) return parsed.value.meta.rowCount;
  return (
    parsed.value.meta.rowCount +
    batchUpload.uploadedFiles.reduce((sum, f) => sum + f.parsed.meta.rowCount, 0)
  );
});

const combinedDuration = computed(() => {
  if (!parsed.value) return 0;
  if (!combinedStats.value) return parsed.value.meta.duration;
  return (
    parsed.value.meta.duration +
    batchUpload.uploadedFiles.reduce((sum, f) => sum + f.parsed.meta.duration, 0)
  );
});
const selectedCloudIds = ref([]);
const bulkAddingCompare = ref(false);
const compareAddingId = ref(null);

// Lightweight overlay for the "Schnellvorschau" on Import — same series
// data as the full Vergleich page (mtStore.compareSeries), just without
// its extra controls (offset inputs, stats table, batch export).
const quickCompareConfig = computed(() => {
  const series = mtStore.compareSeries;
  return (peakMode) => {
    const datasets = series.map((s) => {
      const y = s.signal.data.map((v) => (v == null ? null : v));
      const d = downsample(y, s.time, peakMode ? "minmax" : "simple", 600);
      const off = s.offsetSec || 0;
      const points = d.rx.map((x, i) => ({ x: x + off, y: d.ry[i] }));
      return {
        label: `${s.fileName} — ${s.signal.name} [${s.signal.unit || "-"}]`,
        data: points,
        borderColor: s.color,
        backgroundColor: s.color,
        borderWidth: 1.5,
        pointRadius: 0,
      };
    });
    return {
      type: "line",
      data: { datasets },
      options: {
        responsive: true,
        animation: false,
        parsing: false,
        scales: {
          x: { type: "linear", title: { display: true, text: "Zeit [s]" } },
          y: { title: { display: true, text: "Wert" } },
        },
      },
    };
  };
});

function toggleCloudSelection(id) {
  const i = selectedCloudIds.value.indexOf(id);
  if (i === -1) selectedCloudIds.value = [...selectedCloudIds.value, id];
  else selectedCloudIds.value = selectedCloudIds.value.filter((x) => x !== id);
}

async function addSelectedToCompare() {
  const files = cloudFiles.value.filter((f) => selectedCloudIds.value.includes(f.id));
  if (!files.length) return;
  bulkAddingCompare.value = true;
  errorMsg.value = "";
  const failed = [];
  for (const f of files) {
    if (mtStore.compareFiles.some((c) => c.name === f.name)) continue; // already added
    try {
      const buffer = await mtStorage.downloadMessfile(f.storage_path);
      const text = decodeLatin1(buffer);
      const result = await parseMesstoolCsv(text, {});
      mtStore.addCompareFile(f.name, result, { messfileId: f.id, storagePath: f.storage_path });
    } catch {
      failed.push(f.name);
    }
  }
  bulkAddingCompare.value = false;
  selectedCloudIds.value = [];
  if (failed.length) {
    errorMsg.value = "Nicht hinzugefügt: " + failed.join(", ");
  } else {
    emit("navigate", "mt-vergleich");
  }
}

async function addCloudFileToCompare(f) {
  if (mtStore.compareFiles.some((c) => c.name === f.name)) {
    emit("navigate", "mt-vergleich");
    return;
  }
  compareAddingId.value = f.id;
  errorMsg.value = "";
  try {
    const buffer = await mtStorage.downloadMessfile(f.storage_path);
    const text = decodeLatin1(buffer);
    const result = await parseMesstoolCsv(text, {});
    mtStore.addCompareFile(f.name, result, { messfileId: f.id, storagePath: f.storage_path });
  } catch (e) {
    errorMsg.value = `"${f.name}" konnte nicht zum Vergleich hinzugefügt werden: ` + (e.message || e);
  }
  compareAddingId.value = null;
}

function compareBatchFiles() {
  if (parsed.value && !mtStore.compareFiles.some((f) => f.name === fileName.value)) {
    mtStore.addCompareFile(fileName.value, parsed.value, {
      messfileId: mtStore.messfileId,
      storagePath: mtStore.messfileStoragePath,
    });
  }
  for (const f of batchUpload.uploadedFiles) {
    if (!mtStore.compareFiles.some((c) => c.name === f.name)) {
      mtStore.addCompareFile(f.name, f.parsed, { messfileId: f.messfileId, storagePath: f.storagePath });
    }
  }
  emit("navigate", "mt-vergleich");
}

async function handleFile(file) {
  errorMsg.value = "";
  parsed.value = null;
  parsing.value = true;
  importProgress.value = 0;
  fileName.value = file.name;
  lastFile.value = file;

  try {
    const buffer = await file.arrayBuffer();
    const text = decodeLatin1(buffer);
    await new Promise((r) => setTimeout(r, 20));
    const result = await parseMesstoolCsv(text, {
      ...buildParseOptions(),
      onProgress: (f) => { importProgress.value = Math.round(f * 100); },
    });
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
    const row = await mtStorage.uploadMessfile(lastFile.value, parsed.value.meta);
    mtStore.setCloudRef(row.id, row.storage_path);
    await loadList();
    showToast(`${fileName.value} in die Cloud gespeichert.`);
  } catch (e) {
    errorMsg.value = "Upload fehlgeschlagen: " + (e.message || e);
  }
  uploading.value = false;
}

async function openCloudFile(f) {
  busyId.value = f.id;
  errorMsg.value = "";
  importProgress.value = 0;
  try {
    const buffer = await mtStorage.downloadMessfile(f.storage_path);
    const text = decodeLatin1(buffer);
    const result = await parseMesstoolCsv(text, {
      ...buildParseOptions(),
      onProgress: (frac) => { importProgress.value = Math.round(frac * 100); },
    });
    parsed.value = result;
    mtStore.setData(result, f.name);
    mtStore.setCloudRef(f.id, f.storage_path);
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

onMounted(() => {
  // If the store already has a file (restored session, or just came back
  // from another Messtool page), reflect it locally so this page's own
  // "file loaded" summary/signal list shows it too.
  if (mtStore.parsed && !parsed.value) {
    parsed.value = mtStore.parsed;
    fileName.value = mtStore.fileName;
  }
  loadList();
});

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

<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-file-upload</v-icon>
      <h2 class="text-h4 font-weight-bold">Import</h2>
    </div>
    <p class="text-medium-emphasis mb-6">Messdatei laden (Stadler LOGDATA / CSV)</p>

    <!-- Dropzone -->
    <v-card
      variant="outlined"
      rounded="lg"
      class="dropzone pa-8 text-center mb-6"
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

    <!-- Result -->
    <template v-if="parsed">
      <v-row class="mb-4">
        <v-col cols="6" sm="3">
          <v-card variant="tonal" color="primary" class="pa-3 text-center">
            <div class="text-h5 font-weight-bold">{{ parsed.meta.signalCount }}</div>
            <div class="text-caption">Signale</div>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
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
          <v-card variant="outlined" rounded="lg">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2">mdi-chart-line</v-icon>
              Vorschau: {{ selectedSignal?.name }}
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text>
              <canvas ref="canvas" height="300"></canvas>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue";
import Chart from "chart.js/auto";
import { parseMesstoolCsv, decodeLatin1 } from "../../utils/messtoolParser.js";

const fileInput = ref(null);
const canvas = ref(null);
const isDragging = ref(false);
const parsing = ref(false);
const errorMsg = ref("");
const parsed = ref(null);
const fileName = ref("");
const selectedIdx = ref(0);
let chart = null;

const selectedSignal = computed(() =>
  parsed.value ? parsed.value.signals[selectedIdx.value] : null,
);

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

  try {
    const buffer = await file.arrayBuffer();
    const text = decodeLatin1(buffer);
    // parse in a microtask so the spinner can render
    await new Promise((r) => setTimeout(r, 20));
    const result = parseMesstoolCsv(text);
    if (result.signals.length === 0) {
      throw new Error("Keine Signale in der Datei gefunden.");
    }
    parsed.value = result;
    selectedIdx.value = 0;
    await nextTick();
    drawChart();
  } catch (err) {
    errorMsg.value = "Konnte Datei nicht parsen: " + (err.message || err);
  } finally {
    parsing.value = false;
  }
}

function drawChart() {
  if (!canvas.value || !selectedSignal.value) return;
  if (chart) {
    chart.destroy();
    chart = null;
  }

  const time = parsed.value.time;
  const data = selectedSignal.value.data;

  // downsample to ~800 points for smooth rendering
  const step = Math.max(1, Math.ceil(time.length / 800));
  const labels = [];
  const values = [];
  for (let i = 0; i < time.length; i += step) {
    labels.push(time[i]);
    values.push(data[i]);
  }

  chart = new Chart(canvas.value.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: `${selectedSignal.value.name} [${selectedSignal.value.unit || "-"}]`,
          data: values,
          borderColor: "#2563EB",
          backgroundColor: "rgba(37,99,235,0.08)",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.1,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        x: { title: { display: true, text: "Zeit [s]" }, ticks: { maxTicksLimit: 10 } },
        y: { title: { display: true, text: selectedSignal.value.unit || "" } },
      },
      plugins: { legend: { display: true } },
    },
  });
}

watch(selectedIdx, () => drawChart());

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

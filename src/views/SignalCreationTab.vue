<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <h2 class="text-h5 font-weight-bold mb-4">Signal Generator</h2>
      </v-col>
    </v-row>

    <v-row>
      <!-- Controls Sidebar -->
      <v-col cols="12" md="3">
        <v-card class="elevation-2 sticky" style="top: 20px">
          <v-card-title>Parameters</v-card-title>
          <v-card-text>
            <!-- Signal Name -->
            <v-text-field
              v-model="params.name"
              label="Signal Name"
              outlined
              dense
              class="mb-4"
            ></v-text-field>

            <!-- Wave Type -->
            <v-select
              v-model="params.waveType"
              label="Wave Type"
              :items="waveTypes"
              outlined
              dense
              class="mb-4"
              @update:modelValue="generateSignal"
            ></v-select>

            <!-- Frequency -->
            <div class="mb-4">
              <label class="text-caption font-weight-500"
                >Frequency: {{ params.frequency }} Hz</label
              >
              <v-slider
                v-model="params.frequency"
                min="0.1"
                max="100"
                step="0.1"
                @update:modelValue="generateSignal"
              ></v-slider>
              <v-text-field
                v-model.number="params.frequency"
                label="Frequency (Hz)"
                type="number"
                outlined
                dense
                @update:modelValue="generateSignal"
              ></v-text-field>
            </div>

            <!-- Amplitude -->
            <div class="mb-4">
              <label class="text-caption font-weight-500"
                >Amplitude: {{ params.amplitude }}</label
              >
              <v-slider
                v-model="params.amplitude"
                min="0.1"
                max="100"
                step="0.1"
                @update:modelValue="generateSignal"
              ></v-slider>
              <v-text-field
                v-model.number="params.amplitude"
                label="Amplitude"
                type="number"
                outlined
                dense
                @update:modelValue="generateSignal"
              ></v-text-field>
            </div>

            <!-- Phase -->
            <div class="mb-4">
              <label class="text-caption font-weight-500"
                >Phase: {{ params.phase }}°</label
              >
              <v-slider
                v-model="params.phase"
                min="0"
                max="360"
                step="1"
                @update:modelValue="generateSignal"
              ></v-slider>
              <v-text-field
                v-model.number="params.phase"
                label="Phase (°)"
                type="number"
                outlined
                dense
                @update:modelValue="generateSignal"
              ></v-text-field>
            </div>

            <v-divider class="my-4"></v-divider>

            <!-- Duration -->
            <div class="mb-4">
              <label class="text-caption font-weight-500"
                >Duration: {{ params.duration }}s</label
              >
              <v-slider
                v-model="params.duration"
                min="0.1"
                max="10"
                step="0.1"
                @update:modelValue="generateSignal"
              ></v-slider>
              <v-text-field
                v-model.number="params.duration"
                label="Duration (s)"
                type="number"
                outlined
                dense
                @update:modelValue="generateSignal"
              ></v-text-field>
            </div>

            <!-- Sampling Rate -->
            <div class="mb-4">
              <label class="text-caption font-weight-500"
                >Sampling Rate: {{ params.samplingRate }} Hz</label
              >
              <v-select
                v-model="params.samplingRate"
                label="Sampling Rate"
                :items="samplingRates"
                outlined
                dense
                @update:modelValue="generateSignal"
              ></v-select>
            </div>

            <v-divider class="my-4"></v-divider>

            <!-- Options -->
            <div class="mb-4">
              <v-checkbox
                v-model="options.enableFFT"
                label="Enable FFT Analysis"
              ></v-checkbox>
              <v-checkbox
                v-model="options.enableWindow"
                label="Apply Hann Window"
              ></v-checkbox>
              <v-checkbox
                v-model="options.logScale"
                label="Log Scale"
              ></v-checkbox>
            </div>

            <!-- Action Buttons -->
            <v-btn
              block
              color="primary"
              class="mb-2"
              @click="saveSignal"
              prepend-icon="mdi-save"
            >
              Save Signal
            </v-btn>
            <v-btn
              block
              color="primary"
              variant="outlined"
              class="mb-2"
              @click="exportSignal"
              prepend-icon="mdi-download"
            >
              Export
            </v-btn>
            <v-btn
              block
              color="primary"
              variant="outlined"
              @click="resetParameters"
              prepend-icon="mdi-refresh"
            >
              Reset
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Chart Display -->
      <v-col cols="12" md="9">
        <v-row>
          <!-- Time Domain Plot -->
          <v-col cols="12">
            <v-card class="elevation-2">
              <v-card-title>Time Domain</v-card-title>
              <v-card-text>
                <canvas id="timeDomainChart"></canvas>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- FFT Plot -->
          <v-col v-if="options.enableFFT" cols="12">
            <v-card class="elevation-2">
              <v-card-title>Frequency Domain (FFT)</v-card-title>
              <v-card-text>
                <canvas id="fftChart"></canvas>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Signal Statistics -->
          <v-col cols="12" sm="6" md="4">
            <v-card class="elevation-2">
              <v-card-title class="text-subtitle2"
                >Signal Statistics</v-card-title
              >
              <v-card-text>
                <div class="text-caption mb-2">
                  <strong>RMS Value:</strong>
                  {{ formatNumber(store.currentSignal.meta.rms) }}
                </div>
                <div class="text-caption mb-2">
                  <strong>Peak Value:</strong>
                  {{ formatNumber(store.currentSignal.meta.peak) }}
                </div>
                <div class="text-caption mb-2">
                  <strong>Peak-to-Peak:</strong>
                  {{ formatNumber(store.currentSignal.meta.peakToPeak) }}
                </div>
                <div class="text-caption">
                  <strong>Samples:</strong>
                  {{ store.currentSignal.timeData.length }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Signal Info -->
          <v-col cols="12" sm="6" md="4">
            <v-card class="elevation-2">
              <v-card-title class="text-subtitle2">Signal Info</v-card-title>
              <v-card-text>
                <div class="text-caption mb-2">
                  <strong>Type:</strong> {{ params.waveType }}
                </div>
                <div class="text-caption mb-2">
                  <strong>Frequency:</strong> {{ params.frequency }} Hz
                </div>
                <div class="text-caption mb-2">
                  <strong>Duration:</strong> {{ params.duration }} s
                </div>
                <div class="text-caption">
                  <strong>Sample Rate:</strong> {{ params.samplingRate }} Hz
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Code Preview -->
          <v-col cols="12" sm="6" md="4">
            <v-card class="elevation-2">
              <v-card-title class="text-subtitle2">Generated Code</v-card-title>
              <v-card-text>
                <v-btn
                  size="small"
                  color="primary"
                  @click="copyCode"
                  class="mb-2"
                >
                  <v-icon small left>mdi-content-copy</v-icon>
                  Copy
                </v-btn>
                <pre
                  class="text-caption"
                  style="overflow: auto; max-height: 150px"
                  >{{ generatedCode }}</pre
                >
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <v-row class="mt-6">
      <v-col cols="12">
        <v-card variant="outlined" rounded="lg">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-database-arrow-down-outline</v-icon>
            Messtool-Testdatei generieren
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <p class="text-body-2 text-medium-emphasis mb-4">
              Erzeugt eine grosse, realistische LOGDATA-CSV im gleichen Format wie eine echte
              Messdatei (SECTION/LOGITEM-Header, 35 typische Antriebs-/Bremssignale,
              Fahrzyklen mit Beschleunigen/Cruisen/Bremsen) — zum Testen von Import, Filter,
              Analyse und Verarbeitung mit grossen Dateien.
            </p>
            <v-row dense>
              <v-col cols="12" sm="3">
                <v-text-field
                  v-model.number="brakeGen.rows"
                  type="number"
                  label="Anzahl Zeilen"
                  variant="outlined"
                  density="comfortable"
                  hint="z.B. 10000, bis mehrere 100'000"
                  persistent-hint
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field
                  v-model.number="brakeGen.fs"
                  type="number"
                  label="Samplerate [Hz]"
                  variant="outlined"
                  density="comfortable"
                  hint="Original: 8 Hz"
                  persistent-hint
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field
                  v-model.number="brakeGen.cycles"
                  type="number"
                  label="Fahrzyklen (leer = auto)"
                  variant="outlined"
                  density="comfortable"
                  placeholder="auto"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field
                  v-model.number="brakeGen.seed"
                  type="number"
                  label="Seed (leer = zufällig)"
                  variant="outlined"
                  density="comfortable"
                  placeholder="zufällig"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-alert
              v-if="brakeGen.rows > 150000"
              type="warning"
              variant="tonal"
              density="compact"
              class="text-caption mb-3"
            >
              Grosse Zeilenzahl — Generierung/Download kann einige Sekunden dauern und die Datei
              wird entsprechend gross (~0.5 KB/Zeile).
            </v-alert>

            <v-btn
              color="primary"
              prepend-icon="mdi-file-download-outline"
              :loading="brakeGen.busy"
              @click="generateBrakeFile"
            >
              Testdatei generieren &amp; herunterladen
            </v-btn>
            <v-btn
              variant="outlined"
              prepend-icon="mdi-dice-multiple-outline"
              class="ml-2"
              :disabled="brakeGen.busy"
              @click="randomizeAndGenerate"
            >
              Zufällig
              <v-tooltip activator="parent" location="bottom">
                Würfelt Zeilen/Samplerate/Fahrzyklen/Seed neu und generiert direkt
              </v-tooltip>
            </v-btn>

            <v-alert v-if="brakeGen.error" type="error" variant="tonal" density="compact" class="mt-3">
              {{ brakeGen.error }}
            </v-alert>
            <v-alert v-if="brakeGen.lastInfo" type="success" variant="tonal" density="compact" class="mt-3">
              {{ brakeGen.lastInfo }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSnackbar" color="success" :timeout="2000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch, reactive } from "vue";
import { useSignalStore } from "../stores/signalStore";
import * as signalProcessing from "../utils/signalProcessing";
import Chart from "chart.js/auto";
import { generateBrakeTestCsv, downloadBrakeTestCsv } from "../utils/messtoolTestGenerator.js";

const brakeGen = reactive({
  rows: 10000,
  fs: 8,
  cycles: null,
  seed: null,
  busy: false,
  error: "",
  lastInfo: "",
});

// Rolls new random-ish generation parameters (rows/samplerate/cycles/seed)
// within sensible ranges, then generates immediately — a quick "surprise
// me" variant of a test file without having to fill in the form by hand.
async function randomizeAndGenerate() {
  const rowChoices = [2000, 5000, 10000, 25000, 50000, 100000];
  brakeGen.rows = rowChoices[Math.floor(Math.random() * rowChoices.length)];
  const fsChoices = [4, 5, 8, 10, 16, 20];
  brakeGen.fs = fsChoices[Math.floor(Math.random() * fsChoices.length)];
  brakeGen.cycles = Math.random() < 0.5 ? null : 1 + Math.floor(Math.random() * 6);
  brakeGen.seed = Math.floor(Math.random() * 1_000_000_000);
  await generateBrakeFile();
}

async function generateBrakeFile() {
  brakeGen.error = "";
  brakeGen.lastInfo = "";
  const rows = Math.floor(brakeGen.rows);
  if (!rows || rows < 2) {
    brakeGen.error = "Bitte eine gültige Anzahl Zeilen angeben (mind. 2).";
    return;
  }
  brakeGen.busy = true;
  try {
    // yield to the UI so the loading spinner actually shows before the
    // (synchronous, potentially multi-second) generation work runs
    await new Promise((r) => setTimeout(r, 20));
    const csv = generateBrakeTestCsv({
      rows,
      fs: brakeGen.fs > 0 ? brakeGen.fs : 8,
      cycles: brakeGen.cycles ? Math.max(1, Math.floor(brakeGen.cycles)) : null,
      seed: brakeGen.seed != null && brakeGen.seed !== "" ? Math.floor(brakeGen.seed) : null,
    });
    const filename = `Testfile_Brake_Resisitor_${rows}rows_${Date.now()}.csv`;
    downloadBrakeTestCsv(csv, filename);
    brakeGen.lastInfo = `${filename} erstellt (${(csv.length / 1024 / 1024).toFixed(2)} MB, 35 Signale, ${rows.toLocaleString()} Zeilen).`;
  } catch (err) {
    brakeGen.error = err.message || "Konnte Testdatei nicht generieren.";
  } finally {
    brakeGen.busy = false;
  }
}

const store = useSignalStore();

const params = ref({
  name: "Signal 1",
  waveType: "sinus",
  frequency: 5,
  amplitude: 10,
  phase: 0,
  duration: 2,
  samplingRate: 1000,
});

const options = ref({
  enableFFT: false,
  enableWindow: false,
  logScale: false,
});

const waveTypes = ["sinus", "cosinus", "rechteck", "sägezahn", "dreieck"];
const samplingRates = [100, 500, 1000, 5000, 10000, 44100];

let timeDomainChart = null;
let fftChart = null;

const showSnackbar = ref(false);
const snackbarMessage = ref("");

const generatedCode = computed(() => {
  return `// Generate ${params.value.waveType} wave
const duration = ${params.value.duration}; // seconds
const samplingRate = ${params.value.samplingRate}; // Hz
const frequency = ${params.value.frequency}; // Hz
const amplitude = ${params.value.amplitude};
const phase = ${params.value.phase}; // degrees

const timeArray = generateTimeArray(duration, samplingRate);
const signal = generateSignal(
  timeArray,
  '${params.value.waveType}',
  frequency,
  amplitude,
  phase
);`;
});

function formatNumber(num) {
  return typeof num === "number" ? num.toFixed(3) : "0";
}

function generateSignal() {
  store.generateSignal(params.value);
  updateCharts();
}

async function saveSignal() {
  try {
    const saved = await store.saveCurrentSignal();
    snackbarMessage.value = `Signal "${saved.name}" saved!`;
  } catch (e) {
    snackbarMessage.value = "Fehler beim Speichern: " + (e.message || e);
  }
  showSnackbar.value = true;
}

function exportSignal() {
  const format = "json";
  store.exportSignal(store.currentSignal.id, format);
  snackbarMessage.value = "Signal exported!";
  showSnackbar.value = true;
}

function resetParameters() {
  params.value = {
    name: "Signal 1",
    waveType: "sinus",
    frequency: 5,
    amplitude: 10,
    phase: 0,
    duration: 2,
    samplingRate: 1000,
  };
  generateSignal();
}

function copyCode() {
  navigator.clipboard.writeText(generatedCode.value);
  snackbarMessage.value = "Code copied to clipboard!";
  showSnackbar.value = true;
}

function updateCharts() {
  drawTimeDomainChart();
  if (options.value.enableFFT) {
    drawFFTChart();
  }
}

function drawTimeDomainChart() {
  const canvas = document.getElementById("timeDomainChart");
  if (!canvas) return;

  if (timeDomainChart) {
    timeDomainChart.destroy();
  }

  const signal = store.currentSignal;
  if (signal.timeData.length === 0) return;

  // Sample data for display
  const sampleRate = Math.ceil(signal.timeData.length / 1000);
  const sampledTime = signal.timeData.filter((_, i) => i % sampleRate === 0);
  const sampledAmplitude = signal.amplitudeData.filter(
    (_, i) => i % sampleRate === 0,
  );

  timeDomainChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: sampledTime.map((t) => t.toFixed(3)),
      datasets: [
        {
          label: params.value.name,
          data: sampledAmplitude,
          borderColor: "#2563EB",
          backgroundColor: "rgba(37, 99, 235, 0.1)",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          labels: { usePointStyle: true },
        },
      },
      scales: {
        y: {
          title: {
            display: true,
            text: "Amplitude",
          },
        },
        x: {
          title: {
            display: true,
            text: "Time (s)",
          },
        },
      },
    },
  });
}

function drawFFTChart() {
  const canvas = document.getElementById("fftChart");
  if (!canvas) return;

  if (fftChart) {
    fftChart.destroy();
  }

  const signal = store.currentSignal;
  if (signal.amplitudeData.length === 0) return;

  let signalData = new Float64Array(signal.amplitudeData);
  if (options.value.enableWindow) {
    signalData = signalProcessing.applyHannWindow(signalData);
  }

  const fftResult = signalProcessing.computeFFTMagnitude(
    signalData,
    params.value.samplingRate,
  );

  // Sample FFT data
  const sampleRate = Math.ceil(fftResult.frequency.length / 500);
  const sampledFreq = Array.from(fftResult.frequency).filter(
    (_, i) => i % sampleRate === 0,
  );
  const sampledMag = Array.from(fftResult.magnitude).filter(
    (_, i) => i % sampleRate === 0,
  );

  fftChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: sampledFreq.map((f) => f.toFixed(1)),
      datasets: [
        {
          label: "FFT Magnitude",
          data: sampledMag,
          borderColor: "#FF6B35",
          backgroundColor: "rgba(255, 107, 53, 0.1)",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          labels: { usePointStyle: true },
        },
      },
      scales: {
        y: {
          type: options.value.logScale ? "logarithmic" : "linear",
          title: {
            display: true,
            text: "Magnitude",
          },
        },
        x: {
          title: {
            display: true,
            text: "Frequency (Hz)",
          },
        },
      },
    },
  });
}

onMounted(() => {
  generateSignal();
});

watch(
  () => options.value.enableFFT,
  () => {
    updateCharts();
  },
);

watch(
  () => options.value.enableWindow,
  () => {
    if (options.value.enableFFT) {
      updateCharts();
    }
  },
);

watch(
  () => options.value.logScale,
  () => {
    if (options.value.enableFFT) {
      drawFFTChart();
    }
  },
);
</script>

<style scoped>
canvas {
  max-height: 400px;
}

.sticky {
  position: sticky;
  top: 80px;
}

@media (max-width: 960px) {
  .sticky {
    position: relative;
    top: 0;
  }
}
</style>

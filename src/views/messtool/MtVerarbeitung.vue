<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-cog-transfer</v-icon>
      <h2 class="text-h4 font-weight-bold">Verarbeitung</h2>
    </div>
    <p class="text-medium-emphasis mb-6">Glätten, Detrend, Normalisieren – verkettbar</p>

    <v-card v-if="!mtStore.parsed" variant="outlined" rounded="lg" class="pa-8 text-center">
      <v-icon size="56" color="grey-lighten-1" class="mb-3">mdi-file-question-outline</v-icon>
      <h3 class="text-h6 mb-2">Keine Messdatei geladen</h3>
      <p class="text-medium-emphasis">Lade zuerst im Bereich <strong>Import</strong> eine Datei.</p>
    </v-card>

    <template v-else>
      <v-row>
        <!-- Left: controls -->
        <v-col cols="12" md="4">
          <v-select
            v-model="selectedIdx"
            :items="signalOptions"
            label="Signal"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-sine-wave"
            class="mb-4"
          ></v-select>

          <v-card variant="outlined" rounded="lg" class="mb-4">
            <v-card-title class="text-subtitle-1 d-flex align-center flex-wrap ga-2">
              Operationen
              <v-spacer></v-spacer>
              <v-menu>
                <template #activator="{ props }">
                  <v-btn size="small" variant="outlined" v-bind="props" prepend-icon="mdi-folder-open-outline">
                    Presets
                  </v-btn>
                </template>
                <v-list min-width="220">
                  <v-list-item v-if="presets.length === 0" disabled title="Noch keine Presets gespeichert"></v-list-item>
                  <v-list-item
                    v-for="p in presets"
                    :key="p.name"
                    :title="p.name"
                    :subtitle="`${p.ops.length} Schritt(e)`"
                    @click="loadPresetByName(p.name)"
                  >
                    <template #append>
                      <v-btn size="x-small" variant="text" color="error" icon="mdi-delete" @click.stop="removePreset(p.name)"></v-btn>
                    </template>
                  </v-list-item>
                </v-list>
              </v-menu>
              <v-btn
                size="small"
                variant="outlined"
                prepend-icon="mdi-content-save-outline"
                :disabled="ops.length === 0"
                @click="saveDialog = true"
              >
                Speichern
              </v-btn>
              <v-menu>
                <template #activator="{ props }">
                  <v-btn size="small" variant="tonal" color="primary" v-bind="props" prepend-icon="mdi-plus">
                    Hinzufügen
                  </v-btn>
                </template>
                <v-list>
                  <v-list-item
                    v-for="entry in registry"
                    :key="entry.id"
                    :title="entry.label"
                    @click="addOp(entry)"
                  ></v-list-item>
                </v-list>
              </v-menu>
              <v-btn
                size="small"
                variant="outlined"
                prepend-icon="mdi-file-delimited-outline"
                :disabled="!sig"
                @click="exportCsv"
              >
                CSV
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>

            <div v-if="ops.length === 0" class="pa-4 text-center text-medium-emphasis text-caption">
              Noch keine Operation. Über „Hinzufügen" wählen.
            </div>

            <v-list v-else>
              <template v-for="(op, i) in ops" :key="i">
                <v-list-item>
                  <template #prepend>
                    <v-chip size="x-small" class="mr-2">{{ i + 1 }}</v-chip>
                  </template>
                  <v-list-item-title>{{ op.label }}</v-list-item-title>

                  <!-- per-op params -->
                  <div v-if="op.id === 'smooth'" class="mt-2">
                    <v-slider
                      v-model="op.params.windowLen"
                      :min="3" :max="101" :step="2"
                      density="compact"
                      hide-details
                      :label="`Fenster: ${op.params.windowLen}`"
                      @update:model-value="recompute"
                    ></v-slider>
                    <v-select
                      v-model="op.params.windowType"
                      :items="['hanning','hamming','flat']"
                      density="compact"
                      variant="outlined"
                      hide-details
                      label="Fenstertyp"
                      class="mt-2"
                      @update:model-value="recompute"
                    ></v-select>
                  </div>
                  <div v-else-if="op.id === 'normalize'" class="mt-2">
                    <v-text-field
                      v-model.number="op.params.target"
                      type="number"
                      density="compact"
                      variant="outlined"
                      hide-details
                      label="Ziel-Amplitude"
                      @update:model-value="recompute"
                    ></v-text-field>
                  </div>

                  <template #append>
                    <v-btn size="x-small" variant="text" icon="mdi-arrow-up" :disabled="i===0" @click="move(i,-1)"></v-btn>
                    <v-btn size="x-small" variant="text" icon="mdi-arrow-down" :disabled="i===ops.length-1" @click="move(i,1)"></v-btn>
                    <v-btn size="x-small" variant="text" color="error" icon="mdi-delete" @click="removeOp(i)"></v-btn>
                  </template>
                </v-list-item>
                <v-divider v-if="i < ops.length - 1"></v-divider>
              </template>
            </v-list>
          </v-card>
        </v-col>

        <!-- Right: comparison chart -->
        <v-col cols="12" md="8">
          <ChartCard title="Original vs. Verarbeitet" :config="compareConfig" :height="420" />
        </v-col>
      </v-row>
    </template>

    <!-- Save preset dialog -->
    <v-dialog v-model="saveDialog" max-width="420">
      <v-card>
        <v-card-title>Preset speichern</v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-text-field
            v-model="presetName"
            label="Name"
            variant="outlined"
            density="comfortable"
            autofocus
            hide-details
            @keyup.enter="confirmSave"
          ></v-text-field>
          <p class="text-caption text-medium-emphasis mt-2">
            Speichert die aktuelle Kette ({{ ops.length }} Schritt(e)) mit ihren Parametern.
          </p>
          <v-alert v-if="saveError" type="error" variant="tonal" density="compact" class="mt-2">
            {{ saveError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="saveDialog = false">Abbrechen</v-btn>
          <v-btn color="primary" variant="flat" @click="confirmSave">Speichern</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed } from "vue";
import { useMesstoolStore } from "../../stores/messtoolStore.js";
import { OP_REGISTRY, applyChain } from "../../utils/messtoolProcessing.js";
import * as presetsApi from "../../utils/messtoolPresets.js";
import { buildCsv, downloadCsv } from "../../utils/csvExport.js";
import ChartCard from "./ChartCard.vue";
import { downsample } from "../../utils/downsample.js";

const mtStore = useMesstoolStore();
const registry = OP_REGISTRY;

const selectedIdx = ref(0);
const ops = ref([]);
const version = ref(0); // bump to force recompute on param edits

const presets = ref(presetsApi.listPresets());
const saveDialog = ref(false);
const presetName = ref("");
const saveError = ref("");

function confirmSave() {
  try {
    presets.value = presetsApi.savePreset(presetName.value, ops.value);
    saveDialog.value = false;
    presetName.value = "";
    saveError.value = "";
  } catch (err) {
    saveError.value = err.message || "Konnte Preset nicht speichern.";
  }
}

function loadPresetByName(name) {
  const preset = presets.value.find((p) => p.name === name);
  if (!preset) return;
  ops.value = presetsApi.instantiatePreset(preset, registry);
  recompute();
}

function removePreset(name) {
  presets.value = presetsApi.deletePreset(name);
}

function exportCsv() {
  if (!sig.value) return;
  const s = sig.value, t = time.value;
  const y = s.data.map((v) => (v == null ? 0 : v));
  const processed = applyChain(y, t, ops.value);
  const csv = buildCsv(t, [
    { name: "Original", unit: s.unit, data: y },
    { name: "Verarbeitet", unit: s.unit, data: processed },
  ]);
  downloadCsv(csv, `${s.name.replace(/[^\w.-]+/g, "_")}_verarbeitet.csv`);
}

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

function addOp(entry) {
  ops.value.push(entry.make());
  recompute();
}
function removeOp(i) {
  ops.value.splice(i, 1);
  recompute();
}
function move(i, dir) {
  const j = i + dir;
  [ops.value[i], ops.value[j]] = [ops.value[j], ops.value[i]];
  recompute();
}
function recompute() {
  version.value++;
}

function down(arr, xs, mode) {
  return downsample(arr, xs, mode ? 'minmax' : 'simple', 800);
}

const compareConfig = computed(() => {
  const s = sig.value, t = time.value, _v = version.value, idx = selectedIdx.value;
  // snapshot ops (id + params) so identity changes when they change
  const opSnapshot = ops.value.map((o) => o);
  return (peakMode) => {
    if (!s) return { type: "line", data: { labels: [], datasets: [] } };
    const y = s.data.map((v) => (v == null ? 0 : v));
    const processed = applyChain(y, t, opSnapshot);
    const unit = s.unit || "";
    const oD = down(y, t, peakMode);
    const pD = down(processed, t, peakMode);
    return {
      type: "line",
      data: {
        labels: oD.rx,
        datasets: [
          { label: `Original [${unit}]`, data: oD.ry, borderColor: "#94A3B8", borderWidth: 1, pointRadius: 0 },
          { label: `Verarbeitet [${unit}]`, data: pD.ry, borderColor: "#2563EB", borderWidth: 1.5, pointRadius: 0 },
        ],
      },
      options: {
        responsive: true, animation: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: { title: { display: true, text: "Zeit [s]" }, ticks: { maxTicksLimit: 10 } },
          y: { title: { display: true, text: unit } },
        },
      },
    };
  };
});
</script>

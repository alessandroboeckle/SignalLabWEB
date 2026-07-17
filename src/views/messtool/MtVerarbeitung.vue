<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-cog-transfer</v-icon>
      <h2 class="text-h5 font-weight-bold">Verarbeitung</h2>
    </div>
    <p class="text-medium-emphasis mb-6">Glätten, Detrend, Normalisieren – verkettbar</p>

    <v-card v-if="!mtStore.parsed" variant="outlined" rounded="lg" class="pa-8 text-center">
      <v-icon size="56" color="grey-lighten-1" class="mb-3">mdi-file-question-outline</v-icon>
      <h3 class="text-h6 mb-2">Keine Messdatei geladen</h3>
      <p class="text-medium-emphasis mb-4">Lade zuerst im Bereich <strong>Import</strong> eine Datei.</p>
      <v-btn size="small" color="primary" variant="tonal" prepend-icon="mdi-file-upload" @click="$emit('navigate', 'mt-import')">
        Zu Import
      </v-btn>
    </v-card>

    <template v-else>
      <MtQuickNav
        :items="[
          { target: 'mt-filter', label: 'Filter', icon: 'mdi-tune-variant' },
          { target: 'mt-export', label: 'Export', icon: 'mdi-file-export' },
        ]"
        @navigate="$emit('navigate', $event)"
      />
      <v-row>
        <!-- Left: controls -->
        <v-col cols="12" md="4">
          <v-autocomplete
            v-model="selectedIdx"
            :items="signalOptions"
            label="Signal"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-sine-wave"
            class="mb-4"
            hint="↑ / ↓ zum Durchblättern"
            persistent-hint
          ></v-autocomplete>

          <v-card variant="outlined" rounded="lg" class="mb-4">
            <v-card-title class="text-subtitle-1 d-flex align-center flex-wrap ga-2">
              Operationen
              <v-spacer></v-spacer>
              <v-btn
                size="small" variant="text" icon="mdi-undo" aria-label="Rückgängig"
                :disabled="historyIndex <= 0"
                @click="undo"
              >
                <v-tooltip activator="parent" location="bottom">Rückgängig (Strg+Z)</v-tooltip>
              </v-btn>
              <v-btn
                size="small" variant="text" icon="mdi-redo" aria-label="Wiederholen"
                :disabled="historyIndex >= history.length - 1"
                @click="redo"
              >
                <v-tooltip activator="parent" location="bottom">Wiederholen (Strg+Y)</v-tooltip>
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

            <v-alert
              type="info"
              variant="tonal"
              density="compact"
              tile
              class="text-caption"
            >
              Diese Kette gehört zur aktuellen Datei und bleibt beim Seitenwechsel erhalten.
              Auf der Seite <strong>Sessions</strong> kannst du sie zusammen mit der Datei
              benannt speichern (auch geteilt mit Kollegen).
            </v-alert>

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
                      @update:model-value="onParamChange"
                    ></v-slider>
                    <v-select
                      v-model="op.params.windowType"
                      :items="['hanning','hamming','flat']"
                      density="compact"
                      variant="outlined"
                      hide-details
                      label="Fenstertyp"
                      class="mt-2"
                      @update:model-value="onParamChange"
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
                      @update:model-value="onParamChange"
                    ></v-text-field>
                  </div>

                  <template #append>
                    <v-btn size="x-small" variant="text" icon="mdi-arrow-up" aria-label="Nach oben verschieben" :disabled="i===0" @click="move(i,-1)"></v-btn>
                    <v-btn size="x-small" variant="text" icon="mdi-arrow-down" aria-label="Nach unten verschieben" :disabled="i===ops.length-1" @click="move(i,1)"></v-btn>
                    <v-btn size="x-small" variant="text" color="error" icon="mdi-delete" aria-label="Operation entfernen" @click="removeOp(i)"></v-btn>
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
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useMesstoolStore } from "../../stores/messtoolStore.js";
import { useSignalNavigationShortcuts } from "../../composables/useSignalNavigation.js";
import { OP_REGISTRY, applyChain } from "../../utils/messtoolProcessing.js";
import { buildCsv, downloadCsv } from "../../utils/csvExport.js";
import { showToast } from "../../composables/useToast.js";
import ChartCard from "./ChartCard.vue";
import MtQuickNav from "./MtQuickNav.vue";

defineEmits(["navigate"]);
import { downsample } from "../../utils/downsample.js";

const mtStore = useMesstoolStore();
useSignalNavigationShortcuts(mtStore);
const registry = OP_REGISTRY;

// Reconstruct live ProcessingOp instances from a plain {id,params}[]
// snapshot (from undo/redo history, or mtStore.verarbeitungSnapshot).
// Unknown op ids are skipped rather than throwing, so a snapshot from an
// older/newer app version still loads what it can.
function instantiateOps(snapshot) {
  return snapshot
    .map((s) => {
      const entry = registry.find((r) => r.id === s.id);
      return entry ? entry.make(s.params) : null;
    })
    .filter(Boolean);
}

// Shared across Analyse/Filter/Verarbeitung/Export so switching pages
// keeps showing the same signal instead of resetting to the first one.
const selectedIdx = computed({
  get: () => mtStore.selectedSignalIdx,
  set: (v) => { mtStore.selectedSignalIdx = v; },
});
const ops = ref([]);
const version = ref(0); // bump to force recompute on param edits

// --- undo/redo -----------------------------------------------------------
// History holds snapshots of the chain (op id + params, not live class
// instances — those aren't diffable/serializable). Undo/redo restores a
// snapshot by re-instantiating fresh ops from OP_REGISTRY, the same way a
// preset gets loaded.
const history = ref([]);
const historyIndex = ref(-1);
const suppressHistory = ref(false);
let historyTimer = null;

function snapshotOps() {
  return ops.value.map((o) => ({ id: o.id, params: { ...o.params } }));
}

function commitHistory() {
  if (suppressHistory.value) return;
  const snap = snapshotOps();
  const top = history.value[historyIndex.value];
  if (top && JSON.stringify(top) === JSON.stringify(snap)) return; // no real change
  history.value.splice(historyIndex.value + 1); // drop any redo branch
  history.value.push(snap);
  historyIndex.value = history.value.length - 1;
  mtStore.verarbeitungSnapshot = snap;
}

function commitHistoryDebounced() {
  clearTimeout(historyTimer);
  historyTimer = setTimeout(commitHistory, 400);
}

function restoreSnapshot(snap) {
  suppressHistory.value = true;
  ops.value = instantiateOps(snap);
  recompute();
  suppressHistory.value = false;
}

function undo() {
  if (historyIndex.value <= 0) return;
  historyIndex.value--;
  restoreSnapshot(history.value[historyIndex.value]);
}

function redo() {
  if (historyIndex.value >= history.value.length - 1) return;
  historyIndex.value++;
  restoreSnapshot(history.value[historyIndex.value]);
}

function onKeydown(e) {
  const ctrlOrCmd = e.ctrlKey || e.metaKey;
  if (!ctrlOrCmd) return;
  if (e.key.toLowerCase() === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) {
    e.preventDefault();
    redo();
  }
}

onMounted(() => {
  // Pick up whatever chain is already shared (kept alive across page
  // switches, or just loaded from a Session) instead of always starting empty.
  if (mtStore.verarbeitungSnapshot.length) {
    ops.value = instantiateOps(mtStore.verarbeitungSnapshot);
  }
  history.value = [snapshotOps()];
  historyIndex.value = 0;
  window.addEventListener("keydown", onKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  clearTimeout(historyTimer);
});

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
  showToast("CSV heruntergeladen.");
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
  commitHistory();
}
function removeOp(i) {
  ops.value.splice(i, 1);
  recompute();
  commitHistory();
}
function move(i, dir) {
  const j = i + dir;
  [ops.value[i], ops.value[j]] = [ops.value[j], ops.value[i]];
  recompute();
  commitHistory();
}
function recompute() {
  version.value++;
}
// Slider/select/text-field param edits fire on every tick while dragging,
// so their history entries are debounced — only the settled value gets
// its own undo step, not every intermediate one.
function onParamChange() {
  recompute();
  commitHistoryDebounced();
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
        scales: {
          x: { title: { display: true, text: "Zeit [s]" }, ticks: { maxTicksLimit: 10 } },
          y: { title: { display: true, text: unit } },
        },
      },
    };
  };
});
</script>

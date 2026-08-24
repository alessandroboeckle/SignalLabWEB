<template>
  <v-card variant="outlined" rounded="lg" class="mb-4">
    <v-card-title class="text-subtitle-1 d-flex align-center flex-wrap ga-2">
      {{ title }}
      <v-spacer></v-spacer>
      <v-tooltip location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-btn
            size="small"
            :variant="cursorMode ? 'flat' : 'outlined'"
            :color="cursorMode ? 'secondary' : 'default'"
            icon="mdi-ruler"
            :aria-label="`Cursor ${cursorMode ? 'ausschalten' : 'einschalten'}`"
            :aria-pressed="cursorMode"
            v-bind="tooltipProps"
            @click="toggleCursorMode"
          ></v-btn>
        </template>
        Cursor {{ cursorMode ? "AN" : "AUS" }} — Klicken setzt einen Cursor, mehrere möglich, per Checkbox einzeln ein-/ausschaltbar
      </v-tooltip>
      <v-tooltip location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-btn
            size="small"
            :variant="markerMode ? 'flat' : 'outlined'"
            :color="markerMode ? 'warning' : 'default'"
            icon="mdi-map-marker-plus-outline"
            :aria-label="`Marker ${markerMode ? 'ausschalten' : 'einschalten'}`"
            :aria-pressed="markerMode"
            v-bind="tooltipProps"
            @click="toggleMarkerMode"
          ></v-btn>
        </template>
        Marker {{ markerMode ? "AN" : "AUS" }} — Stelle anklicken, um eine Notiz zu setzen (gilt für alle Charts dieser Datei)
      </v-tooltip>
      <v-tooltip location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-btn
            size="small"
            :variant="peakMode ? 'flat' : 'outlined'"
            :color="peakMode ? 'primary' : 'default'"
            icon="mdi-pulse"
            :aria-label="`Spitzen-Modus ${peakMode ? 'ausschalten' : 'einschalten'}`"
            :aria-pressed="peakMode"
            v-bind="tooltipProps"
            @click="peakMode = !peakMode"
          ></v-btn>
        </template>
        Spitzen {{ peakMode ? "AN" : "AUS" }} — {{ peakMode ? 'Min/Max-Modus: Spitzen bleiben sichtbar' : 'Schneller Modus: kurze Spitzen können fehlen' }}
      </v-tooltip>
      <v-tooltip location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-btn
            size="small"
            :variant="outlierMode ? 'flat' : 'outlined'"
            :color="outlierMode ? 'error' : 'default'"
            icon="mdi-alert-circle-outline"
            :aria-label="`Ausreisser-Markierung ${outlierMode ? 'ausschalten' : 'einschalten'}`"
            :aria-pressed="outlierMode"
            v-bind="tooltipProps"
            @click="toggleOutlierMode"
          ></v-btn>
        </template>
        Ausreisser {{ outlierMode ? "AN" : "AUS" }} — markiert Punkte, die statistisch stark aus der Reihe tanzen (&gt;3σ)
      </v-tooltip>
      <v-tooltip location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-btn
            size="small"
            :variant="yLogMode ? 'flat' : 'outlined'"
            :color="yLogMode ? 'secondary' : 'default'"
            icon="mdi-math-log"
            :aria-label="`Logarithmische Y-Achse ${yLogMode ? 'ausschalten' : 'einschalten'}`"
            :aria-pressed="yLogMode"
            v-bind="tooltipProps"
            @click="toggleYLog"
          ></v-btn>
        </template>
        Y-Log {{ yLogMode ? "AN" : "AUS" }} — logarithmische Y-Achse (Werte ≤ 0 werden dabei nicht angezeigt)
      </v-tooltip>
      <v-tooltip location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-btn
            size="small"
            :variant="yZoomMode ? 'flat' : 'outlined'"
            :color="yZoomMode ? 'secondary' : 'default'"
            icon="mdi-arrow-expand-vertical"
            :aria-label="`Mausrad-Zoom auf Y-Achse ${yZoomMode ? 'ausschalten' : 'einschalten'}`"
            :aria-pressed="yZoomMode"
            v-bind="tooltipProps"
            @click="toggleYZoomMode"
          ></v-btn>
        </template>
        Y-Achsen-Zoom {{ yZoomMode ? "AN" : "AUS" }} — Mausrad & Rechteck-Zoom wirken dann auch auf die Y-Achse
      </v-tooltip>
      <template v-if="!hidePlayback">
        <v-btn
          size="small"
          :variant="playing ? 'flat' : 'outlined'"
          :color="playing ? 'success' : 'default'"
          :icon="playing ? 'mdi-pause' : 'mdi-play'"
          :aria-label="playing ? 'Pause' : 'Abspielen'"
          @click="togglePlay"
        ></v-btn>
        <span v-if="playheadX !== null" class="text-caption text-medium-emphasis" style="min-width: 60px">
          t = {{ playheadX.toFixed(1) }}s
        </span>
        <v-select
          v-model="playSpeed"
          :items="[{title:'1x', value:1},{title:'5x', value:5},{title:'20x', value:20},{title:'60x', value:60}]"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 90px"
          label="Tempo"
        ></v-select>
      </template>
      <v-tooltip location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-btn size="small" variant="text" icon="mdi-restore" aria-label="Zoom zurücksetzen" v-bind="tooltipProps" @click="resetZoom('inline')"></v-btn>
        </template>
        Zoom zurücksetzen
      </v-tooltip>
      <!-- Extra page-specific controls (e.g. MtAnalyse's "Linien-Optionen")
           slot in here, in the same toolbar row, instead of needing their
           own row above the card — which would push just this one chart
           down relative to any sibling chart next to it. -->
      <slot name="extra-toolbar"></slot>
      <v-tooltip location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-btn size="small" variant="text" icon="mdi-fullscreen" aria-label="Vollbild" v-bind="tooltipProps" @click="openFullscreen"></v-btn>
        </template>
        Vergrößern
      </v-tooltip>
    </v-card-title>
    <v-divider></v-divider>
    <v-card-text>
      <div class="hint text-caption text-medium-emphasis mb-1">
        Mausrad = Zoom · Rechteck ziehen = Bereich · Ziehen mit gedrückter Umschalt = verschieben
        <span v-if="cursorMode"> · Cursor-Modus: Klicken setzt weiteren Cursor</span>
        <span v-if="markerMode"> · Marker-Modus: Stelle anklicken für Notiz</span>
      </div>

      <div v-if="mtStore.markers.length" class="d-flex flex-wrap ga-1 mb-2">
        <v-chip
          v-for="m in mtStore.markers"
          :key="m.id"
          size="small"
          color="warning"
          variant="tonal"
          closable
          @click:close="removeMarkerWithUndo(m)"
        >
          <v-icon start size="14">mdi-map-marker</v-icon>
          t={{ m.timeSec.toFixed(2) }}s — {{ m.note }}
        </v-chip>
      </div>

      <!-- Cursorbox: one row per cursor (checkbox to activate/deactivate,
           x-value, delete), each showing every series' value at that x.
           Click a cursor's label to add it to the comparison selection
           below — works for any number of cursors, not just two. -->
      <v-card v-if="cursorMode && cursors.length" variant="tonal" rounded="lg" class="mb-2 pa-2">
        <div class="d-flex align-center justify-space-between mb-1">
          <span class="text-caption font-weight-medium">Cursor</span>
          <v-btn size="x-small" variant="text" @click="clearAllCursors">Alle löschen</v-btn>
        </div>
        <div v-for="(c, i) in cursors" :key="c.id" class="cursor-row mb-1">
          <div class="d-flex align-center ga-1">
            <v-checkbox-btn
              :model-value="c.active"
              :aria-label="`Cursor ${i + 1} ${c.active ? 'deaktivieren' : 'aktivieren'}`"
              density="compact"
              @update:model-value="toggleCursorActive(c.id)"
            ></v-checkbox-btn>
            <v-icon size="10" :color="CURSOR_COLORS[i % CURSOR_COLORS.length]">mdi-circle</v-icon>
            <v-chip
              size="x-small"
              :variant="compareSelection.includes(c.id) ? 'flat' : 'text'"
              :color="compareSelection.includes(c.id) ? 'primary' : 'default'"
              class="font-weight-medium"
              @click="toggleCompareSelect(c.id)"
            >
              C{{ i + 1 }}
            </v-chip>
            <v-btn
              size="x-small"
              variant="text"
              class="text-caption text-medium-emphasis font-mono px-1"
              :append-icon="expandedCursors.has(c.id) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              @click="toggleCursorExpanded(c.id)"
            >
              x = {{ c.x.toFixed(3) }}
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn size="x-small" variant="text" icon="mdi-close" :aria-label="`Cursor ${i + 1} entfernen`" @click="removeCursor(c.id)"></v-btn>
          </div>
          <div v-if="c.active && expandedCursors.has(c.id)" class="cursor-values text-caption text-medium-emphasis ml-6">
            <template v-if="(cursorRows.find((r) => r.id === c.id)?.series || []).length">
              <span v-for="s in cursorRows.find((r) => r.id === c.id).series" :key="s.label" class="mr-3">
                {{ s.label }}: <strong class="font-mono">{{ s.value.toFixed(3) }}</strong>
              </span>
            </template>
            <span v-else class="text-disabled">(keine Werte an dieser Stelle gefunden)</span>
          </div>
        </div>
        <div v-if="cursorDelta" class="text-caption mt-1 pt-1" style="border-top: 1px solid rgba(128,128,128,0.2)">
          <span class="font-mono">Δx = {{ cursorDelta.dx.toFixed(4) }} · Δ({{ cursorDelta.label }}) = {{ cursorDelta.dy.toFixed(4) }}</span>
        </div>
        <div v-else-if="cursors.filter((c) => c.active).length === 2" class="text-caption text-disabled mt-1 pt-1" style="border-top: 1px solid rgba(128,128,128,0.2)">
          (Δ konnte für diese zwei Cursor nicht berechnet werden)
        </div>

        <div v-if="compareSelection.length > 0" class="text-caption mt-1 pt-1" style="border-top: 1px solid rgba(128,128,128,0.2)">
          <span class="text-medium-emphasis">
            Zum Vergleichen anklicken: C-Label antippen (aktuell {{ compareSelection.length }} ausgewählt)
          </span>
          <div v-for="(cmp, i) in cursorComparisons" :key="i" class="mt-1">
            <strong>C{{ cmp.aLabel }} → C{{ cmp.bLabel }}:</strong>
            <span class="font-mono">Δx = {{ cmp.dx.toFixed(4) }}</span>
            <span v-for="s in cmp.perSeries" :key="s.label" class="ml-2">
              <span class="font-mono">· Δ({{ s.label }}) = {{ s.dy.toFixed(4) }}</span>
            </span>
          </div>
        </div>
      </v-card>

      <v-alert v-if="buildError" type="error" variant="tonal" density="compact" class="mb-2">
        Diagramm konnte nicht erstellt werden: {{ buildError }}
      </v-alert>
      <div v-if="!buildError" :style="{ height: height + 'px' }">
        <canvas ref="inlineCanvas" @click="onCanvasClick($event, 'inline')"></canvas>
      </div>
    </v-card-text>

    <!-- Marker note dialog (replaces the old native window.prompt, which
         some browsers/contexts silently suppress) -->
    <v-dialog v-model="markerDialogOpen" max-width="380">
      <v-card>
        <v-card-title class="text-subtitle-1">
          Notiz für Marker bei t = {{ markerDialogX?.toFixed(2) }}s
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="markerNoteInput"
            label="Notiz (optional)"
            variant="outlined"
            density="comfortable"
            autofocus
            hide-details
            @keyup.enter="confirmMarker"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="markerDialogOpen = false">Abbrechen</v-btn>
          <v-btn color="primary" variant="flat" @click="confirmMarker">Speichern</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Fullscreen overlay -->
    <v-dialog v-model="fullscreen" fullscreen transition="dialog-bottom-transition">
      <v-card>
        <v-toolbar color="primary" density="comfortable">
          <v-toolbar-title>{{ title }}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn variant="text" prepend-icon="mdi-restore" @click="resetZoom('fs')">Zoom zurücksetzen</v-btn>
          <v-btn icon="mdi-close" aria-label="Schliessen" @click="fullscreen = false"></v-btn>
        </v-toolbar>
        <v-card-text class="pa-4" style="height: calc(100vh - 64px)">
          <v-card v-if="cursorMode && cursors.length" variant="tonal" rounded="lg" class="mb-2 pa-2">
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="text-caption font-weight-medium">Cursor</span>
              <v-btn size="x-small" variant="text" @click="clearAllCursors">Alle löschen</v-btn>
            </div>
            <div v-for="(c, i) in cursors" :key="c.id" class="cursor-row mb-1">
              <div class="d-flex align-center ga-1">
                <v-checkbox-btn
                  :model-value="c.active"
                  :aria-label="`Cursor ${i + 1} ${c.active ? 'deaktivieren' : 'aktivieren'}`"
                  density="compact"
                  @update:model-value="toggleCursorActive(c.id)"
                ></v-checkbox-btn>
                <v-icon size="10" :color="CURSOR_COLORS[i % CURSOR_COLORS.length]">mdi-circle</v-icon>
                <v-chip
                  size="x-small"
                  :variant="compareSelection.includes(c.id) ? 'flat' : 'text'"
                  :color="compareSelection.includes(c.id) ? 'primary' : 'default'"
                  class="font-weight-medium"
                  @click="toggleCompareSelect(c.id)"
                >
                  C{{ i + 1 }}
                </v-chip>
                <v-btn
                  size="x-small"
                  variant="text"
                  class="text-caption text-medium-emphasis font-mono px-1"
                  :append-icon="expandedCursors.has(c.id) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                  @click="toggleCursorExpanded(c.id)"
                >
                  x = {{ c.x.toFixed(3) }}
                </v-btn>
                <v-spacer></v-spacer>
                <v-btn size="x-small" variant="text" icon="mdi-close" :aria-label="`Cursor ${i + 1} entfernen`" @click="removeCursor(c.id)"></v-btn>
              </div>
              <div v-if="c.active && expandedCursors.has(c.id)" class="cursor-values text-caption text-medium-emphasis ml-6">
                <template v-if="(cursorRows.find((r) => r.id === c.id)?.series || []).length">
                  <span v-for="s in cursorRows.find((r) => r.id === c.id).series" :key="s.label" class="mr-3">
                    {{ s.label }}: <strong class="font-mono">{{ s.value.toFixed(3) }}</strong>
                  </span>
                </template>
                <span v-else class="text-disabled">(keine Werte an dieser Stelle gefunden)</span>
              </div>
            </div>
            <div v-if="cursorDelta" class="text-caption mt-1 pt-1" style="border-top: 1px solid rgba(128,128,128,0.2)">
              <span class="font-mono">Δx = {{ cursorDelta.dx.toFixed(4) }} · Δ({{ cursorDelta.label }}) = {{ cursorDelta.dy.toFixed(4) }}</span>
            </div>
            <div v-else-if="cursors.filter((c) => c.active).length === 2" class="text-caption text-disabled mt-1 pt-1" style="border-top: 1px solid rgba(128,128,128,0.2)">
              (Δ konnte für diese zwei Cursor nicht berechnet werden)
            </div>
            <div v-if="compareSelection.length > 0" class="text-caption mt-1 pt-1" style="border-top: 1px solid rgba(128,128,128,0.2)">
              <span class="text-medium-emphasis">
                Zum Vergleichen anklicken: C-Label antippen (aktuell {{ compareSelection.length }} ausgewählt)
              </span>
              <div v-for="(cmp, i) in cursorComparisons" :key="i" class="mt-1">
                <strong>C{{ cmp.aLabel }} → C{{ cmp.bLabel }}:</strong>
                <span class="font-mono">Δx = {{ cmp.dx.toFixed(4) }}</span>
                <span v-for="s in cmp.perSeries" :key="s.label" class="ml-2">
                  <span class="font-mono">· Δ({{ s.label }}) = {{ s.dy.toFixed(4) }}</span>
                </span>
              </div>
            </div>
          </v-card>
          <v-alert v-if="buildError" type="error" variant="tonal" density="compact" class="mb-2">
            Diagramm konnte nicht erstellt werden: {{ buildError }}
          </v-alert>
          <canvas v-if="!buildError" ref="fsCanvas" @click="onCanvasClick($event, 'fs')"></canvas>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useTheme } from "vuetify";
import Chart from "../../utils/chartSetup.js";
import { useMesstoolStore } from "../../stores/messtoolStore.js";
import { findOutlierIndices } from "../../utils/outlierDetection.js";
import { subscribeZoomSync, broadcastZoomSync } from "../../composables/useChartZoomSync.js";
import { subscribeCursorSync, broadcastCursorSync } from "../../composables/useChartCursorSync.js";
import { formatClockTime } from "../../utils/messtoolParser.js";
import { interpolateDatasetsAtX } from "../../utils/interpolateDatasetsAtX.js";
import { showUndoToast } from "../../composables/useToast.js";

const theme = useTheme();
const mtStore = useMesstoolStore();

function removeMarkerWithUndo(marker) {
  mtStore.removeMarker(marker.id);
  showUndoToast(`Marker "${marker.note}" entfernt.`, () => {
    mtStore.markers.push(marker);
    mtStore.markers.sort((a, b) => a.timeSec - b.timeSec);
  });
}

const props = defineProps({
  title: { type: String, default: "" },
  config: { type: Function, required: true },
  height: { type: Number, default: 260 },
  // Charts sharing the same syncGroup name stay zoomed/panned together on
  // their x-axis (e.g. Analyse's two time-domain charts) — matches the
  // original tool's "Synchroner Zoom" checkbox.
  syncGroup: { type: String, default: null },
  // Same idea, but for cursor placement — click a cursor on one chart,
  // it appears at the same x on every other chart sharing this group.
  // Separate from syncGroup so cursor-sync and zoom-sync can be toggled
  // independently.
  cursorSyncGroup: { type: String, default: null },
  // The playback scrubber (play/pause, tempo, "t = ...s") only makes
  // sense when the x-axis is actually time — set this for charts whose
  // x-axis is something else (e.g. an FFT's frequency axis), where a
  // time-labelled playhead would just be misleading.
  hidePlayback: { type: Boolean, default: false },
});

const inlineCanvas = ref(null);
const fsCanvas = ref(null);
const fullscreen = ref(false);
const peakMode = ref(false);
const cursorMode = ref(false);
const markerMode = ref(false);
const outlierMode = ref(false);
const yLogMode = ref(false);
const yZoomMode = ref(false); // false = wheel zooms X (default), true = wheel zooms Y
const cursors = ref([]); // [{id, x, active}] — click adds a new one, unlimited, each toggleable
// Per-series value breakdown is collapsed by default — with several
// cursors active it used to push the whole panel very tall. Click a
// cursor's x-value to expand just that one.
const expandedCursors = ref(new Set());
function toggleCursorExpanded(id) {
  const next = new Set(expandedCursors.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedCursors.value = next;
}
const markerDialogOpen = ref(false);
const markerDialogX = ref(null);
const markerNoteInput = ref("");

function confirmMarker() {
  if (markerDialogX.value == null) {
    markerDialogOpen.value = false;
    return;
  }
  const note = markerNoteInput.value.trim() || `Marker bei ${markerDialogX.value.toFixed(2)}s`;
  mtStore.addMarker(markerDialogX.value, note);
  markerDialogOpen.value = false;
  buildInline();
  if (fullscreen.value) buildFullscreen();
}
let inlineChart = null;
let fsChart = null;

// One row per active cursor, each carrying every series' interpolated
// value at that x — this is the "Cursorbox" the values panel is built
// from. Needs a live chart instance, so it's computed lazily by
// buildCursorRows() (called after each (re)build) rather than as a
// reactive computed — Chart.js instances aren't reactive-friendly data.
const cursorRows = ref([]);

function buildCursorRows() {
  const chart = fullscreen.value ? fsChart : inlineChart;
  if (!chart || !cursorMode.value) {
    cursorRows.value = [];
    return;
  }
  cursorRows.value = cursors.value
    .filter((c) => c.active)
    .map((c) => ({
      id: c.id,
      x: c.x,
      series: interpolateDatasetsAtX(chart, c.x),
    }));
}

// If exactly two cursors are active, also show the classic Δx/Δy between
// them for the first series they share — keeps the original "measure the
// distance between two points" use case working alongside the richer
// per-cursor, all-series view.
const cursorDelta = computed(() => {
  const rows = cursorRows.value;
  if (rows.length !== 2) return null;
  const [a, b] = rows;
  const commonLabel = a.series[0]?.label;
  const bSeries = b.series.find((s) => s.label === commonLabel) || b.series[0];
  const aSeries = a.series[0];
  if (!aSeries || !bSeries) return null;
  return {
    dx: b.x - a.x,
    dy: bSeries.value - aSeries.value,
    label: commonLabel,
  };
});

// Click any cursor's label (not its checkbox/delete button) to add it to
// a comparison selection — works for any number of cursors, not just
// two. Shows the sequential difference between each consecutively
// selected pair, in the order they were picked.
const compareSelection = ref([]); // [cursorId, ...] in the order clicked

function toggleCompareSelect(id) {
  compareSelection.value = compareSelection.value.includes(id)
    ? compareSelection.value.filter((cid) => cid !== id)
    : [...compareSelection.value, id];
}

const cursorComparisons = computed(() => {
  const ids = compareSelection.value.filter((id) => cursors.value.some((c) => c.id === id && c.active));
  if (ids.length < 2) return [];
  const rowsById = new Map(cursorRows.value.map((r) => [r.id, r]));
  const results = [];
  for (let i = 1; i < ids.length; i++) {
    const a = rowsById.get(ids[i - 1]);
    const b = rowsById.get(ids[i]);
    if (!a || !b) continue;
    const aLabel = cursors.value.findIndex((c) => c.id === ids[i - 1]) + 1;
    const bLabel = cursors.value.findIndex((c) => c.id === ids[i]) + 1;
    const perSeries = a.series.map((aSeries) => {
      const bSeries = b.series.find((s) => s.label === aSeries.label);
      return bSeries ? { label: aSeries.label, dy: bSeries.value - aSeries.value } : null;
    }).filter(Boolean);
    results.push({ aLabel, bLabel, dx: b.x - a.x, perSeries });
  }
  return results;
});

function toggleCursorMode() {
  cursorMode.value = !cursorMode.value;
  if (cursorMode.value) markerMode.value = false;
  cursors.value = [];
  compareSelection.value = [];
  // Previously this only flipped *this* chart's own cursorMode — with
  // "Cursor über alle Plots" active, clicking the ruler on one stacked
  // chart left every other chart in the group either still showing no
  // cursors (mode never turned on there) or hanging onto stale cursor
  // ids from before (mode turned off here without telling them to clear)
  // — exactly the "spakt rum" glitchiness. Broadcasting the mode change
  // itself, not just individual cursor add/remove/toggle actions, keeps
  // every chart in the group on/off together and their cursor lists in
  // sync at all times.
  broadcastCursorAction({ type: "mode", active: cursorMode.value });
  buildInline();
  if (fullscreen.value) buildFullscreen();
  buildCursorRows();
}

function toggleMarkerMode() {
  markerMode.value = !markerMode.value;
  if (markerMode.value) cursorMode.value = false;
  buildInline();
  if (fullscreen.value) buildFullscreen();
}

function toggleOutlierMode() {
  outlierMode.value = !outlierMode.value;
  buildInline();
  if (fullscreen.value) buildFullscreen();
}

function toggleYLog() {
  yLogMode.value = !yLogMode.value;
  buildInline();
  if (fullscreen.value) buildFullscreen();
}

// No rebuild needed — the zoom mode callback below reads yZoomMode.value
// live on every wheel event, since it closes over the ref itself.
function toggleYZoomMode() {
  yZoomMode.value = !yZoomMode.value;
}

const playing = ref(false);
const playSpeed = ref(5); // "seconds of signal time" covered per real second
const playheadX = ref(null);
let playRafId = null;
let playLastTs = null;

function activeChart() {
  return fullscreen.value ? fsChart : inlineChart;
}

function setTooltipEnabled(chart, enabled) {
  if (chart?.options?.plugins?.tooltip) {
    chart.options.plugins.tooltip.enabled = enabled;
  }
}

function togglePlay() {
  const chart = activeChart();
  if (!chart || !chart.scales?.x) return;
  playing.value = !playing.value;
  if (playing.value) {
    setTooltipEnabled(chart, false);
    const fullRange = getFullXRange(chart);
    if (playheadX.value == null || playheadX.value >= fullRange.max) {
      playheadX.value = fullRange.min;
    }
    playLastTs = null;
    playRafId = requestAnimationFrame(stepPlay);
  } else {
    setTooltipEnabled(chart, true);
    if (playRafId) {
      cancelAnimationFrame(playRafId);
      playRafId = null;
    }
  }
}

function stepPlay(ts) {
  if (!playing.value) return;
  const chart = activeChart();
  if (!chart || !chart.scales?.x) {
    playing.value = false;
    return;
  }
  if (playLastTs == null) playLastTs = ts;
  const dtReal = (ts - playLastTs) / 1000;
  playLastTs = ts;

  const fullRange = getFullXRange(chart);
  playheadX.value += dtReal * playSpeed.value;
  const reachedEnd = playheadX.value >= fullRange.max;
  if (reachedEnd) playheadX.value = fullRange.max;

  try {
    chart.update("none"); // cheap redraw, no full rebuild — keeps playback smooth
  } catch {
    playing.value = false;
    setTooltipEnabled(chart, true);
    return;
  }

  if (reachedEnd) {
    playing.value = false;
    setTooltipEnabled(chart, true);
    return;
  }
  playRafId = requestAnimationFrame(stepPlay);
}

// Works for both scale types ChartCard is used with: category scale with
// numeric-string labels (Analyse/Filter/Verarbeitung/Export), and a linear
// scale with raw {x,y} points and parsing:false (Vergleich).
// Reads the clicked x-value directly from the click's pixel position via
// the x-scale itself — not by finding "the nearest data point" (the old
// approach), which depends on there actually being a point close by and
// can silently come up empty (e.g. clicking a gap, a sparse chart, or
// just an unlucky spot), making clicks seem to do nothing at all.
// Reading straight off the scale always works anywhere inside the chart
// area, regardless of the data.
function xValueAtEvent(chart, evt) {
  const xScale = chart.scales?.x;
  if (!xScale) return null;

  const rect = chart.canvas.getBoundingClientRect();
  const pixelX = evt.clientX - rect.left;
  if (pixelX < chart.chartArea.left || pixelX > chart.chartArea.right) return null;

  const rawValue = xScale.getValueForPixel(pixelX);
  if (rawValue == null || Number.isNaN(rawValue)) return null;

  if (chart.data.labels && chart.data.labels.length) {
    // Category scale: getValueForPixel returns a (possibly fractional)
    // index, not the real label value — round to the nearest label.
    const idx = Math.max(0, Math.min(chart.data.labels.length - 1, Math.round(rawValue)));
    const label = chart.data.labels[idx];
    return typeof label === "number" ? label : parseFloat(label);
  }
  return rawValue;
}

function onCanvasClick(evt, which) {
  const chart = which === "inline" ? inlineChart : fsChart;
  if (!chart) return;

  if (markerMode.value) {
    const x = xValueAtEvent(chart, evt);
    if (x == null || Number.isNaN(x)) return;
    markerDialogX.value = x;
    markerNoteInput.value = "";
    markerDialogOpen.value = true;
    return;
  }

  if (!cursorMode.value) return;
  const x = xValueAtEvent(chart, evt);
  if (x == null || Number.isNaN(x)) return;

  const newId = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  cursors.value = [...cursors.value, { id: newId, x, active: true }];
  broadcastCursorAction({ type: "add", id: newId, x });

  buildInline();
  if (fullscreen.value) buildFullscreen();
  buildCursorRows();
}

function toggleCursorActive(id) {
  const target = cursors.value.find((c) => c.id === id);
  const newActive = target ? !target.active : true;
  cursors.value = cursors.value.map((c) => (c.id === id ? { ...c, active: newActive } : c));
  broadcastCursorAction({ type: "toggle", id, active: newActive });
  buildInline();
  if (fullscreen.value) buildFullscreen();
  buildCursorRows();
}

function removeCursor(id) {
  cursors.value = cursors.value.filter((c) => c.id !== id);
  compareSelection.value = compareSelection.value.filter((cid) => cid !== id);
  broadcastCursorAction({ type: "remove", id });
  buildInline();
  if (fullscreen.value) buildFullscreen();
  buildCursorRows();
}

function clearAllCursors() {
  cursors.value = [];
  compareSelection.value = [];
  broadcastCursorAction({ type: "clear" });
  buildInline();
  if (fullscreen.value) buildFullscreen();
  buildCursorRows();
}

// Custom plugin: draws vertical lines + dots at cursor positions.
// Chart.js's category scale treats a raw JS number passed to
// getPixelForValue() as an INDEX into the labels array, not a data value
// to look up — so passing an actual x-value (e.g. 23.625 seconds) there
// silently gives a nonsense position (it just happens to look plausible
// often enough to go unnoticed). This converts a *real* x-axis value into
// whatever getPixelForValue actually expects for the chart's current
// scale: a fractional index for category scales (interpolating between
// the two bracketing labels), or the value itself for a linear scale
// (e.g. Vergleich's overlay, which isn't label-based at all).
function xValueToPixel(chart, value) {
  const xScale = chart.scales.x;
  if (!chart.data.labels || !chart.data.labels.length) {
    return xScale.getPixelForValue(value);
  }
  const labels = chart.data.labels.map(Number);
  if (value <= labels[0]) return xScale.getPixelForValue(0);
  if (value >= labels[labels.length - 1]) return xScale.getPixelForValue(labels.length - 1);
  for (let i = 0; i < labels.length - 1; i++) {
    if (labels[i] <= value && labels[i + 1] >= value) {
      const frac = labels[i + 1] > labels[i] ? (value - labels[i]) / (labels[i + 1] - labels[i]) : 0;
      return xScale.getPixelForValue(i + frac);
    }
  }
  return xScale.getPixelForValue(0);
}

const CURSOR_COLORS = ["#DC2626", "#059669", "#7C3AED", "#DB2777", "#D97706", "#0891B2"];

const cursorPlugin = {
  id: "cursorMarkers",
  afterDraw(chart) {
    if (!cursorMode.value) return;
    const active = cursors.value.filter((c) => c.active);
    if (!active.length) return;
    const { ctx, chartArea } = chart;
    ctx.save();
    active.forEach((c, i) => {
      const color = CURSOR_COLORS[i % CURSOR_COLORS.length];
      const px = xValueToPixel(chart, c.x);
      if (px < chartArea.left || px > chartArea.right) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(px, chartArea.top);
      ctx.lineTo(px, chartArea.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.font = "11px sans-serif";
      ctx.fillText(`C${i + 1}`, px + 3, chartArea.top + 12);

      // A small dot on every series at this cursor's x — the actual
      // numbers live in the Cursorbox panel below the chart, this is
      // just a visual anchor for where each line sits at that moment.
      for (const point of interpolateDatasetsAtX(chart, c.x)) {
        const yScale = chart.scales[point.yAxisID];
        if (!yScale) continue;
        const y = yScale.getPixelForValue(point.value);
        ctx.fillStyle = point.color;
        ctx.beginPath();
        ctx.arc(px, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
    ctx.restore();
  },
};

// Draws every saved marker for the current file as a vertical line + short
// label — always shown (not just while marker mode is on), so annotations
// made on one Messtool page are visible on every other chart too.
const markerPlugin = {
  id: "fileMarkers",
  afterDraw(chart) {
    if (!mtStore.markers.length) return;
    const { ctx, chartArea } = chart;
    ctx.save();
    for (const m of mtStore.markers) {
      const px = xValueToPixel(chart, m.timeSec);
      if (Number.isNaN(px) || px < chartArea.left || px > chartArea.right) continue;
      ctx.strokeStyle = "#D97706";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(px, chartArea.top);
      ctx.lineTo(px, chartArea.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#D97706";
      ctx.font = "10px sans-serif";
      const label = m.note.length > 18 ? m.note.slice(0, 17) + "…" : m.note;
      ctx.fillText(label, px + 3, chartArea.bottom - 4);
    }
    ctx.restore();
  },
};

// Highlights points that sit more than 3 standard deviations from their
// dataset's own mean — a quick visual flag for likely sensor glitches or
// genuinely extreme events, without having to eyeball the whole trace.
const outlierPlugin = {
  id: "outlierHighlight",
  afterDraw(chart) {
    if (!outlierMode.value) return;
    const { ctx, chartArea } = chart;
    ctx.save();
    chart.data.datasets.forEach((ds, dsIndex) => {
      const values = ds.data.map((p) => (p && typeof p === "object" ? p.y : p));
      const outlierIndices = findOutlierIndices(values);
      if (!outlierIndices.length) return;

      const meta = chart.getDatasetMeta(dsIndex);
      for (const i of outlierIndices) {
        const point = meta.data[i];
        if (!point) continue;
        const { x, y } = point.getProps(["x", "y"], true);
        if (x < chartArea.left || x > chartArea.right) continue;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.strokeStyle = "#DC2626";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
    ctx.restore();
  },
};

// Moving vertical line for "Abspiel-Modus" (see togglePlay/stepPlay below).
// Drawn as its own plugin so playback only needs a cheap chart.update()
// each frame, not a full rebuild of the chart/datasets. Also tracks each
// dataset's current value at the playhead with a dot + live number, so
// it's more than just a bar sliding across — you actually see what's
// happening at that moment, like scrubbing through a video.
// Interpolates every dataset's y-value at an exact x position — imported
// from utils/interpolateDatasetsAtX.js so this exact logic is covered by
// real unit tests (see that file's __tests__), not just read-through.


const playheadPlugin = {
  id: "playhead",
  afterDraw(chart) {
    if (playheadX.value == null) return;
    const { ctx, chartArea } = chart;
    const px = xValueToPixel(chart, playheadX.value);
    if (px < chartArea.left || px > chartArea.right) return;

    ctx.save();
    ctx.strokeStyle = "#059669";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, chartArea.top);
    ctx.lineTo(px, chartArea.bottom);
    ctx.stroke();

    for (const point of interpolateDatasetsAtX(chart, playheadX.value)) {
      const yScale = chart.scales[point.yAxisID];
      if (!yScale) continue;
      const y = yScale.getPixelForValue(point.value);

      ctx.fillStyle = point.color;
      ctx.beginPath();
      ctx.arc(px, y, 4, 0, 2 * Math.PI);
      ctx.fill();

      ctx.font = "11px sans-serif";
      const label = point.value.toFixed(2);
      const labelY = y - 8 < chartArea.top + 10 ? y + 16 : y - 8;
      ctx.fillText(label, px + 6, labelY);
    }

    ctx.restore();
  },
};

// Reads the chart's true full data range (set once by applyZoomLimits),
// not just whatever's currently zoomed/panned into — playback should be
// able to scrub across the *whole* recording, not just the visible slice.
function getFullXRange(chart) {
  const limits = chart.options.plugins?.zoom?.limits?.x;
  if (limits && typeof limits.min === "number" && typeof limits.max === "number") {
    return limits;
  }
  return { min: chart.scales.x.min, max: chart.scales.x.max };
}

// Chart.js has no idea about Vuetify's theme, so left alone it always
// renders axis ticks/titles and gridlines in its own (dark) default color
// — unreadable once the card itself goes dark in dark mode. Inject
// theme-aware colors into whatever scales/legend the page's own config
// already defines, without touching the text/labels it set.
function applyThemeColors(cfg) {
  const isDark = theme.global.current.value.dark;
  const textColor = isDark ? "#E2E8F0" : "#334155";
  // Grid lines were a fairly generic neutral grey — a faint cyan tint
  // instead ties the chart canvas itself back to the same "instrument
  // readout" palette as the rest of the app, not just the UI chrome
  // around it.
  const gridColor = isDark ? "rgba(34,211,238,0.10)" : "rgba(14,116,144,0.10)";
  const uiFont = { family: "'Inter', system-ui, sans-serif" };
  const numFont = { family: "'JetBrains Mono', ui-monospace, monospace", size: 11 };

  cfg.options.color = textColor;
  cfg.options.font = { ...uiFont, ...(cfg.options.font || {}) };

  cfg.options.scales = cfg.options.scales || {};
  for (const key of Object.keys(cfg.options.scales)) {
    const s = cfg.options.scales[key] || {};
    // Axis tick labels are numbers (time, values) — the monospace face
    // reads as measured data; the axis *title* ("Zeit [s]") stays in the
    // regular UI font since it's a word, not a figure.
    s.ticks = { color: textColor, font: numFont, ...(s.ticks || {}) };
    if (s.title) s.title = { color: textColor, font: uiFont, ...s.title };
    s.grid = { color: gridColor, ...(s.grid || {}) };
    cfg.options.scales[key] = s;
  }

  cfg.options.plugins.legend = {
    labels: { color: textColor, font: uiFont, ...(cfg.options.plugins.legend?.labels || {}) },
    ...(cfg.options.plugins.legend || {}),
  };
}

// Shared interaction + zoom + tooltip options merged into every chart.
function withInteractions(cfg) {
  cfg.options = cfg.options || {};
  cfg.options.maintainAspectRatio = false;

  // nice hover tooltips: show all datasets at the same x
  cfg.options.interaction = Object.assign(
    { mode: "index", intersect: false },
    cfg.options.interaction || {},
  );

  cfg.options.plugins = cfg.options.plugins || {};
  cfg.options.plugins.tooltip = Object.assign(
    {
      enabled: true,
      // Chart.js's default tooltip is a plain dark rectangle regardless
      // of the app's own theme/palette — restyle it to match rather than
      // have it look like a leftover from a different app.
      backgroundColor: theme.global.current.value.dark ? "rgba(21,31,46,0.96)" : "rgba(255,255,255,0.97)",
      titleColor: theme.global.current.value.dark ? "#E2E8F0" : "#0F172A",
      bodyColor: theme.global.current.value.dark ? "#CBD5E1" : "#334155",
      borderColor: theme.global.current.value.colors.primary,
      borderWidth: 1,
      cornerRadius: 8,
      padding: 10,
      titleFont: { family: "'Inter', system-ui, sans-serif", weight: "600" },
      bodyFont: { family: "'JetBrains Mono', ui-monospace, monospace", size: 11 },
      boxPadding: 4,
      callbacks: {
        title: (items) => {
          if (!items.length) return "";
          const raw = items[0].raw;
          if (raw && typeof raw === "object" && raw.clock != null) {
            const xVal = typeof raw.x === "number" ? raw.x.toFixed(3) : items[0].label;
            return `x = ${xVal}  ·  ${formatClockTime(raw.clock, true)}`;
          }
          return `x = ${items[0].label}`;
        },
        label: (item) => {
          const v = item.parsed.y;
          // Color swatch (Chart.js draws this automatically per dataset)
          // already identifies which series this is — the old label also
          // repeated "<filename> — <signal>" here, which just duplicated
          // the legend and made multi-series tooltips hard to scan.
          return typeof v === "number" ? v.toFixed(3) : String(v);
        },
      },
    },
    cfg.options.plugins.tooltip || {},
  );

  applyThemeColors(cfg);

  // Optional log-scale y-axis (see toggleYLog below) — applied to every
  // y-axis the page's own config defines (y, y1, ...), never touching x
  // (the Filter page's Bode plot already uses its own logarithmic x-axis
  // independently of this toggle).
  if (yLogMode.value) {
    for (const key of Object.keys(cfg.options.scales || {})) {
      if (key === "x") continue;
      cfg.options.scales[key].type = "logarithmic";
    }
  }

  // zoom + pan (matplotlib-style)
  cfg.options.plugins.zoom = {
    limits: {
      // Filled in dynamically once the chart is built (needs the actual
      // rendered scale range) — see applyZoomLimits(). Left empty here so
      // Chart.js still has the key present before that runs.
      x: {},
      y: {},
    },
    zoom: {
      // chartjs-plugin-zoom uses ONE shared "mode" for both wheel and
      // drag-rectangle zoom (drag has no independent mode of its own,
      // despite what its own option might suggest) — so this toggle
      // switches both together: off (default) behaves exactly as before
      // (X only), on lets you zoom into Y as well as X.
      wheel: { enabled: true },
      drag: { enabled: true, backgroundColor: "rgba(37,99,235,0.15)" },
      mode: () => (yZoomMode.value ? "xy" : "x"),
      onZoomComplete: ({ chart }) => broadcastOwnRange(chart),
    },
    pan: {
      enabled: true,
      mode: () => (yZoomMode.value ? "xy" : "x"),
      modifierKey: "shift",
      onPanComplete: ({ chart }) => broadcastOwnRange(chart),
    },
  };
  return cfg;
}

// Without a minRange, chartjs-plugin-zoom lets the wheel zoom in until the
// visible x-range shrinks to (numerically) nothing — no data point falls
// inside it any more and the chart appears to just vanish. Cap how far in
// you can go to a small fraction of the chart's own full data range, and
// keep pan/zoom from wandering past the actual data on either side.
function applyZoomLimits(chart) {
  const limits = chart.options.plugins.zoom.limits;
  for (const key of Object.keys(chart.scales || {})) {
    const scale = chart.scales[key];
    if (!scale || typeof scale.min !== "number" || typeof scale.max !== "number") continue;
    const span = scale.max - scale.min;
    if (!(span > 0)) continue;
    limits[key] = { min: scale.min, max: scale.max, minRange: span * 0.01 };
  }
}

// --- synchronized zoom across charts sharing props.syncGroup ---
const syncInstanceId = `chart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
let applyingSyncedRange = false; // guard so applying an incoming range doesn't re-broadcast it

function broadcastOwnRange(chart) {
  if (!props.syncGroup || applyingSyncedRange) return;
  const xScale = chart.scales?.x;
  if (!xScale) return;
  broadcastZoomSync(props.syncGroup, { min: xScale.min, max: xScale.max }, syncInstanceId);
}

function onIncomingSyncedRange(range, sourceId) {
  if (sourceId === syncInstanceId) return; // ignore our own broadcast
  applyingSyncedRange = true;
  try {
    for (const chart of [inlineChart, fsChart]) {
      if (chart && typeof chart.zoomScale === "function") {
        chart.zoomScale("x", range, "none");
      }
    }
  } finally {
    applyingSyncedRange = false;
  }
}

let unsubscribeZoomSync = null;

// --- synchronized cursors across charts sharing props.cursorSyncGroup ---
const cursorSyncInstanceId = `chart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
let applyingSyncedCursorAction = false;

function broadcastCursorAction(action) {
  if (!props.cursorSyncGroup || applyingSyncedCursorAction) return;
  broadcastCursorSync(props.cursorSyncGroup, action, cursorSyncInstanceId);
}

function onIncomingCursorAction(action, sourceId) {
  if (sourceId === cursorSyncInstanceId) return; // ignore our own broadcast
  applyingSyncedCursorAction = true;
  try {
    if (action.type === "add") {
      cursors.value = [...cursors.value, { id: action.id, x: action.x, active: true }];
    } else if (action.type === "toggle") {
      cursors.value = cursors.value.map((c) => (c.id === action.id ? { ...c, active: action.active } : c));
    } else if (action.type === "remove") {
      cursors.value = cursors.value.filter((c) => c.id !== action.id);
    } else if (action.type === "clear") {
      cursors.value = [];
    } else if (action.type === "mode") {
      cursorMode.value = action.active;
      if (action.active) markerMode.value = false;
      cursors.value = [];
      compareSelection.value = [];
    }
    buildInline();
    if (fullscreen.value) buildFullscreen();
    buildCursorRows();
  } finally {
    applyingSyncedCursorAction = false;
  }
}

let unsubscribeCursorSync = null;

const buildError = ref(null);

// Rebuilding destroys and recreates the Chart.js instance from scratch —
// necessary because props.config is a full config object, not a diff —
// but that means chartjs-plugin-zoom loses all memory of the user's
// current zoom/pan on every single rebuild. Since props.config recomputes
// on ANY relevant reactive change (offset, filter toggle, second axis,
// even just moving a cursor), that used to reset the view constantly —
// most confusingly right after typing a time offset, where the view
// would jump to auto-fit the shifted data instead of staying put.
// Capture the outgoing chart's actual visible range and re-apply it
// after the new one is built, so only genuinely new data (nothing to
// carry over) falls back to auto-fit.
function captureXRange(chart) {
  const xScale = chart?.scales?.x;
  if (!xScale || typeof xScale.min !== "number" || typeof xScale.max !== "number") return null;
  return { min: xScale.min, max: xScale.max };
}
function restoreXRange(chart, range) {
  if (!chart || !range || typeof chart.zoomScale !== "function") return;
  chart.zoomScale("x", range, "none");
}

function buildInline() {
  const previousRange = captureXRange(inlineChart);
  if (inlineChart) { inlineChart.destroy(); inlineChart = null; }
  if (!inlineCanvas.value) return;
  try {
    const cfg = withInteractions(props.config(peakMode.value));
    cfg.plugins = [cursorPlugin, markerPlugin, outlierPlugin, playheadPlugin];
    inlineChart = new Chart(inlineCanvas.value.getContext("2d"), cfg);
    applyZoomLimits(inlineChart);
    restoreXRange(inlineChart, previousRange);
    buildError.value = null;
  } catch (err) {
    // A single bad chart (malformed data, a config bug) shouldn't take
    // down the rest of the page — fail locally, visibly, and recoverably
    // instead of letting it bubble up to the app-wide error boundary.
    // eslint-disable-next-line no-console
    console.error("[ChartCard] failed to build chart:", err);
    buildError.value = err?.message || String(err);
  }
}

function buildFullscreen() {
  const previousRange = captureXRange(fsChart);
  if (fsChart) { fsChart.destroy(); fsChart = null; }
  if (!fsCanvas.value) return;
  try {
    const cfg = withInteractions(props.config(peakMode.value));
    cfg.plugins = [cursorPlugin, markerPlugin, outlierPlugin, playheadPlugin];
    fsChart = new Chart(fsCanvas.value.getContext("2d"), cfg);
    applyZoomLimits(fsChart);
    restoreXRange(fsChart, previousRange);
    buildError.value = null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[ChartCard] failed to build fullscreen chart:", err);
    buildError.value = err?.message || String(err);
  }
}

function resetZoom(which) {
  if (which === "inline" && inlineChart) inlineChart.resetZoom();
  if (which === "fs" && fsChart) fsChart.resetZoom();
}

async function openFullscreen() {
  fullscreen.value = true;
  await nextTick();
  setTimeout(() => { buildFullscreen(); buildCursorRows(); }, 150);
}

watch(() => props.config, async () => { await nextTick(); buildInline(); buildCursorRows(); });
watch(peakMode, async () => { await nextTick(); buildInline(); if (fullscreen.value) buildFullscreen(); buildCursorRows(); });
watch(() => theme.global.name.value, () => { buildInline(); if (fullscreen.value) buildFullscreen(); buildCursorRows(); });

watch(fullscreen, (open) => {
  if (!open && fsChart) { fsChart.destroy(); fsChart = null; }
});

onMounted(async () => {
  await nextTick();
  buildInline();
  buildCursorRows();
});

// Re-subscribe whenever these props change, not just once at mount —
// the toggle switches on the Anzeige page are flipped *after* the charts
// are already showing, so a mount-only subscription would silently never
// take effect for existing charts (only for ones created fresh afterward).
watch(() => props.syncGroup, (group) => {
  if (unsubscribeZoomSync) { unsubscribeZoomSync(); unsubscribeZoomSync = null; }
  if (group) unsubscribeZoomSync = subscribeZoomSync(group, onIncomingSyncedRange);
}, { immediate: true });

watch(() => props.cursorSyncGroup, (group) => {
  if (unsubscribeCursorSync) { unsubscribeCursorSync(); unsubscribeCursorSync = null; }
  if (group) unsubscribeCursorSync = subscribeCursorSync(group, onIncomingCursorAction);
}, { immediate: true });

onBeforeUnmount(() => {
  if (playRafId) cancelAnimationFrame(playRafId);
  if (unsubscribeZoomSync) unsubscribeZoomSync();
  if (unsubscribeCursorSync) unsubscribeCursorSync();
  if (inlineChart) inlineChart.destroy();
  if (fsChart) fsChart.destroy();
});

defineExpose({ rebuild: buildInline });
</script>

<style scoped>
.hint {
  line-height: 1.2;
}
</style>

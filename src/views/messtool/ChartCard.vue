<template>
  <v-card variant="outlined" rounded="lg" class="mb-4">
    <v-card-title class="text-subtitle-1 d-flex align-center flex-wrap ga-2">
      {{ title }}
      <v-spacer></v-spacer>
      <v-btn
        size="small"
        :variant="cursorMode ? 'flat' : 'outlined'"
        :color="cursorMode ? 'secondary' : 'default'"
        prepend-icon="mdi-ruler"
        :aria-pressed="cursorMode"
        @click="toggleCursorMode"
      >
        Cursor {{ cursorMode ? "AN" : "AUS" }}
        <v-tooltip activator="parent" location="bottom">
          Zwei Punkte anklicken, um Δt und ΔWert zu messen
        </v-tooltip>
      </v-btn>
      <v-btn
        size="small"
        :variant="markerMode ? 'flat' : 'outlined'"
        :color="markerMode ? 'warning' : 'default'"
        prepend-icon="mdi-map-marker-plus-outline"
        :aria-pressed="markerMode"
        @click="toggleMarkerMode"
      >
        Marker {{ markerMode ? "AN" : "AUS" }}
        <v-tooltip activator="parent" location="bottom">
          Stelle anklicken, um eine Notiz zu setzen — gilt für alle Charts dieser Datei
        </v-tooltip>
      </v-btn>
      <v-btn
        size="small"
        :variant="peakMode ? 'flat' : 'outlined'"
        :color="peakMode ? 'primary' : 'default'"
        prepend-icon="mdi-pulse"
        :aria-pressed="peakMode"
        @click="peakMode = !peakMode"
      >
        Spitzen {{ peakMode ? "AN" : "AUS" }}
        <v-tooltip activator="parent" location="bottom">
          {{ peakMode ? 'Min/Max-Modus: Spitzen bleiben sichtbar' : 'Schneller Modus: kurze Spitzen können fehlen' }}
        </v-tooltip>
      </v-btn>
      <v-btn
        size="small"
        :variant="outlierMode ? 'flat' : 'outlined'"
        :color="outlierMode ? 'error' : 'default'"
        prepend-icon="mdi-alert-circle-outline"
        :aria-pressed="outlierMode"
        @click="toggleOutlierMode"
      >
        Ausreisser {{ outlierMode ? "AN" : "AUS" }}
        <v-tooltip activator="parent" location="bottom">
          Markiert Punkte, die statistisch stark aus der Reihe tanzen (&gt;3σ)
        </v-tooltip>
      </v-btn>
      <v-btn
        size="small"
        :variant="yLogMode ? 'flat' : 'outlined'"
        :color="yLogMode ? 'secondary' : 'default'"
        prepend-icon="mdi-math-log"
        :aria-pressed="yLogMode"
        @click="toggleYLog"
      >
        Y-Log {{ yLogMode ? "AN" : "AUS" }}
        <v-tooltip activator="parent" location="bottom">
          Logarithmische Y-Achse — Werte ≤ 0 werden dabei nicht angezeigt
        </v-tooltip>
      </v-btn>
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
      <v-btn size="small" variant="text" icon="mdi-restore" aria-label="Zoom zurücksetzen" @click="resetZoom('inline')">
        <v-icon>mdi-restore</v-icon>
        <v-tooltip activator="parent" location="bottom">Zoom zurücksetzen</v-tooltip>
      </v-btn>
      <v-btn size="small" variant="text" icon="mdi-fullscreen" aria-label="Vollbild" @click="openFullscreen">
        <v-icon>mdi-fullscreen</v-icon>
        <v-tooltip activator="parent" location="bottom">Vergrößern</v-tooltip>
      </v-btn>
    </v-card-title>
    <v-divider></v-divider>
    <v-card-text>
      <div class="hint text-caption text-medium-emphasis mb-1">
        Mausrad = Zoom · Rechteck ziehen = Bereich · Ziehen mit gedrückter Umschalt = verschieben
        <span v-if="cursorMode"> · Cursor-Modus: 2 Punkte anklicken</span>
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
          @click:close="mtStore.removeMarker(m.id)"
        >
          <v-icon start size="14">mdi-map-marker</v-icon>
          t={{ m.timeSec.toFixed(2) }}s — {{ m.note }}
        </v-chip>
      </div>

      <v-alert
        v-if="cursorMode && cursorInfo"
        type="info"
        variant="tonal"
        density="compact"
        class="mb-2 text-caption"
      >
        {{ cursorInfo }}
      </v-alert>

      <div :style="{ height: height + 'px' }">
        <canvas ref="inlineCanvas" @click="onCanvasClick($event, 'inline')"></canvas>
      </div>
    </v-card-text>

    <!-- Fullscreen overlay -->
    <v-dialog v-model="fullscreen" fullscreen transition="dialog-bottom-transition">
      <v-card>
        <v-toolbar color="primary" density="comfortable">
          <v-toolbar-title>{{ title }}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn variant="text" prepend-icon="mdi-restore" @click="resetZoom('fs')">Zoom zurück</v-btn>
          <v-btn icon="mdi-close" aria-label="Schliessen" @click="fullscreen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-text class="pa-4" style="height: calc(100vh - 64px)">
          <v-alert
            v-if="cursorMode && cursorInfo"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-2 text-caption"
          >
            {{ cursorInfo }}
          </v-alert>
          <canvas ref="fsCanvas" @click="onCanvasClick($event, 'fs')"></canvas>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useTheme } from "vuetify";
import Chart from "chart.js/auto";
import zoomPlugin from "chartjs-plugin-zoom";
import { useMesstoolStore } from "../../stores/messtoolStore.js";
import { findOutlierIndices } from "../../utils/outlierDetection.js";
import { subscribeZoomSync, broadcastZoomSync } from "../../composables/useChartZoomSync.js";
import { formatClockTime } from "../../utils/messtoolParser.js";

Chart.register(zoomPlugin);

const theme = useTheme();
const mtStore = useMesstoolStore();

const props = defineProps({
  title: { type: String, default: "" },
  config: { type: Function, required: true },
  height: { type: Number, default: 260 },
  // Charts sharing the same syncGroup name stay zoomed/panned together on
  // their x-axis (e.g. Analyse's two time-domain charts) — matches the
  // original tool's "Synchroner Zoom" checkbox.
  syncGroup: { type: String, default: null },
});

const inlineCanvas = ref(null);
const fsCanvas = ref(null);
const fullscreen = ref(false);
const peakMode = ref(false);
const cursorMode = ref(false);
const markerMode = ref(false);
const outlierMode = ref(false);
const yLogMode = ref(false);
const cursors = ref([]); // up to 2 points: {x, y, label}
let inlineChart = null;
let fsChart = null;

const cursorInfo = computed(() => {
  if (cursors.value.length < 2) return cursors.value.length === 1
    ? "Erster Punkt gesetzt – zweiten Punkt anklicken."
    : "";
  const [a, b] = cursors.value;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return `Δx = ${dx.toFixed(4)}  ·  Δy = ${dy.toFixed(4)}  (P1: x=${a.x.toFixed(3)}, y=${a.y.toFixed(3)} · P2: x=${b.x.toFixed(3)}, y=${b.y.toFixed(3)})`;
});

function toggleCursorMode() {
  cursorMode.value = !cursorMode.value;
  if (cursorMode.value) markerMode.value = false;
  cursors.value = [];
  buildInline();
  if (fullscreen.value) buildFullscreen();
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
function xValueAtEvent(chart, evt) {
  const points = chart.getElementsAtEventForMode(evt, "nearest", { intersect: false }, true);
  if (!points.length) return null;
  const p = points[0];
  const ds = chart.data.datasets[p.datasetIndex];
  const rawX = chart.data.labels ? chart.data.labels[p.index] : ds.data[p.index]?.x;
  return typeof rawX === "number" ? rawX : parseFloat(rawX);
}

function onCanvasClick(evt, which) {
  const chart = which === "inline" ? inlineChart : fsChart;
  if (!chart) return;

  if (markerMode.value) {
    const x = xValueAtEvent(chart, evt);
    if (x == null || Number.isNaN(x)) return;
    const note = window.prompt(`Notiz für Marker bei t = ${x.toFixed(2)}s:`);
    if (note && note.trim()) {
      mtStore.addMarker(x, note.trim());
      buildInline();
      if (fullscreen.value) buildFullscreen();
    }
    return;
  }

  if (!cursorMode.value) return;
  const points = chart.getElementsAtEventForMode(evt, "nearest", { intersect: false }, true);
  if (!points.length) return;
  const p = points[0];
  const ds = chart.data.datasets[p.datasetIndex];
  const rawX = chart.data.labels ? chart.data.labels[p.index] : ds.data[p.index]?.x;
  const rawY = chart.data.labels ? ds.data[p.index] : ds.data[p.index]?.y;
  const x = typeof rawX === "number" ? rawX : parseFloat(rawX);
  const y = typeof rawY === "number" ? rawY : parseFloat(rawY);

  if (cursors.value.length >= 2) cursors.value = [];
  cursors.value = [...cursors.value, { x, y }];

  buildInline();
  if (fullscreen.value) buildFullscreen();
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

const cursorPlugin = {
  id: "cursorMarkers",
  afterDraw(chart) {
    if (!cursorMode.value || cursors.value.length === 0) return;
    const { ctx, chartArea } = chart;
    ctx.save();
    cursors.value.forEach((c, i) => {
      const px = xValueToPixel(chart, c.x);
      if (px < chartArea.left || px > chartArea.right) return;
      ctx.strokeStyle = i === 0 ? "#DC2626" : "#059669";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(px, chartArea.top);
      ctx.lineTo(px, chartArea.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = i === 0 ? "#DC2626" : "#059669";
      ctx.font = "11px sans-serif";
      ctx.fillText(`P${i + 1}`, px + 3, chartArea.top + 12);
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

    chart.data.datasets.forEach((ds, dsIndex) => {
      if (!ds.data.length) return;
      // Each dataset can have its own independent x-values (e.g. Vergleich's
      // overlay, where every file/series has its own time array plus its
      // own offset) — using one shared xs array for all of them would find
      // the wrong nearest point and land the dot off the actual line.
      const dsXs = chart.data.labels
        ? chart.data.labels.map(Number)
        : ds.data.map((p) => (p && typeof p === "object" ? p.x : null));

      // Find the two points bracketing the exact playhead x and linearly
      // interpolate between them, rather than snapping to whichever single
      // point is "nearest" — on a steep slope the nearest point's y can
      // sit noticeably off the line at this exact x, making the dot look
      // like it's floating above/below the curve instead of on it.
      let lo = -1;
      for (let i = 0; i < dsXs.length - 1; i++) {
        if (dsXs[i] <= playheadX.value && dsXs[i + 1] >= playheadX.value) {
          lo = i;
          break;
        }
      }
      if (lo === -1) return; // playhead is outside this dataset's own x-range

      const rawLo = ds.data[lo];
      const rawHi = ds.data[lo + 1];
      const yLo = rawLo && typeof rawLo === "object" ? rawLo.y : rawLo;
      const yHi = rawHi && typeof rawHi === "object" ? rawHi.y : rawHi;
      if (yLo == null || yHi == null || !Number.isFinite(yLo) || !Number.isFinite(yHi)) return;

      const xLo = dsXs[lo];
      const xHi = dsXs[lo + 1];
      const frac = xHi > xLo ? (playheadX.value - xLo) / (xHi - xLo) : 0;
      const yVal = yLo + (yHi - yLo) * frac;

      const yScale = chart.scales[ds.yAxisID || "y"];
      if (!yScale) return;
      const y = yScale.getPixelForValue(yVal);

      const color = ds.borderColor || "#059669";
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, y, 4, 0, 2 * Math.PI);
      ctx.fill();

      ctx.font = "11px sans-serif";
      const label = yVal.toFixed(2);
      const labelY = y - 8 < chartArea.top + 10 ? y + 16 : y - 8;
      ctx.fillText(label, px + 6, labelY);
    });

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
  const gridColor = isDark ? "rgba(148,163,184,0.15)" : "rgba(100,116,139,0.15)";

  cfg.options.color = textColor;

  cfg.options.scales = cfg.options.scales || {};
  for (const key of Object.keys(cfg.options.scales)) {
    const s = cfg.options.scales[key] || {};
    s.ticks = { color: textColor, ...(s.ticks || {}) };
    if (s.title) s.title = { color: textColor, ...s.title };
    s.grid = { color: gridColor, ...(s.grid || {}) };
    cfg.options.scales[key] = s;
  }

  cfg.options.plugins.legend = {
    labels: { color: textColor, ...(cfg.options.plugins.legend?.labels || {}) },
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
          return `${item.dataset.label}: ${typeof v === "number" ? v.toFixed(3) : v}`;
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
    },
    zoom: {
      wheel: { enabled: true },
      drag: { enabled: true, backgroundColor: "rgba(37,99,235,0.15)" }, // rectangle select
      mode: "x",
      onZoomComplete: ({ chart }) => broadcastOwnRange(chart),
    },
    pan: {
      enabled: true,
      mode: "x",
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
  const xScale = chart.scales?.x;
  if (!xScale || typeof xScale.min !== "number" || typeof xScale.max !== "number") return;
  const span = xScale.max - xScale.min;
  if (!(span > 0)) return;
  chart.options.plugins.zoom.limits.x = {
    min: xScale.min,
    max: xScale.max,
    minRange: span * 0.01, // never zoom in past ~1% of the full range
  };
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

function buildInline() {
  if (inlineChart) { inlineChart.destroy(); inlineChart = null; }
  if (!inlineCanvas.value) return;
  const cfg = withInteractions(props.config(peakMode.value));
  cfg.plugins = [cursorPlugin, markerPlugin, outlierPlugin, playheadPlugin];
  inlineChart = new Chart(inlineCanvas.value.getContext("2d"), cfg);
  applyZoomLimits(inlineChart);
}

function buildFullscreen() {
  if (fsChart) { fsChart.destroy(); fsChart = null; }
  if (!fsCanvas.value) return;
  const cfg = withInteractions(props.config(peakMode.value));
  cfg.plugins = [cursorPlugin, markerPlugin, outlierPlugin, playheadPlugin];
  fsChart = new Chart(fsCanvas.value.getContext("2d"), cfg);
  applyZoomLimits(fsChart);
}

function resetZoom(which) {
  if (which === "inline" && inlineChart) inlineChart.resetZoom();
  if (which === "fs" && fsChart) fsChart.resetZoom();
}

async function openFullscreen() {
  fullscreen.value = true;
  await nextTick();
  setTimeout(buildFullscreen, 150);
}

watch(() => props.config, async () => { await nextTick(); buildInline(); });
watch(peakMode, async () => { await nextTick(); buildInline(); if (fullscreen.value) buildFullscreen(); });
watch(() => theme.global.name.value, () => { buildInline(); if (fullscreen.value) buildFullscreen(); });

watch(fullscreen, (open) => {
  if (!open && fsChart) { fsChart.destroy(); fsChart = null; }
});

onMounted(async () => {
  await nextTick();
  buildInline();
  if (props.syncGroup) {
    unsubscribeZoomSync = subscribeZoomSync(props.syncGroup, onIncomingSyncedRange);
  }
});
onBeforeUnmount(() => {
  if (playRafId) cancelAnimationFrame(playRafId);
  if (unsubscribeZoomSync) unsubscribeZoomSync();
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

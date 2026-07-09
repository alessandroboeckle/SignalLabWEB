<template>
  <v-card variant="outlined" rounded="lg" class="mb-4">
    <v-card-title class="text-subtitle-1 d-flex align-center flex-wrap ga-2">
      {{ title }}
      <v-spacer></v-spacer>
      <v-btn
        size="small"
        :variant="peakMode ? 'flat' : 'outlined'"
        :color="peakMode ? 'primary' : 'default'"
        prepend-icon="mdi-chart-sawtooth"
        @click="peakMode = !peakMode"
      >
        Spitzen {{ peakMode ? "AN" : "AUS" }}
        <v-tooltip activator="parent" location="bottom">
          {{ peakMode ? 'Min/Max-Modus: Spitzen bleiben sichtbar' : 'Schneller Modus: kurze Spitzen können fehlen' }}
        </v-tooltip>
      </v-btn>
      <v-btn size="small" variant="text" icon="mdi-restore" @click="resetZoom('inline')">
        <v-icon>mdi-restore</v-icon>
        <v-tooltip activator="parent" location="bottom">Zoom zurücksetzen</v-tooltip>
      </v-btn>
      <v-btn size="small" variant="text" icon="mdi-fullscreen" @click="openFullscreen">
        <v-icon>mdi-fullscreen</v-icon>
        <v-tooltip activator="parent" location="bottom">Vergrößern</v-tooltip>
      </v-btn>
    </v-card-title>
    <v-divider></v-divider>
    <v-card-text>
      <div class="hint text-caption text-medium-emphasis mb-1">
        Mausrad = Zoom · Rechteck ziehen = Bereich · Ziehen mit gedrückter Umschalt = verschieben
      </div>
      <div :style="{ height: height + 'px' }">
        <canvas ref="inlineCanvas"></canvas>
      </div>
    </v-card-text>

    <!-- Fullscreen overlay -->
    <v-dialog v-model="fullscreen" fullscreen transition="dialog-bottom-transition">
      <v-card>
        <v-toolbar color="primary" density="comfortable">
          <v-toolbar-title>{{ title }}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn variant="text" prepend-icon="mdi-restore" @click="resetZoom('fs')">Zoom zurück</v-btn>
          <v-btn icon="mdi-close" @click="fullscreen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-text class="pa-4" style="height: calc(100vh - 64px)">
          <canvas ref="fsCanvas"></canvas>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import Chart from "chart.js/auto";
import zoomPlugin from "chartjs-plugin-zoom";

Chart.register(zoomPlugin);

const props = defineProps({
  title: { type: String, default: "" },
  config: { type: Function, required: true },
  height: { type: Number, default: 260 },
});

const inlineCanvas = ref(null);
const fsCanvas = ref(null);
const fullscreen = ref(false);
const peakMode = ref(false);
let inlineChart = null;
let fsChart = null;

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
        title: (items) => (items.length ? `x = ${items[0].label}` : ""),
        label: (item) => {
          const v = item.parsed.y;
          return `${item.dataset.label}: ${typeof v === "number" ? v.toFixed(3) : v}`;
        },
      },
    },
    cfg.options.plugins.tooltip || {},
  );

  // zoom + pan (matplotlib-style)
  cfg.options.plugins.zoom = {
    zoom: {
      wheel: { enabled: true },
      drag: { enabled: true, backgroundColor: "rgba(37,99,235,0.15)" }, // rectangle select
      mode: "x",
    },
    pan: {
      enabled: true,
      mode: "x",
      modifierKey: "shift",
    },
  };
  return cfg;
}

function buildInline() {
  if (inlineChart) { inlineChart.destroy(); inlineChart = null; }
  if (!inlineCanvas.value) return;
  inlineChart = new Chart(inlineCanvas.value.getContext("2d"), withInteractions(props.config(peakMode.value)));
}

function buildFullscreen() {
  if (fsChart) { fsChart.destroy(); fsChart = null; }
  if (!fsCanvas.value) return;
  fsChart = new Chart(fsCanvas.value.getContext("2d"), withInteractions(props.config(peakMode.value)));
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

watch(fullscreen, (open) => {
  if (!open && fsChart) { fsChart.destroy(); fsChart = null; }
});

onMounted(async () => { await nextTick(); buildInline(); });
onBeforeUnmount(() => {
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

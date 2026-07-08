<template>
  <v-card variant="outlined" rounded="lg" class="mb-4">
    <v-card-title class="text-subtitle-1 d-flex align-center">
      {{ title }}
      <v-spacer></v-spacer>
      <v-btn
        size="small"
        variant="text"
        icon="mdi-fullscreen"
        @click="openFullscreen"
      >
        <v-icon>mdi-fullscreen</v-icon>
        <v-tooltip activator="parent" location="bottom">Vergrößern</v-tooltip>
      </v-btn>
    </v-card-title>
    <v-divider></v-divider>
    <v-card-text>
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

const props = defineProps({
  title: { type: String, default: "" },
  // a function returning a fresh Chart.js config object
  config: { type: Function, required: true },
  height: { type: Number, default: 260 },
});

const inlineCanvas = ref(null);
const fsCanvas = ref(null);
const fullscreen = ref(false);
let inlineChart = null;
let fsChart = null;

function buildInline() {
  if (inlineChart) { inlineChart.destroy(); inlineChart = null; }
  if (!inlineCanvas.value) return;
  const cfg = props.config();
  cfg.options = cfg.options || {};
  cfg.options.maintainAspectRatio = false;
  inlineChart = new Chart(inlineCanvas.value.getContext("2d"), cfg);
}

function buildFullscreen() {
  if (fsChart) { fsChart.destroy(); fsChart = null; }
  if (!fsCanvas.value) return;
  const cfg = props.config();
  cfg.options = cfg.options || {};
  cfg.options.maintainAspectRatio = false;
  fsChart = new Chart(fsCanvas.value.getContext("2d"), cfg);
}

async function openFullscreen() {
  fullscreen.value = true;
  await nextTick();
  // small delay so the dialog has its final size
  setTimeout(buildFullscreen, 150);
}

// rebuild inline chart whenever the config function identity changes
watch(() => props.config, async () => { await nextTick(); buildInline(); });

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

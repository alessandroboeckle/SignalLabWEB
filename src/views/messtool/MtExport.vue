<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-file-export</v-icon>
      <h2 class="text-h5 font-weight-bold">Export</h2>
    </div>
    <p class="text-medium-emphasis mb-6">Plot als Bild speichern oder PDF-Report erstellen</p>

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
          { target: 'mt-sessions', label: 'Sessions (speichern)', icon: 'mdi-content-save-cog-outline' },
        ]"
        @navigate="$emit('navigate', $event)"
      />
      <v-row>
        <v-col cols="12" md="4">
          <v-card variant="outlined" rounded="lg" class="pa-4 mb-4">
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

            <v-btn
              class="mb-3 w-100"
              color="primary"
              prepend-icon="mdi-image"
              @click="exportPng"
            >
              Als PNG speichern
            </v-btn>

            <v-btn
              class="mb-3 w-100"
              color="primary"
              variant="outlined"
              prepend-icon="mdi-svg"
              @click="exportSvg"
            >
              Als SVG speichern
            </v-btn>

            <v-btn
              class="w-100"
              color="primary"
              variant="outlined"
              prepend-icon="mdi-file-pdf-box"
              :loading="buildingPdf"
              @click="exportPdf"
            >
              PDF-Report erstellen
            </v-btn>

            <v-alert type="info" variant="tonal" density="compact" class="text-caption mt-4">
              Der PDF-Report enthält den Plot, die Kennzahlen (Mittel, RMS, Min/Max)
              sowie Dateiname und Zeitstempel.
            </v-alert>
          </v-card>

          <v-card variant="outlined" rounded="lg" class="pa-4">
            <div class="d-flex align-center mb-2">
              <v-icon class="mr-2" size="20">mdi-archive-arrow-down-outline</v-icon>
              <span class="text-subtitle-1">Batch-Export</span>
            </div>
            <p class="text-caption text-medium-emphasis mb-3">
              Erstellt einen PDF-Report je Signal aus dem <strong>Vergleich</strong>-Bereich
              (auch mehrere je Datei) und packt alle in ein ZIP.
            </p>

            <template v-if="mtStore.compareSeries.length === 0">
              <v-alert type="info" variant="tonal" density="compact" class="text-caption">
                Noch keine Signale im Vergleich ausgewählt. Füge welche auf der Vergleich-Seite hinzu.
              </v-alert>
            </template>
            <template v-else>
              <v-list density="compact" class="mb-3">
                <v-list-item v-for="s in mtStore.compareSeries" :key="s.key">
                  <template #prepend>
                    <v-avatar :color="s.color" size="10"></v-avatar>
                  </template>
                  <v-list-item-title class="text-body-2">{{ s.fileName }}</v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    {{ s.signal.name }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
              <v-btn
                class="w-100"
                color="primary"
                variant="flat"
                prepend-icon="mdi-folder-zip-outline"
                :loading="buildingBatch"
                @click="exportBatchZip"
              >
                {{ mtStore.compareSeries.length }} PDFs als ZIP
              </v-btn>
              <v-progress-linear
                v-if="buildingBatch"
                :model-value="batchProgress"
                class="mt-2"
                height="4"
                color="primary"
              ></v-progress-linear>
            </template>
          </v-card>
        </v-col>

        <v-col cols="12" md="8">
          <ChartCard title="Zu exportierender Plot" :config="exportConfig" :height="360" />
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { ref, computed } from "vue";
import jsPDF from "jspdf";
import JSZip from "jszip";
import { useMesstoolStore } from "../../stores/messtoolStore.js";
import { showToast } from "../../composables/useToast.js";
import { useSignalNavigationShortcuts } from "../../composables/useSignalNavigation.js";
import * as A from "../../utils/messtoolAnalysis.js";
import { downsample } from "../../utils/downsample.js";
import { buildLineChartSvg } from "../../utils/svgChart.js";
import ChartCard from "./ChartCard.vue";
import MtQuickNav from "./MtQuickNav.vue";

defineEmits(["navigate"]);

const mtStore = useMesstoolStore();
useSignalNavigationShortcuts(mtStore);

// Shared across Analyse/Filter/Verarbeitung/Export so switching pages
// keeps showing the same signal instead of resetting to the first one.
const selectedIdx = computed({
  get: () => mtStore.selectedSignalIdx,
  set: (v) => { mtStore.selectedSignalIdx = v; },
});
const buildingPdf = ref(false);
const buildingBatch = ref(false);
const batchProgress = ref(0);

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

const exportConfig = computed(() => {
  const s = sig.value, t = time.value;
  return (peakMode) => {
    if (!s) return { type: "line", data: { labels: [], datasets: [] } };
    const { rx, ry } = downsample(s.data, t, peakMode ? "minmax" : "simple", 800);
    return {
      type: "line",
      data: {
        labels: rx,
        datasets: [{
          label: `${s.name} [${s.unit || "-"}]`,
          data: ry,
          borderColor: "#2563EB",
          backgroundColor: "rgba(37,99,235,0.08)",
          borderWidth: 1.5, pointRadius: 0, fill: true,
        }],
      },
      options: {
        responsive: true, animation: false,
        scales: {
          x: { title: { display: true, text: "Zeit [s]" } },
          y: { title: { display: true, text: s.unit || "" } },
        },
      },
    };
  };
});

// Render a standalone offscreen chart to get a clean PNG (not the interactive one).
// Takes explicit (s, t) so it can be reused for the batch export over other files.
async function renderOffscreenChart(s, t, width = 1000, height = 500, { showMarkers = false } = {}) {
  const { default: Chart } = await import("chart.js/auto");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const { rx, ry } = downsample(s.data, t, "minmax", 1000);

  // Raw numeric labels (not pre-formatted strings) so the marker plugin's
  // getPixelForValue(timeSec) resolves reliably against them.
  const exportMarkerPlugin = {
    id: "exportMarkers",
    afterDraw(chart) {
      if (!showMarkers || !mtStore.markers.length) return;
      const { ctx, chartArea, scales } = chart;
      const xScale = scales.x;
      ctx.save();
      for (const m of mtStore.markers) {
        const px = xScale.getPixelForValue(m.timeSec);
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
        ctx.font = "11px sans-serif";
        const label = m.note.length > 22 ? m.note.slice(0, 21) + "…" : m.note;
        ctx.fillText(label, px + 3, chartArea.bottom - 6);
      }
      ctx.restore();
    },
  };

  const chart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: rx,
      datasets: [{
        label: `${s.name} [${s.unit || "-"}]`,
        data: ry,
        borderColor: "#2563EB",
        backgroundColor: "rgba(37,99,235,0.08)",
        borderWidth: 1.5, pointRadius: 0, fill: true,
      }],
    },
    options: {
      responsive: false, animation: false,
      scales: {
        x: {
          title: { display: true, text: "Zeit [s]" },
          ticks: { callback: (val, idx) => rx[idx]?.toFixed(2) },
        },
        y: { title: { display: true, text: s.unit || "" } },
      },
      plugins: { legend: { display: true } },
    },
    plugins: [exportMarkerPlugin],
  });
  await new Promise((r) => setTimeout(r, 50)); // let it render
  const dataUrl = canvas.toDataURL("image/png");
  chart.destroy();
  return dataUrl;
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function exportPng() {
  if (!sig.value) return;
  const dataUrl = await renderOffscreenChart(sig.value, time.value, 1200, 600, { showMarkers: true });
  downloadDataUrl(dataUrl, `${sig.value.name.replace(/[^\w.-]+/g, "_")}.png`);
  showToast("PNG heruntergeladen.");
}

function exportSvg() {
  if (!sig.value) return;
  const s = sig.value;
  const { rx, ry } = downsample(s.data, time.value, "minmax", 1000);
  const svg = buildLineChartSvg({
    x: rx,
    y: ry,
    title: `${s.name}${s.unit ? ` [${s.unit}]` : ""}`,
    xLabel: "Zeit [s]",
    yLabel: s.unit || "Wert",
  });
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, `${s.name.replace(/[^\w.-]+/g, "_")}.svg`);
  URL.revokeObjectURL(url);
  showToast("SVG heruntergeladen.");
}

// Builds a single-page report PDF for one signal and returns the jsPDF doc
// (caller decides whether to .save() it directly or bundle it into a zip).
// showMarkers should only be true when `s`/`t` genuinely belong to the
// currently active file (mtStore.markers is scoped to that file) — batch-
// exporting a different comparison file must leave it off.
async function buildReportPdf(s, t, fileLabel, { showMarkers = false } = {}) {
  const y = s.data.filter((v) => v != null && Number.isFinite(v));
  const mm = A.minMax(y);
  const stats = {
    mean: A.mean(y), rms: A.rms(y), std: A.stddev(y),
    variance: A.variance(y), min: mm.min, max: mm.max,
  };

  const imgData = await renderOffscreenChart(s, t, 1000, 500, { showMarkers });

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;

  doc.setFontSize(18);
  doc.text("Messtool – Analyse-Report", margin, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Datei: ${fileLabel || "-"}`, margin, 28);
  doc.text(`Signal: ${s.name} [${s.unit || "-"}]`, margin, 34);
  doc.text(`Erstellt: ${new Date().toLocaleString("de-DE")}`, margin, 40);

  const imgW = pageW - 2 * margin;
  const imgH = imgW * 0.5;
  doc.addImage(imgData, "PNG", margin, 48, imgW, imgH);

  let y0 = 48 + imgH + 12;
  doc.setFontSize(13);
  doc.setTextColor(30);
  doc.text("Kennzahlen", margin, y0);
  y0 += 7;

  doc.setFontSize(10);
  doc.setTextColor(60);
  const rows = [
    ["Mittelwert", stats.mean, s.unit],
    ["RMS", stats.rms, s.unit],
    ["Standardabweichung", stats.std, s.unit],
    ["Varianz", stats.variance, ""],
    ["Minimum", stats.min, s.unit],
    ["Maximum", stats.max, s.unit],
  ];
  for (const [label, val, unit] of rows) {
    doc.text(`${label}:`, margin, y0);
    doc.text(`${val == null ? "-" : val.toFixed(4)} ${unit || ""}`, margin + 60, y0);
    y0 += 6;
  }

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Erstellt mit Signal Lab – Messtool", margin, 287);

  return doc;
}

async function exportPdf() {
  if (!sig.value) return;
  buildingPdf.value = true;
  try {
    const doc = await buildReportPdf(sig.value, time.value, mtStore.fileName, { showMarkers: true });
    doc.save(`${sig.value.name.replace(/[^\w.-]+/g, "_")}_report.pdf`);
    showToast("PDF-Report heruntergeladen.");
  } finally {
    buildingPdf.value = false;
  }
}

// Batch: one report PDF per file in mtStore.compareFiles (built on the
// Vergleich page), using each file's own selected signal, all bundled
// into a single ZIP download.
// Batch: one report PDF per (file, signal) series selected on the
// Vergleich page — so picking two signals from the same file there
// produces two PDFs here too, not just one.
async function exportBatchZip() {
  const series = mtStore.compareSeries;
  if (series.length === 0) return;
  buildingBatch.value = true;
  batchProgress.value = 0;
  try {
    const zip = new JSZip();
    const usedNames = new Set();
    for (let i = 0; i < series.length; i++) {
      const s = series[i];
      const doc = await buildReportPdf(s.signal, s.time, s.fileName);
      const baseName = s.fileName.replace(/[^\w.-]+/g, "_").replace(/\.csv$/i, "");
      const sigName = s.signal.name.replace(/[^\w.-]+/g, "_");
      let filename = `${baseName}_${sigName}_report.pdf`;
      // guard against duplicate signal names within the same file (rare,
      // but LOGITEM names aren't guaranteed unique) clobbering each other
      if (usedNames.has(filename)) filename = `${baseName}_${sigName}_${i}_report.pdf`;
      usedNames.add(filename);
      zip.file(filename, doc.output("blob"));
      batchProgress.value = Math.round(((i + 1) / series.length) * 100);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    downloadDataUrl(url, `messtool_batch_${Date.now()}.zip`);
    URL.revokeObjectURL(url);
    showToast(`${series.length} PDF(s) als ZIP heruntergeladen.`);
  } finally {
    buildingBatch.value = false;
  }
}
</script>

<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-file-export</v-icon>
      <h2 class="text-h4 font-weight-bold">Export</h2>
    </div>
    <p class="text-medium-emphasis mb-6">Plot als Bild speichern oder PDF-Report erstellen</p>

    <v-card v-if="!mtStore.parsed" variant="outlined" rounded="lg" class="pa-8 text-center">
      <v-icon size="56" color="grey-lighten-1" class="mb-3">mdi-file-question-outline</v-icon>
      <h3 class="text-h6 mb-2">Keine Messdatei geladen</h3>
      <p class="text-medium-emphasis">Lade zuerst im Bereich <strong>Import</strong> eine Datei.</p>
    </v-card>

    <template v-else>
      <v-row>
        <v-col cols="12" md="4">
          <v-card variant="outlined" rounded="lg" class="pa-4 mb-4">
            <v-select
              v-model="selectedIdx"
              :items="signalOptions"
              label="Signal"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-sine-wave"
              class="mb-4"
            ></v-select>

            <v-btn
              class="mb-3 w-100"
              color="primary"
              prepend-icon="mdi-image"
              @click="exportPng"
            >
              Als PNG speichern
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
        </v-col>

        <v-col cols="12" md="8">
          <ChartCard title="Zu exportierender Plot" :config="exportConfig" :height="360" />
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { ref, computed, nextTick } from "vue";
import jsPDF from "jspdf";
import { useMesstoolStore } from "../../stores/messtoolStore.js";
import * as A from "../../utils/messtoolAnalysis.js";
import { downsample } from "../../utils/downsample.js";
import ChartCard from "./ChartCard.vue";

const mtStore = useMesstoolStore();

const selectedIdx = ref(0);
const buildingPdf = ref(false);

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
async function renderOffscreenChart(width = 1000, height = 500) {
  const { default: Chart } = await import("chart.js/auto");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const s = sig.value, t = time.value;
  const { rx, ry } = downsample(s.data, t, "minmax", 1000);

  const chart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: rx.map((v) => v.toFixed(2)),
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
        x: { title: { display: true, text: "Zeit [s]" } },
        y: { title: { display: true, text: s.unit || "" } },
      },
      plugins: { legend: { display: true } },
    },
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
  const dataUrl = await renderOffscreenChart(1200, 600);
  downloadDataUrl(dataUrl, `${sig.value.name.replace(/[^\w.-]+/g, "_")}.png`);
}

async function exportPdf() {
  if (!sig.value) return;
  buildingPdf.value = true;
  try {
    const s = sig.value;
    const y = s.data.filter((v) => v != null && Number.isFinite(v));
    const mm = A.minMax(y);
    const stats = {
      mean: A.mean(y), rms: A.rms(y), std: A.stddev(y),
      variance: A.variance(y), min: mm.min, max: mm.max,
    };

    const imgData = await renderOffscreenChart(1000, 500);

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;

    doc.setFontSize(18);
    doc.text("Messtool – Analyse-Report", margin, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Datei: ${mtStore.fileName || "-"}`, margin, 28);
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

    doc.save(`${s.name.replace(/[^\w.-]+/g, "_")}_report.pdf`);
  } finally {
    buildingPdf.value = false;
  }
}
</script>

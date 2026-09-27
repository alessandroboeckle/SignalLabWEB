<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-file-export</v-icon>
      <h2 class="text-h5 font-weight-bold">Export</h2>
    
      <v-spacer></v-spacer>
      <HelpIconButton section="messtool-export" label="Export" />
    </div>
    <p class="text-medium-emphasis mb-6">Plot als Bild speichern oder PDF-Report erstellen</p>

    <!-- All Anzeige plots in one PDF — shown whenever the Anzeige has
         content, even if no single file is loaded here (the per-signal
         export below needs one, this doesn't). -->
    <v-card v-if="mtStore.compareFiles.length" variant="outlined" rounded="lg" class="mb-4 chart-popover">
      <div class="popover-head">
        <v-icon size="20" color="primary">mdi-file-pdf-box</v-icon>
        <div class="flex-grow-1">
          <div class="popover-title">Anzeige komplett als PDF</div>
          <div class="popover-sub">Alle Plots der Anzeige in einem Dokument — inkl. Zoom, Marker und Cursor-Werten</div>
        </div>
      </div>
      <div class="pa-4">
        <AnzeigePdfExportForm
          :fields="exportFields.filter((f) => f.label.trim())"
          show-navigate
          show-list
          @navigate="$emit('navigate', $event)"
        />
      </div>
    </v-card>

    <EmptyState
      v-if="!mtStore.parsed"
      title="Keine Messdatei geladen"
      description="Lade zuerst im Bereich Import eine Datei."
      action-label="Zu Import"
      action-icon="mdi-file-upload"
      @action="$emit('navigate', 'mt-import')"
    />

    <template v-else>
      <MtQuickNav
        :items="[
          { target: 'mt-sessions', label: 'Sessions (speichern)', icon: 'mdi-content-save-cog-outline' },
        ]"
        @navigate="$emit('navigate', $event)"
      />
      <v-row>
        <v-col cols="12" md="4">
          <v-card variant="outlined" rounded="lg" class="mb-4 chart-popover">
            <div class="popover-head">
              <v-icon size="20" color="primary">mdi-sine-wave</v-icon>
              <div>
                <div class="popover-title">Einzelnes Signal exportieren</div>
                <div class="popover-sub">Plot wie rechts angezeigt — mit Zoom, Markern und Cursor</div>
              </div>
            </div>
            <div class="pa-4">
              <v-autocomplete
                v-model="selectedIdx"
                :items="signalOptions"
                label="Signal"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-sine-wave"
                class="mb-3"
                hint="↑ / ↓ zum Durchblättern"
                persistent-hint
              ></v-autocomplete>

              <v-text-field
                v-model="customBaseName"
                label="Dateiname"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-form-textbox"
                hint="Ohne Dateiendung — die wird je nach Format automatisch angehängt"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <div class="popover-label">Bild &amp; Daten</div>
              <div class="format-row mb-5">
                <v-btn variant="outlined" prepend-icon="mdi-image-outline" @click="exportPng">PNG</v-btn>
                <v-btn variant="outlined" prepend-icon="mdi-svg" @click="exportSvg">SVG</v-btn>
                <v-btn variant="outlined" prepend-icon="mdi-microsoft-excel" :loading="buildingExcel" @click="exportAllSignalsExcel">
                  Excel
                  <v-tooltip activator="parent" location="bottom">Alle Signale der Datei als Excel-Tabelle</v-tooltip>
                </v-btn>
              </div>

              <div class="popover-label">PDF-Report · Inhalt</div>
              <OptionToggle v-model="pdfScope" :options="scopeOptions" fill class="mb-3" />
              <div class="popover-label">Ausrichtung</div>
              <OptionToggle v-model="pdfOrientation" :options="orientationOptions" fill class="mb-3" />
              <div class="popover-hint mb-4">
                {{ pdfScope === "full"
                  ? "Logo, Datei-/Signal-Angaben, Zusatzfelder, Plot, Cursor-Werte und Kennzahlen (Mittel, RMS, Std, Varianz, Min/Max, dt/df/N)."
                  : "Nur der Plot (inkl. Cursor-Werte) — zum Einfügen in ein eigenes Dokument." }}
              </div>

              <ExportActionButton
                label="PDF exportieren"
                :sub="`${pdfScope === 'full' ? 'Vollständiger Report' : 'Nur Plot'} · A4 ${pdfOrientation === 'landscape' ? 'quer' : 'hoch'}`"
                :loading="buildingPdf"
                loading-text="PDF wird erstellt"
                @click="doExportPdf(pdfScope === 'full')"
              />

              <v-divider class="my-5"></v-divider>

              <div class="d-flex align-center ga-2 mb-2">
                <img v-if="reportSettings.logoDataUrl" :src="reportSettings.logoDataUrl" alt="Logo" style="max-height: 24px; max-width: 80px" />
                <span class="text-caption text-medium-emphasis">
                  {{ reportSettings.logoDataUrl ? "Team-Logo wird auf jedem Report angezeigt." : "Kein Team-Logo hinterlegt (Admin → Report-Vorlage)." }}
                </span>
              </div>
              <div class="popover-label">Zusätzliche Angaben (alle PDFs)</div>
              <div v-for="(field, i) in exportFields" :key="i" class="d-flex align-center ga-2 mb-2">
                <v-text-field v-model="field.label" density="compact" variant="outlined" label="Feld" hide-details style="max-width: 130px"></v-text-field>
                <v-text-field v-model="field.value" density="compact" variant="outlined" label="Wert" hide-details></v-text-field>
                <v-btn icon="mdi-close" size="x-small" variant="text" :aria-label="`Feld ${field.label || i + 1} entfernen`" @click="exportFields.splice(i, 1)"></v-btn>
              </div>
              <v-btn size="small" variant="text" prepend-icon="mdi-plus" @click="exportFields.push({ label: '', value: '' })">
                Feld hinzufügen
              </v-btn>
            </div>
          </v-card>

          <v-card variant="outlined" rounded="lg" class="chart-popover">
            <div class="popover-head">
              <v-icon size="20" color="primary">mdi-archive-arrow-down-outline</v-icon>
              <div>
                <div class="popover-title">Batch-Export</div>
                <div class="popover-sub">Ein PDF je Signal aus der Anzeige, gesammelt als ZIP</div>
              </div>
            </div>
            <div class="pa-4">
              <template v-if="mtStore.compareSeries.length === 0">
                <v-alert type="info" variant="tonal" density="compact" class="text-caption">
                  Noch keine Signale in der Anzeige ausgewählt. Füge welche auf der Anzeige-Seite hinzu.
                </v-alert>
              </template>
              <template v-else>
                <v-list density="compact" class="mb-3 py-0">
                  <v-list-item v-for="s in mtStore.compareSeries" :key="s.key" class="px-0">
                    <template #prepend>
                      <v-avatar :color="s.color" size="10" class="mr-3"></v-avatar>
                    </template>
                    <v-list-item-title class="text-body-2">{{ s.fileName }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">{{ s.signal.name }}</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
                <div class="popover-label">Inhalt</div>
                <OptionToggle v-model="batchScope" :options="scopeOptions" fill class="mb-3" />
                <div class="popover-label">Ausrichtung</div>
                <OptionToggle v-model="batchOrientation" :options="orientationOptions" fill class="mb-3" />
                <div class="popover-label">ZIP-Dateiname</div>
                <v-text-field
                  v-model="batchZipName"
                  placeholder="messtool_batch"
                  persistent-placeholder
                  suffix=".zip"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mb-4"
                ></v-text-field>
                <ExportActionButton
                  label="ZIP exportieren"
                  icon="mdi-folder-zip-outline"
                  :sub="`${mtStore.compareSeries.length} PDFs · ${batchScope === 'full' ? 'Vollständiger Report' : 'Nur Plot'} · A4 ${batchOrientation === 'landscape' ? 'quer' : 'hoch'}`"
                  :loading="buildingBatch"
                  loading-text="PDFs werden erstellt"
                  :progress="batchProgress"
                  @click="doExportBatchZip(batchScope === 'full')"
                />
              </template>
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" md="8">
          <ChartCard ref="exportChartRef" title="Zu exportierender Plot" :config="exportConfig" :height="360" />
        </v-col>
      </v-row>
    </template>

    <v-dialog v-model="showPngDialog" max-width="420">
      <v-card>
        <v-card-title class="text-subtitle-1">PNG exportieren</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="pngTitleInput"
            label="Überschrift"
            variant="outlined"
            density="comfortable"
            :rules="[(v) => !!v.trim() || 'Überschrift ist erforderlich']"
            autofocus
            hide-details="auto"
            class="mb-3"
          ></v-text-field>
          <p class="text-caption text-medium-emphasis mb-0">
            Erscheint als Titel oben im Bild, mit Rahmen ums Ganze.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            v-if="reportSettings.logoDataUrl"
            variant="text"
            :disabled="!pngTitleInput.trim() || buildingPng"
            @click="doExportPng(false)"
          >
            Ohne Logo
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!pngTitleInput.trim()"
            :loading="buildingPng"
            @click="doExportPng(!!reportSettings.logoDataUrl)"
          >
            {{ reportSettings.logoDataUrl ? "Mit Logo" : "Exportieren" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>


  </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import EmptyState from "../../components/EmptyState.vue";
import { useMesstoolStore } from "../../stores/messtoolStore.js";
import { useReportSettingsStore } from "../../stores/reportSettingsStore.js";
import AnzeigePdfExportForm from "./AnzeigePdfExportForm.vue";
import { createdByLine, cursorTableHeight, drawCursorTable, rangeTableHeight, drawRangeTable } from "../../utils/chartsPdf.js";
import OptionToggle from "../../components/OptionToggle.vue";
import ExportActionButton from "../../components/ExportActionButton.vue";
import { useAuthStore } from "../../stores/authStore.js";
import { usernameFromEmail } from "../../utils/formatUsername.js";
import { showToast } from "../../composables/useToast.js";
import { useSignalNavigationShortcuts } from "../../composables/useSignalNavigation.js";
import * as A from "../../utils/messtoolAnalysis.js";
import { downsample, downsampleForDisplay } from "../../utils/downsample.js";
import { buildLineChartConfig, emptyLineChartConfig } from "../../utils/lineChartConfig.js";
import { buildLineChartSvg } from "../../utils/svgChart.js";
import { buildMultiSignalWorkbook, downloadWorkbook } from "../../utils/xlsxExport.js";
import ChartCard from "./ChartCard.vue";
import HelpIconButton from "../../components/HelpIconButton.vue";
import MtQuickNav from "./MtQuickNav.vue";

defineEmits(["navigate"]);

const mtStore = useMesstoolStore();
const reportSettings = useReportSettingsStore();
const auth = useAuthStore();

// Starts as the team's default fields (Admin → Report-Vorlage), fully
// editable/removable/extendable here without touching that shared
// default — this copy only affects the report(s) about to be exported.
const exportFields = ref([]);
onMounted(async () => {
  await reportSettings.load();
  exportFields.value = reportSettings.defaultFields.map((f) => ({ ...f }));
});
useSignalNavigationShortcuts(mtStore);

// Shared across Analyse/Filter/Verarbeitung/Export so switching pages
// keeps showing the same signal instead of resetting to the first one.
const selectedIdx = computed({
  get: () => mtStore.selectedSignalIdx,
  set: (v) => { mtStore.selectedSignalIdx = v; },
});
const buildingPdf = ref(false);
const buildingBatch = ref(false);
const buildingExcel = ref(false);
const buildingPng = ref(false);
const batchProgress = ref(0);
const batchZipName = ref("messtool_batch");
const showPngDialog = ref(false);
const pngTitleInput = ref("");
// PDF options are chosen inline now (no more "Nur Plot / Vollständig"
// pop-up) and remembered per browser.
const PDF_PREF_KEY = "signallab.export.pdfPrefs";
const pdfPrefs = (() => { try { return JSON.parse(localStorage.getItem(PDF_PREF_KEY) || "{}"); } catch { return {}; } })();
const scopeOptions = [
  { value: "full", label: "Vollständig", icon: "mdi-file-document-outline" },
  { value: "plot", label: "Nur Plot", icon: "mdi-chart-line" },
];
const orientationOptions = [
  { value: "portrait", label: "Hochformat", icon: "mdi-crop-portrait" },
  { value: "landscape", label: "Querformat", icon: "mdi-crop-landscape" },
];
const pdfScope = ref(pdfPrefs.pdfScope === "plot" ? "plot" : "full");
const pdfOrientation = ref(pdfPrefs.pdfOrientation === "landscape" ? "landscape" : "portrait");
const batchScope = ref(pdfPrefs.batchScope === "plot" ? "plot" : "full");
const batchOrientation = ref(pdfPrefs.batchOrientation === "landscape" ? "landscape" : "portrait");
watch([pdfScope, pdfOrientation, batchScope, batchOrientation], () => {
  try {
    localStorage.setItem(PDF_PREF_KEY, JSON.stringify({
      pdfScope: pdfScope.value, pdfOrientation: pdfOrientation.value,
      batchScope: batchScope.value, batchOrientation: batchOrientation.value,
    }));
  } catch { /* storage unavailable */ }
});
const exportChartRef = ref(null);

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

// Editable filename base (no extension — each export type appends its
// own). Re-suggests a sensible default whenever the selected signal
// changes; customizing it right before exporting is the realistic use
// pattern, so resetting on signal switch (rather than trying to track
// "did they edit it") keeps this predictable instead of surprising.
const customBaseName = ref("");
watch(sig, (s) => {
  customBaseName.value = s ? s.name.replace(/[^\w.-]+/g, "_") : "";
}, { immediate: true });
function exportFilename(extension) {
  const base = customBaseName.value.trim() || (sig.value ? sig.value.name.replace(/[^\w.-]+/g, "_") : "export");
  return `${base}.${extension}`;
}

const exportConfig = computed(() => {
  const s = sig.value, t = time.value;
  return (peakMode, exactMode = false) => {
    if (!s) return emptyLineChartConfig(false);
    const { rx, ry } = downsampleForDisplay(s.data, t, peakMode, exactMode);
    // {x,y} points on a real linear time axis (like Analyse) — the old
    // label/category axis printed raw float labels such as
    // "5.310000000000001" as ticks, also in the exported PDF.
    return buildLineChartConfig({
      parsing: false,
      xScale: { type: "linear", ticks: { maxTicksLimit: 10 } },
      datasets: [{
        label: `${s.name} [${s.unit || "-"}]`,
        data: rx.map((x, i) => ({ x, y: ry[i] })),
        borderColor: "#2563EB",
        backgroundColor: "rgba(37,99,235,0.08)",
        borderWidth: 1.5, pointRadius: 0, fill: true,
      }],
      xTitle: "Zeit [s]",
      yTitle: s.unit || "",
    });
  };
});

// Render a standalone offscreen chart to get a clean PNG (not the interactive one).
// Takes explicit (s, t) so it can be reused for the batch export over other files.
async function renderOffscreenChart(s, t, width = 1000, height = 500, { showMarkers = false } = {}) {
  const { default: Chart } = await import("../../utils/chartSetup.js");
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
    // Forces 2x supersampling regardless of the exporting screen's own
    // pixel density — Chart.js otherwise defaults to window.devicePixelRatio,
    // so a "1200x600" export on a plain 1x monitor would come out at
    // native 1200x600 with soft, slightly fuzzy text/lines once printed
    // or zoomed in. This doubles the actual backing canvas resolution
    // while keeping the layout math (font sizes, padding) the same.
    devicePixelRatio: 2,
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

async function exportAllSignalsExcel() {
  if (!mtStore.parsed) return;
  buildingExcel.value = true;
  try {
    const wb = await buildMultiSignalWorkbook(mtStore.parsed.time, mtStore.parsed.signals);
    const base = customBaseName.value.trim() || (mtStore.fileName || "signale").replace(/[^\w.-]+/g, "_").replace(/\.csv$/i, "");
    await downloadWorkbook(wb, `${base}_alle_signale.xlsx`);
    showToast("Excel-Datei heruntergeladen.");
  } finally {
    buildingExcel.value = false;
  }
}

async function exportPng() {
  if (!sig.value) return;
  pngTitleInput.value = `${sig.value.name}${sig.value.unit ? ` [${sig.value.unit}]` : ""}`;
  showPngDialog.value = true;
}

async function doExportPng(withLogo) {
  if (!pngTitleInput.value.trim()) return; // required — the dialog's own button is disabled without it too, this is just the safety net
  buildingPng.value = true;
  try {
    const chartDataUrl = await renderOffscreenChart(sig.value, time.value, 1800, 900, { showMarkers: true });
    const dataUrl = await composePngExport(chartDataUrl, {
      title: pngTitleInput.value.trim(),
      logoDataUrl: withLogo ? reportSettings.logoDataUrl : null,
      logoAspect: reportSettings.logoAspect,
    });
    downloadDataUrl(dataUrl, exportFilename("png"));
    showPngDialog.value = false;
    showToast("PNG heruntergeladen.");
  } finally {
    buildingPng.value = false;
  }
}

// Builds the actual exported PNG on its own canvas rather than just
// handing out the bare Chart.js render: a title bar (the chart's own
// legend text was the only "heading" before — easy to miss, not
// something you'd choose yourself) and a frame around the whole thing,
// so the export reads as a finished image rather than a screenshot of a
// chart. Logo (if requested) sits in the title bar, vertically centered
// against it rather than overlapping the plot area.
function composePngExport(chartDataUrl, { title, logoDataUrl, logoAspect }) {
  return new Promise((resolve, reject) => {
    const chartImg = new Image();
    chartImg.onload = () => {
      // Frame/title/font sizes scale with the chart's own resolution
      // (not fixed pixel counts) — otherwise a thin 24px frame that
      // looked right against a 1200px-wide export reads as a hairline
      // sliver against the higher-resolution export this now produces.
      const scale = chartImg.width / 1800;
      const frame = Math.round(24 * scale);
      const titleH = Math.round(64 * scale);
      const fontPx = Math.round(30 * scale);

      const canvas = document.createElement("canvas");
      canvas.width = chartImg.width + frame * 2;
      canvas.height = chartImg.height + titleH + frame * 2;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `600 ${fontPx}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = "#1e293b";
      ctx.textBaseline = "middle";
      ctx.fillText(title, frame, frame + titleH / 2, canvas.width - frame * 2 - Math.round(160 * scale));

      ctx.drawImage(chartImg, frame, frame + titleH);

      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = Math.max(2, Math.round(2 * scale));
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

      const finish = () => resolve(canvas.toDataURL("image/png"));

      if (logoDataUrl) {
        const logoImg = new Image();
        logoImg.onload = () => {
          const maxW = Math.round(140 * scale), maxH = titleH - Math.round(16 * scale);
          const aspect = logoAspect > 0 ? logoAspect : maxW / maxH;
          let w = maxW, h = maxW / aspect;
          if (h > maxH) { h = maxH; w = maxH * aspect; }
          ctx.drawImage(logoImg, canvas.width - frame - w, frame + (titleH - h) / 2, w, h);
          finish();
        };
        logoImg.onerror = finish; // logo failed to draw — still deliver the framed+titled export
        logoImg.src = logoDataUrl;
      } else {
        finish();
      }
    };
    chartImg.onerror = reject;
    chartImg.src = chartDataUrl;
  });
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
  downloadDataUrl(url, exportFilename("svg"));
  URL.revokeObjectURL(url);
  showToast("SVG heruntergeladen.");
}

// Builds a single-page report PDF for one signal and returns the jsPDF doc
// (caller decides whether to .save() it directly or bundle it into a zip).
// showMarkers should only be true when `s`/`t` genuinely belong to the
// currently active file (mtStore.markers is scoped to that file) — batch-
// exporting a different comparison file must leave it off.
async function buildReportPdf(s, t, fileLabel, {
  showMarkers = false, logoDataUrl = null, logoAspect = null, fields = [], fullReport = true,
  orientation = "portrait", renderChart = null,
} = {}) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: orientation === "landscape" ? "landscape" : "portrait", unit: "mm", format: "a4" });
  const landscape = orientation === "landscape";
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - 2 * margin;
  const footerY = pageH - 8;

  // Renders the plot for a given box (mm) — from the live chart when the
  // caller has one (zoom + cursors), else the plain off-screen renderer
  // (batch export). Returns { image, width, height, cursors, xUnit }.
  async function plotFor(boxW, boxH) {
    const pxW = Math.round(boxW * 4.2), pxH = Math.round(boxH * 4.2);
    if (renderChart) return renderChart({ width: pxW, height: pxH });
    const image = await renderOffscreenChart(s, t, pxW, pxH, { showMarkers });
    return { image, width: pxW, height: pxH, cursors: [], ranges: [], xUnit: "s" };
  }
  function footer() {
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(createdByLine(usernameFromEmail(auth.user?.email)), margin, footerY);
  }
  function placePlot(item, x, y, maxW, maxH) {
    const aspect = item.width / item.height;
    let w = maxW, h = w / aspect;
    if (h > maxH) { h = maxH; w = h * aspect; }
    doc.addImage(item.image, "PNG", x, y, w, h, undefined, "FAST");
    return h;
  }
  const cursorEstimate = (renderChart && exportChartRef.value?.cursorCountForExport?.()) || 0;
  const tableEst = cursorEstimate ? 7.5 + (2 * cursorEstimate - 1) * 4.8 + (cursorEstimate - 1) * 13 : 0;

  // "Nur Plot" — the chart as large as the page allows, with just the
  // signal name as a label (+ cursor values if any). For dropping it
  // straight into your own document.
  if (!fullReport) {
    doc.setFontSize(12);
    doc.setTextColor(60);
    doc.text(`${s.name}${s.unit ? ` [${s.unit}]` : ""}`, margin, 18);
    const maxH = footerY - 6 - 24 - tableEst - 4;
    const item = await plotFor(contentW, Math.min(maxH, contentW * 0.62));
    const actualTables = cursorTableHeight(doc, item.cursors, contentW) + rangeTableHeight(item.ranges);
    const h = placePlot(item, margin, 24, contentW, Math.max(40, footerY - 6 - 24 - actualTables - 4));
    drawCursorTable(doc, item.cursors, margin, 24 + h + 2, contentW, item.xUnit);
    drawRangeTable(doc, item.ranges, margin, 24 + h + 2 + cursorTableHeight(doc, item.cursors, contentW), contentW, item.xUnit);
    footer();
    return doc;
  }

  const y = s.data.filter((v) => v != null && Number.isFinite(v));
  const mm = A.minMax(y);
  const stats = {
    mean: A.mean(y), rms: A.rms(y), std: A.stddev(y),
    variance: A.variance(y), min: mm.min, max: mm.max,
  };
  // dt/df/N — same window-resolution readout as the Analyse page, so
  // someone reading just the PDF (not the app) can still tell how finely
  // resolved the underlying spectrum analysis actually was.
  let windowInfo = null;
  if (t.length >= 2) {
    const dt = (t[t.length - 1] - t[0]) / (t.length - 1);
    if (dt > 0) windowInfo = { dt, df: 1 / (t.length * dt), n: t.length };
  }

  // Logo top-right, if the team has one set (Admin → Report-Vorlage) —
  // fitted ("contain") within a max box using its real aspect ratio.
  if (logoDataUrl) {
    try {
      const maxW = 40, maxH = 18;
      const aspect = logoAspect > 0 ? logoAspect : maxW / maxH;
      let w = maxW, h = maxW / aspect;
      if (h > maxH) { h = maxH; w = maxH * aspect; }
      doc.addImage(logoDataUrl, "PNG", pageW - margin - w, 10, w, h, undefined, "FAST");
    } catch {
      // A malformed/unsupported logo shouldn't break the whole report.
    }
  }

  doc.setFontSize(18);
  doc.setTextColor(20);
  doc.text("Messtool – Analyse-Report", margin, 20);

  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text("Fachgruppe Antrieb", margin, 26);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Datei: ${fileLabel || "-"}`, margin, 33);
  doc.text(`Signal: ${s.name} [${s.unit || "-"}]`, margin, 39);
  doc.text(`Erstellt: ${new Date().toLocaleString("de-DE")}`, margin, 45);

  // Custom fields — 2 columns portrait, 3 landscape.
  const fieldCols = landscape ? 3 : 2;
  let fieldsBottomY = 49;
  if (fields.length) {
    const colW = contentW / fieldCols;
    fields.forEach((f, i) => {
      const fx = margin + (i % fieldCols) * colW;
      const fy = 53 + Math.floor(i / fieldCols) * 6;
      doc.text(`${f.label}:`, fx, fy);
      doc.text(String(f.value ?? ""), fx + Math.min(colW * 0.4, 35), fy);
      fieldsBottomY = fy + 6;
    });
  }

  const statRows = [
    ["Mittelwert", stats.mean, s.unit],
    ["RMS", stats.rms, s.unit],
    ["Standardabweichung", stats.std, s.unit],
    ["Varianz", stats.variance, s.unit ? `${s.unit}²` : ""],
    ["Minimum", stats.min, s.unit],
    ["Maximum", stats.max, s.unit],
  ];
  if (windowInfo) {
    statRows.push(["dt", windowInfo.dt, "s"], ["df", windowInfo.df, "Hz"], ["N (Samples)", windowInfo.n, "", 0]);
  }
  // Kennzahlen as a grid (2 columns portrait, 3 landscape) — keeps the
  // plot large, especially on the shorter landscape page.
  const statCols = landscape ? 3 : 2;
  const statsH = 12 + Math.ceil(statRows.length / statCols) * 6;

  const imgY = Math.max(53, fieldsBottomY);
  const maxImgH = footerY - 6 - imgY - statsH - tableEst - 8;
  const item = await plotFor(contentW, Math.max(40, Math.min(maxImgH, contentW * 0.55)));
  // Size the image from the ACTUAL table heights (known only after the
  // render) — the estimate above only picks the render's aspect ratio.
  const cursorH = cursorTableHeight(doc, item.cursors, contentW);
  const tableH = cursorH + rangeTableHeight(item.ranges);
  const imgH = placePlot(item, margin, imgY, contentW, Math.max(40, footerY - 6 - imgY - statsH - tableH - 8));
  drawCursorTable(doc, item.cursors, margin, imgY + imgH + 2, contentW, item.xUnit);
  drawRangeTable(doc, item.ranges, margin, imgY + imgH + 2 + cursorH, contentW, item.xUnit);

  let y0 = imgY + imgH + 2 + tableH + 8;
  // Many cursors/signals can make the tables taller than estimated —
  // never let the Kennzahlen run off the page: continue on a new one.
  if (y0 + statsH > footerY - 4) {
    footer();
    doc.addPage();
    y0 = 20;
  }
  doc.setFontSize(13);
  doc.setTextColor(30);
  doc.text("Kennzahlen", margin, y0);
  y0 += 7;
  doc.setFontSize(10);
  doc.setTextColor(60);
  const statColW = contentW / statCols;
  statRows.forEach(([label, val, unit, decimals], i) => {
    const sx = margin + (i % statCols) * statColW;
    const sy = y0 + Math.floor(i / statCols) * 6;
    doc.text(`${label}:`, sx, sy);
    doc.text(`${val == null ? "-" : val.toFixed(decimals ?? 4)} ${unit || ""}`, sx + Math.min(statColW * 0.5, 45), sy);
  });

  footer();
  return doc;
}

async function doExportPdf(fullReport) {
  if (!sig.value) return;
  buildingPdf.value = true;
  try {
    // The single-signal report uses the live chart on the right, so the
    // PDF shows exactly that view: zoom, markers, cursors (+ their values).
    const live = exportChartRef.value;
    const doc = await buildReportPdf(sig.value, time.value, mtStore.fileName, {
      showMarkers: true,
      logoDataUrl: reportSettings.logoDataUrl,
      logoAspect: reportSettings.logoAspect,
      fields: exportFields.value.filter((f) => f.label.trim()),
      fullReport,
      orientation: pdfOrientation.value,
      renderChart: live?.renderForExport ? (size) => live.renderForExport(size) : null,
    });
    doc.save(exportFilename("pdf"));
    showToast("PDF heruntergeladen.");
  } catch (e) {
    console.error("[Export] PDF failed", e);
    showToast("PDF konnte nicht erstellt werden: " + (e?.message || e), { color: "error" });
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

async function doExportBatchZip(fullReport) {
  const series = mtStore.compareSeries;
  if (series.length === 0) return;
  buildingBatch.value = true;
  batchProgress.value = 0;
  try {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const usedNames = new Set();
    const fields = exportFields.value.filter((f) => f.label.trim());
    for (let i = 0; i < series.length; i++) {
      const s = series[i];
      const doc = await buildReportPdf(s.signal, s.time, s.fileName, {
        logoDataUrl: reportSettings.logoDataUrl,
        logoAspect: reportSettings.logoAspect,
        fields,
        fullReport,
        orientation: batchOrientation.value,
      });
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
    const zipBase = batchZipName.value.trim().replace(/[^\w.-]+/g, "_") || `messtool_batch_${Date.now()}`;
    downloadDataUrl(url, `${zipBase}.zip`);
    URL.revokeObjectURL(url);
    showToast(`${series.length} PDF(s) als ZIP heruntergeladen.`);
  } finally {
    buildingBatch.value = false;
  }
}
</script>

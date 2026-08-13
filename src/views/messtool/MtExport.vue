<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-file-export</v-icon>
      <h2 class="text-h5 font-weight-bold">Export</h2>
    
      <v-spacer></v-spacer>
      <HelpIconButton section="messtool-export" label="Export" />
    </div>
    <p class="text-medium-emphasis mb-6">Plot als Bild speichern oder PDF-Report erstellen</p>

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
              class="mb-3 w-100"
              color="primary"
              variant="outlined"
              prepend-icon="mdi-microsoft-excel"
              @click="exportAllSignalsExcel"
            >
              Alle Signale als Excel
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

            <div class="mt-4">
              <div class="d-flex align-center ga-2 mb-2">
                <img v-if="reportSettings.logoDataUrl" :src="reportSettings.logoDataUrl" alt="Logo" style="max-height: 24px; max-width: 80px" />
                <span class="text-caption text-medium-emphasis">
                  {{ reportSettings.logoDataUrl ? "Team-Logo wird auf jedem Report angezeigt." : "Kein Team-Logo hinterlegt (Admin → Report-Vorlage)." }}
                </span>
              </div>
              <div class="text-caption font-weight-medium mb-1">Zusätzliche Angaben für diesen Export</div>
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

          <v-card variant="outlined" rounded="lg" class="pa-4">
            <div class="d-flex align-center mb-2">
              <v-icon class="mr-2" size="20">mdi-archive-arrow-down-outline</v-icon>
              <span class="text-subtitle-1">Batch-Export</span>
            </div>
            <p class="text-caption text-medium-emphasis mb-3">
              Erstellt einen PDF-Report je Signal aus dem <strong>Anzeige</strong>-Bereich
              (auch mehrere je Datei) und packt alle in ein ZIP.
            </p>

            <template v-if="mtStore.compareSeries.length === 0">
              <v-alert type="info" variant="tonal" density="compact" class="text-caption">
                Noch keine Signale in der Anzeige ausgewählt. Füge welche auf der Anzeige-Seite hinzu.
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
              <v-text-field
                v-model="batchZipName"
                label="ZIP-Dateiname"
                variant="outlined"
                density="compact"
                hint="Ohne .zip — die Namen der einzelnen PDFs darin bleiben pro Signal eindeutig"
                persistent-hint
                class="mb-3"
              ></v-text-field>
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
            :disabled="!pngTitleInput.trim()"
            @click="doExportPng(false)"
          >
            Ohne Logo
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!pngTitleInput.trim()"
            @click="doExportPng(!!reportSettings.logoDataUrl)"
          >
            {{ reportSettings.logoDataUrl ? "Mit Logo" : "Exportieren" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showPdfScopeDialog" max-width="380">
      <v-card>
        <v-card-title class="text-subtitle-1">PDF exportieren</v-card-title>
        <v-card-text class="text-body-2 text-medium-emphasis">
          Vollständiger Report (Logo, Datei-/Signal-Angaben, Zusatzfelder, Kennzahlen)
          oder nur der Plot selbst?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="doExportPdf(false)">Nur Plot</v-btn>
          <v-btn color="primary" variant="flat" @click="doExportPdf(true)">Vollständiger Report</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showBatchScopeDialog" max-width="380">
      <v-card>
        <v-card-title class="text-subtitle-1">PDFs exportieren</v-card-title>
        <v-card-text class="text-body-2 text-medium-emphasis">
          Gilt für alle {{ mtStore.compareSeries.length }} PDFs im ZIP: vollständiger Report
          oder nur der jeweilige Plot?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="doExportBatchZip(false)">Nur Plot</v-btn>
          <v-btn color="primary" variant="flat" @click="doExportBatchZip(true)">Vollständiger Report</v-btn>
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
import { showToast } from "../../composables/useToast.js";
import { useSignalNavigationShortcuts } from "../../composables/useSignalNavigation.js";
import * as A from "../../utils/messtoolAnalysis.js";
import { downsample } from "../../utils/downsample.js";
import { buildLineChartSvg } from "../../utils/svgChart.js";
import { buildMultiSignalWorkbook, downloadWorkbook } from "../../utils/xlsxExport.js";
import ChartCard from "./ChartCard.vue";
import HelpIconButton from "../../components/HelpIconButton.vue";
import MtQuickNav from "./MtQuickNav.vue";

defineEmits(["navigate"]);

const mtStore = useMesstoolStore();
const reportSettings = useReportSettingsStore();

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
const batchProgress = ref(0);
const batchZipName = ref("messtool_batch");
const showPngDialog = ref(false);
const pngTitleInput = ref("");
const showPdfScopeDialog = ref(false);
const showBatchScopeDialog = ref(false);

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
  const wb = await buildMultiSignalWorkbook(mtStore.parsed.time, mtStore.parsed.signals);
  const base = customBaseName.value.trim() || (mtStore.fileName || "signale").replace(/[^\w.-]+/g, "_").replace(/\.csv$/i, "");
  await downloadWorkbook(wb, `${base}_alle_signale.xlsx`);
  showToast("Excel-Datei heruntergeladen.");
}

async function exportPng() {
  if (!sig.value) return;
  pngTitleInput.value = `${sig.value.name}${sig.value.unit ? ` [${sig.value.unit}]` : ""}`;
  showPngDialog.value = true;
}

async function doExportPng(withLogo) {
  if (!pngTitleInput.value.trim()) return; // required — the dialog's own button is disabled without it too, this is just the safety net
  showPngDialog.value = false;
  const chartDataUrl = await renderOffscreenChart(sig.value, time.value, 1800, 900, { showMarkers: true });
  const dataUrl = await composePngExport(chartDataUrl, {
    title: pngTitleInput.value.trim(),
    logoDataUrl: withLogo ? reportSettings.logoDataUrl : null,
    logoAspect: reportSettings.logoAspect,
  });
  downloadDataUrl(dataUrl, exportFilename("png"));
  showToast("PNG heruntergeladen.");
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
async function buildReportPdf(s, t, fileLabel, { showMarkers = false, logoDataUrl = null, logoAspect = null, fields = [], fullReport = true } = {}) {
  const imgData = await renderOffscreenChart(s, t, 1600, 800, { showMarkers });

  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;

  // "Nur Plot" — the chart, as large as the page allows, with just the
  // signal name as a minimal label. No logo, no header, no custom
  // fields, no Kennzahlen — genuinely just the plot, for when someone
  // wants to drop it straight into their own document instead of a
  // standalone report.
  if (!fullReport) {
    doc.setFontSize(12);
    doc.setTextColor(60);
    doc.text(`${s.name}${s.unit ? ` [${s.unit}]` : ""}`, margin, 18);
    const imgW = pageW - 2 * margin;
    const imgH = imgW * 0.6;
    doc.addImage(imgData, "PNG", margin, 24, imgW, imgH);
    return doc;
  }

  const y = s.data.filter((v) => v != null && Number.isFinite(v));
  const mm = A.minMax(y);
  const stats = {
    mean: A.mean(y), rms: A.rms(y), std: A.stddev(y),
    variance: A.variance(y), min: mm.min, max: mm.max,
  };

  // Logo top-right, if the team has one set (Admin → Report-Vorlage) —
  // fitted ("contain") within a max box using its real aspect ratio
  // instead of being stretched into a fixed box, and always re-encoded
  // to PNG at upload time (see AdminTab.vue) since jsPDF's addImage has
  // no real SVG support despite the uploader once accepting it.
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
  doc.text("Messtool – Analyse-Report", margin, 20);

  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text("Fachgruppe Antrieb", margin, 26);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Datei: ${fileLabel || "-"}`, margin, 33);
  doc.text(`Signal: ${s.name} [${s.unit || "-"}]`, margin, 39);
  doc.text(`Erstellt: ${new Date().toLocaleString("de-DE")}`, margin, 45);

  // Custom fields (Admin defaults + whatever was added/edited just for
  // this export) — two-column layout so a handful of short fields don't
  // push the chart image far down the page.
  let fieldsBottomY = 45;
  if (fields.length) {
    const colW = (pageW - 2 * margin) / 2;
    fields.forEach((f, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const fx = margin + col * colW;
      const fy = 53 + row * 6;
      doc.text(`${f.label}:`, fx, fy);
      doc.text(String(f.value ?? ""), fx + Math.min(colW * 0.4, 35), fy);
      fieldsBottomY = fy;
    });
    fieldsBottomY += 6;
  } else {
    fieldsBottomY = 49;
  }

  const imgY = Math.max(53, fieldsBottomY);
  const imgW = pageW - 2 * margin;
  const imgH = imgW * 0.5;
  doc.addImage(imgData, "PNG", margin, imgY, imgW, imgH);

  let y0 = imgY + imgH + 12;
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

function exportPdf() {
  if (!sig.value) return;
  showPdfScopeDialog.value = true;
}

async function doExportPdf(fullReport) {
  showPdfScopeDialog.value = false;
  buildingPdf.value = true;
  try {
    const doc = await buildReportPdf(sig.value, time.value, mtStore.fileName, {
      showMarkers: true,
      logoDataUrl: reportSettings.logoDataUrl,
      logoAspect: reportSettings.logoAspect,
      fields: exportFields.value.filter((f) => f.label.trim()),
      fullReport,
    });
    doc.save(exportFilename("pdf"));
    showToast("PDF heruntergeladen.");
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
  if (mtStore.compareSeries.length === 0) return;
  showBatchScopeDialog.value = true;
}

async function doExportBatchZip(fullReport) {
  showBatchScopeDialog.value = false;
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

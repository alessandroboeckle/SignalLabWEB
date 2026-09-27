// "Alle Plots der Anzeige als PDF" — used both on the Export page and
// directly on the Anzeige page. Renders every ChartCard registered under
// exportGroup "anzeige" (in on-screen order, with its current zoom and
// cursors) and assembles them into one PDF via buildChartsPdf().

import { ref, computed } from "vue";
import { useExportCharts } from "./useChartExportRegistry.js";
import { buildChartsPdf } from "../utils/chartsPdf.js";
import { useMesstoolStore } from "../stores/messtoolStore.js";
import { useReportSettingsStore } from "../stores/reportSettingsStore.js";

export function useAnzeigePdfExport() {
  const mtStore = useMesstoolStore();
  const reportSettings = useReportSettingsStore();
  const charts = useExportCharts("anzeige");
  const building = ref(false);
  const progress = ref(0);

  const chartCount = computed(() => charts.value.length);
  const cursorCount = computed(() => charts.value.reduce((n, c) => n + (c.cursorCount?.() || 0), 0));

  function defaultFileName() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `Anzeige_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  async function exportAnzeigePdf({ perPage = 1, fields = null, fileName = "" } = {}) {
    const list = charts.value;
    if (!list.length) return false;
    building.value = true;
    progress.value = 0;
    try {
      try { await reportSettings.load(); } catch { /* logo/fields are optional */ }
      // Logical px: ~1100 px across the page width keeps Chart.js' 11 px axis
      // labels at a readable ~7–8 pt on paper (1600 px made them tiny).
      const size = perPage === 1 ? { width: 1100, height: 520 } : { width: 1000, height: 430 };
      const items = [];
      for (let i = 0; i < list.length; i++) {
        items.push(await list[i].render(size));
        progress.value = Math.round(((i + 1) / (list.length + 1)) * 100);
        await new Promise((r) => setTimeout(r, 0)); // keep the UI responsive between plots
      }
      const files = mtStore.compareFiles.map((f) => f.name);
      const doc = await buildChartsPdf(items, {
        title: "Signal Lab – Anzeige",
        subtitle: files.length ? `Dateien: ${files.join(", ")}` : "",
        perPage,
        logoDataUrl: reportSettings.logoDataUrl,
        logoAspect: reportSettings.logoAspect,
        fields: fields ?? (reportSettings.defaultFields || []),
      });
      const name = (fileName || "").trim().replace(/\.pdf$/i, "") || defaultFileName();
      doc.save(`${name}.pdf`);
      progress.value = 100;
      return true;
    } finally {
      building.value = false;
    }
  }

  return { charts, chartCount, cursorCount, building, progress, exportAnzeigePdf, defaultFileName };
}

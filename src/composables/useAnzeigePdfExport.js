// "Alle Plots der Anzeige als PDF" — used both on the Export page and
// directly on the Anzeige page. Renders every ChartCard registered under
// exportGroup "anzeige" (in on-screen order, with its current zoom and
// cursors) and assembles them into one PDF via buildChartsPdf().

import { ref, computed } from "vue";
import { useExportCharts } from "./useChartExportRegistry.js";
import { buildChartsPdf } from "../utils/chartsPdf.js";
import { useMesstoolStore } from "../stores/messtoolStore.js";
import { useReportSettingsStore } from "../stores/reportSettingsStore.js";
import { useAuthStore } from "../stores/authStore.js";
import { usernameFromEmail } from "../utils/formatUsername.js";

export function useAnzeigePdfExport() {
  const mtStore = useMesstoolStore();
  const reportSettings = useReportSettingsStore();
  const auth = useAuthStore();
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

  async function exportAnzeigePdf({ perPage = 1, orientation = "landscape", fields = null, fileName = "" } = {}) {
    const list = charts.value;
    if (!list.length) return false;
    building.value = true;
    progress.value = 0;
    try {
      try { await reportSettings.load(); } catch { /* logo/fields are optional */ }
      const files = mtStore.compareFiles.map((f) => f.name);
      const doc = await buildChartsPdf(list, {
        title: "Signal Lab – Anzeige",
        subtitle: files.length ? `Dateien: ${files.join(", ")}` : "",
        perPage,
        orientation,
        logoDataUrl: reportSettings.logoDataUrl,
        logoAspect: reportSettings.logoAspect,
        fields: fields ?? (reportSettings.defaultFields || []),
        createdBy: usernameFromEmail(auth.user?.email),
        onProgress: (f) => { progress.value = Math.round(f * 100); },
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

<template>
  <div>
    <template v-if="chartCount === 0">
      <v-alert type="info" variant="tonal" density="compact" class="text-caption">
        Noch keine Plots in der Anzeige. Öffne die Anzeige-Seite und wähle Signale aus —
        danach lassen sich hier alle Plots gemeinsam exportieren.
      </v-alert>
      <v-btn
        v-if="showNavigate"
        class="mt-3"
        size="small"
        variant="tonal"
        color="primary"
        prepend-icon="mdi-chart-multiple"
        @click="$emit('navigate', 'mt-vergleich')"
      >
        Zur Anzeige
      </v-btn>
    </template>

    <div v-else :class="{ 'with-list': showList }">
      <div>
      <div class="summary-row mb-4">
        <div>
          <div class="summary-value">{{ chartCount }}</div>
          <div class="summary-caption">{{ chartCount === 1 ? "Plot" : "Plots" }}</div>
        </div>
        <div>
          <div class="summary-value">{{ cursorCount }}</div>
          <div class="summary-caption">Cursor</div>
        </div>
        <div>
          <div class="summary-value">{{ pageCount }}</div>
          <div class="summary-caption">{{ pageCount === 1 ? "Seite" : "Seiten" }}</div>
        </div>
      </div>

      <div class="popover-label">Ausrichtung</div>
      <OptionToggle v-model="orientation" :options="orientationOptions" fill class="mb-4" />

      <div class="popover-label">Plots pro Seite</div>
      <div class="d-flex align-center ga-3 mb-3">
        <div class="option-row option-row--tight flex-grow-1">
          <v-btn
            v-for="n in perPagePresets"
            :key="n"
            :variant="perPage === n ? 'flat' : 'outlined'"
            :color="perPage === n ? 'secondary' : undefined"
            class="option-btn option-btn--num"
            @click="perPage = n"
          >
            {{ n }}
          </v-btn>
        </div>
        <div class="stepper">
          <v-btn icon="mdi-minus" size="x-small" variant="text" :disabled="perPage <= 1" aria-label="Weniger Plots pro Seite" @click="perPage = clampPerPage(perPage - 1)"></v-btn>
          <input
            :value="perPage"
            type="number"
            min="1"
            max="12"
            class="stepper-input"
            aria-label="Plots pro Seite"
            @change="perPage = clampPerPage($event.target.value)"
          />
          <v-btn icon="mdi-plus" size="x-small" variant="text" :disabled="perPage >= 12" aria-label="Mehr Plots pro Seite" @click="perPage = clampPerPage(perPage + 1)"></v-btn>
        </div>
      </div>

      <!-- Mini page preview: shows orientation + where the plots go -->
      <div class="preview-wrap mb-4">
        <div class="page-preview" :class="orientation">
          <div class="page-head"></div>
          <div class="page-grid" :style="{ gridTemplateColumns: `repeat(${grid.cols}, 1fr)`, gridTemplateRows: `repeat(${grid.rows}, 1fr)` }">
            <div v-for="i in grid.n" :key="i" class="page-cell" :class="{ empty: i > chartCount }"></div>
          </div>
        </div>
        <div class="text-caption text-medium-emphasis">
          A4 {{ orientation === "landscape" ? "quer" : "hoch" }} ·
          {{ grid.cols === 2 ? `2 Spalten × ${grid.rows} Zeilen` : `${grid.rows} ${grid.rows === 1 ? "Plot" : "Plots"} untereinander` }}
        </div>
      </div>

      <div class="popover-label">Dateiname</div>
      <v-text-field
        v-model="fileName"
        :placeholder="defaultFileName()"
        persistent-placeholder
        suffix=".pdf"
        variant="outlined"
        density="compact"
        hide-details
        class="mb-2"
      ></v-text-field>
      <div class="popover-hint mb-4">
        Jeder Plot so wie er gerade angezeigt wird — mit Zoom, Markern und Cursor.
        Cursor-Werte und Differenzen stehen als Tabelle unter dem jeweiligen Plot.
      </div>

      <div class="export-footer">
        <ExportActionButton
          label="PDF exportieren"
          :sub="`${chartCount} ${chartCount === 1 ? 'Plot' : 'Plots'} · ${pageCount} ${pageCount === 1 ? 'Seite' : 'Seiten'}`"
          :loading="building"
          loading-text="PDF wird erstellt"
          :progress="progress"
          @click="run"
        />
      </div>
      </div>

      <div v-if="showList" class="plot-list">
        <div class="popover-label">Enthaltene Plots (Reihenfolge wie in der Anzeige)</div>
        <div v-for="(c, i) in charts" :key="c.id" class="plot-row">
          <span class="plot-index">{{ i + 1 }}</span>
          <span class="plot-title">{{ c.title() }}</span>
          <v-chip v-if="c.cursorCount?.()" size="x-small" variant="tonal" color="secondary" prepend-icon="mdi-ruler">
            {{ c.cursorCount() }} Cursor
          </v-chip>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { pdfGrid } from "../../utils/chartsPdf.js";
import OptionToggle from "../../components/OptionToggle.vue";
import ExportActionButton from "../../components/ExportActionButton.vue";
import { useAnzeigePdfExport } from "../../composables/useAnzeigePdfExport.js";
import { showToast } from "../../composables/useToast.js";

const props = defineProps({
  // Extra report fields (Export page's "Zusätzliche Angaben"); null =
  // the team defaults from Admin → Report-Vorlage.
  fields: { type: Array, default: null },
  showNavigate: { type: Boolean, default: false },
  // Export page: show the list of included plots next to the form.
  showList: { type: Boolean, default: false },
});
const emit = defineEmits(["navigate", "done"]);

const { charts, chartCount, cursorCount, building, progress, exportAnzeigePdf, defaultFileName } = useAnzeigePdfExport();
// Layout choice is remembered per browser.
const PREF_KEY = "signallab.anzeigePdf.layout";
function readPref() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || "{}"); } catch { return {}; }
}
const pref = readPref();
const orientationOptions = [
  { value: "portrait", label: "Hochformat", icon: "mdi-crop-portrait" },
  { value: "landscape", label: "Querformat", icon: "mdi-crop-landscape" },
];
const perPagePresets = [1, 2, 3, 4, 6];
function clampPerPage(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(12, Math.max(1, n)) : 1;
}
const orientation = ref(pref.orientation === "portrait" ? "portrait" : "landscape");
const perPage = ref(clampPerPage(pref.perPage ?? 1));
watch([orientation, perPage], () => {
  try { localStorage.setItem(PREF_KEY, JSON.stringify({ orientation: orientation.value, perPage: perPage.value })); } catch { /* ignore */ }
});
const grid = computed(() => pdfGrid(perPage.value, orientation.value));
const fileName = ref("");
const pageCount = computed(() => Math.max(1, Math.ceil(chartCount.value / perPage.value)));

async function run() {
  try {
    const ok = await exportAnzeigePdf({ perPage: perPage.value, orientation: orientation.value, fields: props.fields, fileName: fileName.value });
    if (ok) {
      showToast("PDF mit allen Anzeige-Plots heruntergeladen.");
      emit("done");
    }
  } catch (e) {
    console.error("[AnzeigePdfExport]", e);
    showToast("PDF konnte nicht erstellt werden: " + (e?.message || e), { color: "error" });
  }
}
</script>

<style scoped>
.option-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.option-row--tight {
  gap: 6px;
  flex-wrap: nowrap;
}
.option-btn {
  flex: 1 1 0;
  min-width: 0;
}
.option-btn--num {
  flex: 0 0 38px;
  min-width: 38px !important;
  padding: 0 !important;
}
.stepper {
  display: flex;
  align-items: center;
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: 8px;
  height: 36px;
  padding: 0 2px;
}
.stepper-input {
  width: 30px;
  text-align: center;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-weight: 600;
  color: inherit;
  background: transparent;
  border: none;
  outline: none;
  -moz-appearance: textfield;
}
.stepper-input::-webkit-outer-spin-button,
.stepper-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.preview-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
}
.page-preview {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 5px;
  border-radius: 3px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}
.page-preview.portrait {
  width: 50px;
  height: 70px;
}
.page-preview.landscape {
  width: 70px;
  height: 50px;
}
.page-head {
  height: 4px;
  width: 55%;
  border-radius: 1px;
  background: #94a3b8;
}
.page-grid {
  flex: 1 1 auto;
  display: grid;
  gap: 2px;
}
.page-cell {
  border-radius: 1px;
  background: rgb(var(--v-theme-primary));
  opacity: 0.75;
}
.page-cell.empty {
  opacity: 0.18;
}
.export-footer {
  margin: 4px -4px 0;
  padding-top: 14px;
  border-top: 1px solid rgba(var(--v-border-color), 0.15);
}
.with-list {
  display: grid;
  grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
  gap: 24px;
}
@media (max-width: 960px) {
  .with-list {
    grid-template-columns: 1fr;
  }
}
.plot-list {
  min-width: 0;
}
.plot-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 4px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}
.plot-index {
  flex: 0 0 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 600;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
}
.plot-title {
  flex: 1 1 auto;
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.summary-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.06);
  text-align: center;
}
.summary-value {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-weight: 600;
  font-size: 1rem;
}
.summary-caption {
  font-size: 0.7rem;
  opacity: 0.65;
}
</style>

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

      <div class="popover-label">Layout</div>
      <v-btn-toggle v-model="perPage" mandatory divided density="compact" color="primary" variant="outlined" class="mb-4 w-100">
        <v-btn :value="1" class="flex-grow-1" prepend-icon="mdi-crop-landscape">1 pro Seite</v-btn>
        <v-btn :value="2" class="flex-grow-1" prepend-icon="mdi-view-agenda-outline">2 pro Seite</v-btn>
      </v-btn-toggle>

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
        Die Cursor-Werte aller Signale stehen als Tabelle unter dem jeweiligen Plot.
      </div>

      <v-btn
        block
        color="primary"
        variant="flat"
        prepend-icon="mdi-file-pdf-box"
        :loading="building"
        @click="run"
      >
        {{ chartCount }} {{ chartCount === 1 ? "Plot" : "Plots" }} als PDF
        <template #loader>
          <v-progress-circular indeterminate size="18" width="2" class="mr-2"></v-progress-circular>
          {{ progress }} %
        </template>
      </v-btn>
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
import { ref, computed } from "vue";
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
const perPage = ref(1);
const fileName = ref("");
const pageCount = computed(() => Math.max(1, Math.ceil(chartCount.value / perPage.value)));

async function run() {
  try {
    const ok = await exportAnzeigePdf({ perPage: perPage.value, fields: props.fields, fileName: fileName.value });
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

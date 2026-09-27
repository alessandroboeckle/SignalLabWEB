<template>
  <div v-if="ranges.length" class="range-stats">
    <div v-for="r in ranges" :key="`${r.aLabel}-${r.bLabel}`" class="range-block">
      <div class="range-head">
        <v-icon size="14" class="mr-1">mdi-arrow-expand-horizontal</v-icon>
        <strong>Bereich {{ r.aLabel }}–{{ r.bLabel }}</strong>
        <span class="text-medium-emphasis ml-2 font-mono">
          {{ fmt(Math.min(r.a, r.b)) }} … {{ fmt(Math.max(r.a, r.b)) }} {{ xUnit }} · Δx = {{ fmt(r.dx) }} {{ xUnit }}
        </span>
      </div>
      <div class="range-table-wrap">
        <table class="range-table">
          <thead>
            <tr>
              <th class="text-left">Signal</th>
              <th>Mittel</th>
              <th>RMS</th>
              <th>Min</th>
              <th>Max</th>
              <th title="Spitze-Spitze (Max − Min)">Spitze-Spitze</th>
              <th title="Anzahl Messpunkte im Bereich">N</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in r.series" :key="s.dsIndex">
              <td class="text-left sig-cell">
                <span class="dot" :style="{ background: s.color }"></span>{{ s.label }}
              </td>
              <template v-if="s.n > 0">
                <td>{{ fmt(s.mean) }}</td>
                <td>{{ fmt(s.rms) }}</td>
                <td :title="`bei x = ${fmt(s.minAt)} ${xUnit}`">{{ fmt(s.min) }}</td>
                <td :title="`bei x = ${fmt(s.maxAt)} ${xUnit}`">{{ fmt(s.max) }}</td>
                <td>{{ fmt(s.pp) }}</td>
                <td>{{ s.n }}</td>
              </template>
              <td v-else colspan="6" class="text-disabled">keine Messpunkte im Bereich</td>
            </tr>
            <tr v-if="!r.series.length">
              <td colspan="7" class="text-disabled text-left">Keine auswertbaren Signale in diesem Plot.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div v-if="reduced" class="text-caption text-medium-emphasis mt-1">
      Punktreduktion aktiv — Werte aus den angezeigten Punkten. Für exakte Werte „Exakte Messpunkte“ einschalten.
    </div>
  </div>
</template>

<script setup>
import { formatCursorNumber } from "../../utils/chartsPdf.js";

defineProps({
  ranges: { type: Array, default: () => [] },
  xUnit: { type: String, default: "" },
  reduced: { type: Boolean, default: false },
});
const fmt = formatCursorNumber;
</script>

<style scoped>
.range-stats {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(128, 128, 128, 0.2);
}
.range-block + .range-block {
  margin-top: 8px;
}
.range-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  font-size: 0.78rem;
  margin-bottom: 4px;
}
.range-table-wrap {
  overflow-x: auto;
}
.range-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
  font-family: "JetBrains Mono", ui-monospace, monospace;
}
.range-table th {
  font-family: "Inter", system-ui, sans-serif;
  font-weight: 600;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.65;
  padding: 2px 8px;
  text-align: right;
  white-space: nowrap;
}
.range-table td {
  padding: 3px 8px;
  text-align: right;
  white-space: nowrap;
  border-top: 1px solid rgba(128, 128, 128, 0.12);
}
.range-table .text-left {
  text-align: left;
}
.sig-cell {
  font-family: "Inter", system-ui, sans-serif;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}
</style>

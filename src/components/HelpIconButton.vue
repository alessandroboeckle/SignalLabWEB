<template>
  <v-tooltip location="bottom">
    <template #activator="{ props: tooltipProps }">
      <v-btn
        size="small"
        variant="text"
        icon="mdi-help-circle-outline"
        :aria-label="`Hilfe zu ${label || 'dieser Seite'} öffnen`"
        v-bind="tooltipProps"
        @click="ui.openHelp(section)"
      ></v-btn>
    </template>
    Hilfe zu {{ label || "dieser Seite" }}
  </v-tooltip>
</template>

<script setup>
import { useUiStore } from "../stores/uiStore.js";

defineProps({
  // Matches a section "key" in HilfeTab.vue's sections array — clicking
  // switches to the Hilfe tab and expands + scrolls straight to it.
  section: { type: String, required: true },
  // Only used for the tooltip/aria-label text, e.g. "Filter".
  label: { type: String, default: "" },
});

const ui = useUiStore();
</script>

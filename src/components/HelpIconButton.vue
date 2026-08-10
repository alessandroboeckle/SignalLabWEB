<template>
  <v-btn
    size="small"
    variant="text"
    icon="mdi-help-circle-outline"
    :aria-label="`Hilfe zu ${label || 'dieser Seite'} öffnen`"
    @click="ui.openHelp(section)"
  >
    <v-icon>mdi-help-circle-outline</v-icon>
    <v-tooltip activator="parent" location="bottom">
      Hilfe zu {{ label || "dieser Seite" }}
    </v-tooltip>
  </v-btn>
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

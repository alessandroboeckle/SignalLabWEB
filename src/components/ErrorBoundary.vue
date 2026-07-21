<template>
  <template v-if="error">
    <v-container class="d-flex align-center justify-center" style="min-height: 70vh">
      <v-card variant="outlined" rounded="lg" max-width="480" class="pa-8 text-center">
        <v-icon size="64" color="error" class="mb-4">mdi-alert-circle-outline</v-icon>
        <h2 class="text-h6 font-weight-bold mb-2">Etwas ist schiefgelaufen</h2>
        <p class="text-medium-emphasis mb-6">
          Dieser Bereich der App ist auf einen unerwarteten Fehler gestossen. Deine Daten
          sind davon nicht betroffen — ein Neuladen behebt das meistens.
        </p>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-refresh" @click="reload">
          Seite neu laden
        </v-btn>
        <v-expansion-panels class="mt-6" variant="accordion">
          <v-expansion-panel title="Technische Details">
            <template #text>
              <pre class="text-caption text-left" style="white-space: pre-wrap">{{ errorDetails }}</pre>
            </template>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card>
    </v-container>
  </template>
  <slot v-else></slot>
</template>

<script setup>
import { ref, onErrorCaptured } from "vue";

const error = ref(null);
const errorDetails = ref("");

onErrorCaptured((err, instance, info) => {
  error.value = err;
  errorDetails.value = `${err?.message || err}\n\nKontext: ${info}`;
  // eslint-disable-next-line no-console
  console.error("[ErrorBoundary] caught:", err, info);
  return false; // stop propagation — contained here, not bubbling further
});

function reload() {
  window.location.reload();
}
</script>

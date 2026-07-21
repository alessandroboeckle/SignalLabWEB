<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <h2 class="text-h5 font-weight-bold mb-1">Einstellungen</h2>
        <p class="text-medium-emphasis mb-4">
          Gilt für die ganze App, ausser wo eigens als Generator-Tool-spezifisch markiert.
        </p>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-card class="elevation-2">
          <v-card-title>Darstellung</v-card-title>
          <v-card-text>
            <div class="mb-2">
              <label class="text-caption font-weight-500 mb-2 d-block">Theme</label>
              <v-btn-toggle v-model="settings.theme" group class="w-100">
                <v-btn value="light" class="flex-grow-1">
                  <v-icon start size="small">mdi-white-balance-sunny</v-icon>
                  Hell
                </v-btn>
                <v-btn value="dark" class="flex-grow-1">
                  <v-icon start size="small">mdi-moon-waning-crescent</v-icon>
                  Dunkel
                </v-btn>
              </v-btn-toggle>
              <p class="text-caption text-medium-emphasis mt-2">
                Dasselbe Theme wie über das Symbol oben in der Kopfzeile — beide steuern denselben Schalter.
              </p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="elevation-2">
          <v-card-title class="d-flex align-center ga-2">
            Signalverarbeitung
            <v-chip size="x-small" variant="tonal" color="secondary">Generator-Tool</v-chip>
          </v-card-title>
          <v-card-text>
            <div class="mb-4">
              <v-checkbox
                v-model="settings.autoFFT"
                label="FFT standardmässig aktivieren"
                density="comfortable"
                hide-details
              ></v-checkbox>
            </div>

            <v-select
              v-model="settings.windowFunction"
              label="Standard-Fensterfunktion"
              :items="windowFunctions"
              variant="outlined"
              density="comfortable"
              class="mb-4"
            ></v-select>

            <div class="mb-2">
              <v-checkbox
                v-model="settings.gridEnabled"
                label="Gitter in Diagrammen anzeigen"
                density="comfortable"
                hide-details
              ></v-checkbox>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <v-card class="elevation-2">
          <v-card-title class="d-flex align-center ga-2">
            Speicher & Daten
            <v-chip size="x-small" variant="tonal" color="secondary">Generator-Tool</v-chip>
          </v-card-title>
          <v-card-text>
            <p class="text-caption text-medium-emphasis mb-3">
              Betrifft nur die lokal im Browser gespeicherten Generator-Sessions und -Signale —
              nicht die Messtool-Dateien und -Sessions in der Cloud.
            </p>
            <div class="mb-4">
              <div class="text-caption text-disabled">Speichernutzung</div>
              <div class="text-body-2 mb-2">{{ storageInfo.storageUsage }}</div>
              <div class="text-caption mb-3">
                {{ storageInfo.sessionCount }} Sessions,
                {{ storageInfo.signalCount }} Signale
              </div>
              <v-progress-linear
                :model-value="storagePercentage"
                :color="storageColor"
                class="mb-4"
              ></v-progress-linear>
            </div>

            <v-btn
              block
              color="warning"
              class="mb-2"
              prepend-icon="mdi-download"
              @click="exportAllData"
            >
              Generator-Daten exportieren
            </v-btn>

            <v-btn
              block
              color="error"
              variant="outlined"
              prepend-icon="mdi-delete"
              @click="showClearDialog = true"
            >
              Generator-Daten löschen
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="elevation-2">
          <v-card-title>Über</v-card-title>
          <v-card-text>
            <div class="mb-4">
              <div class="text-caption text-disabled">Anwendung</div>
              <div class="text-body-2">Signal Lab</div>
            </div>

            <div class="mb-4">
              <div class="text-caption text-disabled">Version</div>
              <div class="text-body-2">1.0.0</div>
            </div>

            <div class="mb-4">
              <div class="text-caption text-disabled">Stand</div>
              <div class="text-body-2">{{ currentDate }}</div>
            </div>

            <div class="mb-4">
              <div class="text-caption text-disabled">Gebaut mit</div>
              <div class="text-caption">Vue 3 • Vuetify • Chart.js • Supabase</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12">
        <v-card class="elevation-2">
          <v-card-title>Tastatur-Kürzel</v-card-title>
          <v-card-text>
            <v-table density="comfortable">
              <thead>
                <tr>
                  <th>Kürzel</th>
                  <th>Wirkung</th>
                  <th>Gilt auf</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><kbd>↑</kbd> / <kbd>↓</kbd></td>
                  <td>Durchs Signal blättern</td>
                  <td>Messtool: Analyse, Filter, Verarbeitung, Export</td>
                </tr>
                <tr>
                  <td><kbd>Strg</kbd> + <kbd>Z</kbd></td>
                  <td>Verarbeitungsschritt rückgängig</td>
                  <td>Messtool: Verarbeitung</td>
                </tr>
                <tr>
                  <td><kbd>Strg</kbd> + <kbd>Y</kbd></td>
                  <td>Verarbeitungsschritt wiederholen</td>
                  <td>Messtool: Verarbeitung</td>
                </tr>
                <tr>
                  <td><kbd>Umschalt</kbd> + Ziehen</td>
                  <td>Chart verschieben (pan)</td>
                  <td>Messtool: alle Diagramme</td>
                </tr>
                <tr>
                  <td>Mausrad</td>
                  <td>Chart zoomen</td>
                  <td>Messtool: alle Diagramme</td>
                </tr>
                <tr>
                  <td>Rechteck ziehen</td>
                  <td>In Bereich hineinzoomen</td>
                  <td>Messtool: alle Diagramme</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Clear Data Confirmation Dialog -->
    <v-dialog v-model="showClearDialog" max-width="420">
      <v-card>
        <v-card-title>Generator-Daten löschen?</v-card-title>
        <v-card-text>
          Löscht dauerhaft alle lokal gespeicherten Generator-Sessions und -Signale. Das kann
          nicht rückgängig gemacht werden. Deine Messtool-Dateien und -Sessions in der Cloud
          sind davon nicht betroffen.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showClearDialog = false">Abbrechen</v-btn>
          <v-btn color="error" @click="clearAllData">Löschen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSnackbar" color="success" :timeout="2500">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, reactive, watch } from "vue";
import { useTheme } from "vuetify";
import { useSignalStore } from "../stores/signalStore";
import * as storage from "../utils/storage";

const theme = useTheme();
const store = useSignalStore();

const showClearDialog = ref(false);
const showSnackbar = ref(false);
const snackbarMessage = ref("");

const settings = reactive({
  theme: store.settings.theme,
  autoFFT: store.settings.autoFFT,
  windowFunction: store.settings.windowFunction,
  gridEnabled: store.settings.gridEnabled,
});

const windowFunctions = ["none", "hann", "hamming", "blackman"];

const currentDate = computed(() => new Date().toLocaleDateString("de-DE"));

const storageInfo = computed(() => storage.getStorageInfo());

const storagePercentage = computed(() => {
  // Assume 5MB limit
  const usage = parseFloat(storageInfo.value.storageUsage);
  return Math.min((usage / 5000) * 100, 100);
});

const storageColor = computed(() => {
  const percentage = storagePercentage.value;
  if (percentage > 80) return "error";
  if (percentage > 50) return "warning";
  return "success";
});

function exportAllData() {
  const data = {
    sessions: storage.loadAllSessions(),
    signals: storage.loadAllSignals(),
    exportDate: new Date().toISOString(),
  };

  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `signal-lab-backup-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  snackbarMessage.value = "Generator-Daten exportiert.";
  showSnackbar.value = true;
}

async function clearAllData() {
  try {
    await store.clearAllData();
    snackbarMessage.value = "Generator-Daten gelöscht.";
  } catch (e) {
    snackbarMessage.value = "Fehler: " + (e.message || e);
  }
  showClearDialog.value = false;
  showSnackbar.value = true;
}

// Watch for changes and update theme
watch(
  () => settings.theme,
  (newTheme) => {
    theme.global.name.value = newTheme === "dark" ? "dark" : "light";
    store.updateSettings({ theme: newTheme });
  },
);

watch(
  () => settings.autoFFT,
  (val) => store.updateSettings({ autoFFT: val }),
);

watch(
  () => settings.windowFunction,
  (val) => store.updateSettings({ windowFunction: val }),
);

watch(
  () => settings.gridEnabled,
  (val) => store.updateSettings({ gridEnabled: val }),
);
</script>

<style scoped>
kbd {
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 2px 6px;
  font-family: monospace;
  font-size: 0.875rem;
  display: inline-block;
  margin: 0 2px;
}

:deep(.dark) kbd {
  background-color: #374151;
  border-color: #4b5563;
}

:deep(tbody tr:nth-child(odd)) {
  background-color: rgba(0, 0, 0, 0.02);
}

:deep(.dark tbody tr:nth-child(odd)) {
  background-color: rgba(255, 255, 255, 0.05);
}
</style>

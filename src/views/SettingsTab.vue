<template>
  <v-container fluid class="pa-4 pa-md-6 settings-page">
    <div class="d-flex align-center ga-3 mb-1">
      <v-icon size="28" color="primary">mdi-cog</v-icon>
      <h2 class="text-h5 font-weight-bold">Einstellungen</h2>
    </div>
    <p class="text-medium-emphasis mb-6">
      Gilt für die ganze App, ausser wo eigens als <v-chip size="x-small" variant="tonal" color="secondary">Generator-Tool</v-chip> markiert.
    </p>

    <v-row>
      <!-- Account -->
      <v-col cols="12" md="6">
        <v-card class="settings-card" variant="outlined" rounded="lg">
          <v-card-title class="d-flex align-center ga-2">
            <v-icon size="20">mdi-account-circle-outline</v-icon>
            Account
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <div class="d-flex align-center ga-3 mb-4">
              <v-avatar color="primary" size="44">
                <span class="text-h6">{{ (auth.user?.email || "?")[0].toUpperCase() }}</span>
              </v-avatar>
              <div>
                <div class="font-weight-medium">{{ auth.user?.email }}</div>
                <v-chip v-if="auth.isAdmin" size="x-small" color="primary" variant="tonal" class="mt-1">
                  Admin
                </v-chip>
              </div>
            </div>
            <v-btn variant="outlined" color="error" prepend-icon="mdi-logout" @click="auth.signOut()">
              Abmelden
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Darstellung -->
      <v-col cols="12" md="6">
        <v-card class="settings-card" variant="outlined" rounded="lg">
          <v-card-title class="d-flex align-center ga-2">
            <v-icon size="20">mdi-palette-outline</v-icon>
            Darstellung
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <label class="text-caption font-weight-500 mb-2 d-block">Theme</label>
            <v-btn-toggle v-model="settings.theme" color="primary" mandatory class="w-100" divided>
              <v-btn value="light" class="flex-grow-1">
                <v-icon start size="small">mdi-white-balance-sunny</v-icon>
                Hell
              </v-btn>
              <v-btn value="dark" class="flex-grow-1">
                <v-icon start size="small">mdi-moon-waning-crescent</v-icon>
                Dunkel
              </v-btn>
            </v-btn-toggle>
            <p class="text-caption text-medium-emphasis mt-3 mb-0">
              Dasselbe Theme wie über das Symbol oben in der Kopfzeile — beide steuern denselben Schalter.
            </p>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Messtool: Signal-Gruppen -->
      <v-col cols="12" md="6">
        <v-card class="settings-card" variant="outlined" rounded="lg">
          <v-card-title class="d-flex align-center ga-2">
            <v-icon size="20">mdi-folder-star-outline</v-icon>
            Signal-Gruppen
            <v-chip size="x-small" variant="tonal" color="primary">Messtool</v-chip>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <p class="text-caption text-medium-emphasis mb-3">
              Gespeicherte Signal-Auswahlen aus der Anzeige-Seite (z.B. "alle 4 Radsatz-Temperaturen").
              Hier zentral einsehen und aufräumen.
            </p>
            <v-list v-if="signalGroups.length" density="compact" class="pa-0">
              <v-list-item
                v-for="g in signalGroups"
                :key="g.name"
                :title="g.name"
                :subtitle="`${g.signalNames.length} Signal(e)`"
              >
                <template #append>
                  <v-btn size="small" variant="text" color="error" icon="mdi-delete" :aria-label="`${g.name} löschen`" @click="removeGroup(g.name)"></v-btn>
                </template>
              </v-list-item>
            </v-list>
            <p v-else class="text-medium-emphasis text-center pa-4 mb-0">
              Noch keine Signal-Gruppen gespeichert.
            </p>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Signalverarbeitung (Generator-Tool) -->
      <v-col cols="12" md="6">
        <v-card class="settings-card" variant="outlined" rounded="lg">
          <v-card-title class="d-flex align-center ga-2">
            <v-icon size="20">mdi-sine-wave</v-icon>
            Signalverarbeitung
            <v-chip size="x-small" variant="tonal" color="secondary">Generator-Tool</v-chip>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-checkbox
              v-model="settings.autoFFT"
              label="FFT standardmässig aktivieren"
              density="comfortable"
              hide-details
              class="mb-2"
            ></v-checkbox>

            <v-select
              v-model="settings.windowFunction"
              label="Standard-Fensterfunktion"
              :items="windowFunctionOptions"
              variant="outlined"
              density="comfortable"
              class="mb-2 mt-2"
            ></v-select>

            <v-checkbox
              v-model="settings.gridEnabled"
              label="Gitter in Diagrammen anzeigen"
              density="comfortable"
              hide-details
            ></v-checkbox>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Speicher & Daten (Generator-Tool) -->
      <v-col cols="12" md="6">
        <v-card class="settings-card" variant="outlined" rounded="lg">
          <v-card-title class="d-flex align-center ga-2">
            <v-icon size="20">mdi-database-outline</v-icon>
            Speicher & Daten
            <v-chip size="x-small" variant="tonal" color="secondary">Generator-Tool</v-chip>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <p class="text-caption text-medium-emphasis mb-3">
              Nur die Generator-Sessions und -Signale — nicht die Messtool-Dateien und -Sessions in der Cloud.
            </p>
            <v-row dense class="mb-2">
              <v-col cols="6">
                <div class="text-h5 font-weight-bold">{{ storageInfo.sessionCount }}</div>
                <div class="text-caption text-medium-emphasis">Sessions</div>
              </v-col>
              <v-col cols="6">
                <div class="text-h5 font-weight-bold">{{ storageInfo.signalCount }}</div>
                <div class="text-caption text-medium-emphasis">Signale</div>
              </v-col>
            </v-row>
            <p class="text-caption text-medium-emphasis mb-4">
              Datenumfang: {{ storageInfo.storageUsage }}
            </p>

            <v-btn block color="warning" variant="tonal" class="mb-2" prepend-icon="mdi-download" @click="exportAllData">
              Generator-Daten exportieren
            </v-btn>
            <v-btn block color="error" variant="outlined" prepend-icon="mdi-delete" @click="showClearDialog = true">
              Generator-Daten löschen
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Über -->
      <v-col cols="12" md="6">
        <v-card class="settings-card" variant="outlined" rounded="lg">
          <v-card-title class="d-flex align-center ga-2">
            <v-icon size="20">mdi-information-outline</v-icon>
            Über
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-row dense>
              <v-col cols="6">
                <div class="text-caption text-disabled">Anwendung</div>
                <div class="text-body-2 mb-3">Signal Lab</div>
                <div class="text-caption text-disabled">Version</div>
                <div class="text-body-2">1.0.0</div>
              </v-col>
              <v-col cols="6">
                <div class="text-caption text-disabled">Stand</div>
                <div class="text-body-2 mb-3">{{ currentDate }}</div>
                <div class="text-caption text-disabled">Gebaut mit</div>
                <div class="text-caption">Vue 3 · Vuetify · Chart.js · Supabase</div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Tastatur-Kürzel -->
      <v-col cols="12">
        <v-card class="settings-card" variant="outlined" rounded="lg">
          <v-card-title class="d-flex align-center ga-2">
            <v-icon size="20">mdi-keyboard-outline</v-icon>
            Tastatur-Kürzel
          </v-card-title>
          <v-divider></v-divider>
          <v-table density="comfortable">
            <thead>
              <tr>
                <th>Kürzel</th>
                <th>Wirkung</th>
                <th>Gilt auf</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in shortcuts" :key="row.effect">
                <td class="py-2">
                  <span v-for="(k, i) in row.keys" :key="i" class="d-inline-flex align-center">
                    <kbd class="key-badge">
                      <v-icon v-if="k.icon" size="14">{{ k.icon }}</v-icon>
                      <span v-else>{{ k.text }}</span>
                    </kbd>
                    <span v-if="i < row.keys.length - 1" class="mx-1 text-medium-emphasis">{{ row.keySep || "+" }}</span>
                  </span>
                </td>
                <td>{{ row.effect }}</td>
                <td class="text-medium-emphasis">{{ row.scope }}</td>
              </tr>
            </tbody>
          </v-table>
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

    <v-snackbar v-model="showSnackbar" color="success" :timeout="2500">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, reactive, watch } from "vue";
import { useTheme } from "vuetify";
import { useSignalStore } from "../stores/signalStore";
import { useAuthStore } from "../stores/authStore";
import * as storage from "../utils/storage";
import * as groupsApi from "../utils/messtoolSignalGroups.js";
import { keyboardShortcuts as shortcuts } from "../utils/keyboardShortcuts.js";

const theme = useTheme();
const store = useSignalStore();
const auth = useAuthStore();

const showClearDialog = ref(false);
const showSnackbar = ref(false);
const snackbarMessage = ref("");

const settings = reactive({
  theme: store.settings.theme,
  autoFFT: store.settings.autoFFT,
  windowFunction: store.settings.windowFunction,
  gridEnabled: store.settings.gridEnabled,
});

const windowFunctionOptions = [
  { title: "Keine", value: "none" },
  { title: "Hann", value: "hann" },
  { title: "Hamming", value: "hamming" },
  { title: "Blackman", value: "blackman" },
];

const currentDate = computed(() => new Date().toLocaleDateString("de-DE"));
const storageInfo = computed(() => storage.getStorageInfo());

const signalGroups = ref(groupsApi.listGroups());
function removeGroup(name) {
  signalGroups.value = groupsApi.deleteGroup(name);
}

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
.settings-page {
  max-width: 1200px;
  margin: 0 auto;
}
.settings-card {
  height: 100%;
}
.key-badge {
  background-color: rgba(var(--v-theme-on-surface), 0.06);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.18);
  border-radius: 5px;
  padding: 3px 7px;
  font-family: monospace;
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  min-width: 24px;
  justify-content: center;
}
</style>

<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <h2 class="text-h5 font-weight-bold mb-4">Settings</h2>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-card class="elevation-2">
          <v-card-title>Appearance</v-card-title>
          <v-card-text>
            <!-- Theme Selection -->
            <div class="mb-6">
              <label class="text-caption font-weight-500 mb-2 d-block">Theme</label>
              <v-btn-toggle v-model="settings.theme" group class="w-100">
                <v-btn value="light" class="flex-grow-1">
                  <v-icon left small>mdi-white-balance-sunny</v-icon>
                  Light
                </v-btn>
                <v-btn value="dark" class="flex-grow-1">
                  <v-icon left small>mdi-moon-waning-crescent</v-icon>
                  Dark
                </v-btn>
              </v-btn-toggle>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="elevation-2">
          <v-card-title>Signal Processing</v-card-title>
          <v-card-text>
            <!-- Auto FFT -->
            <div class="mb-4">
              <v-checkbox
                v-model="settings.autoFFT"
                label="Enable FFT by default"
              ></v-checkbox>
            </div>

            <!-- Window Function -->
            <v-select
              v-model="settings.windowFunction"
              label="Default Window Function"
              :items="windowFunctions"
              outlined
              dense
              class="mb-4"
            ></v-select>

            <!-- Grid -->
            <div class="mb-4">
              <v-checkbox
                v-model="settings.gridEnabled"
                label="Show grid in plots"
              ></v-checkbox>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <v-card class="elevation-2">
          <v-card-title>Storage & Data</v-card-title>
          <v-card-text>
            <div class="mb-4">
              <div class="text-caption text-disabled">Storage Usage</div>
              <div class="text-body2 mb-2">{{ storageInfo.storageUsage }}</div>
              <div class="text-caption mb-3">
                {{ storageInfo.sessionCount }} sessions, {{ storageInfo.signalCount }} signals
              </div>
              <v-progress-linear
                :value="storagePercentage"
                :color="storageColor"
                class="mb-4"
              ></v-progress-linear>
            </div>

            <v-btn
              block
              color="warning"
              class="mb-2"
              @click="exportAllData"
              prepend-icon="mdi-download"
            >
              Export All Data
            </v-btn>

            <v-btn
              block
              color="error"
              variant="outlined"
              @click="showClearDialog = true"
              prepend-icon="mdi-delete"
            >
              Clear All Data
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="elevation-2">
          <v-card-title>About</v-card-title>
          <v-card-text>
            <div class="mb-4">
              <div class="text-caption text-disabled">Application</div>
              <div class="text-body2">Signal Lab v1.0</div>
            </div>

            <div class="mb-4">
              <div class="text-caption text-disabled">Version</div>
              <div class="text-body2">1.0.0</div>
            </div>

            <div class="mb-4">
              <div class="text-caption text-disabled">Last Updated</div>
              <div class="text-body2">{{ currentDate }}</div>
            </div>

            <div class="mb-4">
              <div class="text-caption text-disabled">Built with</div>
              <div class="text-caption">Vue 3 • Vuetify • Chart.js</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12">
        <v-card class="elevation-2">
          <v-card-title>Keyboard Shortcuts</v-card-title>
          <v-card-text>
            <v-table>
              <tbody>
                <tr>
                  <td><kbd>Ctrl/Cmd</kbd> + <kbd>S</kbd></td>
                  <td>Save signal</td>
                </tr>
                <tr>
                  <td><kbd>Ctrl/Cmd</kbd> + <kbd>E</kbd></td>
                  <td>Export signal</td>
                </tr>
                <tr>
                  <td><kbd>Ctrl/Cmd</kbd> + <kbd>N</kbd></td>
                  <td>New session</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Clear Data Confirmation Dialog -->
    <v-dialog v-model="showClearDialog" max-width="400">
      <v-card>
        <v-card-title>Clear All Data?</v-card-title>
        <v-card-text>
          This will permanently delete all sessions, signals, and settings. This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showClearDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="clearAllData">Clear All</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSnackbar" color="success" :timeout="2000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useTheme } from 'vuetify'
import { useSignalStore } from '../stores/signalStore'
import * as storage from '../utils/storage'

const theme = useTheme()
const store = useSignalStore()

const showClearDialog = ref(false)
const showSnackbar = ref(false)
const snackbarMessage = ref('')

const settings = reactive({
  theme: store.settings.theme,
  autoFFT: store.settings.autoFFT,
  windowFunction: store.settings.windowFunction,
  gridEnabled: store.settings.gridEnabled
})

const windowFunctions = ['none', 'hann', 'hamming', 'blackman']

const currentDate = computed(() => {
  return new Date().toLocaleDateString()
})

const storageInfo = computed(() => {
  return storage.getStorageInfo()
})

const storagePercentage = computed(() => {
  // Assume 5MB limit
  const usage = parseFloat(storageInfo.value.storageUsage)
  return Math.min((usage / 5000) * 100, 100)
})

const storageColor = computed(() => {
  const percentage = storagePercentage.value
  if (percentage > 80) return 'error'
  if (percentage > 50) return 'warning'
  return 'success'
})

function exportAllData() {
  const data = {
    sessions: storage.loadAllSessions(),
    signals: storage.loadAllSignals(),
    exportDate: new Date().toISOString()
  }

  const dataStr = JSON.stringify(data, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `signal-lab-backup-${Date.now()}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  snackbarMessage.value = 'Data exported successfully!'
  showSnackbar.value = true
}

function clearAllData() {
  store.clearAllData()
  showClearDialog.value = false
  snackbarMessage.value = 'All data cleared!'
  showSnackbar.value = true
}

// Watch for changes and update theme
watch(() => settings.theme, (newTheme) => {
  theme.global.name.value = newTheme === 'dark' ? 'dark' : 'light'
  store.updateSettings({ theme: newTheme })
})

// Watch for other settings changes
watch(() => settings.autoFFT, (val) => {
  store.updateSettings({ autoFFT: val })
})

watch(() => settings.windowFunction, (val) => {
  store.updateSettings({ windowFunction: val })
})

watch(() => settings.gridEnabled, (val) => {
  store.updateSettings({ gridEnabled: val })
})
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

<template>
  <v-dialog v-model="isOpen" max-width="500" persistent>
    <v-card class="export-dialog">
      <!-- Header -->
      <div class="export-header">
        <v-icon size="32" color="primary">mdi-download</v-icon>
        <h2 class="text-h5 font-weight-bold ml-3">Export Data</h2>
      </div>

      <!-- Content -->
      <v-card-text class="pa-6">
        <!-- Export Type Selection -->
        <div class="mb-6">
          <label class="text-subtitle2 font-weight-600 mb-3 d-block"
            >What to Export</label
          >
          <v-radio-group v-model="exportType" class="mt-2">
            <v-radio
              label="Current Signal"
              value="single"
              class="mb-3"
            ></v-radio>
            <v-radio
              label="All Signals in Session"
              value="session"
              class="mb-3"
            ></v-radio>
            <v-radio label="All Data" value="all"></v-radio>
          </v-radio-group>
        </div>

        <v-divider class="my-6"></v-divider>

        <!-- Format Selection -->
        <div class="mb-6">
          <label class="text-subtitle2 font-weight-600 mb-3 d-block"
            >File Format</label
          >
          <v-radio-group v-model="fileFormat" class="mt-2">
            <v-radio
              label="JSON (includes metadata)"
              value="json"
              class="mb-3"
            ></v-radio>
            <v-radio label="CSV (spreadsheet format)" value="csv"></v-radio>
          </v-radio-group>
        </div>

        <!-- Info Box -->
        <v-alert
          variant="tonal"
          type="info"
          color="info"
          icon="mdi-information-outline"
          class="mt-6"
          dense
        >
          <div class="text-caption">
            <strong>Format info:</strong>
            {{ formatInfo }}
          </div>
        </v-alert>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4 gap-2">
        <v-spacer></v-spacer>
        <v-btn variant="outlined" @click="closeDialog" color="default">
          Cancel
        </v-btn>
        <v-btn
          variant="flat"
          color="primary"
          @click="handleExport"
          :loading="isLoading"
        >
          <v-icon left>mdi-download</v-icon>
          Export
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Success Notification -->
  <v-snackbar v-model="showSuccess" color="success" :timeout="3000">
    <div class="d-flex align-center gap-2">
      <v-icon>mdi-check-circle</v-icon>
      <span>{{ successMessage }}</span>
    </div>
  </v-snackbar>

  <!-- Error Notification -->
  <v-snackbar v-model="showError" color="error" :timeout="4000">
    <div class="d-flex align-center gap-2">
      <v-icon>mdi-alert-circle</v-icon>
      <span>{{ errorMessage }}</span>
    </div>
  </v-snackbar>
</template>

<script setup>
import { ref, computed } from "vue";
import { useSignalStore } from "../stores/signalStore";
import * as storage from "../utils/storage";
import * as exportUtils from "../utils/export";

const emit = defineEmits(["close", "success"]);

const store = useSignalStore();

const isOpen = ref(false);
const isLoading = ref(false);
const exportType = ref("single");
const fileFormat = ref("json");
const showSuccess = ref(false);
const showError = ref(false);
const successMessage = ref("");
const errorMessage = ref("");

const formatInfo = computed(() => {
  if (fileFormat.value === "json") {
    return "JSON includes all metadata and parameters. Best for archiving complete signal data.";
  } else {
    return "CSV is compatible with Excel/spreadsheets. Contains time and amplitude columns.";
  }
});

function openDialog() {
  isOpen.value = true;
  exportType.value = "single";
  fileFormat.value = "json";
}

function closeDialog() {
  isOpen.value = false;
}

async function handleExport() {
  isLoading.value = true;

  try {
    let success = false;
    let message = "";

    if (exportType.value === "single") {
      if (
        !store.currentSignal.timeData ||
        store.currentSignal.timeData.length === 0
      ) {
        throw new Error("No signal data to export. Generate a signal first.");
      }

      if (fileFormat.value === "json") {
        success = exportUtils.exportSignalAsJSON(store.currentSignal);
        message = `Signal "${store.currentSignal.name}" exported as JSON`;
      } else {
        success = exportUtils.exportSignalAsCSV(store.currentSignal);
        message = `Signal "${store.currentSignal.name}" exported as CSV`;
      }
    } else if (exportType.value === "session") {
      const signals = storage.loadSessionSignals(store.currentSession.id);

      if (signals.length === 0) {
        throw new Error("No signals in this session to export.");
      }

      if (fileFormat.value === "json") {
        success = exportUtils.exportSessionAsJSON(
          store.currentSession,
          signals,
        );
        message = `Session "${store.currentSession.name}" with ${signals.length} signal(s) exported`;
      } else {
        success = exportUtils.exportMultipleSignalsAsCSV(signals);
        message = `${signals.length} signal(s) from session exported as CSV`;
      }
    } else if (exportType.value === "all") {
      const sessions = storage.loadAllSessions();
      const signals = storage.loadAllSignals();

      if (sessions.length === 0 && signals.length === 0) {
        throw new Error("No data to export.");
      }

      if (fileFormat.value === "json") {
        success = exportUtils.exportAllDataAsJSON(sessions, signals);
        message = `All data (${sessions.length} sessions, ${signals.length} signals) exported`;
      } else {
        success = exportUtils.exportMultipleSignalsAsCSV(signals);
        message = `All ${signals.length} signals exported as CSV`;
      }
    }

    if (success) {
      successMessage.value = message;
      showSuccess.value = true;
      emit("success");

      setTimeout(() => {
        closeDialog();
      }, 500);
    } else {
      throw new Error("Export failed. Check browser console for details.");
    }
  } catch (error) {
    errorMessage.value = error.message || "Export failed unexpectedly";
    showError.value = true;
    console.error("Export error:", error);
  } finally {
    isLoading.value = false;
  }
}

defineExpose({
  openDialog,
  closeDialog,
});
</script>

<style scoped>
.export-dialog {
  border-radius: 12px;
}

.export-header {
  display: flex;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(
    135deg,
    rgba(37, 99, 235, 0.05) 0%,
    rgba(100, 116, 139, 0.05) 100%
  );
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.dark .export-header {
  background: linear-gradient(
    135deg,
    rgba(37, 99, 235, 0.1) 0%,
    rgba(100, 116, 139, 0.1) 100%
  );
  border-bottom-color: rgba(255, 255, 255, 0.1);
}
</style>

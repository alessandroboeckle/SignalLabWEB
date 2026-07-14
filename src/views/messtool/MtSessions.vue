<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-content-save-cog-outline</v-icon>
      <h2 class="text-h5 font-weight-bold">Sessions</h2>
    </div>
    <p class="text-medium-emphasis mb-6">
      Deinen aktuellen Arbeitsstand (Datei + Verarbeitung + Filter + gewähltes Signal) benannt
      speichern und später — auch geräteübergreifend oder mit Kollegen geteilt — wieder laden.
    </p>

    <!-- Save current state -->
    <v-card variant="outlined" rounded="lg" class="mb-6">
      <v-card-title class="text-subtitle-1 d-flex align-center">
        <v-icon class="mr-2" size="20">mdi-content-save-outline</v-icon>
        Aktuellen Zustand speichern
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <template v-if="!mtStore.parsed">
          <v-alert type="info" variant="tonal" density="compact">
            Lade zuerst im Bereich <strong>Import</strong> eine Datei.
          </v-alert>
        </template>
        <template v-else-if="!mtStore.messfileStoragePath">
          <v-alert type="warning" variant="tonal" density="compact">
            <strong>{{ mtStore.fileName }}</strong> ist noch nicht in der Cloud gespeichert.
            Sessions verweisen auf die Cloud-Datei statt sie zu duplizieren — lade sie zuerst im
            Bereich <strong>Import</strong> per "In Cloud speichern" hoch.
          </v-alert>
        </template>
        <template v-else>
          <p class="text-caption text-medium-emphasis mb-3">
            Aktuell: <strong>{{ mtStore.fileName }}</strong> ·
            {{ mtStore.verarbeitungSnapshot.length }} Verarbeitungsschritt(e) ·
            Signal "{{ currentSignalName }}"
          </p>
          <v-btn color="primary" prepend-icon="mdi-content-save-outline" @click="openSaveDialog">
            Als neue Session speichern
          </v-btn>
        </template>
      </v-card-text>
    </v-card>

    <!-- Sessions list -->
    <v-card variant="outlined" rounded="lg">
      <v-card-title class="text-subtitle-1 d-flex align-center">
        <v-icon class="mr-2" size="20">mdi-folder-multiple-outline</v-icon>
        Gespeicherte Sessions
        <v-spacer></v-spacer>
        <v-btn size="small" variant="text" icon="mdi-refresh" :loading="loading" @click="loadSessions"></v-btn>
      </v-card-title>
      <v-divider></v-divider>

      <v-alert v-if="errorMsg" type="error" variant="tonal" density="compact" class="ma-3" closable @click:close="errorMsg = ''">
        {{ errorMsg }}
      </v-alert>

      <div v-if="!loading && sessions.length === 0" class="pa-8 text-center text-medium-emphasis">
        <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-folder-open-outline</v-icon>
        <div>Noch keine Sessions gespeichert.</div>
      </div>

      <v-list v-else density="comfortable">
        <v-list-item v-for="s in sessions" :key="s.id">
          <template #prepend>
            <v-icon :color="s.is_shared ? 'primary' : 'grey'">
              {{ s.is_shared ? "mdi-account-group" : "mdi-lock-outline" }}
            </v-icon>
          </template>

          <v-list-item-title class="font-weight-medium">{{ s.name }}</v-list-item-title>
          <v-list-item-subtitle class="text-caption session-details">
            {{ s.messfile_name || "Datei nicht gefunden" }} ·
            {{ (s.verarbeitung_ops || []).length }} Schritt(e) ·
            {{ new Date(s.updated_at).toLocaleString("de-DE") }}
            <v-chip size="x-small" class="ml-1" :color="s.is_shared ? 'primary' : undefined" variant="tonal">
              {{ s.is_shared ? "geteilt" : "privat" }}
            </v-chip>
          </v-list-item-subtitle>

          <template #append>
            <v-btn
              size="small" variant="tonal" color="primary" prepend-icon="mdi-folder-open-outline"
              :loading="loadingId === s.id"
              class="mr-2"
              @click="loadSession(s)"
            >
              Laden
            </v-btn>
            <v-menu v-if="s.created_by === auth.user?.id">
              <template #activator="{ props }">
                <v-btn size="small" variant="text" icon="mdi-dots-vertical" v-bind="props"></v-btn>
              </template>
              <v-list density="compact" min-width="240">
                <v-list-item
                  prepend-icon="mdi-content-save-edit-outline"
                  title="Mit aktuellem Stand aktualisieren"
                  :subtitle="!mtStore.parsed ? 'Keine Datei geladen' : undefined"
                  :disabled="!mtStore.parsed || updatingId === s.id"
                  @click="updateWithCurrent(s)"
                ></v-list-item>
                <v-list-item
                  prepend-icon="mdi-pencil-outline"
                  title="Umbenennen"
                  @click="openRenameDialog(s)"
                ></v-list-item>
                <v-list-item
                  :prepend-icon="s.is_shared ? 'mdi-lock-outline' : 'mdi-account-group'"
                  :title="s.is_shared ? 'Auf privat setzen' : 'Teilen'"
                  @click="toggleShared(s)"
                ></v-list-item>
                <v-divider></v-divider>
                <v-list-item
                  prepend-icon="mdi-delete"
                  title="Löschen"
                  class="text-error"
                  @click="confirmDelete(s)"
                ></v-list-item>
              </v-list>
            </v-menu>
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <!-- Save dialog -->
    <v-dialog v-model="saveDialog" max-width="440">
      <v-card>
        <v-card-title>Session speichern</v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-text-field
            v-model="newName"
            label="Name"
            variant="outlined"
            density="comfortable"
            autofocus
            hide-details
            class="mb-3"
            @keyup.enter="confirmSaveSession"
          ></v-text-field>
          <v-switch
            v-model="newShared"
            color="primary"
            density="compact"
            hide-details
            :label="newShared ? 'Geteilt — alle freigegebenen Nutzer sehen diese Session' : 'Privat — nur für dich sichtbar'"
          ></v-switch>
          <v-alert v-if="saveError" type="error" variant="tonal" density="compact" class="mt-3">
            {{ saveError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="saveDialog = false">Abbrechen</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="confirmSaveSession">Speichern</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete confirm -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>Session löschen?</v-card-title>
        <v-card-text>
          "{{ sessionToDelete?.name }}" wird endgültig gelöscht (die Datei selbst bleibt in der Cloud erhalten).
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="deleteDialog = false">Abbrechen</v-btn>
          <v-btn color="error" variant="flat" :loading="deleting" @click="doDelete">Löschen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- Rename -->
    <v-dialog v-model="renameDialog" max-width="400">
      <v-card>
        <v-card-title>Session umbenennen</v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-text-field
            v-model="renameValue"
            label="Name"
            variant="outlined"
            density="comfortable"
            autofocus
            hide-details
            @keyup.enter="confirmRename"
          ></v-text-field>
          <v-alert v-if="renameError" type="error" variant="tonal" density="compact" class="mt-2">
            {{ renameError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="renameDialog = false">Abbrechen</v-btn>
          <v-btn color="primary" variant="flat" :loading="renaming" @click="confirmRename">Speichern</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useMesstoolStore } from "../../stores/messtoolStore.js";
import { useAuthStore } from "../../stores/authStore.js";
import * as sessionsApi from "../../utils/messtoolSessionStorage.js";
import * as mtStorage from "../../utils/messtoolStorage.js";
import { parseMesstoolCsv } from "../../utils/messtoolParser.js";

const emit = defineEmits(["navigate"]);

const mtStore = useMesstoolStore();
const auth = useAuthStore();

const sessions = ref([]);
const loading = ref(false);
const loadingId = ref(null);
const errorMsg = ref("");

const saveDialog = ref(false);
const newName = ref("");
const newShared = ref(false);
const saving = ref(false);
const saveError = ref("");

const deleteDialog = ref(false);
const sessionToDelete = ref(null);
const deleting = ref(false);

const renameDialog = ref(false);
const renameValue = ref("");
const renameError = ref("");
const renaming = ref(false);
const sessionToRename = ref(null);

const updatingId = ref(null);

const currentSignalName = computed(() => {
  const sig = mtStore.parsed?.signals?.[mtStore.selectedSignalIdx];
  return sig ? sig.name : "-";
});

async function loadSessions() {
  loading.value = true;
  errorMsg.value = "";
  try {
    sessions.value = await sessionsApi.listSessions();
  } catch (e) {
    errorMsg.value = "Sessions konnten nicht geladen werden: " + (e.message || e);
  }
  loading.value = false;
}

function openSaveDialog() {
  newName.value = "";
  newShared.value = false;
  saveError.value = "";
  saveDialog.value = true;
}

async function confirmSaveSession() {
  if (!newName.value.trim()) {
    saveError.value = "Bitte einen Namen angeben.";
    return;
  }
  saving.value = true;
  saveError.value = "";
  try {
    await sessionsApi.createSession({
      name: newName.value.trim(),
      isShared: newShared.value,
      messfileId: mtStore.messfileId,
      messfileStoragePath: mtStore.messfileStoragePath,
      messfileName: mtStore.fileName,
      selectedSignalIdx: mtStore.selectedSignalIdx,
      verarbeitungOps: mtStore.verarbeitungSnapshot,
      filterSettings: mtStore.filterSettings,
    });
    saveDialog.value = false;
    await loadSessions();
  } catch (e) {
    saveError.value = "Konnte nicht speichern: " + (e.message || e);
  }
  saving.value = false;
}

function decodeLatin1(buffer) {
  return new TextDecoder("iso-8859-1").decode(buffer);
}

async function loadSession(s) {
  if (!s.messfile_storage_path) {
    errorMsg.value = `"${s.name}" hat keine gültige Dateireferenz mehr.`;
    return;
  }
  loadingId.value = s.id;
  errorMsg.value = "";
  try {
    const buffer = await mtStorage.downloadMessfile(s.messfile_storage_path);
    const text = decodeLatin1(buffer);
    const result = await parseMesstoolCsv(text, {});
    mtStore.setData(result, s.messfile_name || "");
    mtStore.setCloudRef(s.messfile_id, s.messfile_storage_path);
    mtStore.selectedSignalIdx = s.selected_signal_idx || 0;
    mtStore.verarbeitungSnapshot = s.verarbeitung_ops || [];
    mtStore.filterSettings = {
      characteristic: "butterworth", btype: "low", order: 4,
      cutoff: 1, cutoff2: 3, stopbandDb: 40,
      ...(s.filter_settings || {}),
    };
    emit("navigate", "mt-verarbeitung");
  } catch (e) {
    errorMsg.value = `"${s.name}" konnte nicht geladen werden: ` + (e.message || e);
  }
  loadingId.value = null;
}

async function updateWithCurrent(s) {
  if (!mtStore.parsed) return;
  updatingId.value = s.id;
  errorMsg.value = "";
  try {
    await sessionsApi.updateSession(s.id, {
      messfileId: mtStore.messfileId,
      messfileStoragePath: mtStore.messfileStoragePath,
      messfileName: mtStore.fileName,
      selectedSignalIdx: mtStore.selectedSignalIdx,
      verarbeitungOps: mtStore.verarbeitungSnapshot,
      filterSettings: mtStore.filterSettings,
    });
    await loadSessions();
  } catch (e) {
    errorMsg.value = `"${s.name}" konnte nicht aktualisiert werden: ` + (e.message || e);
  }
  updatingId.value = null;
}

function openRenameDialog(s) {
  sessionToRename.value = s;
  renameValue.value = s.name;
  renameError.value = "";
  renameDialog.value = true;
}

async function confirmRename() {
  if (!renameValue.value.trim()) {
    renameError.value = "Bitte einen Namen angeben.";
    return;
  }
  renaming.value = true;
  renameError.value = "";
  try {
    await sessionsApi.updateSession(sessionToRename.value.id, { name: renameValue.value.trim() });
    renameDialog.value = false;
    await loadSessions();
  } catch (e) {
    renameError.value = "Konnte nicht umbenennen: " + (e.message || e);
  }
  renaming.value = false;
}

async function toggleShared(s) {
  errorMsg.value = "";
  try {
    await sessionsApi.updateSession(s.id, { isShared: !s.is_shared });
    await loadSessions();
  } catch (e) {
    errorMsg.value = `"${s.name}" konnte nicht umgestellt werden: ` + (e.message || e);
  }
}

function confirmDelete(s) {
  sessionToDelete.value = s;
  deleteDialog.value = true;
}

async function doDelete() {
  if (!sessionToDelete.value) return;
  deleting.value = true;
  try {
    await sessionsApi.deleteSession(sessionToDelete.value.id);
    deleteDialog.value = false;
    await loadSessions();
  } catch (e) {
    errorMsg.value = "Löschen fehlgeschlagen: " + (e.message || e);
  }
  deleting.value = false;
}

onMounted(loadSessions);
</script>

<style scoped>
.session-details {
  opacity: 0;
  transition: opacity 0.15s ease;
}
:deep(.v-list-item:hover) .session-details,
:deep(.v-list-item:focus-within) .session-details {
  opacity: 1;
}
</style>

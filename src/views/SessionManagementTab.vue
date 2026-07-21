<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-4">
          <h2 class="text-h5 font-weight-bold">Session-Verwaltung</h2>
          <v-btn
            color="primary"
            @click="showNewSessionDialog = true"
            prepend-icon="mdi-plus"
          >
            Neue Session
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <!-- Sessions List -->
      <v-col cols="12" md="4">
        <v-card class="elevation-2">
          <v-card-title>Sessions</v-card-title>
          <v-card-text>
            <v-list dense>
              <v-list-item
                v-for="session in store.allSessions"
                :key="session.id"
                @click="selectSession(session.id)"
                :active="store.currentSession.id === session.id"
                class="mb-2"
              >
                <template v-slot:prepend>
                  <v-icon small>mdi-folder</v-icon>
                </template>
                <v-list-item-title>{{ session.name }}</v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ new Date(session.created).toLocaleDateString() }}
                </v-list-item-subtitle>
                <template v-slot:append>
                  <v-menu>
                    <template v-slot:activator="{ props }">
                      <v-btn icon size="small" v-bind="props">
                        <v-icon small>mdi-dots-vertical</v-icon>
                      </v-btn>
                    </template>
                    <v-list>
                      <v-list-item
                        @click.stop="renameSession(session.id, session.name)"
                      >
                        <v-list-item-title class="text-caption"
                          >Umbenennen</v-list-item-title
                        >
                      </v-list-item>
                      <v-list-item
                        @click.stop="deleteSessionConfirm(session.id)"
                      >
                        <v-list-item-title class="text-caption text-error"
                          >Löschen</v-list-item-title
                        >
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </template>
              </v-list-item>
            </v-list>

            <div
              v-if="store.allSessions.length === 0"
              class="text-center text-disabled py-4 text-caption"
            >
              Noch keine Sessions
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Current Session Details -->
      <v-col cols="12" md="8">
        <v-card class="elevation-2">
          <v-card-title>{{ store.currentSession.name }}</v-card-title>
          <v-card-text>
            <!-- Session Info -->
            <v-row class="mb-4">
              <v-col cols="12" sm="6">
                <div class="text-caption text-disabled">Erstellt</div>
                <div class="text-body2">
                  {{ new Date(store.currentSession.created).toLocaleString() }}
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-caption text-disabled">Signale</div>
                <div class="text-body2">
                  {{ store.currentSession.signals.length }} Signale
                </div>
              </v-col>
            </v-row>

            <!-- Session Notes -->
            <div class="mb-4">
              <label class="text-caption font-weight-500">Notizen</label>
              <v-textarea
                v-model="editingNotes"
                outlined
                dense
                rows="4"
              ></v-textarea>
              <v-btn size="small" color="primary" @click="saveNotes"
                >Notizen speichern</v-btn
              >
            </div>

            <v-divider class="my-4"></v-divider>

            <!-- Signals in Session -->
            <h3 class="text-subtitle2 font-weight-bold mb-3">
              Signale in dieser Session
            </h3>
            <v-list dense>
              <v-list-item
                v-for="signal in store.currentSession.signals"
                :key="signal.id"
                class="mb-2"
              >
                <template v-slot:prepend>
                  <v-icon small color="primary">mdi-sine-wave</v-icon>
                </template>
                <v-list-item-title class="text-body2">{{
                  signal.name
                }}</v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ signal.waveType }} @ {{ signal.frequency }}Hz
                </v-list-item-subtitle>
                <template v-slot:append>
                  <v-btn-group density="compact">
                    <v-btn size="x-small" icon @click="loadSignal(signal.id)">
                      <v-icon small>mdi-eye</v-icon>
                    </v-btn>
                    <v-btn
                      size="x-small"
                      icon
                      color="error"
                      @click="deleteSignalConfirm(signal.id)"
                    >
                      <v-icon small>mdi-delete</v-icon>
                    </v-btn>
                  </v-btn-group>
                </template>
              </v-list-item>
            </v-list>

            <div
              v-if="store.currentSession.signals.length === 0"
              class="text-center text-disabled py-4 text-caption"
            >
              Noch keine Signale in dieser Session
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- New Session Dialog -->
    <v-dialog v-model="showNewSessionDialog" max-width="400">
      <v-card>
        <v-card-title>Neue Session erstellen</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newSessionName"
            label="Session-Name"
            outlined
            dense
            class="mt-4"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showNewSessionDialog = false">Abbrechen</v-btn>
          <v-btn color="primary" @click="createNewSession">Erstellen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Rename Session Dialog -->
    <v-dialog v-model="showRenameDialog" max-width="400">
      <v-card>
        <v-card-title>Session umbenennen</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="renamingSessionName"
            label="Neuer Name"
            outlined
            dense
            class="mt-4"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showRenameDialog = false">Abbrechen</v-btn>
          <v-btn color="primary" @click="confirmRename">Umbenennen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card>
        <v-card-title>{{ deleteTarget.type === 'session' ? 'Session' : 'Signal' }} löschen?</v-card-title>
        <v-card-text>
          Möchtest du {{ deleteTarget.type === 'session' ? 'diese Session' : 'dieses Signal' }} wirklich löschen?
          Das kann nicht rückgängig gemacht werden.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showDeleteDialog = false">Abbrechen</v-btn>
          <v-btn color="error" @click="confirmDelete">Löschen</v-btn>
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
import { ref } from "vue";
import { useSignalStore } from "../stores/signalStore";

const store = useSignalStore();

const showNewSessionDialog = ref(false);
const showRenameDialog = ref(false);
const showDeleteDialog = ref(false);
const showSnackbar = ref(false);

const newSessionName = ref("Neue Session");
const editingNotes = ref("");
const renamingSessionName = ref("");

const snackbarMessage = ref("");

const deleteTarget = ref({
  type: "session",
  id: null,
});

const renamingSessionId = ref(null);

function selectSession(sessionId) {
  store.setCurrentSession(sessionId);
  editingNotes.value = store.currentSession.notes;
}

async function createNewSession() {
  if (newSessionName.value.trim()) {
    await store.createSession(newSessionName.value);
    editingNotes.value = "";
    newSessionName.value = "Neue Session";
    showNewSessionDialog.value = false;
    snackbarMessage.value = "Session erstellt!";
    showSnackbar.value = true;
  }
}

function renameSession(sessionId, currentName) {
  renamingSessionId.value = sessionId;
  renamingSessionName.value = currentName;
  showRenameDialog.value = true;
}

async function confirmRename() {
  if (renamingSessionName.value.trim()) {
    await store.updateSession({ name: renamingSessionName.value });
    showRenameDialog.value = false;
    snackbarMessage.value = "Session umbenannt!";
    showSnackbar.value = true;
  }
}

function deleteSessionConfirm(sessionId) {
  deleteTarget.value = {
    type: "session",
    id: sessionId,
  };
  showDeleteDialog.value = true;
}

function deleteSignalConfirm(signalId) {
  deleteTarget.value = {
    type: "signal",
    id: signalId,
  };
  showDeleteDialog.value = true;
}

async function confirmDelete() {
  if (deleteTarget.value.type === "session") {
    await store.deleteSession(deleteTarget.value.id);
    snackbarMessage.value = "Session gelöscht!";
  } else {
    await store.deleteSignal(deleteTarget.value.id);
    snackbarMessage.value = "Signal gelöscht!";
  }
  showDeleteDialog.value = false;
  showSnackbar.value = true;
}

function loadSignal(signalId) {
  store.loadSignal(signalId);
  snackbarMessage.value = "Signal geladen!";
  showSnackbar.value = true;
}

async function saveNotes() {
  await store.updateSession({ notes: editingNotes.value });
  snackbarMessage.value = "Notizen gespeichert!";
  showSnackbar.value = true;
}
</script>

<style scoped>
:deep(.v-list-item--active) {
  background-color: rgba(37, 99, 235, 0.1);
}
</style>

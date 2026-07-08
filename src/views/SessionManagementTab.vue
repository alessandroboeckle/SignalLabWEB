<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-4">
          <h2 class="text-h5 font-weight-bold">Session Management</h2>
          <v-btn color="primary" @click="showNewSessionDialog = true" prepend-icon="mdi-plus">
            New Session
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
                      <v-list-item @click.stop="renameSession(session.id, session.name)">
                        <v-list-item-title class="text-caption">Rename</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click.stop="deleteSessionConfirm(session.id)">
                        <v-list-item-title class="text-caption text-error">Delete</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </template>
              </v-list-item>
            </v-list>

            <div v-if="store.allSessions.length === 0" class="text-center text-disabled py-4 text-caption">
              No sessions yet
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
                <div class="text-caption text-disabled">Created</div>
                <div class="text-body2">{{ new Date(store.currentSession.created).toLocaleString() }}</div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-caption text-disabled">Signals</div>
                <div class="text-body2">{{ store.currentSession.signals.length }} signals</div>
              </v-col>
            </v-row>

            <!-- Session Notes -->
            <div class="mb-4">
              <label class="text-caption font-weight-500">Notes</label>
              <v-textarea
                v-model="editingNotes"
                outlined
                dense
                rows="4"
              ></v-textarea>
              <v-btn size="small" color="primary" @click="saveNotes">Save Notes</v-btn>
            </div>

            <v-divider class="my-4"></v-divider>

            <!-- Signals in Session -->
            <h3 class="text-subtitle2 font-weight-bold mb-3">Signals in This Session</h3>
            <v-list dense>
              <v-list-item
                v-for="signal in store.currentSession.signals"
                :key="signal.id"
                class="mb-2"
              >
                <template v-slot:prepend>
                  <v-icon small color="primary">mdi-sine-wave</v-icon>
                </template>
                <v-list-item-title class="text-body2">{{ signal.name }}</v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ signal.waveType }} @ {{ signal.frequency }}Hz
                </v-list-item-subtitle>
                <template v-slot:append>
                  <v-btn-group density="compact">
                    <v-btn size="x-small" icon @click="loadSignal(signal.id)">
                      <v-icon small>mdi-eye</v-icon>
                    </v-btn>
                    <v-btn size="x-small" icon color="error" @click="deleteSignalConfirm(signal.id)">
                      <v-icon small>mdi-delete</v-icon>
                    </v-btn>
                  </v-btn-group>
                </template>
              </v-list-item>
            </v-list>

            <div v-if="store.currentSession.signals.length === 0" class="text-center text-disabled py-4 text-caption">
              No signals in this session yet
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- New Session Dialog -->
    <v-dialog v-model="showNewSessionDialog" max-width="400">
      <v-card>
        <v-card-title>Create New Session</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newSessionName"
            label="Session Name"
            outlined
            dense
            class="mt-4"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showNewSessionDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="createNewSession">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Rename Session Dialog -->
    <v-dialog v-model="showRenameDialog" max-width="400">
      <v-card>
        <v-card-title>Rename Session</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="renamingSessionName"
            label="New Name"
            outlined
            dense
            class="mt-4"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showRenameDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="confirmRename">Rename</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card>
        <v-card-title>Delete {{ deleteTarget.type }}?</v-card-title>
        <v-card-text>
          Are you sure you want to delete this {{ deleteTarget.type }}? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="confirmDelete">Delete</v-btn>
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
import { ref, computed } from 'vue'
import { useSignalStore } from '../stores/signalStore'

const store = useSignalStore()

const showNewSessionDialog = ref(false)
const showRenameDialog = ref(false)
const showDeleteDialog = ref(false)
const showSnackbar = ref(false)

const newSessionName = ref('New Session')
const editingNotes = ref('')
const renamingSessionName = ref('')

const snackbarMessage = ref('')

const deleteTarget = ref({
  type: 'session',
  id: null
})

const renamingSessionId = ref(null)

function selectSession(sessionId) {
  store.setCurrentSession(sessionId)
  editingNotes.value = store.currentSession.notes
}

function createNewSession() {
  if (newSessionName.value.trim()) {
    store.createSession(newSessionName.value)
    editingNotes.value = ''
    newSessionName.value = 'New Session'
    showNewSessionDialog.value = false
    snackbarMessage.value = 'Session created!'
    showSnackbar.value = true
  }
}

function renameSession(sessionId, currentName) {
  renamingSessionId.value = sessionId
  renamingSessionName.value = currentName
  showRenameDialog.value = true
}

function confirmRename() {
  if (renamingSessionName.value.trim()) {
    store.updateSession({ name: renamingSessionName.value })
    showRenameDialog.value = false
    snackbarMessage.value = 'Session renamed!'
    showSnackbar.value = true
  }
}

function deleteSessionConfirm(sessionId) {
  deleteTarget.value = {
    type: 'session',
    id: sessionId
  }
  showDeleteDialog.value = true
}

function deleteSignalConfirm(signalId) {
  deleteTarget.value = {
    type: 'signal',
    id: signalId
  }
  showDeleteDialog.value = true
}

function confirmDelete() {
  if (deleteTarget.value.type === 'session') {
    store.deleteSession(deleteTarget.value.id)
    snackbarMessage.value = 'Session deleted!'
  } else {
    store.deleteSignal(deleteTarget.value.id)
    snackbarMessage.value = 'Signal deleted!'
  }
  showDeleteDialog.value = false
  showSnackbar.value = true
}

function loadSignal(signalId) {
  store.loadSignal(signalId)
  snackbarMessage.value = 'Signal loaded!'
  showSnackbar.value = true
}

function saveNotes() {
  store.updateSession({ notes: editingNotes.value })
  snackbarMessage.value = 'Notes saved!'
  showSnackbar.value = true
}
</script>

<style scoped>
:deep(.v-list-item--active) {
  background-color: rgba(37, 99, 235, 0.1);
}
</style>

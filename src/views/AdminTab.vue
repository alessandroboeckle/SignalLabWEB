<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-shield-account</v-icon>
      <h2 class="text-h4 font-weight-bold">Admin</h2>
    </div>
    <p class="text-medium-emphasis mb-6">Nutzer freigeben und verwalten</p>

    <div class="d-flex align-center mb-4">
      <v-btn
        variant="tonal"
        color="primary"
        prepend-icon="mdi-refresh"
        :loading="loading"
        @click="load"
      >
        Aktualisieren
      </v-btn>
      <v-spacer></v-spacer>
      <v-chip color="warning" variant="tonal" class="mr-2">
        {{ pending.length }} wartend
      </v-chip>
      <v-chip color="success" variant="tonal">
        {{ approvedUsers.length }} freigegeben
      </v-chip>
    </div>

    <v-alert v-if="errorMsg" type="error" variant="tonal" class="mb-4" closable @click:close="errorMsg = ''">
      {{ errorMsg }}
    </v-alert>

    <!-- Pending -->
    <v-card class="mb-6" variant="outlined" rounded="lg">
      <v-card-title class="d-flex align-center">
        <v-icon color="warning" class="mr-2">mdi-clock-outline</v-icon>
        Warten auf Freigabe
      </v-card-title>
      <v-divider></v-divider>

      <div v-if="pending.length === 0" class="pa-6 text-center text-medium-emphasis">
        Keine offenen Anfragen.
      </div>

      <v-list v-else>
        <v-list-item v-for="u in pending" :key="u.id" class="py-2">
          <template #prepend>
            <v-avatar color="warning" variant="tonal">
              <v-icon>mdi-account-clock</v-icon>
            </v-avatar>
          </template>
          <v-list-item-title class="font-weight-medium">{{ u.email }}</v-list-item-title>
          <v-list-item-subtitle>
            registriert {{ formatDate(u.created_at) }}
          </v-list-item-subtitle>
          <template #append>
            <v-btn
              color="success"
              variant="flat"
              prepend-icon="mdi-check"
              :loading="busyId === u.id"
              @click="setApproval(u, true)"
            >
              Freigeben
            </v-btn>
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <!-- Approved -->
    <v-card variant="outlined" rounded="lg">
      <v-card-title class="d-flex align-center">
        <v-icon color="success" class="mr-2">mdi-account-check</v-icon>
        Freigegebene Nutzer
      </v-card-title>
      <v-divider></v-divider>

      <div v-if="approvedUsers.length === 0" class="pa-6 text-center text-medium-emphasis">
        Noch niemand freigegeben.
      </div>

      <v-list v-else>
        <v-list-item v-for="u in approvedUsers" :key="u.id" class="py-2">
          <template #prepend>
            <v-avatar :color="u.is_admin ? 'primary' : 'success'" variant="tonal">
              <v-icon>{{ u.is_admin ? 'mdi-shield-account' : 'mdi-account' }}</v-icon>
            </v-avatar>
          </template>
          <v-list-item-title class="font-weight-medium">
            {{ u.email }}
            <v-chip v-if="u.is_admin" size="x-small" color="primary" class="ml-2">Admin</v-chip>
            <v-chip v-if="u.id === auth.user.id" size="x-small" variant="outlined" class="ml-1">Du</v-chip>
          </v-list-item-title>
          <v-list-item-subtitle>
            freigegeben • registriert {{ formatDate(u.created_at) }}
          </v-list-item-subtitle>
          <template #append>
            <v-btn
              v-if="u.id !== auth.user.id && !u.is_admin"
              color="error"
              variant="text"
              prepend-icon="mdi-cancel"
              :loading="busyId === u.id"
              @click="setApproval(u, false)"
            >
              Sperren
            </v-btn>
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <v-snackbar v-model="showSnackbar" :timeout="2500" color="primary">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";

const auth = useAuthStore();

const users = ref([]);
const loading = ref(false);
const busyId = ref(null);
const errorMsg = ref("");
const showSnackbar = ref(false);
const snackbarMessage = ref("");

const pending = computed(() => users.value.filter((u) => !u.approved));
const approvedUsers = computed(() => users.value.filter((u) => u.approved));

async function load() {
  loading.value = true;
  errorMsg.value = "";
  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) {
    errorMsg.value = "Konnte Nutzer nicht laden: " + error.message;
  } else {
    users.value = data || [];
  }
  loading.value = false;
}

async function setApproval(u, approved) {
  busyId.value = u.id;
  const { error } = await supabase
    .from("profiles")
    .update({ approved })
    .eq("id", u.id);

  if (error) {
    errorMsg.value = "Fehler: " + error.message;
  } else {
    u.approved = approved;
    snackbarMessage.value = approved
      ? `${u.email} freigegeben`
      : `${u.email} gesperrt`;
    showSnackbar.value = true;
  }
  busyId.value = null;
}

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

onMounted(load);
</script>

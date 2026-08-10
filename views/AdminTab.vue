<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-shield-account</v-icon>
      <h2 class="text-h5 font-weight-bold">Admin</h2>
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
    <v-card variant="outlined" rounded="lg" class="mb-6">
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

    <!-- Wartung -->
    <v-card variant="outlined" rounded="lg">
      <v-card-title class="d-flex align-center">
        <v-icon color="secondary" class="mr-2">mdi-broom</v-icon>
        Wartung
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Löscht den Browser-Cache (Service Worker + Cache-Storage, falls vorhanden) und lädt die Seite
          garantiert frisch vom Server, statt eine evtl. gecachte alte Version zu zeigen — nützlich direkt
          nach einem neuen Deploy, wenn trotz Neuladen (F5) noch der alte Stand angezeigt wird.
          <strong>Wirkt nur im eigenen Browser</strong>, nicht bei anderen Nutzern — jeder muss das bei sich
          selbst auslösen. Deine Messdaten/Sessions bleiben unangetastet, es wird nur Browser-Cache
          geleert, keine eigenen Daten.
        </p>
        <v-btn
          variant="tonal"
          color="secondary"
          prepend-icon="mdi-cached"
          :loading="hardRefreshing"
          @click="hardRefresh"
        >
          Cache leeren & Seite neu laden
        </v-btn>
      </v-card-text>
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
const hardRefreshing = ref(false);

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

// Clears anything the browser might be holding onto from an older
// deploy (Cache Storage entries, a service worker if one's ever
// registered) and then forces a genuinely fresh network fetch — a plain
// location.reload() can still be served from HTTP cache/a CDN edge
// cache, which is exactly the "I pushed a fix but the site still shows
// the old thing" symptom. Deliberately does NOT touch IndexedDB/
// localStorage (measurement data, saved sessions, active tab) — this is
// only about stale *code*, never about the user's own data.
async function hardRefresh() {
  hardRefreshing.value = true;
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // best effort — still do the cache-busting reload below regardless
  }
  const url = new URL(window.location.href);
  url.searchParams.set("_refresh", Date.now().toString());
  window.location.href = url.toString();
}

onMounted(load);
</script>

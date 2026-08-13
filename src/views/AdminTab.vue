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

    <!-- Online now -->
    <v-card variant="outlined" rounded="lg" class="mb-6">
      <v-card-title class="d-flex align-center">
        <v-icon color="success" class="mr-2">mdi-circle</v-icon>
        Gerade online
        <v-chip v-if="presence.onlineUsers.length" size="small" color="success" variant="tonal" class="ml-2">
          {{ presence.onlineUsers.length }}
        </v-chip>
      </v-card-title>
      <v-divider></v-divider>
      <div v-if="presence.onlineUsers.length === 0" class="pa-6 text-center text-medium-emphasis">
        Gerade niemand aktiv (ausser dir, falls dein Tab die Verbindung noch aufbaut).
      </div>
      <v-list v-else density="comfortable">
        <v-list-item v-for="u in presence.onlineUsers" :key="u.id" class="py-1">
          <template #prepend>
            <v-avatar color="success" variant="tonal" size="32">
              <v-icon size="16">mdi-account</v-icon>
            </v-avatar>
          </template>
          <v-list-item-title class="text-body-2">
            {{ u.email }}
            <v-chip v-if="u.id === auth.user.id" size="x-small" variant="outlined" class="ml-1">Du</v-chip>
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            online seit {{ formatDate(u.online_at) }}
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>
      <v-card-text class="text-caption text-medium-emphasis pt-0">
        Nur Nutzer mit gerade offenem Tab — kein Verlauf, niemand wird nachträglich aufgezeichnet.
      </v-card-text>
    </v-card>

    <!-- Report template (logo + default custom fields for PDF exports) -->
    <v-card variant="outlined" rounded="lg" class="mb-6">
      <v-card-title class="d-flex align-center">
        <v-icon color="secondary" class="mr-2">mdi-file-image-outline</v-icon>
        Report-Vorlage
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Logo und Standard-Felder, die auf jedem PDF-Export erscheinen (Export-Seite). Gilt fürs ganze
          Team — jeder kann beim Exportieren einzelne Felder für diesen einen Report noch anpassen oder
          ergänzen, aber die Vorgabe hier gilt als Standard.
        </p>

        <div class="d-flex align-center ga-4 mb-4">
          <div
            class="report-logo-preview d-flex align-center justify-center"
            :class="{ 'report-logo-preview--empty': !logoDraft }"
          >
            <img v-if="logoDraft" :src="logoDraft" alt="Logo-Vorschau" />
            <v-icon v-else size="28" color="medium-emphasis">mdi-image-off-outline</v-icon>
          </div>
          <div>
            <v-btn size="small" variant="outlined" prepend-icon="mdi-upload" @click="logoInput?.click()">
              Logo hochladen
            </v-btn>
            <v-btn
              v-if="logoDraft"
              size="small"
              variant="text"
              color="error"
              class="ml-2"
              @click="logoDraft = null; logoAspectDraft = null"
            >
              Entfernen
            </v-btn>
            <input ref="logoInput" type="file" accept="image/png,image/jpeg" class="d-none" @change="onLogoSelected" />
            <p class="text-caption text-medium-emphasis mt-1 mb-0">PNG/JPG/SVG, unter ~200 KB empfohlen.</p>
          </div>
        </div>

        <div class="text-subtitle-2 font-weight-medium mb-2">Standard-Felder</div>
        <div v-for="(field, i) in fieldsDraft" :key="i" class="d-flex align-center ga-2 mb-2">
          <v-text-field v-model="field.label" density="compact" variant="outlined" label="Feldname" hide-details style="max-width: 200px"></v-text-field>
          <v-text-field v-model="field.value" density="compact" variant="outlined" label="Wert" hide-details></v-text-field>
          <v-btn icon="mdi-close" size="small" variant="text" :aria-label="`Feld ${field.label || i + 1} entfernen`" @click="fieldsDraft.splice(i, 1)"></v-btn>
        </div>
        <v-btn size="small" variant="text" prepend-icon="mdi-plus" class="mb-4" @click="fieldsDraft.push({ label: '', value: '' })">
          Feld hinzufügen
        </v-btn>

        <div>
          <v-btn color="primary" variant="flat" prepend-icon="mdi-content-save-outline" :loading="savingReportSettings" @click="saveReportTemplate">
            Vorlage speichern
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-alert v-if="errorMsg" type="error" variant="tonal" class="mb-4" closable @click:close="errorMsg = ''">
      {{ errorMsg }}
    </v-alert>

    <!-- Storage overview -->
    <v-card variant="outlined" rounded="lg" class="mb-6">
      <v-card-title class="d-flex align-center">
        <v-icon color="secondary" class="mr-2">mdi-database-outline</v-icon>
        Speicherplatz
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <v-row dense>
          <v-col cols="6" sm="3">
            <v-card variant="outlined" class="pa-2 text-center stat-card">
              <div class="text-overline text-medium-emphasis stat-card__label">Dateien</div>
              <div class="text-h5 font-weight-bold font-mono stat-card__value">{{ messfiles.length }}</div>
            </v-card>
          </v-col>
          <v-col cols="6" sm="3">
            <v-card variant="outlined" class="pa-2 text-center stat-card">
              <div class="text-overline text-medium-emphasis stat-card__label">Belegt</div>
              <div class="text-h5 font-weight-bold font-mono stat-card__value">{{ formatBytes(totalStorageBytes) }}</div>
            </v-card>
          </v-col>
          <v-col cols="6" sm="3">
            <v-card variant="outlined" class="pa-2 text-center stat-card">
              <div class="text-overline text-medium-emphasis stat-card__label">Ordner</div>
              <div class="text-h5 font-weight-bold font-mono stat-card__value">{{ folderCount }}</div>
            </v-card>
          </v-col>
          <v-col cols="6" sm="3">
            <v-card variant="outlined" class="pa-2 text-center stat-card">
              <div class="text-overline text-medium-emphasis stat-card__label">Ø Dateigrösse</div>
              <div class="text-h5 font-weight-bold font-mono stat-card__value">
                {{ formatBytes(messfiles.length ? totalStorageBytes / messfiles.length : 0) }}
              </div>
            </v-card>
          </v-col>
        </v-row>
        <p class="text-caption text-medium-emphasis mt-2 mb-0">
          Über alle Nutzer hinweg — die Dateiliste selbst ist geräteübergreifend geteilt, nicht pro Person.
        </p>
      </v-card-text>
    </v-card>

    <!-- Announcement -->
    <v-card variant="outlined" rounded="lg" class="mb-6">
      <v-card-title class="d-flex align-center">
        <v-icon color="info" class="mr-2">mdi-bullhorn-outline</v-icon>
        Ankündigung an alle
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Schickt ein Banner an alle gerade offenen Tabs — z.B. "Neue Version verfügbar, bitte Seite neu
          laden". Wird nicht gespeichert: wer die Seite erst später öffnet, sieht nichts davon, und ein
          Neuladen des eigenen Tabs blendet es dort auch wieder aus.
        </p>
        <v-text-field
          v-model="announcementText"
          variant="outlined"
          density="comfortable"
          label="Nachricht"
          placeholder="z.B. Neue Version verfügbar — bitte Seite neu laden (Strg+Shift+R)"
          maxlength="200"
          hide-details
          class="mb-3"
          @keyup.enter="sendAnnouncement"
        ></v-text-field>
        <v-btn
          color="info"
          variant="tonal"
          prepend-icon="mdi-send-outline"
          :loading="sendingAnnouncement"
          :disabled="!announcementText.trim()"
          @click="sendAnnouncement"
        >
          An alle senden{{ presence.onlineUsers.length ? ` (${presence.onlineUsers.length} online)` : "" }}
        </v-btn>
      </v-card-text>
    </v-card>

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
            freigegeben • registriert {{ formatDate(u.created_at) }} • zuletzt online {{ formatLastSeen(u.last_seen_at) }}
          </v-list-item-subtitle>
          <template #append>
            <v-btn
              v-if="u.id !== auth.user.id && !u.is_admin"
              color="primary"
              variant="text"
              prepend-icon="mdi-shield-account"
              :loading="busyId === u.id"
              @click="setAdminRole(u, true)"
            >
              Zum Admin machen
            </v-btn>
            <v-btn
              v-if="u.id !== auth.user.id && u.is_admin"
              color="secondary"
              variant="text"
              prepend-icon="mdi-shield-off-outline"
              :loading="busyId === u.id"
              @click="setAdminRole(u, false)"
            >
              Admin entziehen
            </v-btn>
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
import { usePresenceStore } from "../stores/presenceStore.js";
import { showToast } from "../composables/useToast.js";
import * as mtStorage from "../utils/messtoolStorage.js";
import { formatBytes } from "../utils/formatBytes.js";
import { useReportSettingsStore } from "../stores/reportSettingsStore.js";

const auth = useAuthStore();
const presence = usePresenceStore();

const announcementText = ref("");
const sendingAnnouncement = ref(false);

async function sendAnnouncement() {
  if (!announcementText.value.trim()) return;
  sendingAnnouncement.value = true;
  const ok = await presence.sendAnnouncement(announcementText.value);
  sendingAnnouncement.value = false;
  if (ok) {
    showToast(`Gesendet an ${presence.onlineUsers.length} online Nutzer.`);
    announcementText.value = "";
  } else {
    errorMsg.value = "Ankündigung konnte nicht gesendet werden — Verbindung noch nicht bereit?";
  }
}

const users = ref([]);
const loading = ref(false);
const busyId = ref(null);
const errorMsg = ref("");
const showSnackbar = ref(false);
const snackbarMessage = ref("");
const hardRefreshing = ref(false);

const pending = computed(() => users.value.filter((u) => !u.approved));
const approvedUsers = computed(() => users.value.filter((u) => u.approved));

const messfiles = ref([]);
const messfilesLoading = ref(false);

// Report template (logo + default custom fields)
const reportSettings = useReportSettingsStore();
const logoInput = ref(null);
const logoDraft = ref(null); // data URL, or null — separate from the store's own value so "Entfernen"/a bad upload doesn't touch anything until "speichern" is actually clicked
const logoAspectDraft = ref(null); // width/height, so the PDF can fit it without distorting it
const fieldsDraft = ref([]); // [{ label, value }]
const savingReportSettings = ref(false);
const MAX_LOGO_BYTES = 300 * 1024; // ~300KB — plenty for a logo, keeps the settings row (and every PDF) small

async function loadReportSettings() {
  await reportSettings.load();
  logoDraft.value = reportSettings.logoDataUrl;
  logoAspectDraft.value = reportSettings.logoAspect;
  fieldsDraft.value = reportSettings.defaultFields.map((f) => ({ ...f }));
}

function onLogoSelected(e) {
  const file = e.target.files?.[0];
  e.target.value = ""; // allow re-selecting the same file later
  if (!file) return;
  if (file.size > MAX_LOGO_BYTES) {
    errorMsg.value = `Logo ist zu gross (${formatBytes(file.size)}) — bitte unter ${formatBytes(MAX_LOGO_BYTES)} bleiben.`;
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    // Normalize whatever got uploaded (PNG/JPEG/SVG/whatever the browser
    // will decode) into a clean PNG via canvas — jsPDF's addImage only
    // actually supports raster formats (no native SVG support at all,
    // despite the file picker accepting it), and re-encoding through
    // canvas also sidesteps any PNG color-profile/alpha quirks that were
    // producing garbage blocks in the exported PDF. White background
    // fill first so transparency doesn't turn into an unpredictable
    // black block in the final render.
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      logoDraft.value = canvas.toDataURL("image/png");
      logoAspectDraft.value = img.naturalWidth / img.naturalHeight;
    };
    img.onerror = () => {
      errorMsg.value = "Logo konnte nicht gelesen werden — Datei beschädigt oder Format nicht unterstützt.";
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

async function saveReportTemplate() {
  savingReportSettings.value = true;
  try {
    const fields = fieldsDraft.value.filter((f) => f.label.trim());
    await reportSettings.save({ logoDataUrl: logoDraft.value, logoAspect: logoAspectDraft.value, defaultFields: fields });
    fieldsDraft.value = fields.map((f) => ({ ...f }));
    showToast("Report-Vorlage gespeichert.");
  } catch (e) {
    errorMsg.value = "Vorlage konnte nicht gespeichert werden: " + (e.message || e);
  }
  savingReportSettings.value = false;
}
const totalStorageBytes = computed(() => messfiles.value.reduce((sum, f) => sum + (f.size_bytes || 0), 0));
const folderCount = computed(() => new Set(messfiles.value.map((f) => f.folder).filter(Boolean)).size);

async function loadStorageStats() {
  messfilesLoading.value = true;
  try {
    messfiles.value = await mtStorage.listMessfiles();
  } catch {
    // non-critical — the rest of the Admin page still works without this
  }
  messfilesLoading.value = false;
}

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

async function setAdminRole(u, makeAdmin) {
  busyId.value = u.id;
  const { error } = await supabase.rpc("admin_set_admin", {
    target_user_id: u.id,
    make_admin: makeAdmin,
  });

  if (error) {
    errorMsg.value = "Fehler: " + error.message;
  } else {
    u.is_admin = makeAdmin;
    snackbarMessage.value = makeAdmin
      ? `${u.email} ist jetzt Admin`
      : `${u.email} ist kein Admin mehr`;
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

// Relative-ish "last seen" — a raw timestamp is fine for "registriert",
// but for "how actively is this actually being used" a glance at "vor 5
// Min." is far more useful at a glance than doing date math in your head
// against today's date every time you check this page.
function formatLastSeen(d) {
  if (!d) return "nie";
  const diffMs = Date.now() - new Date(d).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `vor ${days} Tag${days === 1 ? "" : "en"}`;
  return formatDate(d);
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

onMounted(() => {
  load();
  loadStorageStats();
  loadReportSettings();
});
</script>

<style scoped>
.report-logo-preview {
  width: 96px;
  height: 64px;
  border: 1px dashed rgba(128, 128, 128, 0.4);
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}
.report-logo-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.report-logo-preview--empty {
  background: rgba(128, 128, 128, 0.06);
}
</style>

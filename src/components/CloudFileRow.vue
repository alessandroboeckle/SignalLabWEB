<template>
  <div class="d-flex flex-wrap align-center ga-2 px-4 py-3 cloud-file-row">
    <v-checkbox-btn
      :model-value="selected"
      :aria-label="`${file.name} auswählen`"
      density="compact"
      @update:model-value="$emit('toggle-select')"
    ></v-checkbox-btn>
    <v-icon color="primary">mdi-file-chart</v-icon>
    <div class="flex-grow-1" style="min-width: 180px">
      <div class="font-weight-medium text-body-2 text-truncate">
        {{ file.name }}
        <v-chip v-if="file.folder && showFolderChip" size="x-small" variant="tonal" prepend-icon="mdi-folder-outline" class="ml-1">
          {{ file.folder }}
        </v-chip>
        <v-chip v-if="ownerLabel" size="x-small" variant="tonal" color="secondary" prepend-icon="mdi-account-outline" class="ml-1">
          {{ ownerLabel }}
        </v-chip>
      </div>
      <div class="text-caption text-medium-emphasis text-truncate">
        {{ file.signal_count }} Signale • {{ file.row_count?.toLocaleString() }} Punkte •
        {{ formatBytes(file.size_bytes) }} • {{ formatDate(file.created_at) }}
        <span v-if="file.matchedSignal" class="text-primary">
          • <v-icon size="12">mdi-magnify</v-icon> Signal: {{ file.matchedSignal }}
        </span>
      </div>
    </div>
    <div class="d-flex flex-wrap align-center ga-1">
      <v-menu :close-on-content-click="false">
        <template #activator="{ props: folderMenuProps }">
          <v-tooltip location="bottom">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                size="small" variant="text" icon="mdi-folder-move-outline"
                :aria-label="`${file.name} in Ordner verschieben`"
                v-bind="{ ...folderMenuProps, ...tooltipProps }"
              ></v-btn>
            </template>
            In Ordner verschieben
          </v-tooltip>
        </template>
        <v-card min-width="240" class="pa-3">
          <v-select
            :model-value="file.folder"
            :items="[{ title: 'Kein Ordner', value: null }, ...folders.map((f) => ({ title: f, value: f }))]"
            density="compact"
            variant="outlined"
            label="Ordner"
            hide-details
            @update:model-value="(val) => $emit('move-folder', val)"
          ></v-select>
        </v-card>
      </v-menu>
      <v-tooltip location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-btn
            size="small" variant="text" color="primary" icon="mdi-chart-multiple"
            :loading="adding"
            :aria-label="`${file.name} zur Anzeige hinzufügen`"
            v-bind="tooltipProps"
            @click="$emit('add-to-compare')"
          ></v-btn>
        </template>
        Zur Anzeige hinzufügen
      </v-tooltip>
      <v-btn size="small" variant="text" prepend-icon="mdi-download" :loading="opening" @click="$emit('open')">
        Öffnen
      </v-btn>
      <v-btn size="small" variant="text" color="error" icon="mdi-delete" :aria-label="`${file.name} löschen`" @click="$emit('remove')"></v-btn>
    </div>
  </div>
</template>

<script setup>
import { formatBytes } from "../utils/formatBytes.js";

defineProps({
  file: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  folders: { type: Array, default: () => [] },
  adding: { type: Boolean, default: false },
  opening: { type: Boolean, default: false },
  formatDate: { type: Function, required: true },
  // Off inside an already-expanded folder section (the folder is obvious
  // from context there); on in the flat "Alle"/single-folder-filtered view.
  showFolderChip: { type: Boolean, default: true },
  // Set only for admins viewing other users' files — shows who the file belongs to.
  ownerLabel: { type: String, default: null },
});
defineEmits(["toggle-select", "move-folder", "add-to-compare", "open", "remove"]);
</script>

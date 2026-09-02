<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-chart-multiple</v-icon>
      <h2 class="text-h5 font-weight-bold">Anzeige</h2>
    
      <v-spacer></v-spacer>
      <HelpIconButton section="messtool-vergleich" label="Anzeige" />
    </div>
    <p class="text-medium-emphasis mb-6">Signale anzeigen, überlagern und vergleichen</p>

    <!-- Add files -->
    <v-card variant="outlined" rounded="lg" class="mb-4">
      <v-card-text class="d-flex flex-wrap ga-3 align-center">
        <span>
          <v-btn
            variant="outlined"
            prepend-icon="mdi-file-plus-outline"
            :disabled="!mtStore.parsed"
            @click="addCurrent"
          >
            Aktuelle Datei hinzufügen
          </v-btn>
          <v-tooltip v-if="!mtStore.parsed" activator="parent" location="bottom">
            Zuerst auf der Import-Seite eine Datei laden
          </v-tooltip>
        </span>
        <v-btn variant="outlined" prepend-icon="mdi-upload" @click="fileInput?.click()">
          Datei hochladen
        </v-btn>
        <v-btn variant="outlined" prepend-icon="mdi-cloud" @click="openCloudDialog">
          Aus Cloud hinzufügen
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          v-if="mtStore.compareFiles.length"
          variant="text"
          color="error"
          prepend-icon="mdi-delete-sweep"
          @click="clearCompareWithUndo"
        >
          Alle entfernen
        </v-btn>
        <input ref="fileInput" type="file" accept=".csv" class="d-none" @change="onFileSelect" />
      </v-card-text>
    </v-card>

    <v-alert v-if="errorMsg" type="error" variant="tonal" density="compact" class="mb-4" closable @click:close="errorMsg = ''">
      {{ errorMsg }}
    </v-alert>

    <MtQuickNav
      v-if="mtStore.compareFiles.length > 0"
      :items="[
        { target: 'mt-export', label: 'Export (Batch)', icon: 'mdi-file-export' },
        { target: 'mt-sessions', label: 'Sessions', icon: 'mdi-content-save-cog-outline' },
      ]"
      @navigate="$emit('navigate', $event)"
    />

    <EmptyState
      v-if="mtStore.compareFiles.length === 0"
      icon="mdi-chart-multiple"
      title="Noch keine Dateien zur Anzeige hinzugefügt"
      description="Füge die aktuell geladene Datei, eine neue Datei oder eine aus der Cloud hinzu."
    />

    <template v-else>
      <!-- Per-file signal selection -->
      <v-card variant="outlined" rounded="lg" class="mb-4">
        <v-list density="comfortable">
          <v-list-item v-for="(f, idx) in mtStore.compareFiles" :key="f.id">
            <template #prepend>
              <v-icon color="grey" class="mr-1">mdi-file-outline</v-icon>
            </template>
            <v-row align="center" dense class="ml-1">
              <v-col cols="12" sm="3">
                <div class="text-body-2 font-weight-medium">{{ f.name }}</div>
                <div class="text-caption text-medium-emphasis mb-1">
                  {{ f.parsed.signals.length }} Signale · {{ f.parsed.time.length }} Punkte
                </div>
                <v-menu>
                  <template #activator="{ props }">
                    <v-btn size="x-small" variant="outlined" prepend-icon="mdi-folder-star-outline" v-bind="props">
                      Gruppen
                    </v-btn>
                  </template>
                  <v-list density="compact" min-width="220">
                    <v-list-item
                      prepend-icon="mdi-content-save-outline"
                      title="Aktuelle Auswahl als Gruppe speichern"
                      :disabled="!f.selectedIndices.length"
                      @click="openSaveGroupDialog(f)"
                    ></v-list-item>
                    <v-divider></v-divider>
                    <v-list-item v-if="signalGroups.length === 0" disabled title="Noch keine Gruppen gespeichert"></v-list-item>
                    <v-list-item
                      v-for="g in signalGroups"
                      :key="g.name"
                      :title="g.name"
                      :subtitle="`${g.signalNames.length} Signal(e)`"
                      @click="applyGroup(f, g)"
                    >
                      <template #append>
                        <v-btn size="x-small" variant="text" color="error" icon="mdi-delete" @click.stop="removeGroup(g.name)"></v-btn>
                      </template>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </v-col>
              <v-col cols="12" sm="5">
                <v-autocomplete
                  v-model="f.selectedIndices"
                  :items="signalOptions(f)"
                  label="Signale (mehrere möglich)"
                  variant="outlined"
                  density="compact"
                  multiple
                  chips
                  closable-chips
                  hide-details
                >
                  <template #chip="{ item, props: chipProps }">
                    <v-chip
                      v-bind="chipProps"
                      :color="colorForSeries(f.id, item.value)"
                      variant="flat"
                      size="small"
                    ></v-chip>
                  </template>
                </v-autocomplete>
                <div v-if="!f.selectedIndices.length" class="text-caption text-warning mt-1">
                  Noch kein Signal ausgewählt — oben eins wählen, damit diese Datei angezeigt wird.
                </div>
              </v-col>
              <v-col cols="12" sm="2">
                <v-text-field
                  v-model.number="f.offsetSec"
                  type="number"
                  step="0.1"
                  label="Zeit-Offset [s]"
                  variant="outlined"
                  density="compact"
                  hide-details
                  prepend-inner-icon="mdi-arrow-left-right"
                >
                  <template #append-inner>
                    <v-btn
                      v-if="f.offsetSec"
                      size="x-small" variant="text"
                      aria-label="Offset zurücksetzen"
                      @click="f.offsetSec = 0"
                    >
                      <v-icon size="16">mdi-backup-restore</v-icon>
                      <v-tooltip activator="parent" location="bottom">Offset zurücksetzen</v-tooltip>
                    </v-btn>
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="12" sm="2" class="d-flex justify-end ga-1">
                <v-menu :close-on-content-click="false">
                  <template #activator="{ props: advProps }">
                    <v-badge
                      :content="advancedActiveCount(f)"
                      :model-value="advancedActiveCount(f) > 0"
                      color="primary"
                      offset-x="6"
                      offset-y="6"
                    >
                      <v-btn v-bind="advProps" size="small" variant="text" icon="mdi-tune-variant" aria-label="Erweiterte Optionen"></v-btn>
                    </v-badge>
                  </template>
                  <v-card min-width="320" class="pa-4">
                    <div class="text-subtitle-2 font-weight-bold mb-2">Erweiterte Optionen — {{ f.name }}</div>
                    <v-switch
                      v-model="f.useSecondAxis"
                      color="primary"
                      density="compact"
                      hide-details
                      label="Zweite Y-Achse"
                      class="mb-1"
                    ></v-switch>
                    <v-switch
                      v-if="idx > 0"
                      v-model="f.autoAlign"
                      color="primary"
                      density="compact"
                      hide-details
                      label="Automatisch ausrichten (Kreuzkorrelation)"
                      class="mb-1"
                      @update:model-value="(v) => v && autoAlignFile(f)"
                    ></v-switch>
                    <div v-if="idx > 0 && f.autoAlign" class="d-flex align-center ga-2 mb-2 ml-8">
                      <v-btn size="x-small" variant="text" prepend-icon="mdi-refresh" @click="autoAlignFile(f)">
                        Neu berechnen
                      </v-btn>
                      <span v-if="alignConfidence[f.id] !== undefined" class="text-caption text-medium-emphasis">
                        Übereinstimmung: {{ (alignConfidence[f.id] * 100).toFixed(0) }}%
                        <template v-if="alignConfidence[f.id] < 0.2">— unsicher</template>
                      </span>
                    </div>
                    <div v-if="idx > 0 && correlationFor(f) !== null" class="mb-2 ml-8">
                      <v-chip
                        size="small"
                        variant="tonal"
                        :color="Math.abs(correlationFor(f)) > 0.7 ? 'success' : Math.abs(correlationFor(f)) > 0.3 ? 'warning' : 'default'"
                      >
                        Korrelation zu Datei 1: {{ correlationFor(f).toFixed(2) }}
                      </v-chip>
                    </div>

                    <v-divider v-if="displayMode === 'stacked'" class="my-3"></v-divider>

                    <template v-if="displayMode === 'stacked'">
                      <v-switch
                        v-model="f.useFilter"
                        color="secondary"
                        density="compact"
                        hide-details
                        label="Filter anwenden (nur Gestapelt-Ansicht)"
                        class="mb-1"
                      ></v-switch>
                      <v-row v-if="f.useFilter" dense align="center" class="mt-1">
                        <v-col cols="6">
                          <v-select
                            v-model="f.filterSettings.characteristic"
                            :items="[
                              { title: 'Butterworth', value: 'butterworth' },
                              { title: 'Chebyshev I', value: 'cheby1' },
                              { title: 'Bessel', value: 'bessel' },
                              { title: 'Elliptic', value: 'elliptic' },
                            ]"
                            label="Typ"
                            variant="outlined"
                            density="compact"
                            hide-details
                          ></v-select>
                        </v-col>
                        <v-col cols="6">
                          <v-select
                            v-model="f.filterSettings.btype"
                            :items="[
                              { title: 'Tiefpass', value: 'low' },
                              { title: 'Hochpass', value: 'high' },
                              { title: 'Bandpass', value: 'band' },
                            ]"
                            label="Art"
                            variant="outlined"
                            density="compact"
                            hide-details
                          ></v-select>
                        </v-col>
                        <v-col cols="6">
                          <v-select
                            v-model="f.filterSettings.order"
                            :items="[1,2,3,4,5,6,7,8,9,10]"
                            label="Ordnung"
                            variant="outlined"
                            density="compact"
                            hide-details
                          ></v-select>
                        </v-col>
                        <v-col cols="6">
                          <v-text-field
                            v-model.number="f.filterSettings.cutoff"
                            type="number"
                            label="Grenzfrequenz [Hz]"
                            variant="outlined"
                            density="compact"
                            hide-details
                          ></v-text-field>
                        </v-col>
                        <v-col v-if="f.filterSettings.btype === 'band'" cols="6">
                          <v-text-field
                            v-model.number="f.filterSettings.cutoff2"
                            type="number"
                            label="Grenzfreq. 2 [Hz]"
                            variant="outlined"
                            density="compact"
                            hide-details
                          ></v-text-field>
                        </v-col>
                        <v-col cols="12">
                          <v-switch
                            v-model="f.filterOnly"
                            color="secondary"
                            density="compact"
                            hide-details
                            label="Nur gefiltert"
                          ></v-switch>
                        </v-col>
                      </v-row>
                    </template>
                  </v-card>
                </v-menu>
                <v-btn size="small" variant="text" color="error" icon="mdi-delete" :aria-label="`${f.name} aus Anzeige entfernen`" @click="removeCompareFileWithUndo(f)"></v-btn>
              </v-col>
            </v-row>
          </v-list-item>
        </v-list>
      </v-card>

      <!-- Display mode -->
      <div class="d-flex align-center flex-wrap ga-3 mb-3">
        <v-btn-toggle v-model="displayMode" color="primary" density="comfortable" mandatory divided>
          <v-btn value="overlay" size="small" prepend-icon="mdi-layers-outline">Überlagert</v-btn>
          <v-btn value="stacked" size="small" prepend-icon="mdi-view-sequential-outline">Gestapelt</v-btn>
        </v-btn-toggle>

        <v-spacer></v-spacer>

        <v-menu :close-on-content-click="false">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" size="small" variant="outlined" prepend-icon="mdi-view-grid-outline">
              Anzeigeoptionen
            </v-btn>
          </template>
          <v-card min-width="300" class="pa-4">
            <div class="text-subtitle-2 font-weight-bold mb-2">Zeitachse</div>
            <v-btn-toggle v-model="xAxisMode" color="secondary" density="comfortable" mandatory divided class="mb-3">
              <v-btn value="zeit" size="small" prepend-icon="mdi-timer-outline">Zeit</v-btn>
              <v-btn value="uhrzeit" size="small" prepend-icon="mdi-clock-outline">Uhrzeit</v-btn>
            </v-btn-toggle>

            <div class="text-subtitle-2 font-weight-bold mb-2">Darstellung</div>
            <v-switch v-model="bigMode" color="primary" density="compact" hide-details label="Alle gross anzeigen" class="mb-1"></v-switch>
            <v-switch v-model="showFrequencyResponse" color="secondary" density="compact" hide-details label="Frequenzgang anzeigen" class="mb-1"></v-switch>

            <template v-if="displayMode === 'stacked'">
              <v-divider class="my-3"></v-divider>
              <div class="text-subtitle-2 font-weight-bold mb-2">Nur im Gestapelt-Modus</div>
              <v-switch v-model="syncCursors" color="primary" density="compact" hide-details label="Cursor über alle Plots" class="mb-1"></v-switch>
              <v-switch v-model="syncZoom" color="primary" density="compact" hide-details label="Zoom über alle Plots" class="mb-1"></v-switch>
              <v-switch v-model="fullWidthPlots" color="primary" density="compact" hide-details label="Volle Breite"></v-switch>
            </template>
          </v-card>
        </v-menu>

        <span class="text-caption text-medium-emphasis w-100">
          {{ displayMode === "overlay" ? "Alle Signale in einem Chart übereinander" : "Jedes Signal als eigenes Chart untereinander" }}
          <template v-if="xAxisMode === 'uhrzeit' && displayMode === 'overlay' && mtStore.compareFiles.length > 1">
            · Uhrzeit-Achse richtet sich nach der ersten Datei
          </template>
        </span>
      </div>

      <!-- Frequency response — amplitude + phase spectrum (Hann window)
           for every currently compared signal, overlaid so signals can be
           compared directly in the frequency domain too, not just time. -->
      <template v-if="showFrequencyResponse">
        <v-progress-linear v-if="freqComputing" indeterminate color="secondary" class="mb-2"></v-progress-linear>
        <ChartCard
          title="Frequenzgang — Amplitude (FFT)"
          :config="freqAmplitudeConfig"
          :height="260"
          hide-playback
          class="mb-4"
        />
        <ChartCard
          title="Frequenzgang — Phase (FFT)"
          :config="freqPhaseConfig"
          :height="260"
          hide-playback
          class="mb-4"
        />
      </template>

      <!-- Overlay chart -->
      <ChartCard v-if="displayMode === 'overlay'" title="Überlagerte Signale" :config="overlayConfig" :height="bigMode ? 700 : 380" />

      <!-- Stacked individual charts -->
      <template v-else>
        <v-row>
        <v-col
          v-for="item in stackedRenderItems"
          :key="item.key"
          :cols="12"
          :md="fullWidthPlots ? 12 : 6"
        >
        <ChartCard
          :title="item.title"
          :config="item.config"
          :height="bigMode ? 600 : 260"
          :sync-group="syncZoom ? 'vergleich-gestapelt' : null"
          :cursor-sync-group="syncCursors ? 'vergleich-gestapelt' : null"
          class="mb-4"
        >
          <template v-if="mtStore.compareSeries.length > 1" #extra-toolbar>
            <v-menu :close-on-content-click="false">
              <template #activator="{ props: menuProps }">
                <v-tooltip location="bottom">
                  <template #activator="{ props: tooltipProps }">
                    <v-btn
                      size="small" variant="text" icon="mdi-chevron-down"
                      :aria-label="`Weitere Signale in ${item.title} legen`"
                      v-bind="{ ...menuProps, ...tooltipProps }"
                    ></v-btn>
                  </template>
                  Signale in diesen Plot legen
                </v-tooltip>
              </template>
              <v-card min-width="300" max-height="380" style="overflow-y: auto">
                <v-list density="compact">
                  <v-list-subheader>Signale in diesem Plot</v-list-subheader>
                  <v-list-item v-for="s in mtStore.compareSeries" :key="s.key" :disabled="isGroupLeader(item, s)">
                    <template #prepend>
                      <v-checkbox-btn
                        :model-value="isInGroup(item, s)"
                        :disabled="isGroupLeader(item, s) || !canJoinGroup(s)"
                        density="compact"
                        @update:model-value="(v) => toggleGroupMembership(item, s, v)"
                      ></v-checkbox-btn>
                    </template>
                    <v-list-item-title class="text-body-2">{{ s.fileName }} — {{ s.signal.name }}</v-list-item-title>
                    <v-list-item-subtitle v-if="isGroupLeader(item, s)" class="text-caption">
                      Ankersignal dieses Plots
                    </v-list-item-subtitle>
                    <v-list-item-subtitle v-else-if="!canJoinGroup(s)" class="text-caption">
                      Hat selbst andere Signale zusammengelegt — erst dort entfernen
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-menu>
          </template>
        </ChartCard>
        </v-col>
        </v-row>
        <p v-if="mtStore.compareSeries.length === 0" class="text-medium-emphasis text-center pa-6">
          Keine Signale ausgewählt.
        </p>
      </template>

      <!-- Stat comparison -->
      <v-card variant="outlined" rounded="lg" class="mt-4">
        <v-card-title class="text-subtitle-1">Statistik-Übersicht</v-card-title>
        <v-divider></v-divider>
        <v-data-table
          :headers="statHeaders"
          :items="statRows"
          density="comfortable"
          items-per-page="-1"
          hide-default-footer
        >
          <template #item.name="{ item }">
            <v-avatar :color="item.color" size="10" class="mr-2"></v-avatar>{{ item.name }}
          </template>
          <template #item.mean="{ item }">{{ item.mean == null ? "-" : item.mean.toFixed(3) }}</template>
          <template #item.rms="{ item }">{{ item.rms == null ? "-" : item.rms.toFixed(3) }}</template>
          <template #item.std="{ item }">{{ item.std == null ? "-" : item.std.toFixed(3) }}</template>
          <template #item.min="{ item }">{{ item.min == null ? "-" : item.min.toFixed(3) }}</template>
          <template #item.max="{ item }">{{ item.max == null ? "-" : item.max.toFixed(3) }}</template>
        </v-data-table>
      </v-card>
    </template>

    <!-- Save group dialog -->
    <v-dialog v-model="saveGroupDialog" max-width="400">
      <v-card>
        <v-card-title>Signal-Gruppe speichern</v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-text-field
            v-model="groupNameInput"
            label="Name"
            variant="outlined"
            density="comfortable"
            autofocus
            hide-details
            @keyup.enter="confirmSaveGroup"
          ></v-text-field>
          <p class="text-caption text-medium-emphasis mt-2">
            Speichert die {{ groupSaveTarget?.selectedIndices.length || 0 }} aktuell ausgewählten
            Signale (nach Name, funktioniert auch bei anderen Dateien mit denselben Kanälen).
          </p>
          <v-alert v-if="groupSaveError" type="error" variant="tonal" density="compact" class="mt-2">
            {{ groupSaveError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="saveGroupDialog = false">Abbrechen</v-btn>
          <v-btn color="primary" variant="flat" @click="confirmSaveGroup">Speichern</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Cloud file picker -->
    <v-dialog v-model="cloudDialog" max-width="560">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-cloud</v-icon>
          Aus Cloud hinzufügen
        </v-card-title>
        <v-divider></v-divider>
        <div v-if="cloudDialogLoading" class="d-flex justify-center pa-8">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>
        <template v-else-if="cloudFiles.length">
          <div class="d-flex align-center ga-2 px-4 py-2">
            <v-checkbox-btn
              :model-value="allCloudSelected"
              :indeterminate="selectedCloudIds.length > 0 && !allCloudSelected"
              density="compact"
              aria-label="Alle auswählen"
              @update:model-value="toggleSelectAllCloud"
            ></v-checkbox-btn>
            <span class="text-caption text-medium-emphasis">
              {{ selectedCloudIds.length > 0 ? `${selectedCloudIds.length} ausgewählt` : "Alle auswählen" }}
            </span>
            <v-spacer></v-spacer>
            <v-btn
              v-if="selectedCloudIds.length > 0"
              size="small"
              color="primary"
              variant="flat"
              prepend-icon="mdi-plus"
              :loading="bulkCloudAdding"
              @click="addSelectedFromCloud"
            >
              Ausgewählte hinzufügen
            </v-btn>
          </div>
          <v-divider></v-divider>
          <v-list density="comfortable" style="max-height: 420px; overflow-y: auto">
            <v-list-item v-for="f in cloudFiles" :key="f.id">
              <template #prepend>
                <v-checkbox-btn
                  :model-value="selectedCloudIds.includes(f.id)"
                  :disabled="mtStore.compareFiles.some((c) => c.name === f.name)"
                  :aria-label="`${f.name} auswählen`"
                  density="compact"
                  class="mr-1"
                  @update:model-value="toggleCloudSelection(f.id)"
                ></v-checkbox-btn>
              </template>
              <v-list-item-title>{{ f.name }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ f.signal_count }} Signale · {{ (f.size_bytes / 1024).toFixed(0) }} KB
              </v-list-item-subtitle>
              <template #append>
                <v-btn
                  size="small"
                  variant="text"
                  prepend-icon="mdi-plus"
                  :loading="cloudBusyId === f.id"
                  :disabled="mtStore.compareFiles.some((c) => c.name === f.name)"
                  @click="addFromCloud(f)"
                >
                  {{ mtStore.compareFiles.some((c) => c.name === f.name) ? "Hinzugefügt" : "Hinzufügen" }}
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
        </template>
        <v-card-text v-else-if="!cloudDialogLoading" class="text-center text-medium-emphasis pa-6">
          Keine Dateien in der Cloud.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="cloudDialog = false">Schließen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import EmptyState from "../../components/EmptyState.vue";
import { useMesstoolStore } from "../../stores/messtoolStore.js";
import { showToast, showUndoToast } from "../../composables/useToast.js";
import * as A from "../../utils/messtoolAnalysis.js";
import { computeFftOffMainThread } from "../../utils/computeFftOffMainThread.js";
import { formatClockTime, decodeLatin1 } from "../../utils/messtoolParser.js";
import { parseCsvOffMainThread } from "../../utils/parseCsvOffMainThread.js";
import { downsample } from "../../utils/downsample.js";
import { applyFilter } from "../../utils/messtoolFilter.js";
import { findBestOffset } from "../../utils/crossCorrelate.js";
import { correlateSeries } from "../../utils/correlation.js";
import * as groupsApi from "../../utils/messtoolSignalGroups.js";
import * as mtStorage from "../../utils/messtoolStorage.js";
import { withTimeout } from "../../utils/withTimeout.js";
import { useSignalMergeGroups } from "../../composables/useSignalMergeGroups.js";
import { buildLineChartConfig, emptyLineChartConfig } from "../../utils/lineChartConfig.js";
import ChartCard from "./ChartCard.vue";
import HelpIconButton from "../../components/HelpIconButton.vue";
import MtQuickNav from "./MtQuickNav.vue";

defineEmits(["navigate"]);

const mtStore = useMesstoolStore();

// Deleting a file (or all of them) from the comparison is easy to do by
// accident — one misplaced click and the whole setup (offsets, merge
// groups, filter settings on it) is gone. Snapshot before removing, offer
// a real "Rückgängig" for a few seconds instead of it just being final.
function removeCompareFileWithUndo(f) {
  const index = mtStore.compareFiles.findIndex((cf) => cf.id === f.id);
  if (index === -1) return;
  const [removed] = mtStore.compareFiles.splice(index, 1);
  showUndoToast(`"${f.name}" aus der Anzeige entfernt.`, () => {
    mtStore.compareFiles.splice(index, 0, removed);
  });
}

function clearCompareWithUndo() {
  const count = mtStore.compareFiles.length;
  const snapshot = [...mtStore.compareFiles];
  mtStore.clearCompare();
  showUndoToast(`${count} Datei(en) aus der Anzeige entfernt.`, () => {
    mtStore.compareFiles.push(...snapshot);
  });
}

const fileInput = ref(null);
const errorMsg = ref("");
const displayMode = ref("overlay"); // 'overlay' | 'stacked'
const xAxisMode = ref("zeit"); // 'zeit' (elapsed seconds) | 'uhrzeit' (real clock time)
const bigMode = ref(false); // show every chart bigger, one page's worth at a time
const fullWidthPlots = ref(true); // stacked charts: full width (default, unchanged) vs. two side by side
const syncCursors = ref(false); // cursors placed on one Gestapelt chart appear on all of them
const syncZoom = ref(true); // zoom/pan on one Gestapelt chart applies to all of them (existing default behavior)

const showFrequencyResponse = ref(false);

// FFT (Hann window) of every currently compared signal's full-resolution
// data — NOT the downsampled data the time-domain charts use, since
// downsampling for display would distort the actual spectral content.
// Runs off the main thread (see computeFftOffMainThread.js) so toggling
// this on with several long signals compared doesn't freeze the tab —
// only recomputes when the toggle is on and compareSeries changes.
const freqSpectra = ref([]);
const freqComputing = ref(false);
let freqComputeToken = 0;
watch(
  [showFrequencyResponse, () => mtStore.compareSeries],
  async () => {
    if (!showFrequencyResponse.value || !mtStore.compareSeries.length) {
      freqSpectra.value = [];
      freqComputing.value = false;
      return;
    }
    const token = ++freqComputeToken;
    freqComputing.value = true;
    const series = mtStore.compareSeries.map((s) => ({ key: s.key, y: s.signal.data, t: s.time }));
    const results = await computeFftOffMainThread(series, { windowType: "hann", normalize: true });
    if (token !== freqComputeToken) return; // a newer computation started while this one was running
    const byKey = new Map(results.map((r) => [r.key, r]));
    freqSpectra.value = mtStore.compareSeries
      .map((s) => {
        const r = byKey.get(s.key);
        if (!r) return null;
        return { key: s.key, label: `${s.fileName} — ${s.signal.name}`, color: s.color, ...r };
      })
      .filter(Boolean);
    freqComputing.value = false;
  },
  { immediate: true },
);

function freqChartConfig(field, yLabel) {
  // Reads freqSpectra.value here (not just inside the returned closure)
  // so this outer computed actually tracks it as a dependency and
  // produces a fresh closure — the same "config function identity never
  // changes, so ChartCard never rebuilds" bug fixed earlier for
  // xAxisMode/Uhrzeit would otherwise bite here too.
  void freqSpectra.value;
  return () => {
    const spectra = freqSpectra.value;
    if (!spectra.length) return emptyLineChartConfig();
    return buildLineChartConfig({
      datasets: spectra.map((sp) => ({
        label: sp.label,
        data: sp.freq.map((f, i) => ({ x: f, y: sp[field][i] })),
        borderColor: sp.color,
        backgroundColor: sp.color,
        borderWidth: 1.5,
        pointRadius: 0,
      })),
      parsing: false,
      xTitle: "Frequenz [Hz] (log)",
      xScale: { type: "logarithmic" },
      yTitle: yLabel,
    });
  };
}

const freqAmplitudeConfig = computed(() => freqChartConfig("amp", "Amplitude"));
const freqPhaseConfig = computed(() => freqChartConfig("phaseDeg", "Phase [°]"));

// Merge-group logic for the Gestapelt view (letting e.g. plot #3 share a
// chart with #1) lives in useSignalMergeGroups.js — a self-contained
// algorithm over mtStore.compareSeries that never touches Chart.js or
// anything else on this page.
const {
  groupLeaderKeys,
  canJoinGroup,
  isGroupLeader,
  isInGroup,
  toggleGroupMembership,
  stackedGroups,
} = useSignalMergeGroups(computed(() => mtStore.compareSeries));
void groupLeaderKeys; // exposed by the composable, not read directly here — the menu checks canJoinGroup() per-series instead

// Elapsed-time-to-clock offset for a series: clockSec[i] ≈ time[i] +
// clockOffset, assuming a steady sample rate (reasonable — big gaps are
// already flagged separately by the quality check). Used to relabel the
// x-axis ticks as real clock time without touching where points are
// actually plotted.
function clockOffsetFor(s) {
  if (!s?.clockSec?.length || !s?.time?.length) return null;
  const c0 = s.clockSec[0];
  const t0 = s.time[0];
  if (c0 == null || t0 == null) return null;
  return c0 - t0;
}

// One config per series for the "Gestapelt" view — same data as the
// overlay, just one signal per chart instead of superimposed. Points
// Sample rate for filtering — prefer the file's own detected rate (from
// its timestamp analysis at import time), falling back to computing it
// from the time array's average spacing if that's not available.
function sampleRateFor(f) {
  const info = f.parsed.meta?.sampleRateInfo;
  if (info?.detectedFs) return info.detectedFs;
  const t = f.parsed.time;
  if (t.length > 1) {
    const dt = (t[t.length - 1] - t[0]) / (t.length - 1);
    return dt > 0 ? 1 / dt : 100;
  }
  return 100;
}

// The in-place filter option for Gestapelt (see the per-file "Filter
// anwenden" switch) — applies the file's own filter settings to this
// series and renders it as its own chart, same shape as stackedConfig.
function filteredStackedConfig(s, f) {
  return (peakMode) => {
    const rawY = s.signal.data.map((v) => (v == null ? 0 : v));
    let filtered;
    try {
      filtered = applyFilter(rawY, {
        order: f.filterSettings.order,
        cutoffHz: f.filterSettings.cutoff,
        cutoff2Hz: f.filterSettings.cutoff2,
        sampleRate: sampleRateFor(f),
        btype: f.filterSettings.btype,
        characteristic: f.filterSettings.characteristic,
      });
    } catch {
      filtered = rawY;
    }
    const d = downsample(filtered, s.time, peakMode ? "minmax" : "simple", 800);
    const off = s.offsetSec || 0;
    const points = d.rx.map((x, i) => ({
      x: x + off,
      y: d.ry[i],
      clock: s.clockSec ? s.clockSec[d.indices[i]] : null,
    }));

    const useClock = xAxisMode.value === "uhrzeit";
    const clockOffset = useClock ? clockOffsetFor(s) : null;

    return buildLineChartConfig({
      datasets: [{
        label: `${s.signal.name} gefiltert [${s.signal.unit || "-"}]`,
        data: points,
        borderColor: "#FF6B35",
        backgroundColor: "#FF6B35",
        borderWidth: 1.5,
        pointRadius: 0,
      }],
      parsing: false,
      xTitle: useClock ? "Uhrzeit" : "Zeit [s]",
      xScale: {
        type: "linear",
        ticks: clockOffset != null
          ? { callback: (val) => formatClockTime(val + clockOffset) }
          : {},
      },
      yTitle: s.signal.unit || "Wert",
    });
  };
}

// Expands each selected series into one or two charts for the Gestapelt
// view, depending on that file's "Filter anwenden" / "Nur gefiltert"
// settings: original only (default, filter off), both stacked (filter
// on, default), or filtered only. Groups of >1 (via mergeGroupOf) render
// as a single chart with one dataset per member instead.
const stackedRenderItems = computed(() => {
  // stackedConfig()/filteredStackedConfig()/mergedStackedConfig() only
  // read xAxisMode inside the closure they return (evaluated later by
  // ChartCard), so Vue's computed dependency tracking never sees it
  // accessed *here* — toggling Zeit/Uhrzeit silently did nothing in the
  // Gestapelt view because this computed (and therefore item.config's
  // function identity) never re-ran. Read it here too, same fix already
  // used in overlayConfig.
  void xAxisMode.value;
  const items = [];
  for (const { anchorKey, members: group } of stackedGroups.value) {
    if (group.length === 1) {
      const s = group[0];
      const f = mtStore.compareFiles.find((cf) => cf.id === s.fileId);
      const useFilter = !!f?.useFilter;
      const filterOnly = !!f?.filterOnly;

      if (!useFilter || !filterOnly) {
        items.push({
          key: `${s.key}:orig`,
          title: `${s.fileName} — ${s.signal.name} [${s.signal.unit || "-"}]`,
          config: stackedConfig(s),
          members: group,
          anchorKey,
        });
      }
      if (useFilter) {
        items.push({
          key: `${s.key}:filtered`,
          title: `${s.fileName} — ${s.signal.name} (gefiltert)`,
          config: filteredStackedConfig(s, f),
          members: group,
          anchorKey,
        });
      }
    } else {
      items.push({
        key: `${anchorKey}:merged`,
        title: group.map((s) => `${s.fileName} — ${s.signal.name}`).join("  +  "),
        config: mergedStackedConfig(group),
        members: group,
        anchorKey,
      });
    }
  }
  return items;
});

// One chart, one dataset per member series — same shape/behavior as the
// overlay chart (offset, second axis, per-file in-place filter) but
// scoped to just the signals merged into this particular Gestapelt slot.
function mergedStackedConfig(members) {
  return (peakMode) => {
    const datasets = [];
    for (const s of members) {
      const f = mtStore.compareFiles.find((cf) => cf.id === s.fileId);
      const useFilter = !!f?.useFilter;
      const filterOnly = !!f?.filterOnly;
      const off = s.offsetSec || 0;

      if (!useFilter || !filterOnly) {
        const y = s.signal.data.map((v) => (v == null ? null : v));
        const d = downsample(y, s.time, peakMode ? "minmax" : "simple", 800);
        datasets.push({
          label: `${s.fileName} — ${s.signal.name} [${s.signal.unit || "-"}]`,
          data: d.rx.map((x, i) => ({ x: x + off, y: d.ry[i], clock: s.clockSec ? s.clockSec[d.indices[i]] : null })),
          borderColor: s.color,
          backgroundColor: s.color,
          borderWidth: 1.5,
          pointRadius: 0,
          yAxisID: s.useSecondAxis ? "y1" : "y",
        });
      }
      if (useFilter) {
        const rawY = s.signal.data.map((v) => (v == null ? 0 : v));
        let filtered;
        try {
          filtered = applyFilter(rawY, {
            order: f.filterSettings.order,
            cutoffHz: f.filterSettings.cutoff,
            cutoff2Hz: f.filterSettings.cutoff2,
            sampleRate: sampleRateFor(f),
            btype: f.filterSettings.btype,
            characteristic: f.filterSettings.characteristic,
          });
        } catch {
          filtered = rawY;
        }
        const fD = downsample(filtered, s.time, peakMode ? "minmax" : "simple", 800);
        datasets.push({
          label: `${s.fileName} — ${s.signal.name} gefiltert [${s.signal.unit || "-"}]`,
          data: fD.rx.map((x, i) => ({ x: x + off, y: fD.ry[i] })),
          borderColor: "#FF6B35",
          backgroundColor: "#FF6B35",
          borderWidth: 1.5,
          pointRadius: 0,
          yAxisID: s.useSecondAxis ? "y1" : "y",
        });
      }
    }

    const useClock = xAxisMode.value === "uhrzeit";
    const clockOffset = useClock ? clockOffsetFor(members[0]) : null;

    const extraScales = {};
    if (members.some((s) => s.useSecondAxis)) {
      extraScales.y1 = {
        position: "right",
        title: { display: true, text: "Wert (rechte Achse)" },
        grid: { drawOnChartArea: false },
      };
    }

    return buildLineChartConfig({
      datasets,
      parsing: false,
      xTitle: useClock ? "Uhrzeit" : "Zeit [s]",
      xScale: {
        type: "linear",
        ticks: clockOffset != null ? { callback: (val) => formatClockTime(val + clockOffset) } : {},
      },
      yTitle: "Wert",
      extraScales,
    });
  };
}

// carry the file's real clock time (see messtoolParser's clockSec)
// alongside elapsed seconds, so ChartCard's tooltip can show both.
function stackedConfig(s) {
  return (peakMode) => {
    const y = s.signal.data.map((v) => (v == null ? null : v));
    const d = downsample(y, s.time, peakMode ? "minmax" : "simple", 800);
    const off = s.offsetSec || 0;
    const points = d.rx.map((x, i) => ({
      x: x + off,
      y: d.ry[i],
      clock: s.clockSec ? s.clockSec[d.indices[i]] : null,
    }));

    const useClock = xAxisMode.value === "uhrzeit";
    const clockOffset = useClock ? clockOffsetFor(s) : null;

    return buildLineChartConfig({
      datasets: [{
        label: `${s.signal.name} [${s.signal.unit || "-"}]`,
        data: points,
        borderColor: s.color,
        backgroundColor: s.color,
        borderWidth: 1.5,
        pointRadius: 0,
      }],
      parsing: false,
      xTitle: useClock ? "Uhrzeit" : "Zeit [s]",
      xScale: {
        type: "linear",
        ticks: clockOffset != null
          ? { callback: (val) => formatClockTime(val + clockOffset) }
          : {},
      },
      yTitle: s.signal.unit || "Wert",
    });
  };
}
const signalGroups = ref(groupsApi.listGroups());
const saveGroupDialog = ref(false);
const groupNameInput = ref("");
const groupSaveError = ref("");
const groupSaveTarget = ref(null);

function openSaveGroupDialog(f) {
  groupSaveTarget.value = f;
  groupNameInput.value = "";
  groupSaveError.value = "";
  saveGroupDialog.value = true;
}

function confirmSaveGroup() {
  const f = groupSaveTarget.value;
  if (!f) return;
  try {
    const names = f.selectedIndices.map((i) => f.parsed.signals[i]?.name).filter(Boolean);
    signalGroups.value = groupsApi.saveGroup(groupNameInput.value, names);
    saveGroupDialog.value = false;
    showToast(`Gruppe "${groupNameInput.value}" gespeichert.`);
  } catch (err) {
    groupSaveError.value = err.message || "Konnte Gruppe nicht speichern.";
  }
}

function applyGroup(f, group) {
  const matched = groupsApi.resolveGroupIndices(group, f.parsed.signals);
  if (!matched.length) {
    errorMsg.value = `Keines der Signale aus "${group.name}" ist in "${f.name}" vorhanden.`;
    return;
  }
  f.selectedIndices = matched;
  showToast(`Gruppe "${group.name}" angewendet (${matched.length} Signal(e)).`, { color: "info" });
}

function removeGroup(name) {
  const groupsBefore = groupsApi.listGroups(); // snapshot for undo — deleteGroup only returns what's left
  const removed = groupsBefore.find((g) => g.name === name);
  signalGroups.value = groupsApi.deleteGroup(name);
  showUndoToast(`Gruppe "${name}" gelöscht.`, () => {
    if (removed) signalGroups.value = groupsApi.saveGroup(removed.name, removed.signalNames);
  });
}
const alignConfidence = ref({}); // { [fileId]: score } from the last auto-align run
const cloudDialog = ref(false);
const cloudDialogLoading = ref(false);
const cloudFiles = ref([]);
const cloudBusyId = ref(null);
const selectedCloudIds = ref([]);
const bulkCloudAdding = ref(false);

// Only files not already in the comparison list count towards "select
// all" / are selectable at all — an already-added file has nothing left
// to do here (its row's checkbox and "Hinzufügen" button are disabled).
const selectableCloudFiles = computed(() =>
  cloudFiles.value.filter((f) => !mtStore.compareFiles.some((c) => c.name === f.name)),
);
const allCloudSelected = computed(() =>
  selectableCloudFiles.value.length > 0 &&
  selectableCloudFiles.value.every((f) => selectedCloudIds.value.includes(f.id)),
);

function toggleCloudSelection(id) {
  selectedCloudIds.value = selectedCloudIds.value.includes(id)
    ? selectedCloudIds.value.filter((x) => x !== id)
    : [...selectedCloudIds.value, id];
}

function toggleSelectAllCloud(checked) {
  selectedCloudIds.value = checked ? selectableCloudFiles.value.map((f) => f.id) : [];
}

function addCurrent() {
  if (!mtStore.parsed) return;
  const name = mtStore.fileName || "Aktuelle Datei";
  const added = mtStore.addCompareFile(name, mtStore.parsed, {
    messfileId: mtStore.messfileId,
    storagePath: mtStore.messfileStoragePath,
  });
  if (!added) errorMsg.value = `"${name}" ist bereits in der Liste.`;
}

async function onFileSelect(e) {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;
  try {
    const buffer = await file.arrayBuffer();
    const text = decodeLatin1(buffer);
    const result = await parseCsvOffMainThread(text, {});
    if (result.signals.length === 0) throw new Error("Keine Signale gefunden.");
    const added = mtStore.addCompareFile(file.name, result);
    if (!added) errorMsg.value = `"${file.name}" ist bereits in der Liste.`;
  } catch (err) {
    errorMsg.value = err.message || "Datei konnte nicht gelesen werden.";
  }
}

async function openCloudDialog() {
  cloudDialog.value = true;
  selectedCloudIds.value = [];
  cloudDialogLoading.value = true;
  try {
    cloudFiles.value = await withTimeout(mtStorage.listMessfiles(), 25000, "Zeitüberschreitung beim Laden der Cloud-Liste.");
  } catch (err) {
    errorMsg.value = err.message || "Cloud-Liste konnte nicht geladen werden.";
  } finally {
    cloudDialogLoading.value = false;
  }
}

async function addFromCloud(f) {
  cloudBusyId.value = f.id;
  try {
    const buffer = await withTimeout(mtStorage.downloadMessfile(f.storage_path), 25000, `"${f.name}": Zeitüberschreitung beim Download.`);
    const text = decodeLatin1(buffer);
    const result = await parseCsvOffMainThread(text, {});
    mtStore.addCompareFile(f.name, result, { messfileId: f.id, storagePath: f.storage_path });
  } catch (err) {
    errorMsg.value = err.message || "Datei konnte nicht geladen werden.";
  } finally {
    cloudBusyId.value = null;
  }
}

// Bulk version of addFromCloud — downloads/parses/adds every selected
// file in sequence (same "list of failures instead of failing everything"
// approach as Import's addSelectedToCompare), so ticking a batch of
// checkboxes doesn't require clicking "Hinzufügen" once per file.
async function addSelectedFromCloud() {
  const files = cloudFiles.value.filter((f) => selectedCloudIds.value.includes(f.id));
  if (!files.length) return;
  bulkCloudAdding.value = true;
  errorMsg.value = "";
  const failed = [];
  for (const f of files) {
    if (mtStore.compareFiles.some((c) => c.name === f.name)) continue; // already added
    try {
      const buffer = await withTimeout(mtStorage.downloadMessfile(f.storage_path), 25000, `"${f.name}": Zeitüberschreitung beim Download.`);
      const text = decodeLatin1(buffer);
      const result = await parseCsvOffMainThread(text, {});
      mtStore.addCompareFile(f.name, result, { messfileId: f.id, storagePath: f.storage_path });
    } catch {
      failed.push(f.name);
    }
  }
  bulkCloudAdding.value = false;
  selectedCloudIds.value = [];
  if (failed.length) {
    errorMsg.value = "Nicht hinzugefügt: " + failed.join(", ");
  } else {
    showToast(`${files.length} Datei(en) hinzugefügt.`);
  }
}

// Auto-align (via cross-correlation) a file's time offset against the
// *first* file in the list, using each one's first selected signal as
// the representative "shape" to match on. Low-confidence matches (the
// two signals don't share a recognizable common event) get flagged
// instead of silently applying a probably-meaningless offset.
function autoAlignFile(f) {
  const ref = mtStore.compareFiles[0];
  if (!ref || ref.id === f.id) return;
  const refSig = ref.parsed.signals[ref.selectedIndices[0]];
  const targetSig = f.parsed.signals[f.selectedIndices[0]];
  if (!refSig || !targetSig) return;

  const { offsetSec, confidence } = findBestOffset(
    ref.parsed.time, refSig.data.map((v) => v ?? 0),
    f.parsed.time, targetSig.data.map((v) => v ?? 0),
  );
  f.offsetSec = +offsetSec.toFixed(2);
  alignConfidence.value = { ...alignConfidence.value, [f.id]: confidence };
}

// How many "advanced" per-file options are currently switched on — shown
// as a small badge on the "Erweitert" button so it's obvious at a glance
// that something in there is active, without having to open the menu.
function advancedActiveCount(f) {
  let n = 0;
  if (f.useSecondAxis) n++;
  if (f.autoAlign) n++;
  if (f.useFilter) n++;
  return n;
}

function signalOptions(f) {
  return f.parsed.signals.map((s, i) => ({ title: `${s.name} [${s.unit || "-"}]`, value: i }));
}

// How similar is this file's (first selected) signal to the first file's,
// as an actual number rather than just "looks similar overlaid" — takes
// the current offsetSec into account, same as what's actually plotted.
function correlationFor(f) {
  const ref = mtStore.compareFiles[0];
  if (!ref || ref.id === f.id) return null;
  const refSig = ref.parsed.signals[ref.selectedIndices[0]];
  const targetSig = f.parsed.signals[f.selectedIndices[0]];
  if (!refSig || !targetSig) return null;
  const off = f.offsetSec || 0;
  const targetTimeShifted = f.parsed.time.map((t) => t + off);
  return correlateSeries(
    ref.parsed.time, refSig.data.map((v) => v ?? 0),
    targetTimeShifted, targetSig.data.map((v) => v ?? 0),
  );
}

// Looks up the color a given (file, signal-index) pair got assigned in
// mtStore.compareSeries, so the chips in the multi-select match the
// chart/stats colors exactly.
function colorForSeries(fileId, idx) {
  const found = mtStore.compareSeries.find((s) => s.fileId === fileId && s.signalIdx === idx);
  return found ? found.color : "grey";
}

// Overlay chart: linear x-axis with {x,y} points per dataset, so series
// with different durations/sample counts still line up correctly on time.
// One dataset per (file, signal) pair from compareSeries — so two signals
// picked from the same file each get their own line here too.
const overlayConfig = computed(() => {
  const series = mtStore.compareSeries;
  void xAxisMode.value; // read here so toggling Zeit/Uhrzeit triggers a rebuild
  return (peakMode) => {
    const datasets = series.map((s) => {
      const y = s.signal.data.map((v) => (v == null ? null : v));
      const d = downsample(y, s.time, peakMode ? "minmax" : "simple", 800);
      const off = s.offsetSec || 0;
      const points = d.rx.map((x, i) => ({
        x: x + off,
        y: d.ry[i],
        clock: s.clockSec ? s.clockSec[d.indices[i]] : null,
      }));
      const offsetSuffix = off ? ` (${off > 0 ? "+" : ""}${off}s)` : "";
      const axisSuffix = s.useSecondAxis ? " ▸ rechte Achse" : "";
      const label = `${s.fileName} — ${s.signal.name} [${s.signal.unit || "-"}]${offsetSuffix}${axisSuffix}`;
      return {
        label,
        data: points,
        borderColor: s.color,
        backgroundColor: s.color,
        borderWidth: 1.5,
        pointRadius: 0,
        yAxisID: s.useSecondAxis ? "y1" : "y",
      };
    });

    const useClock = xAxisMode.value === "uhrzeit";
    const clockOffset = useClock ? clockOffsetFor(series[0]) : null;

    const extraScales = {};
    // Only add the right-hand axis if at least one series actually uses
    // it — otherwise an empty second axis would just clutter the chart.
    if (series.some((s) => s.useSecondAxis)) {
      extraScales.y1 = {
        position: "right",
        title: { display: true, text: "Wert (rechte Achse)" },
        grid: { drawOnChartArea: false }, // avoid a doubled-up gridline mess
      };
    }

    return buildLineChartConfig({
      datasets,
      parsing: false,
      xTitle: useClock ? "Uhrzeit" : "Zeit [s]",
      xScale: {
        type: "linear",
        ticks: clockOffset != null
          ? { callback: (val) => formatClockTime(val + clockOffset) }
          : {},
      },
      yTitle: "Wert",
      extraScales,
    });
  };
});

const statHeaders = [
  { title: "Datei", key: "name" },
  { title: "Signal", key: "signalLabel" },
  { title: "Mittel", key: "mean", align: "end" },
  { title: "RMS", key: "rms", align: "end" },
  { title: "Std", key: "std", align: "end" },
  { title: "Min", key: "min", align: "end" },
  { title: "Max", key: "max", align: "end" },
];

const statRows = computed(() =>
  mtStore.compareSeries.map((s) => {
    const y = s.signal.data.filter((v) => v != null && Number.isFinite(v));
    const mm = A.minMax(y);
    return {
      id: s.key,
      name: s.fileName,
      color: s.color,
      signalLabel: `${s.signal.name} [${s.signal.unit || "-"}]`,
      // Raw numbers so the table sorts numerically, not lexically —
      // formatted for display via the #item.mean etc. templates.
      mean: A.mean(y),
      rms: A.rms(y),
      std: A.stddev(y),
      min: mm.min,
      max: mm.max,
    };
  }),
);

onBeforeUnmount(() => {
  errorMsg.value = "";
});
</script>

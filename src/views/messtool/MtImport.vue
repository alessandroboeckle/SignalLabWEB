<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-file-upload</v-icon>
      <h2 class="text-h5 font-weight-bold">Import</h2>
    
      <v-spacer></v-spacer>
      <HelpIconButton section="messtool-import" label="Import" />
    </div>
    <p class="text-medium-emphasis mb-6">Messdatei laden (LOGDATA-CSV oder Excel/.xlsx)</p>

    <v-alert
      v-if="showWorkflowHint"
      type="info"
      variant="tonal"
      density="comfortable"
      closable
      class="mb-4"
      @click:close="showWorkflowHint = false"
    >
      <strong>So geht's:</strong> Datei laden (unten reinziehen oder aus der Cloud öffnen) →
      optional filtern/verarbeiten → auf <strong>Analyse</strong> auswerten oder unter
      <strong>Anzeige</strong> mit anderen Dateien vergleichen → bei Bedarf <strong>exportieren</strong>.
    </v-alert>

    <MtQuickNav
      v-if="lastFile || mtStore.parsed"
      :items="[
        { target: 'mt-filter', label: 'Filter', icon: 'mdi-tune-variant' },
        { target: 'mt-analyse', label: 'Analyse', icon: 'mdi-chart-bell-curve' },
      ]"
      @navigate="$emit('navigate', $event)"
    />

    <div v-if="recentFiles.some((f) => f.storagePath)" class="mb-4">
      <div class="text-caption text-medium-emphasis mb-1">Zuletzt geöffnet</div>
      <div class="d-flex flex-wrap ga-2">
        <v-chip
          v-for="f in recentFiles.filter((r) => r.storagePath)"
          :key="f.name"
          variant="outlined"
          prepend-icon="mdi-history"
          :disabled="busyId === f.messfileId"
          @click="openRecentFile(f)"
        >
          {{ f.name }}
        </v-chip>
      </div>
    </div>

    <v-alert
      v-if="mtStore.sessionRestored"
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-4"
      closable
      @click:close="mtStore.dismissRestoredNotice()"
    >
      Sitzung wiederhergestellt: <strong>{{ mtStore.fileName }}</strong> war noch geladen
      (z.B. nach einem versehentlichen Neuladen der Seite). Zum Verwerfen einfach eine neue
      Datei laden oder diesen Hinweis schliessen.
    </v-alert>
    <v-alert
      v-if="mtStore.sessionTooLargeToPersist"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      Diese Datei ist zu gross, um automatisch gesichert zu werden — bei einem Neuladen der
      Seite müsstest du sie erneut importieren.
    </v-alert>


    <!-- Dropzone -->
    <v-card
      variant="outlined"
      rounded="lg"
      class="dropzone pa-8 text-center mb-4"
      :class="{ dragging: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
      @click="fileInput?.click()"
    >
      <v-icon size="56" color="primary" class="mb-3">mdi-cloud-upload-outline</v-icon>
      <h3 class="text-h6 mb-1">Datei(en) hierher ziehen oder klicken</h3>
      <p class="text-medium-emphasis text-caption">
        CSV im LOGDATA-Messformat oder Excel (.xlsx/.xls) · mehrere auf einmal möglich — die
        erste wird geöffnet, weitere werden direkt in die Cloud hochgeladen
      </p>
      <input
        ref="fileInput"
        type="file"
        accept=".csv,.xlsx,.xls"
        multiple
        class="d-none"
        @change="onFileSelect"
      />
    </v-card>

    <!-- Excel: which sheet to import (only shown once a multi-sheet workbook was picked) -->
    <v-card v-if="excelSheets.length > 1" variant="tonal" color="primary" class="pa-4 mb-4">
      <div class="d-flex align-center flex-wrap ga-3">
        <v-icon>mdi-file-excel-outline</v-icon>
        <span class="text-body-2">"{{ excelFileName }}" hat mehrere Tabellenblätter:</span>
        <v-select
          v-model="excelSheetName"
          :items="excelSheets"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 260px"
        ></v-select>
        <v-btn size="small" color="primary" variant="flat" :loading="parsing" @click="parseChosenExcelSheet">
          Blatt laden
        </v-btn>
      </div>
    </v-card>

    <!-- Batch upload of the extra files (beyond the first) -->
    <v-card v-if="batchUpload.active || batchUpload.done > 0" variant="tonal" color="primary" class="pa-4 mb-4">
      <div class="d-flex align-center mb-2">
        <v-progress-circular v-if="batchUpload.active" indeterminate size="20" class="mr-3"></v-progress-circular>
        <v-icon v-else class="mr-3">mdi-cloud-check-outline</v-icon>
        <span>
          <template v-if="batchUpload.active">
            Lade weitere Dateien in die Cloud hoch … ({{ batchUpload.done }}/{{ batchUpload.total }})
          </template>
          <template v-else>
            {{ batchUpload.done }}/{{ batchUpload.total }} weitere Datei(en) in die Cloud hochgeladen
          </template>
        </span>
      </div>
      <v-progress-linear
        v-if="batchUpload.total"
        :model-value="(batchUpload.done / batchUpload.total) * 100"
        height="6" rounded color="primary"
      ></v-progress-linear>
      <div v-if="!batchUpload.active && batchUpload.failed.length" class="text-caption mt-2">
        Fehlgeschlagen: {{ batchUpload.failed.join(", ") }}
      </div>
      <v-btn
        v-if="!batchUpload.active && batchUpload.uploadedFiles.length"
        size="small"
        color="primary"
        variant="flat"
        prepend-icon="mdi-chart-multiple"
        class="mt-2"
        @click="compareBatchFiles"
      >
        Diese Dateien vergleichen
      </v-btn>
    </v-card>

    <!-- Cloud files (shared) -->
    <v-card variant="outlined" rounded="lg" class="mb-6">
      <v-card-title class="d-flex align-center flex-wrap ga-2">
        <v-icon class="mr-2">mdi-cloud</v-icon>
        Gespeicherte Messdateien
        <v-spacer></v-spacer>
        <template v-if="selectedCloudIds.length > 0">
          <span class="text-caption text-medium-emphasis mr-2">{{ selectedCloudIds.length }} ausgewählt</span>
          <v-btn
            size="small" color="primary" variant="flat" prepend-icon="mdi-chart-multiple"
            :loading="bulkAddingCompare"
            class="mr-2"
            @click="addSelectedToCompare"
          >
            Zur Anzeige hinzufügen
          </v-btn>
          <v-btn size="small" variant="text" @click="selectedCloudIds = []">Auswahl aufheben</v-btn>
        </template>
        <v-btn size="small" variant="text" icon="mdi-refresh" aria-label="Liste aktualisieren" :loading="loadingList" @click="loadList"></v-btn>
      </v-card-title>
      <v-card-subtitle v-if="cloudFiles.length > 0" class="pb-2">
        {{ cloudFiles.length }} Datei(en) insgesamt •
        <template v-if="auth.isAdmin">
          {{ formatBytes(totalStorageBytes) }} belegt (alle Nutzer) · eigene: {{ formatBytes(myStorageBytes) }} / {{ formatBytes(QUOTA_BYTES) }}
        </template>
        <template v-else>{{ formatBytes(myStorageBytes) }} / {{ formatBytes(QUOTA_BYTES) }} belegt</template>
        <template v-if="activeFolder !== '__all__' && folderFilteredFiles.length !== cloudFiles.length">
          — {{ activeFolderLabel }}: {{ folderFilteredFiles.length }} Datei(en), {{ formatBytes(folderStorageBytes) }}
        </template>
      </v-card-subtitle>
      <v-progress-linear
        v-if="cloudFiles.length > 0"
        :model-value="quotaUsedPct"
        :color="quotaUsedPct >= 100 ? 'error' : quotaUsedPct >= 80 ? 'warning' : 'primary'"
        height="4"
        class="mb-2"
      ></v-progress-linear>
      <v-alert v-if="quotaExceeded" type="warning" variant="tonal" density="compact" class="text-caption mx-4 mb-2">
        Speicherlimit ({{ formatBytes(QUOTA_BYTES) }}) erreicht — erst Dateien löschen, bevor du neue hochladen kannst.
      </v-alert>
      <v-divider></v-divider>
      <div v-if="cloudFiles.length === 0" class="pa-6 text-center text-medium-emphasis">
        Noch keine Dateien in der Cloud.
      </div>
      <template v-else>
        <div class="px-4 pt-3">
          <v-text-field
            v-model="fileSearchQuery"
            density="compact"
            variant="outlined"
            prepend-inner-icon="mdi-magnify"
            label="Datei- oder Signalname durchsuchen"
            clearable
            hide-details
          ></v-text-field>
        </div>
        <!-- Admin only: filter the whole list down to one user's files before
             browsing folders — otherwise everyone's files are mixed together. -->
        <div v-if="auth.isAdmin && ownerOptions.length > 0" class="d-flex flex-wrap align-center ga-2 px-4 pt-3">
          <v-icon size="18" class="text-medium-emphasis">mdi-account-filter-outline</v-icon>
          <v-chip
            :variant="selectedOwnerFilter === '__all__' ? 'flat' : 'outlined'"
            :color="selectedOwnerFilter === '__all__' ? 'secondary' : 'default'"
            size="small"
            @click="selectedOwnerFilter = '__all__'"
          >
            Alle Nutzer
          </v-chip>
          <v-chip
            v-for="o in ownerOptions"
            :key="o.id"
            :variant="selectedOwnerFilter === o.id ? 'flat' : 'outlined'"
            :color="selectedOwnerFilter === o.id ? 'secondary' : 'default'"
            size="small"
            prepend-icon="mdi-account-outline"
            @click="selectedOwnerFilter = o.id"
          >
            {{ o.label }}
          </v-chip>
        </div>
        <!-- Folder filter -->
        <div class="d-flex flex-wrap align-center ga-2 px-4 py-2">
          <v-chip
            :variant="activeFolder === '__all__' ? 'flat' : 'outlined'"
            :color="activeFolder === '__all__' ? 'primary' : 'default'"
            size="small"
            @click="activeFolder = '__all__'"
          >
            Alle ({{ searchedCloudFiles.length }})
          </v-chip>
          <v-chip
            v-if="unfiledCount > 0"
            :variant="activeFolder === '__none__' ? 'flat' : 'outlined'"
            :color="activeFolder === '__none__' ? 'primary' : 'default'"
            size="small"
            prepend-icon="mdi-folder-off-outline"
            @click="activeFolder = '__none__'"
          >
            Ohne Ordner ({{ unfiledCount }})
          </v-chip>
          <v-chip
            v-for="folder in folders"
            :key="folder"
            :variant="activeFolder === folder ? 'flat' : 'outlined'"
            :color="activeFolder === folder ? 'primary' : 'default'"
            size="small"
            prepend-icon="mdi-folder-outline"
            closable
            @click="activeFolder = folder"
            @click:close="renameOrDeleteFolder(folder)"
          >
            {{ folder }} ({{ searchedCloudFiles.filter((f) => f.folder === folder).length }})
          </v-chip>
          <v-btn size="small" variant="outlined" prepend-icon="mdi-folder-plus-outline" @click="showCreateFolderDialog = true">
            Ordner erstellen
          </v-btn>
        </div>
        <v-divider></v-divider>

        <div class="d-flex align-center ga-2 px-4 py-2">
          <v-checkbox-btn
            :model-value="allCloudFilesSelected"
            :indeterminate="selectedCloudIds.length > 0 && !allCloudFilesSelected"
            density="compact"
            aria-label="Alle auswählen"
            @update:model-value="toggleSelectAllCloudFiles"
          ></v-checkbox-btn>
          <span class="text-caption text-medium-emphasis">Alle auswählen</span>
        </div>
        <v-divider></v-divider>

        <!-- "Alle" gets real folder structure — a collapsible section per
             folder (+ "Ohne Ordner"), each date-grouped inside — instead
             of just a flat chronological list with filter chips as the
             only sense of organization. Filtering to one specific folder
             via the chips above skips this extra layer since it'd just
             be one section containing everything anyway. -->
        <div v-if="searchedCloudFiles.length === 0 && fileSearchQuery" class="pa-6 text-center text-medium-emphasis">
          Keine Dateien gefunden für "{{ fileSearchQuery }}".
        </div>
        <v-expansion-panels v-else-if="activeFolder === '__all__'" v-model="openFolderSections" multiple variant="accordion">
          <v-expansion-panel v-for="section in folderSections" :key="section.key" :value="section.key">
            <v-expansion-panel-title>
              <v-icon size="18" class="mr-2">{{ section.key === "__none__" ? "mdi-folder-off-outline" : "mdi-folder-outline" }}</v-icon>
              <span class="font-weight-medium">{{ section.label }}</span>
              <span class="text-caption text-medium-emphasis ml-2">
                {{ section.files.length }} Datei(en) • {{ formatBytes(section.bytes) }}
              </span>
            </v-expansion-panel-title>
            <v-expansion-panel-text class="pa-0">
              <template v-for="group in groupByDate(section.files)" :key="group.label">
                <div class="text-caption text-medium-emphasis font-weight-bold px-4 pt-3 pb-1">
                  {{ group.label }}
                </div>
                <CloudFileRow
                  v-for="f in group.items"
                  :key="f.id"
                  :file="f"
                  :selected="selectedCloudIds.includes(f.id)"
                  :folders="folders"
                  :adding="compareAddingId === f.id"
                  :opening="busyId === f.id"
                  :format-date="formatDate"
                  :show-folder-chip="false"
                  :owner-label="ownerUsername(f)"
                  @toggle-select="toggleCloudSelection(f.id)"
                  @move-folder="(val) => moveFileToFolder(f, val)"
                  @add-to-compare="addCloudFileToCompare(f)"
                  @open="openCloudFile(f)"
                  @remove="removeCloudFile(f)"
                />
              </template>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <template v-else>
          <div v-if="folderFilteredFiles.length === 0" class="pa-6 text-center text-medium-emphasis">
            Keine Dateien gefunden{{ fileSearchQuery ? ` für "${fileSearchQuery}"` : "" }} in diesem Ordner.
          </div>
          <template v-for="group in groupedCloudFiles" :key="group.label">
            <div class="text-caption text-medium-emphasis font-weight-bold px-4 pt-3 pb-1">
              {{ group.label }}
            </div>
            <CloudFileRow
              v-for="f in group.items"
              :key="f.id"
              :file="f"
              :selected="selectedCloudIds.includes(f.id)"
              :folders="folders"
              :adding="compareAddingId === f.id"
              :opening="busyId === f.id"
              :format-date="formatDate"
              :owner-label="ownerUsername(f)"
              @toggle-select="toggleCloudSelection(f.id)"
              @move-folder="(val) => moveFileToFolder(f, val)"
              @add-to-compare="addCloudFileToCompare(f)"
              @open="openCloudFile(f)"
              @remove="removeCloudFile(f)"
            />
          </template>
        </template>
      </template>
    </v-card>

    <!-- Advanced import settings -->
    <v-card variant="outlined" rounded="lg" class="mb-6">
      <v-card-title class="d-flex align-center py-2">
        <v-icon class="mr-2" size="20">mdi-tune</v-icon>
        <span class="text-body-1">Erweiterte Einstellungen</span>
        <v-spacer></v-spacer>
        <v-switch
          v-model="advancedMode"
          color="primary"
          density="compact"
          hide-details
          @click.stop
        ></v-switch>
      </v-card-title>
      <v-expand-transition>
        <div v-if="advancedMode">
          <v-divider></v-divider>
          <v-card-text>
            <p class="text-caption text-medium-emphasis mb-3">
              Ohne Angabe wird wie bisher die ganze Datei mit automatischer Zeitachse geladen.
              Lädst du mehrere Dateien gleichzeitig, gelten diese Einstellungen für alle.
              Bei Excel-Dateien (.xlsx/.xls) gelten Start/End Spalte über die Signalspalten
              (ohne die Zeitspalte); die Zeitspalte wird automatisch anhand des Namens "Time"
              erkannt.
            </p>
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="startRow"
                  label="Start Reihe"
                  placeholder="z.B. 1"
                  variant="outlined"
                  density="comfortable"
                  type="number"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="endRow"
                  label="End Reihe"
                  placeholder="z.B. 10000"
                  variant="outlined"
                  density="comfortable"
                  type="number"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="startCol"
                  label="Start Spalte"
                  placeholder="z.B. 1 / A"
                  variant="outlined"
                  density="comfortable"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="endCol"
                  label="End Spalte"
                  placeholder="z.B. 100 / CC"
                  variant="outlined"
                  density="comfortable"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="sampleFrequenz"
                  label="Samplefrequenz"
                  placeholder="z.B. 20 (leer = aus Zeitstempel)"
                  variant="outlined"
                  density="comfortable"
                  type="number"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="windowTypeImport"
                  :items="windowOptions"
                  label="Fenstertyp (FFT, für Analyse)"
                  variant="outlined"
                  density="comfortable"
                ></v-select>
              </v-col>
            </v-row>
          </v-card-text>
        </div>
      </v-expand-transition>
    </v-card>

    <!-- Parsing indicator -->
    <v-card v-if="parsing" variant="tonal" color="primary" class="pa-4 mb-6">
      <div class="d-flex align-center mb-2">
        <v-progress-circular
          v-if="importProgress === 0"
          indeterminate
          size="24"
          class="mr-3"
        ></v-progress-circular>
        <span>Datei wird geparst{{ importProgress > 0 ? ` … ${importProgress}%` : " …" }}</span>
      </div>
      <v-progress-linear
        v-if="importProgress > 0"
        :model-value="importProgress"
        height="6"
        rounded
        color="primary"
      ></v-progress-linear>
    </v-card>

    <!-- Error -->
    <v-alert v-if="errorMsg" type="error" variant="tonal" class="mb-6" closable @click:close="errorMsg = ''">
      {{ errorMsg }}
    </v-alert>

    <!-- Result -->
    <template v-if="parsed">
      <div class="d-flex align-center mb-2 flex-wrap ga-2">
        <h3 class="text-h6">Geladen: {{ fileName }}</h3>
        <v-spacer></v-spacer>
        <v-btn
          variant="outlined"
          prepend-icon="mdi-chart-multiple"
          class="mr-2"
          :disabled="mtStore.compareFiles.some((f) => f.name === fileName)"
          @click="addCurrentToCompare"
        >
          {{ mtStore.compareFiles.some((f) => f.name === fileName) ? "In Anzeige" : "Zur Anzeige hinzufügen" }}
        </v-btn>
        <v-btn
          v-if="lastFile"
          color="primary"
          prepend-icon="mdi-cloud-upload"
          :loading="uploading"
          :disabled="quotaExceeded"
          @click="saveToCloud"
        >
          In Cloud speichern
        </v-btn>
        <span v-if="quotaExceeded" class="text-caption text-warning ml-2 align-self-center">
          Speicherlimit (30 MB) erreicht
        </span>
      </div>

      <div v-if="batchUpload.uploadedFiles.length > 0" class="d-flex align-center mb-3">
        <v-switch
          v-model="combinedStats"
          color="primary"
          density="compact"
          hide-details
          class="flex-grow-0"
        ></v-switch>
        <span class="text-caption text-medium-emphasis">
          Messpunkte/Dauer für alle {{ batchUpload.uploadedFiles.length + 1 }} gerade geladenen
          Dateien zusammenzählen (statt nur {{ fileName }})
        </span>
      </div>

      <v-row class="mb-4">
        <v-col cols="6" sm="3">
          <v-card variant="outlined" class="pa-3 text-center stat-card">
            <div class="text-overline text-medium-emphasis stat-card__label">Signale</div>
            <div class="text-h5 font-weight-bold font-mono stat-card__value">{{ parsed.meta.signalCount }}</div>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card variant="outlined" class="pa-3 text-center stat-card">
            <div class="text-overline text-medium-emphasis stat-card__label">Messpunkte{{ combinedStats ? " (kombiniert)" : "" }}</div>
            <div class="text-h5 font-weight-bold font-mono stat-card__value">{{ combinedRowCount.toLocaleString() }}</div>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card variant="outlined" class="pa-3 text-center stat-card">
            <div class="text-overline text-medium-emphasis stat-card__label">Dauer{{ combinedStats ? " (kombiniert)" : "" }}</div>
            <div class="text-h5 font-weight-bold font-mono stat-card__value">{{ formatDuration(combinedDuration) }}</div>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card variant="outlined" class="pa-3 text-center stat-card">
            <div class="text-overline text-medium-emphasis stat-card__label">Datei</div>
            <div class="text-body-1 font-weight-bold font-mono text-truncate stat-card__value">{{ fileName }}</div>
          </v-card>
        </v-col>
      </v-row>

      <v-alert
        v-if="parsed.meta.qualityWarnings && parsed.meta.qualityWarnings.suspicious"
        type="warning"
        variant="tonal"
        density="comfortable"
        class="mb-4"
      >
        <div class="font-weight-medium mb-1">
          Auffällig viele Signale ohne Daten
          ({{ parsed.meta.qualityWarnings.allNullSignals.length }} leer,
          {{ parsed.meta.qualityWarnings.constantSignals.length }} konstant,
          von {{ parsed.meta.signalCount }} Signalen)
        </div>
        <div class="text-caption">
          Das kann bei einzelnen, wirklich unbenutzten Kanälen normal sein — bei diesem Anteil
          lohnt sich aber ein Blick, ob der Export vom Desktop-Tool vollständig war.
        </div>
      </v-alert>

      <v-alert
        v-if="parsed.meta.sampleRateInfo && parsed.meta.sampleRateInfo.gapCount > 0"
        type="warning"
        variant="tonal"
        density="comfortable"
        class="mb-4"
      >
        <div class="font-weight-medium mb-1">
          Unregelmässige Zeitstempel entdeckt ({{ parsed.meta.sampleRateInfo.gapCount }}
          {{ parsed.meta.sampleRateInfo.gapCount === 1 ? "Lücke" : "Lücken" }})
        </div>
        <div class="text-caption">
          Erkannte Samplerate ~{{ parsed.meta.sampleRateInfo.detectedFs ?? "?" }} Hz (Median-Δt).
          Erste Lücke bei Zeile {{ parsed.meta.sampleRateInfo.gaps[0]?.atRow }}
          (Δt = {{ parsed.meta.sampleRateInfo.gaps[0]?.dt }}s).
          Falls das die Analyse/Filterung verfälscht, ggf. in "Erweiterte Einstellungen"
          eine feste Samplefrequenz vorgeben.
        </div>
      </v-alert>

      <v-row>
        <!-- Signal list -->
        <v-col cols="12" md="5">
          <v-card variant="outlined" rounded="lg">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
              Signale
            </v-card-title>
            <v-divider></v-divider>
            <v-text-field
              v-model="signalSearch"
              placeholder="Signal suchen …"
              variant="plain"
              density="compact"
              hide-details
              prepend-inner-icon="mdi-magnify"
              clearable
              class="px-3 pt-2"
            ></v-text-field>
            <v-divider></v-divider>
            <v-list density="compact" class="signal-list">
              <v-list-item
                v-for="item in filteredSignals"
                :key="item.idx"
                :active="selectedIdx === item.idx"
                @click="selectedIdx = item.idx"
              >
                <v-list-item-title :class="{ 'text-medium-emphasis': item.flagged }">
                  <v-icon v-if="item.flagged" size="14" color="warning" class="mr-1">mdi-alert-circle-outline</v-icon>
                  {{ item.sig.name }}
                </v-list-item-title>
                <template #append>
                  <v-chip size="x-small" variant="tonal">{{ item.sig.unit || "-" }}</v-chip>
                </template>
              </v-list-item>
              <v-list-item v-if="filteredSignals.length === 0" disabled title="Kein Signal gefunden"></v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- Preview chart -->
        <v-col cols="12" md="7">
          <ChartCard
            :title="`Vorschau: ${selectedSignal?.name || ''}`"
            :config="previewConfig"
            :height="340"
          />
          <v-row v-if="selectedSignal" dense class="mt-1">
            <v-col cols="6" sm="3">
              <v-card variant="outlined" class="pa-2 text-center stat-card">
                <div class="text-overline text-medium-emphasis stat-card__label">Mittel</div>
                <div class="text-body-1 font-weight-bold font-mono stat-card__value">{{ previewStats.mean }}</div>
              </v-card>
            </v-col>
            <v-col cols="6" sm="3">
              <v-card variant="outlined" class="pa-2 text-center stat-card">
                <div class="text-overline text-medium-emphasis stat-card__label">RMS</div>
                <div class="text-body-1 font-weight-bold font-mono stat-card__value">{{ previewStats.rms }}</div>
              </v-card>
            </v-col>
            <v-col cols="6" sm="3">
              <v-card variant="outlined" class="pa-2 text-center stat-card">
                <div class="text-overline text-medium-emphasis stat-card__label">Min</div>
                <div class="text-body-1 font-weight-bold font-mono stat-card__value">{{ previewStats.min }}</div>
              </v-card>
            </v-col>
            <v-col cols="6" sm="3">
              <v-card variant="outlined" class="pa-2 text-center stat-card">
                <div class="text-overline text-medium-emphasis stat-card__label">Max</div>
                <div class="text-body-1 font-weight-bold font-mono stat-card__value">{{ previewStats.max }}</div>
              </v-card>
            </v-col>
          </v-row>
        </v-col>
      </v-row>

      <!-- Quick compare preview: fast overlay right here, no page switch.
           Full controls (offset, stats table, batch export, multi-signal
           picking) live on the Vergleich page — this is just a fast look. -->
      <div v-if="mtStore.compareFiles.length > 1" class="mt-2">
        <div class="d-flex align-center flex-wrap ga-2 mb-2">
          <span class="text-subtitle-2">
            Schnellvorschau: {{ mtStore.compareFiles.length }} Datei(en) im Vergleich
          </span>
          <v-spacer></v-spacer>
          <v-btn size="small" color="primary" variant="tonal" prepend-icon="mdi-open-in-new" @click="emit('navigate', 'mt-vergleich')">
            Alle Funktionen in der Anzeige öffnen
          </v-btn>
        </div>
        <ChartCard title="Überlagert" :config="quickCompareConfig" :height="260" />
      </div>
    </template>

    <!-- Vergleich shortcut -->
    <v-alert
      v-if="mtStore.compareFiles.length > 0"
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-4"
    >
      <div class="d-flex align-center flex-wrap ga-2">
        <span>
          {{ mtStore.compareFiles.length }} Datei(en) für den Vergleich vorgemerkt.
        </span>
        <v-spacer></v-spacer>
        <v-btn size="small" color="primary" variant="flat" prepend-icon="mdi-chart-multiple" @click="emit('navigate', 'mt-vergleich')">
          Zur Anzeige
        </v-btn>
      </div>
    </v-alert>


    <v-dialog v-model="showCreateFolderDialog" max-width="360">
      <v-card>
        <v-card-title class="text-subtitle-1">Ordner erstellen</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newFolderNameInput"
            label="Ordnername"
            variant="outlined"
            density="comfortable"
            autofocus
            hide-details
            @keyup.enter="createFolderNow"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showCreateFolderDialog = false">Abbrechen</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!newFolderNameInput.trim()"
            :loading="creatingFolder"
            @click="createFolderNow"
          >
            Erstellen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from "vue";
import { decodeLatin1 } from "../../utils/messtoolParser.js";
import { listExcelSheets, parseMesstoolExcel } from "../../utils/messtoolExcelParser.js";
import { parseCsvOffMainThread } from "../../utils/parseCsvOffMainThread.js";
import * as mtStorage from "../../utils/messtoolStorage.js";
import { groupByDate } from "../../utils/groupByDate.js";
import { formatBytes } from "../../utils/formatBytes.js";
import { withTimeout } from "../../utils/withTimeout.js";
import { friendlyError } from "../../utils/friendlyError.js";
import * as A from "../../utils/messtoolAnalysis.js";
import { useMesstoolStore } from "../../stores/messtoolStore.js";
import { useAuthStore } from "../../stores/authStore.js";
import { showToast } from "../../composables/useToast.js";
import { listRecentFiles, addRecentFile } from "../../utils/recentFiles.js";
import ChartCard from "./ChartCard.vue";
import HelpIconButton from "../../components/HelpIconButton.vue";
import CloudFileRow from "../../components/CloudFileRow.vue";
import MtQuickNav from "./MtQuickNav.vue";
import { downsample } from "../../utils/downsample.js";
import { buildLineChartConfig, emptyLineChartConfig } from "../../utils/lineChartConfig.js";
import { useCloudFileFolders } from "../../composables/useCloudFileFolders.js";
import { formatDate } from "../../utils/formatDate.js";

const emit = defineEmits(["navigate"]);

const mtStore = useMesstoolStore();
const auth = useAuthStore();
const showWorkflowHint = ref(true);
// Reappears fresh on every page load/reload (not persisted), but fades
// itself out after a bit if nobody dismisses it manually — a first-time
// hint shouldn't linger forever taking up space once you've clearly
// started working.
const WORKFLOW_HINT_AUTO_DISMISS_MS = 100_000; // ~1.5–2 min
let workflowHintTimer = null;

const fileInput = ref(null);
const isDragging = ref(false);
const parsing = ref(false);
const importProgress = ref(0);
const batchUpload = reactive({ active: false, total: 0, done: 0, failed: [], uploadedFiles: [] });
const errorMsg = ref("");
const parsed = ref(null);
const fileName = ref("");
const selectedIdx = ref(0);
const lastFile = ref(null); // the raw File, kept for uploading

// advanced import settings (all optional; empty = behave exactly as before)
// ---- Excel import (.xlsx/.xls) ----
// Same buildParseOptions() (startRow/endRow/startCol/endCol/sampleFrequenz)
// is reused for Excel — the parser applies them the same way over the
// signal columns, excluding the auto-detected "Time" column.
function isExcelFile(file) {
  return /\.xlsx?$/i.test(file.name);
}
const excelSheets = ref([]);
const excelSheetName = ref(null);
const excelFileName = ref("");
const pendingExcelBuffer = ref(null);

async function handleExcelFile(file) {
  errorMsg.value = "";
  parsed.value = null;
  excelSheets.value = [];
  excelSheetName.value = null;
  parsing.value = true;
  fileName.value = file.name;
  lastFile.value = file;
  try {
    const buffer = await file.arrayBuffer();
    const sheets = await listExcelSheets(buffer);
    if (sheets.length > 1) {
      // Let the user choose — mirrors the desktop tool's sheet dropdown.
      pendingExcelBuffer.value = buffer;
      excelFileName.value = file.name;
      excelSheets.value = sheets;
      excelSheetName.value = sheets[0];
      parsing.value = false;
      return;
    }
    await parseExcelBuffer(buffer, sheets[0], file.name);
  } catch (err) {
    errorMsg.value = "Konnte Excel-Datei nicht lesen: " + (err.message || err);
    parsing.value = false;
  }
}

async function parseExcelBuffer(buffer, sheetName, name) {
  parsing.value = true;
  try {
    const result = await parseMesstoolExcel(buffer, sheetName, buildParseOptions());
    if (result.signals.length === 0) {
      throw new Error("Keine Signale in diesem Tabellenblatt gefunden.");
    }
    parsed.value = result;
    mtStore.setData(result, name);
    mtStore.fftWindowDefault = advancedMode.value ? windowTypeImport.value : null;
    selectedIdx.value = 0;
    recentFiles.value = addRecentFile({ name });
    excelSheets.value = [];
    pendingExcelBuffer.value = null;
  } catch (err) {
    errorMsg.value = "Konnte Excel-Tabellenblatt nicht parsen: " + (err.message || err);
  } finally {
    parsing.value = false;
  }
}

function parseChosenExcelSheet() {
  if (!pendingExcelBuffer.value) return;
  parseExcelBuffer(pendingExcelBuffer.value, excelSheetName.value, excelFileName.value);
}

const advancedMode = ref(false);
const startRow = ref(null);
const endRow = ref(null);
const startCol = ref(null);
const endCol = ref(null);
const sampleFrequenz = ref(null);
const windowTypeImport = ref("hann");
const windowOptions = [
  { title: "Hann", value: "hann" },
  { title: "Hamming", value: "hamming" },
  { title: "Blackman", value: "blackman" },
  { title: "Rechteck (keins)", value: "none" },
];

function buildParseOptions() {
  if (!advancedMode.value) return {};
  const opts = {};
  if (startRow.value) opts.startRow = Number(startRow.value);
  if (endRow.value) opts.endRow = Number(endRow.value);
  if (startCol.value) opts.startCol = startCol.value;
  if (endCol.value) opts.endCol = endCol.value;
  if (sampleFrequenz.value) opts.sampleFrequenz = Number(sampleFrequenz.value);
  return opts;
}

// cloud state
const cloudFiles = ref([]);
const recentFiles = ref(listRecentFiles());

// Folder/owner-filter/search/quota logic for the cloud file browser lives
// in this composable (see useCloudFileFolders.js) — it only ever needs
// the raw cloudFiles list + the auth store, so it was a fully separable
// concern from everything else on this page (upload, parsing, compare).
const {
  activeFolder,
  showCreateFolderDialog,
  newFolderNameInput,
  creatingFolder,
  fileSearchQuery,
  selectedOwnerFilter,
  loadAdminUserMap,
  ownerUsername,
  ownerOptions,
  folders,
  unfiledCount,
  loadRegisteredFolders,
  createFolderNow,
  searchedCloudFiles,
  folderFilteredFiles,
  folderSections,
  openFolderSections,
  groupedCloudFiles,
  totalStorageBytes,
  myStorageBytes,
  QUOTA_BYTES,
  quotaUsedPct,
  quotaExceeded,
  folderStorageBytes,
  activeFolderLabel,
  moveFileToFolder,
  renameOrDeleteFolder,
} = useCloudFileFolders(cloudFiles, auth, { onError: (msg) => { errorMsg.value = msg; } });

function openRecentFile(entry) {
  if (!entry.storagePath) return; // raw local upload, never saved — nothing to re-fetch
  openCloudFile({ id: entry.messfileId, storage_path: entry.storagePath, name: entry.name });
}
const loadingList = ref(false);
const uploading = ref(false);
const busyId = ref(null);

const selectedSignal = computed(() =>
  parsed.value ? parsed.value.signals[selectedIdx.value] : null,
);

const signalSearch = ref("");
const filteredSignals = computed(() => {
  if (!parsed.value) return [];
  const q = (signalSearch.value || "").trim().toLowerCase();
  const flagged = new Set([
    ...(parsed.value.meta.qualityWarnings?.allNullSignals || []),
    ...(parsed.value.meta.qualityWarnings?.constantSignals || []),
  ]);
  return parsed.value.signals
    .map((sig, idx) => ({ sig, idx, flagged: flagged.has(sig.name) }))
    .filter((item) => !q || item.sig.name.toLowerCase().includes(q));
});

const previewStats = computed(() => {
  const s = selectedSignal.value;
  if (!s) return { mean: "-", rms: "-", min: "-", max: "-" };
  const y = s.data.filter((v) => v != null && Number.isFinite(v));
  const mm = A.minMax(y);
  const fmt = (v) => (v == null ? "-" : v.toFixed(3));
  return { mean: fmt(A.mean(y)), rms: fmt(A.rms(y)), min: fmt(mm.min), max: fmt(mm.max) };
});

// config for the preview ChartCard (fresh function when signal changes)
const previewConfig = computed(() => {
  const p = parsed.value;
  const idx = selectedIdx.value;
  return (peakMode) => {
    if (!p) return emptyLineChartConfig();
    const s = p.signals[idx];
    const time = p.time;
    const { rx: labels, ry: values } = downsample(s.data, time, peakMode ? "minmax" : "simple", 800);
    return buildLineChartConfig({
      labels,
      datasets: [{
        label: `${s.name} [${s.unit || "-"}]`,
        data: values,
        borderColor: "#2563EB",
        backgroundColor: "rgba(37,99,235,0.08)",
        borderWidth: 1.5, pointRadius: 0, tension: 0.1, fill: true,
      }],
      xTitle: "Zeit [s]",
      xScale: { ticks: { maxTicksLimit: 10 } },
      yTitle: s.unit || "",
    });
  };
});

function onFileSelect(e) {
  const files = Array.from(e.target.files || []);
  e.target.value = ""; // allow re-selecting the same file(s) later
  if (files.length) handleFiles(files);
}

function onDrop(e) {
  isDragging.value = false;
  const files = Array.from(e.dataTransfer.files || []);
  if (files.length) handleFiles(files);
}

// First file becomes the active file (existing single-file behavior).
// Any further files can't also be "active" — the whole app works off one
// loaded file at a time — so they're uploaded straight to the cloud
// instead, ready to be opened individually or pulled into Vergleich later.
function handleFiles(files) {
  const [first, ...rest] = files;
  handleFile(first);
  if (rest.length) uploadExtraFiles(rest);
}

async function uploadExtraFiles(files) {
  batchUpload.active = true;
  batchUpload.total = files.length;
  batchUpload.done = 0;
  batchUpload.failed = [];
  batchUpload.uploadedFiles = [];
  for (const file of files) {
    try {
      const buffer = await file.arrayBuffer();
      // Excel files in a batch use the first sheet automatically (no
      // per-file sheet picker in batch mode) — pick the right sheet
      // beforehand and re-import individually if that's not the one you need.
      const result = isExcelFile(file)
        ? await parseMesstoolExcel(buffer, undefined, buildParseOptions())
        : await parseCsvOffMainThread(decodeLatin1(buffer), buildParseOptions());
      const row = await mtStorage.uploadMessfile(file, result.meta, result.signals.map((s) => s.name));
      batchUpload.uploadedFiles.push({
        name: file.name,
        parsed: result,
        messfileId: row.id,
        storagePath: row.storage_path,
      });
    } catch {
      batchUpload.failed.push(file.name);
    }
    batchUpload.done++;
  }
  batchUpload.active = false;
  await loadList();
}

function addCurrentToCompare() {
  if (!parsed.value) return;
  mtStore.addCompareFile(fileName.value, parsed.value, {
    messfileId: mtStore.messfileId,
    storagePath: mtStore.messfileStoragePath,
  });
  showToast(`${fileName.value} zur Anzeige hinzugefügt.`, { color: "info" });
}

const combinedStats = ref(false);

const combinedRowCount = computed(() => {
  if (!parsed.value) return 0;
  if (!combinedStats.value) return parsed.value.meta.rowCount;
  return (
    parsed.value.meta.rowCount +
    batchUpload.uploadedFiles.reduce((sum, f) => sum + f.parsed.meta.rowCount, 0)
  );
});

const combinedDuration = computed(() => {
  if (!parsed.value) return 0;
  if (!combinedStats.value) return parsed.value.meta.duration;
  return (
    parsed.value.meta.duration +
    batchUpload.uploadedFiles.reduce((sum, f) => sum + f.parsed.meta.duration, 0)
  );
});
const selectedCloudIds = ref([]);
const bulkAddingCompare = ref(false);
const compareAddingId = ref(null);

// Lightweight overlay for the "Schnellvorschau" on Import — same series
// data as the full Vergleich page (mtStore.compareSeries), just without
// its extra controls (offset inputs, stats table, batch export).
const quickCompareConfig = computed(() => {
  const series = mtStore.compareSeries;
  return (peakMode) => {
    const datasets = series.map((s) => {
      const y = s.signal.data.map((v) => (v == null ? null : v));
      const d = downsample(y, s.time, peakMode ? "minmax" : "simple", 600);
      const off = s.offsetSec || 0;
      const points = d.rx.map((x, i) => ({
        x: x + off,
        y: d.ry[i],
        clock: s.clockSec ? s.clockSec[d.indices[i]] : null,
      }));
      return {
        label: `${s.fileName} — ${s.signal.name} [${s.signal.unit || "-"}]`,
        data: points,
        borderColor: s.color,
        backgroundColor: s.color,
        borderWidth: 1.5,
        pointRadius: 0,
      };
    });
    return buildLineChartConfig({
      datasets,
      parsing: false,
      xTitle: "Zeit [s]",
      xScale: { type: "linear" },
      yTitle: "Wert",
    });
  };
});

function toggleCloudSelection(id) {
  const i = selectedCloudIds.value.indexOf(id);
  if (i === -1) selectedCloudIds.value = [...selectedCloudIds.value, id];
  else selectedCloudIds.value = selectedCloudIds.value.filter((x) => x !== id);
}

const allCloudFilesSelected = computed(() =>
  cloudFiles.value.length > 0 && cloudFiles.value.every((f) => selectedCloudIds.value.includes(f.id)),
);

function toggleSelectAllCloudFiles(checked) {
  selectedCloudIds.value = checked ? cloudFiles.value.map((f) => f.id) : [];
}

async function addSelectedToCompare() {
  const files = cloudFiles.value.filter((f) => selectedCloudIds.value.includes(f.id));
  if (!files.length) return;
  bulkAddingCompare.value = true;
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
  bulkAddingCompare.value = false;
  selectedCloudIds.value = [];
  if (failed.length) {
    errorMsg.value = "Nicht hinzugefügt: " + failed.join(", ");
  } else {
    // Button says "Zur Anzeige hinzufügen", not "zur Anzeige gehen" — stay
    // put so you can keep selecting more files instead of getting bounced
    // to the Anzeige page after every add. The explicit "Zur Anzeige" /
    // "Alle Funktionen in der Anzeige öffnen" buttons elsewhere on this
    // page still navigate on purpose.
    showToast(`${files.length} Datei(en) zur Anzeige hinzugefügt.`);
  }
}

async function addCloudFileToCompare(f) {
  if (mtStore.compareFiles.some((c) => c.name === f.name)) {
    showToast(`"${f.name}" ist bereits in der Anzeige.`);
    return;
  }
  compareAddingId.value = f.id;
  errorMsg.value = "";
  try {
    const buffer = await withTimeout(mtStorage.downloadMessfile(f.storage_path), 25000, `"${f.name}": Zeitüberschreitung beim Download.`);
    const text = decodeLatin1(buffer);
    const result = await parseCsvOffMainThread(text, {});
    mtStore.addCompareFile(f.name, result, { messfileId: f.id, storagePath: f.storage_path });
    showToast(`"${f.name}" zur Anzeige hinzugefügt.`);
  } catch (e) {
    errorMsg.value = `"${f.name}" konnte nicht zur Anzeige hinzugefügt werden: ` + friendlyError(e);
  }
  compareAddingId.value = null;
}

function compareBatchFiles() {
  if (parsed.value && !mtStore.compareFiles.some((f) => f.name === fileName.value)) {
    mtStore.addCompareFile(fileName.value, parsed.value, {
      messfileId: mtStore.messfileId,
      storagePath: mtStore.messfileStoragePath,
    });
  }
  for (const f of batchUpload.uploadedFiles) {
    if (!mtStore.compareFiles.some((c) => c.name === f.name)) {
      mtStore.addCompareFile(f.name, f.parsed, { messfileId: f.messfileId, storagePath: f.storagePath });
    }
  }
  showToast(`${mtStore.compareFiles.length} Datei(en) zur Anzeige hinzugefügt.`);
}

async function handleFile(file) {
  if (isExcelFile(file)) {
    await handleExcelFile(file);
    return;
  }
  errorMsg.value = "";
  parsed.value = null;
  parsing.value = true;
  importProgress.value = 0;
  fileName.value = file.name;
  lastFile.value = file;

  try {
    const buffer = await file.arrayBuffer();
    const text = decodeLatin1(buffer);
    await new Promise((r) => setTimeout(r, 20));
    const result = await parseCsvOffMainThread(text, buildParseOptions(), (f) => {
      importProgress.value = Math.round(f * 100);
    });
    if (result.signals.length === 0) {
      throw new Error("Keine Signale in der Datei gefunden.");
    }
    parsed.value = result;
    mtStore.setData(result, file.name);
    mtStore.fftWindowDefault = advancedMode.value ? windowTypeImport.value : null;
    selectedIdx.value = 0;
    recentFiles.value = addRecentFile({ name: file.name });
  } catch (err) {
    errorMsg.value = "Konnte Datei nicht parsen: " + (err.message || err);
  } finally {
    parsing.value = false;
  }
}

// ---- cloud ----

async function loadList() {
  loadingList.value = true;
  try {
    cloudFiles.value = await withTimeout(mtStorage.listMessfiles(), 25000, "Zeitüberschreitung beim Laden der Cloud-Liste.");
  } catch (e) {
    errorMsg.value = "Liste konnte nicht geladen werden: " + friendlyError(e);
  }
  await loadRegisteredFolders();
  loadingList.value = false;
}

async function saveToCloud() {
  if (!lastFile.value || !parsed.value) return;
  uploading.value = true;
  errorMsg.value = "";
  try {
    const row = await mtStorage.uploadMessfile(lastFile.value, parsed.value.meta, parsed.value.signals.map((s) => s.name));
    mtStore.setCloudRef(row.id, row.storage_path);
    await loadList();
    recentFiles.value = addRecentFile({ name: fileName.value, messfileId: row.id, storagePath: row.storage_path });
    showToast(`${fileName.value} in die Cloud gespeichert.`);
  } catch (e) {
    errorMsg.value = "Upload fehlgeschlagen: " + friendlyError(e);
  }
  uploading.value = false;
}

async function openCloudFile(f) {
  busyId.value = f.id;
  errorMsg.value = "";
  importProgress.value = 0;
  try {
    const buffer = await withTimeout(mtStorage.downloadMessfile(f.storage_path), 25000, `"${f.name}": Zeitüberschreitung beim Download.`);
    const result = /\.xlsx?$/i.test(f.name)
      ? await parseMesstoolExcel(buffer, undefined, buildParseOptions())
      : await parseCsvOffMainThread(decodeLatin1(buffer), buildParseOptions(), (frac) => {
          importProgress.value = Math.round(frac * 100);
        });
    parsed.value = result;
    mtStore.setData(result, f.name);
    mtStore.setCloudRef(f.id, f.storage_path);
    mtStore.fftWindowDefault = advancedMode.value ? windowTypeImport.value : null;
    fileName.value = f.name;
    lastFile.value = null; // came from cloud, no re-upload
    selectedIdx.value = 0;
    recentFiles.value = addRecentFile({ name: f.name, messfileId: f.id, storagePath: f.storage_path });
  } catch (e) {
    errorMsg.value = "Öffnen fehlgeschlagen: " + friendlyError(e);
  }
  busyId.value = null;
}

async function removeCloudFile(f) {
  if (!confirm(`Datei "${f.name}" wirklich löschen?`)) return;
  try {
    await mtStorage.deleteMessfile(f);
    await loadList();
  } catch (e) {
    errorMsg.value = "Löschen fehlgeschlagen: " + friendlyError(e);
  }
}

onMounted(() => {
  // If the store already has a file (restored session, or just came back
  // from another Messtool page), reflect it locally so this page's own
  // "file loaded" summary/signal list shows it too.
  if (mtStore.parsed && !parsed.value) {
    parsed.value = mtStore.parsed;
    fileName.value = mtStore.fileName;
  }
  loadList();
  loadAdminUserMap();
  workflowHintTimer = setTimeout(() => { showWorkflowHint.value = false; }, WORKFLOW_HINT_AUTO_DISMISS_MS);
});

onBeforeUnmount(() => {
  if (workflowHintTimer) clearTimeout(workflowHintTimer);
});

function formatDuration(sec) {
  if (sec < 60) return `${sec.toFixed(0)} s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")} min`;
}
</script>

<style scoped>
.dropzone {
  cursor: pointer;
  border-style: dashed !important;
  border-width: 2px !important;
  transition: all 0.2s ease;
}
.dropzone:hover,
.dropzone.dragging {
  border-color: #2563eb !important;
  background: rgba(37, 99, 235, 0.04);
}
.signal-list {
  max-height: 360px;
  overflow-y: auto;
}
.cloud-file-row + .cloud-file-row {
  border-top: 1px solid rgba(128, 128, 128, 0.15);
}
</style>

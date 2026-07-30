<template>
  <v-container fluid class="pa-6 pa-md-10" style="max-width: 980px">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">mdi-help-circle-outline</v-icon>
      <h2 class="text-h5 font-weight-bold">Bedienungsanleitung</h2>
    </div>
    <p class="text-medium-emphasis mb-6">
      Kurzer Überblick über alle Bereiche von Signal Lab. Bei Fragen oder Problemen: Feedback-Button
      (Daumen runter) im Chat nutzen oder direkt an Alessandro wenden.
    </p>

    <v-text-field
      v-model="query"
      variant="outlined"
      density="comfortable"
      prepend-inner-icon="mdi-magnify"
      label="Anleitung durchsuchen"
      clearable
      class="mb-4"
    ></v-text-field>

    <v-expansion-panels v-model="openPanels" multiple variant="accordion">
      <v-expansion-panel v-for="section in filteredSections" :key="section.key" :value="section.key">
        <v-expansion-panel-title>
          <v-icon class="mr-2" size="20">{{ section.icon }}</v-icon>
          {{ section.title }}
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <div v-for="(block, i) in section.blocks" :key="i" class="mb-4">
            <h4 v-if="block.h" class="text-subtitle-1 font-weight-bold mb-1">{{ block.h }}</h4>
            <p v-if="block.p" class="text-body-2 text-medium-emphasis" style="white-space: pre-line">{{ block.p }}</p>
            <v-list v-if="block.list" density="compact" class="mb-0">
              <v-list-item v-for="(item, j) in block.list" :key="j" prepend-icon="mdi-circle-small">
                <span class="text-body-2">{{ item }}</span>
              </v-list-item>
            </v-list>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <v-alert v-if="query && filteredSections.length === 0" type="info" variant="tonal" class="mt-4">
      Keine Treffer für "{{ query }}".
    </v-alert>
  </v-container>
</template>

<script setup>
import { ref, computed } from "vue";

const query = ref("");
const openPanels = ref(["messtool-import"]);

const sections = [
  {
    key: "messtool-import",
    title: "Messtool → Import",
    icon: "mdi-file-upload-outline",
    blocks: [
      {
        h: "Datei laden",
        p: "Stadler LOGDATA-CSV-Dateien (ISO-8859-1, semikolon-getrennt) per Klick oder Drag & Drop hochladen. Mehrere Dateien gleichzeitig möglich (Batch-Upload) — jede wird einzeln geparst und in die Cloud hochgeladen (Supabase Storage).",
      },
      {
        h: "Excel-Import",
        p: "Neben CSV können auch Excel-Dateien (.xlsx) importiert werden. Tabellenblatt wählen, Kopfzeile/Einheiten werden aus der ersten bzw. zweiten Zeile erkannt (Format 'Name [Einheit]'), Zeilen-/Spaltenbereich kann bei Bedarf eingeschränkt werden.",
      },
      {
        p: "Zuletzt geöffnete Dateien erscheinen unten in der Liste 'Zuletzt verwendet' für schnellen Wiedereinstieg.",
      },
    ],
  },
  {
    key: "messtool-verarbeitung",
    title: "Messtool → Verarbeitung",
    icon: "mdi-cog-transfer",
    blocks: [
      {
        p: "Verarbeitungskette aus mehreren Schritten aufbauen: Glätten, Entrenden (Detrend), Normalisieren, Offset entfernen. Reihenfolge per Drag & Drop änderbar. Die Kette wird pro Session gespeichert.",
      },
    ],
  },
  {
    key: "messtool-filter",
    title: "Messtool → Filter",
    icon: "mdi-tune-variant",
    blocks: [
      {
        h: "Filtertypen",
        list: ["Butterworth", "Chebyshev I", "Bessel", "Elliptic"],
      },
      {
        h: "Charakteristik",
        list: ["Tiefpass", "Hochpass", "Bandpass (2 Grenzfrequenzen)"],
      },
      {
        p: "Alle Filter sind zero-phase (sosfiltfilt-äquivalent, keine Phasenverschiebung). Achtung: Die Grenzfrequenz muss unter der Nyquist-Frequenz (halbe Abtastrate) liegen — bei ~8 Hz Abtastrate also unter 4 Hz. Der Frequenzgang (Amplitude + Phase) kann direkt angezeigt werden.",
      },
    ],
  },
  {
    key: "messtool-analyse",
    title: "Messtool → Analyse",
    icon: "mdi-chart-bell-curve",
    blocks: [
      {
        h: "Einzelsignal-Analyse",
        p: "Statistik (Mittel, RMS, Std, Varianz, Min/Max), Ableitung, Integral und FFT (mit Fensterfunktion: Hann/Hamming/Blackman/Rechteck) für ein ausgewähltes Signal. Zeitbereich per Start/Ende einschränkbar — alle Berechnungen greifen dann nur auf diesen Ausschnitt zu.",
      },
      {
        h: "Automatische Ereignis-Erkennung",
        p: "Findet Bereiche, in denen ein Signal einen Schwellwert über-/unterschreitet (z.B. Bremsereignisse), und kann sie direkt als Marker setzen.",
      },
      {
        h: "Gruppen-Analyse",
        p: "Mehrere Signale gleichzeitig auswählen und vergleichen: gemeinsame Statistik-Tabelle, überlagerte Zeit-Kurve und überlagertes FFT-Spektrum aller gewählten Signale in einem Chart. Nützlich um z.B. mehrere Achsen oder Sensoren eines Ereignisses direkt gegenüberzustellen.",
      },
      {
        p: "Jeder Chart hat einen Y-Log-Schalter (Symbol 'log') in der Werkzeugleiste — auch fürs FFT-Spektrum.",
      },
    ],
  },
  {
    key: "messtool-vergleich",
    title: "Messtool → Anzeige/Vergleich",
    icon: "mdi-chart-multiple",
    blocks: [
      {
        p: "Mehrere geladene Dateien/Signale nebeneinander (gestapelt) oder überlagert anzeigen. Unbegrenzt viele Cursor setzbar, Werte aller Serien pro Cursor in der Cursorbox, Differenzen zwischen Cursoren per Klick vergleichen. Zoom- und Cursor-Sync zwischen Charts ein-/ausschaltbar. Pro Datei kann in der gestapelten Ansicht ein eigener Filter angewendet werden (Original + Gefiltert übereinander oder nur gefiltert).",
      },
    ],
  },
  {
    key: "messtool-export",
    title: "Messtool → Export",
    icon: "mdi-export-variant",
    blocks: [
      { p: "Export als PNG, PDF, CSV oder XLSX — inklusive optionaler Zusatzspalten (AVG, RMS, Ableitung, Integral)." },
    ],
  },
  {
    key: "messtool-sessions",
    title: "Messtool → Sessions",
    icon: "mdi-content-save-outline",
    blocks: [
      { p: "Speichert den kompletten Zustand (Datei-Referenz, Verarbeitungskette, Filter-Einstellungen, Marker) in der Cloud. Sessions können geteilt werden — jeder mit Zugriff sieht denselben Stand, geräteübergreifend." },
    ],
  },
  {
    key: "generier-tool",
    title: "Generier-Tool",
    icon: "mdi-waveform",
    blocks: [
      { p: "Eigene Testsignale erzeugen (5 Kurvenformen), FFT-Analyse, Signal-Vergleich, Cloud-Sessions und Export als JSON/CSV — unabhängig vom Messtool." },
    ],
  },
  {
    key: "tipps",
    title: "Tipps & Tastenkürzel",
    icon: "mdi-lightbulb-outline",
    blocks: [
      {
        list: [
          "'?' irgendwo drücken → Tastenkürzel-Übersicht",
          "↑ / ↓ im Signal-Feld → durch Signale blättern",
          "Mausrad auf einem Chart → zoomen, Shift+Ziehen → verschieben, Doppelklick → zurücksetzen",
          "Vor dem Schliessen mit ungespeicherter Verarbeitungskette warnt die App automatisch",
        ],
      },
    ],
  },
];

const filteredSections = computed(() => {
  const q = (query.value || "").trim().toLowerCase();
  if (!q) return sections;
  return sections
    .map((s) => {
      const hay = JSON.stringify(s).toLowerCase();
      return hay.includes(q) ? s : null;
    })
    .filter(Boolean);
});
</script>

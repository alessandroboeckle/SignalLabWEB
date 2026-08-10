<template>
  <v-container fluid class="pa-4 pa-md-8 hilfe-page">
    <div class="hilfe-hero mb-6">
      <div class="d-flex align-center ga-3 mb-1">
        <v-avatar color="primary" variant="tonal" size="44">
          <v-icon size="24">mdi-help-circle-outline</v-icon>
        </v-avatar>
        <div>
          <h2 class="text-h5 font-weight-bold mb-0">Bedienungsanleitung</h2>
          <p class="text-medium-emphasis text-body-2 mb-0">
            Überblick über alle Bereiche von Signal Lab. Nicht fündig geworden?
            Feedback-Button (Daumen runter) im Chat, oder direkt an Alessandro.
          </p>
        </div>
      </div>
    </div>

    <!-- Quick start: this genuinely IS a sequence, in the order you'd
         actually use the tool, so numbering earns its place here. Each
         step jumps straight into the real page, not just the help text —
         "interactive" means acting on it, not just reading about it. -->
    <v-card variant="outlined" rounded="lg" class="mb-6 pa-4 pa-md-5 quickstart-card">
      <div class="text-overline text-primary mb-3">Erste Schritte</div>
      <div class="quickstart-grid">
        <button
          v-for="(step, i) in quickStartSteps"
          :key="step.page"
          type="button"
          class="quickstart-step"
          @click="goToPage(step.page)"
        >
          <span class="quickstart-num">{{ i + 1 }}</span>
          <v-icon size="22" color="primary" class="mb-2">{{ step.icon }}</v-icon>
          <div class="text-body-2 font-weight-medium">{{ step.title }}</div>
          <div class="text-caption text-medium-emphasis">{{ step.desc }}</div>
        </button>
      </div>
    </v-card>

    <v-text-field
      v-model="query"
      variant="outlined"
      density="comfortable"
      prepend-inner-icon="mdi-magnify"
      label="Anleitung durchsuchen"
      clearable
      autocomplete="off"
      class="mb-3"
    ></v-text-field>

    <div class="d-flex flex-wrap ga-2 mb-6">
      <v-chip
        :variant="activeCategory === null ? 'flat' : 'outlined'"
        :color="activeCategory === null ? 'primary' : 'default'"
        size="small"
        @click="activeCategory = null"
      >
        Alle
      </v-chip>
      <v-chip
        v-for="cat in categories"
        :key="cat"
        :variant="activeCategory === cat ? 'flat' : 'outlined'"
        :color="activeCategory === cat ? 'primary' : 'default'"
        size="small"
        @click="activeCategory = activeCategory === cat ? null : cat"
      >
        {{ cat }}
      </v-chip>
    </div>

    <div class="hilfe-cards">
      <v-card
        v-for="section in filteredSections"
        :id="`help-section-${section.key}`"
        :key="section.key"
        variant="outlined"
        rounded="lg"
        class="mb-4 hilfe-card"
        :class="{ 'hilfe-card--open': openPanels.includes(section.key) }"
      >
        <button type="button" class="hilfe-card__header" @click="togglePanel(section.key)">
          <v-avatar :color="categoryColor(section.category)" variant="tonal" size="36" class="mr-3">
            <v-icon size="19">{{ section.icon }}</v-icon>
          </v-avatar>
          <div class="flex-grow-1 text-left">
            <div class="text-subtitle-1 font-weight-bold">{{ section.title }}</div>
            <div class="text-caption text-medium-emphasis">{{ section.category }}</div>
          </div>
          <v-btn
            v-if="section.page"
            size="small"
            variant="tonal"
            color="primary"
            class="mr-2"
            @click.stop="goToPage(section.page)"
          >
            Zur Seite
          </v-btn>
          <v-icon>{{ openPanels.includes(section.key) ? "mdi-chevron-up" : "mdi-chevron-down" }}</v-icon>
        </button>

        <v-expand-transition>
          <div v-show="openPanels.includes(section.key)">
            <v-divider></v-divider>
            <div class="pa-4 pa-md-5">
              <div v-for="(block, i) in section.blocks" :key="i" class="mb-4">
                <h4 v-if="block.h" class="text-subtitle-2 font-weight-bold mb-1">{{ block.h }}</h4>
                <p
                  v-if="block.p"
                  class="text-body-2 text-medium-emphasis mb-0"
                  style="white-space: pre-line"
                  v-html="highlight(block.p)"
                ></p>
                <v-alert
                  v-if="block.tip"
                  type="warning"
                  variant="tonal"
                  density="compact"
                  class="mt-2"
                  icon="mdi-alert-outline"
                >
                  <span v-html="highlight(block.tip)"></span>
                </v-alert>
                <div v-if="block.chips" class="d-flex flex-wrap ga-2 mt-1">
                  <v-chip v-for="(item, j) in block.chips" :key="j" size="small" variant="tonal">
                    {{ item }}
                  </v-chip>
                </div>
                <v-list v-if="block.list" density="compact" class="mb-0 bg-transparent">
                  <v-list-item
                    v-for="(item, j) in block.list"
                    :key="j"
                    prepend-icon="mdi-circle-small"
                    class="px-0"
                  >
                    <span class="text-body-2" v-html="highlight(item)"></span>
                  </v-list-item>
                </v-list>
                <div v-if="block.kbd" class="d-flex flex-wrap ga-2 mt-1">
                  <span v-for="(k, j) in block.kbd" :key="j" class="text-body-2 d-flex align-center ga-1">
                    <kbd class="hilfe-kbd">{{ k.key }}</kbd>
                    <span class="text-medium-emphasis">{{ k.desc }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </v-expand-transition>
      </v-card>
    </div>

    <v-alert v-if="filteredSections.length === 0" type="info" variant="tonal" class="mt-4">
      Keine Treffer{{ query ? ` für "${query}"` : "" }}.
    </v-alert>
  </v-container>
</template>

<style scoped>
.hilfe-hero {
  padding-bottom: 4px;
}
.quickstart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
.quickstart-step {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  border: 1px solid rgba(128, 128, 128, 0.25);
  border-radius: 10px;
  padding: 14px 14px 12px;
  background: transparent;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease, background 0.15s ease;
  font: inherit;
  color: inherit;
}
.quickstart-step:hover,
.quickstart-step:focus-visible {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.06);
  transform: translateY(-1px);
}
.quickstart-num {
  position: absolute;
  top: 10px;
  right: 12px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(128, 128, 128, 0.6);
}
.hilfe-card__header {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 14px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  font: inherit;
  color: inherit;
  text-align: left;
}
.hilfe-card__header:hover {
  background: rgba(128, 128, 128, 0.06);
}
.hilfe-card--open .hilfe-card__header {
  background: rgba(128, 128, 128, 0.04);
}
.hilfe-kbd {
  display: inline-block;
  padding: 1px 7px;
  border: 1px solid rgba(128, 128, 128, 0.4);
  border-bottom-width: 2px;
  border-radius: 5px;
  font-family: ui-monospace, "SF Mono", Consolas, monospace;
  font-size: 12px;
  background: rgba(128, 128, 128, 0.08);
}
:deep(mark) {
  background: rgba(var(--v-theme-primary), 0.35);
  color: inherit;
  border-radius: 3px;
  padding: 0 1px;
}
</style>

<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { useUiStore } from "../stores/uiStore.js";

const ui = useUiStore();
const query = ref("");
const activeCategory = ref(null);
const openPanels = ref(["messtool-import"]);

function togglePanel(key) {
  openPanels.value = openPanels.value.includes(key)
    ? openPanels.value.filter((k) => k !== key)
    : [...openPanels.value, key];
}

function goToPage(page) {
  ui.pendingTab = page;
}

const quickStartSteps = [
  { page: "mt-import", icon: "mdi-file-upload-outline", title: "1. Datei laden", desc: "CSV oder Excel importieren" },
  { page: "mt-filter", icon: "mdi-tune-variant", title: "2. Filtern (optional)", desc: "Rauschen raus, Kurve glätten" },
  { page: "mt-analyse", icon: "mdi-chart-bell-curve", title: "3. Analysieren", desc: "Statistik, FFT, Ereignisse" },
  { page: "mt-export", icon: "mdi-export-variant", title: "4. Exportieren", desc: "Als Bild, PDF, CSV oder XLSX" },
];

const sections = [
  {
    key: "start",
    title: "Startseite / Übersicht",
    icon: "mdi-view-dashboard-outline",
    category: "Erste Schritte",
    blocks: [
      {
        p: "Landet nach dem Login als erstes hier — Kurzlinks zu Messtool, Signal-Generator, Rechner und Einstellungen. Welche Seite du zuletzt offen hattest, wird gemerkt: nach einem Neuladen (F5) landest du automatisch wieder dort, nicht zwangsläufig auf der Startseite.",
      },
      {
        h: "Login",
        p: "Zugriff ist über eine Freigabeliste geregelt (Supabase Auth) — neue Konten müssen von einem Admin freigeschaltet werden, bis dahin siehst du einen Warte-Bildschirm.",
      },
    ],
  },
  {
    key: "messtool-import",
    title: "Messtool → Import",
    icon: "mdi-file-upload-outline",
    category: "Messtool",
    page: "mt-import",
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
        h: "Gespeicherte Messdateien (Cloud)",
        p: "Liste aller bisher hochgeladenen Dateien, geräteübergreifend sichtbar (jeder mit Zugriff sieht dieselbe Liste). Pro Zeile: öffnen, zur Anzeige hinzufügen, löschen.\nCheckbox oben links = alle auswählen — damit lassen sich mehrere Dateien auf einmal zur Anzeige-Seite hinzufügen, statt jede einzeln anklicken zu müssen.\n'Zur Anzeige hinzufügen' navigiert NICHT mehr automatisch weg — du bleibst auf der Import-Seite (praktisch, wenn du nacheinander mehrere Dateien auswählen willst) und bekommst stattdessen eine kurze Bestätigung.",
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
    category: "Messtool",
    page: "mt-verarbeitung",
    blocks: [
      {
        p: "Verarbeitungskette aus mehreren Schritten aufbauen: Glätten, Entrenden (Detrend), Normalisieren, Offset entfernen. Reihenfolge per Drag & Drop änderbar. Die Kette wird automatisch pro Session gespeichert und übersteht auch ein Neuladen der Seite.",
      },
    ],
  },
  {
    key: "messtool-filter",
    title: "Messtool → Filter",
    icon: "mdi-tune-variant",
    category: "Messtool",
    page: "mt-filter",
    blocks: [
      {
        h: "Filtertypen",
        chips: ["Butterworth", "Chebyshev I", "Bessel", "Elliptic"],
      },
      {
        h: "Charakteristik",
        chips: ["Tiefpass", "Hochpass", "Bandpass (2 Grenzfrequenzen)"],
      },
      {
        p: "Alle Filter sind zero-phase (sosfiltfilt-äquivalent, keine Phasenverschiebung).",
        tip: "Die Grenzfrequenz muss unter der Nyquist-Frequenz (halbe Abtastrate) liegen — bei ~8 Hz Abtastrate also unter 4 Hz.",
      },
      {
        h: "Frequenzgang (Bode-Plot)",
        p: "'Frequenzgang anzeigen' aktivieren, um den Filter selbst (unabhängig vom geladenen Signal) zu beurteilen — zwei Diagramme: Amplitude in dB und Phase in Grad, jeweils über der Frequenz (log-Skala). Hilft z.B. zu sehen, wie steil der Filter tatsächlich abschneidet oder wie viel Phasendrehung er im relevanten Bereich einführt.",
      },
    ],
  },
  {
    key: "messtool-analyse",
    title: "Messtool → Analyse",
    icon: "mdi-chart-bell-curve",
    category: "Messtool",
    page: "mt-analyse",
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
    title: "Messtool → Anzeige (Vergleich)",
    icon: "mdi-chart-multiple",
    category: "Messtool",
    page: "mt-vergleich",
    blocks: [
      {
        h: "Dateien hinzufügen",
        p: "Über 'Aktuelle Datei hinzufügen', per Upload-Button, oder 'Aus Cloud hinzufügen' — der Cloud-Dialog hat eine Checkbox pro Datei plus 'Alle auswählen' oben, damit sich mehrere Dateien auf einmal übernehmen lassen statt einzeln.",
      },
      {
        h: "Überlagert vs. Gestapelt",
        p: "Überlagert: alle ausgewählten Signale in einem gemeinsamen Chart übereinander. Gestapelt: jedes Signal bekommt standardmässig einen eigenen Chart untereinander — übersichtlicher bei vielen Signalen mit unterschiedlichen Wertebereichen.",
      },
      {
        h: "Signale in der Gestapelt-Ansicht zusammenlegen",
        p: "Jeder Plot hat rechts in der Werkzeugleiste einen Pfeil (˅) — Klick öffnet ein Menü mit Checkboxen für alle anderen geladenen Signale. Ankreuzen legt sie zusätzlich in genau diesen Plot (mehrere gleichzeitig möglich), statt dass jedes Signal zwingend seinen eigenen Chart bekommt. Das ursprüngliche 'Ankersignal' des Plots lässt sich nicht entfernen (steht im Menü grau); ein Signal, das selbst schon andere gesammelt hat, kann nicht zusätzlich in einen anderen Plot verschoben werden, ohne vorher dort entfernt zu werden (sonst würden die gesammelten Signale verwaisen).",
      },
      {
        h: "Cursor",
        p: "Unbegrenzt viele Cursor pro Chart setzbar (Cursor-Modus an, dann klicken). Werte aller Serien an der Cursor-Position erscheinen in der Cursorbox; bei genau zwei aktiven Cursorn wird zusätzlich Δx/Δy angezeigt. 'Cursor über alle Plots' (Schalter oben) sorgt dafür, dass ein neu gesetzter Cursor auf allen Gestapelt-Charts gleichzeitig erscheint — praktisch um denselben Zeitpunkt in mehreren Signalen zu vergleichen.",
      },
      {
        h: "Zoom-Sync",
        p: "'Zoom über alle Plots' hält die Zeitachse aller Gestapelt-Charts synchron — zoomst/verschiebst du einen, ziehen die anderen mit.",
      },
      {
        h: "Pro Datei (Erweiterte Optionen, Zahnrad-Symbol)",
        list: [
          "Zeit-Offset [s] — verschiebt die Zeitachse dieser Datei, z.B. um zwei Messungen zeitlich zueinander auszurichten",
          "Automatisch ausrichten (Kreuzkorrelation) — versucht den Offset selbst zu finden, mit Konfidenz-Anzeige",
          "Zweite Y-Achse — bei stark unterschiedlichen Wertebereichen in der Überlagert-Ansicht",
          "Filter anwenden (nur Gestapelt-Ansicht) — wendet die Filter-Einstellungen dieser Datei direkt hier an, original + gefiltert übereinander (oder 'Nur gefiltert', dann nur die gefilterte Kurve)",
        ],
      },
      {
        p: "Der komplette Stand (welche Dateien, welche Signale ausgewählt, Offsets, Zusammenlegen-Gruppen, Filter-Einstellungen) wird automatisch gespeichert und übersteht ein Neuladen der Seite.",
      },
    ],
  },
  {
    key: "messtool-export",
    title: "Messtool → Export",
    icon: "mdi-export-variant",
    category: "Messtool",
    page: "mt-export",
    blocks: [
      { p: "Export als PNG, PDF, CSV oder XLSX — inklusive optionaler Zusatzspalten (AVG, RMS, Ableitung, Integral). Auch als Batch über mehrere Dateien hinweg möglich (Export-Seite in der Import-Ansicht)." },
    ],
  },
  {
    key: "messtool-sessions",
    title: "Messtool → Sessions",
    icon: "mdi-content-save-outline",
    category: "Messtool",
    page: "mt-sessions",
    blocks: [
      {
        p: "Speichert den kompletten Zustand (Datei-Referenz, Verarbeitungskette, Filter-Einstellungen, Marker, verknüpfte Anzeige-Dateien) manuell benannt in der Cloud. Sessions können geteilt werden — jeder mit Zugriff sieht denselben Stand, geräteübergreifend.",
      },
      {
        h: "Automatisches Speichern (unabhängig von benannten Sessions)",
        p: "Zusätzlich zu den manuell benannten Sessions merkt sich die App laufend deinen aktuellen Stand automatisch (aktuelle Datei, Marker, Filter- und Verarbeitungs-Einstellungen, komplette Anzeige-Dateiliste) sowie die zuletzt geöffnete Seite. Ein versehentliches Neuladen (F5) oder Schliessen des Tabs verliert dadurch normalerweise nichts — die App macht dort weiter, wo du warst.",
      },
    ],
  },
  {
    key: "rechner",
    title: "Rechner",
    icon: "mdi-calculator-variant-outline",
    category: "Weitere Werkzeuge",
    page: "calculator",
    blocks: [
      {
        p: "Eigenständige Werkzeugsammlung für schnelle Überschlagsrechnungen, unabhängig von einer geladenen Messdatei:",
        list: [
          "Frequenz-Rechner — Frequenz ↔ Periodendauer",
          "RMS- & Spitzenwert-Rechner",
          "Abtasttheorem-Rechner — prüft, ob eine Abtastrate für eine gegebene Signalfrequenz ausreicht (Nyquist)",
          "Energie-Rechner",
          "FFT-Auflösungs-Rechner — wie fein die Frequenzauflösung bei gegebener Abtastrate und FFT-Grösse ausfällt",
        ],
      },
    ],
  },
  {
    key: "generator",
    title: "Signal-Generator",
    icon: "mdi-waveform",
    category: "Weitere Werkzeuge",
    page: "signal",
    blocks: [
      {
        p: "Eigene Testsignale erzeugen: Signalname, Kurvenform (u.a. Sinus, Rechteck, Dreieck, Sägezahn, Rauschen), Frequenz, Amplitude, Phase, Dauer und Abtastrate frei wählbar.",
      },
      {
        p: "Optional direkt FFT-Analyse (mit Hann-Fenster) und logarithmische Skala aktivieren. Export als JSON oder CSV.",
      },
      {
        h: "Signal-Vergleich (Generator)",
        p: "Eigener Vergleichs-Bereich für generierte Signale, unabhängig vom Messtool-Anzeige.",
      },
      {
        h: "Session-Verwaltung (Generator)",
        p: "Erzeugte Signale ebenfalls als benannte Cloud-Sessions speicherbar, umbenennbar, geräteübergreifend.",
      },
    ],
  },
  {
    key: "einstellungen",
    title: "Einstellungen",
    icon: "mdi-cog-outline",
    category: "Konto & Verwaltung",
    page: "settings",
    blocks: [
      {
        list: [
          "FFT standardmässig aktivieren",
          "Standard-Fensterfunktion für FFT",
          "Gitter in Diagrammen anzeigen",
        ],
      },
    ],
  },
  {
    key: "admin",
    title: "Admin (nur für Admin-Konten)",
    icon: "mdi-shield-account-outline",
    category: "Konto & Verwaltung",
    page: "admin",
    blocks: [
      { p: "Neue Konten freischalten/sperren, Zugriff auf die Freigabeliste verwalten. Nur sichtbar, wenn dein Konto Admin-Rechte hat." },
    ],
  },
  {
    key: "tipps",
    title: "Tipps & Tastenkürzel",
    icon: "mdi-lightbulb-outline",
    category: "Tipps & Tastenkürzel",
    blocks: [
      {
        h: "Tastenkürzel",
        kbd: [
          { key: "?", desc: "Tastenkürzel-Übersicht öffnen (irgendwo drückbar)" },
          { key: "↑ / ↓", desc: "im Signal-Feld durch Signale blättern" },
        ],
      },
      {
        h: "In jedem Chart",
        list: [
          "Mausrad → zoomen, Shift+Ziehen → verschieben, Doppelklick/Zoom-Symbol → zurücksetzen",
          "Vollbild-Symbol → grösser + eigene Cursor-Liste daneben",
          "Spitzen-Modus-Schalter (Blitz-Symbol) → Min/Max-Downsampling statt einfachem Downsampling, zeigt kurze Ausschläge/Spitzen zuverlässiger auch bei stark gezoomtem-raus-Signal",
          "Ausreisser-Markierung-Schalter → hebt statistische Ausreisser im Chart optisch hervor",
          "Log-Y-Schalter → logarithmische statt linearer Y-Achse, pro Chart einzeln",
          "Abspielen-Symbol → Zeit-Cursor läuft automatisch durch den Chart (Tempo einstellbar), praktisch zum Nachverfolgen eines Ereignisses",
        ],
      },
      {
        p: "Vor dem Schliessen mit ungespeicherter Verarbeitungskette warnt die App automatisch.",
      },
    ],
  },
];

const filteredSections = computed(() => {
  const q = (query.value || "").trim().toLowerCase();
  return sections.filter((s) => {
    if (activeCategory.value && s.category !== activeCategory.value) return false;
    if (!q) return true;
    return JSON.stringify(s).toLowerCase().includes(q);
  });
});

const categories = computed(() => [...new Set(sections.map((s) => s.category))]);

const CATEGORY_COLORS = {
  "Erste Schritte": "primary",
  Messtool: "primary",
  "Weitere Werkzeuge": "secondary",
  "Konto & Verwaltung": "warning",
  "Tipps & Tastenkürzel": "success",
};
function categoryColor(category) {
  return CATEGORY_COLORS[category] || "primary";
}

// Escapes the text first (this is user-searched, but the source strings
// are our own static content — still escape defensively before wrapping
// matches, since this renders via v-html), then wraps every match of the
// current search term in <mark> so results are visibly highlighted
// instead of just "the whole card either shows or it doesn't."
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function highlight(text) {
  const escaped = escapeHtml(text);
  const q = (query.value || "").trim();
  if (!q) return escaped;
  const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escaped.replace(new RegExp(`(${escapedQ})`, "ig"), "<mark>$1</mark>");
}

// A page's help icon (HelpIconButton.vue) sets ui.helpTarget — expand
// that section and scroll to it. Runs immediately too, in case Hilfe
// wasn't mounted yet when the icon was clicked (first visit).
watch(
  () => ui.helpTarget,
  (key) => {
    if (!key) return;
    activeCategory.value = null;
    query.value = "";
    if (!openPanels.value.includes(key)) openPanels.value = [...openPanels.value, key];
    nextTick(() => {
      document.getElementById(`help-section-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    ui.helpTarget = null;
  },
  { immediate: true },
);
</script>

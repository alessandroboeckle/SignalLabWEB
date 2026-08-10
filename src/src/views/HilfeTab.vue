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
    key: "start",
    title: "Startseite / Übersicht",
    icon: "mdi-view-dashboard-outline",
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
        p: "Alle Filter sind zero-phase (sosfiltfilt-äquivalent, keine Phasenverschiebung). Achtung: Die Grenzfrequenz muss unter der Nyquist-Frequenz (halbe Abtastrate) liegen — bei ~8 Hz Abtastrate also unter 4 Hz.",
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
    blocks: [
      { p: "Export als PNG, PDF, CSV oder XLSX — inklusive optionaler Zusatzspalten (AVG, RMS, Ableitung, Integral). Auch als Batch über mehrere Dateien hinweg möglich (Export-Seite in der Import-Ansicht)." },
    ],
  },
  {
    key: "messtool-sessions",
    title: "Messtool → Sessions",
    icon: "mdi-content-save-outline",
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
    blocks: [
      { p: "Neue Konten freischalten/sperren, Zugriff auf die Freigabeliste verwalten. Nur sichtbar, wenn dein Konto Admin-Rechte hat." },
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
          "Mausrad auf einem Chart → zoomen, Shift+Ziehen → verschieben, Doppelklick/Zoom-Symbol → zurücksetzen",
          "Vollbild-Symbol auf jedem Chart → grösser + eigene Cursor-Liste daneben",
          "Spitzen-Modus-Schalter (Blitz-Symbol) → Min/Max-Downsampling statt einfachem Downsampling, zeigt kurze Ausschläge/Spitzen zuverlässiger auch bei stark gezoomtem-raus-Signal",
          "Ausreisser-Markierung-Schalter → hebt statistische Ausreisser im Chart optisch hervor",
          "Log-Y-Schalter → logarithmische statt linearer Y-Achse, pro Chart einzeln",
          "Abspielen-Symbol → Zeit-Cursor läuft automatisch durch den Chart (Tempo einstellbar), praktisch zum Nachverfolgen eines Ereignisses",
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

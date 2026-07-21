# Signal Lab

Eine Web-App mit zwei Werkzeugen: dem **Messtool** für die Analyse von LOGDATA-Messdateien
(Web-Port des ursprünglichen Python/PySide-Desktoptools), und dem **Generator-Tool** zum
Erzeugen und Untersuchen eigener Testsignale.

## 🌟 Funktionen

### Messtool

- **Import** — LOGDATA-CSV-Dateien (ISO-8859-1, semikolon-getrennt) einzeln oder als Batch
  laden, mit Zeilen-/Spaltenbereich, Samplefrequenz-Override, Fenstertyp, Qualitätscheck
  (leere/konstante Signale, Zeitlücken-Erkennung)
- **Filter** — Butterworth, Chebyshev I, Bessel, Elliptic (Tiefpass/Hochpass/Bandpass,
  Ordnung 1–10), gegen SciPy verifiziert (zero-phase `sosfiltfilt`), inkl. Frequenzgang/
  Bode-Plot
- **Analyse** — Statistik (Mittel/RMS/Std/Varianz/Min/Max), Ableitung, Integral, FFT
  (Hann/Hamming/Blackman/Rechteck), optionale Zeitbereich-Einschränkung, Mittelwert-/
  RMS-Referenzlinien, ±1σ-Band
- **Verarbeitung** — verkettbare Operationen (Glätten, Detrend, Normalisieren, Offset
  entfernen) mit Undo/Redo
- **Anzeige** (früher "Vergleich") — mehrere Dateien/Signale überlagert oder gestapelt
  darstellen, automatische Zeitausrichtung per Kreuzkorrelation, zweite Y-Achse,
  Zeit/Uhrzeit-Achsenumschaltung, Signal-Gruppen (benannte, wiederverwendbare Auswahlen)
- **Export** — PNG, SVG, PDF-Report (einzeln oder als Batch-ZIP), Excel (alle Signale
  einer Datei in einer Arbeitsmappe)
- **Sessions** — Arbeitsstand (Datei + Verarbeitung + Filter + Vergleichs-Zusammenstellung)
  in der Cloud speichern, laden, teilen
- **Charts** — Zoom/Pan, synchronisierter Zoom über mehrere Diagramme, Cursor-Messung,
  Marker/Notizen, Ausreisser-Markierung (>3σ), Abspiel-Modus mit Live-Wertanzeige,
  logarithmische Y-Achse

### Generator-Tool

- Signalgenerierung (Sinus, Cosinus, Rechteck, Sägezahn, Dreieck)
- FFT-Analyse, RMS-/Spitzenwert-Berechnung, Fensterfunktionen
- Signal-Vergleich und Rechner (Frequenz, Abtasttheorem, Energie, FFT-Auflösung)
- Sessions mit Notizen, Export als JSON/CSV

## 🚀 Erste Schritte

### Voraussetzungen
- Node.js 18+ und npm
- Ein Supabase-Projekt (Auth, Postgres, Storage)

### Installation

```bash
git clone <repo-url>
cd SignalLabWEB
npm install
```

### Supabase einrichten

Die App braucht ein paar Tabellen/Policies, die noch nicht Teil des Codes sind:

1. Führe die SQL-Skripte aus `supabase/` im Supabase SQL-Editor aus, in dieser Reihenfolge:
   - `messtool_sessions.sql`
   - `messtool_sessions_compare.sql`
2. Supabase-URL und -Key eintragen — entweder in einer `.env` (siehe `.env.example`,
   empfohlen) oder direkt als Fallback-Wert in `src/lib/supabase.js`.
3. Lege in der `profiles`-Tabelle einen Nutzer mit `approved = true` an (neue Accounts
   sind bis zur Freigabe gesperrt; ein Admin kann das auch über den Admin-Bereich in
   der App erledigen).

### Entwicklung

```bash
npm run dev
```

Öffnet auf `http://localhost:3000`.

### Tests

```bash
npm test          # einmal durchlaufen lassen
npm run test:watch  # im Watch-Modus
```

86 Tests decken die Kern-Utilities ab (Parser, Filter, Verarbeitungsketten, Analyse,
Downsampling, Kreuzkorrelation, Ausreisser-Erkennung, Zeitfenster, Signal-Gruppen,
Excel-/SVG-Export, Zoom-Synchronisation, Test-Generator).

### Production-Build

```bash
npm run build
```

Erzeugt einen optimierten Build in `dist/`. Schwere Abhängigkeiten (`jspdf`, `jszip`,
`xlsx`) werden dynamisch nachgeladen, nicht ins Haupt-Bundle gepackt — sie werden nur
geholt, wenn die jeweilige Export-Funktion tatsächlich benutzt wird.

## 🌐 Deployment auf GitHub Pages

Über GitHub Actions eingerichtet:

1. Code auf den `main`-Branch pushen
2. In den Repository-Einstellungen unter *Pages* als Quelle "GitHub Actions" wählen
3. Der Workflow baut und deployt automatisch bei jedem Push auf `main`

Erreichbar unter: `https://<username>.github.io/SignalLabWEB/`

Die Basis-URL lässt sich in `vite.config.js` anpassen (`base: '/SignalLabWEB/'`).

## 📁 Projektstruktur

```
SignalLabWEB/
├── src/
│   ├── views/
│   │   ├── messtool/         # Import, Filter, Analyse, Verarbeitung,
│   │   │                     # Anzeige, Export, Sessions, ChartCard
│   │   ├── OverviewTab.vue, SignalCreationTab.vue,      # Generator-Tool
│   │   ├── ComparisonTab.vue, CalculatorTab.vue,
│   │   ├── SessionManagementTab.vue, SettingsTab.vue,
│   │   ├── AdminTab.vue, LoginScreen.vue, WaitingScreen.vue
│   ├── stores/                # Pinia: messtoolStore, signalStore, authStore
│   ├── utils/                 # Parser, Filter, Verarbeitung, Analyse,
│   │   │                      # Downsampling, Kreuzkorrelation, Excel-/SVG-Export, ...
│   │   └── __tests__/         # Vitest-Tests für die utils/
│   ├── composables/           # useSignalNavigation, useChartZoomSync, useToast
│   ├── lib/                   # Supabase-Client
│   ├── styles/                # global.css
│   ├── App.vue                # Navigation, Layout, Theme
│   └── main.js
├── supabase/                  # SQL-Migrationen (in der Reihenfolge ausführen)
├── vite.config.js
└── package.json
```

## 🔧 Technologien

- **Vue 3** + **Vuetify 3** — UI
- **Vite** — Build-Tool
- **Vitest** — Tests
- **Pinia** — State Management
- **Chart.js** + **chartjs-plugin-zoom** — Diagramme
- **Supabase** — Auth, Postgres, Storage
- **jsPDF**, **JSZip**, **xlsx (SheetJS)** — Export (alle drei lazy-loaded)

## 💾 Datenhaltung

- **Messtool**: Dateien und Sessions liegen in Supabase (Storage-Bucket + Postgres-
  Tabellen), geräteübergreifend und optional mit Kollegen teilbar. Signal-Gruppen
  liegen lokal im Browser (localStorage).
- **Generator-Tool**: Sessions und Signale liegen ebenfalls in Supabase; die
  "Speicher & Daten"-Verwaltung in den Einstellungen betrifft nur diesen Teil.

## 🐛 Fehlerbehebung

**Seite lädt nicht richtig**
- Browser-Cache leeren, Konsole auf Fehler prüfen (F12)

**Kein Zugriff / "Warten auf Freigabe"**
- Neue Accounts müssen von einem Admin freigeschaltet werden (`profiles.approved`)

**Sessions/Export funktionieren nicht**
- Prüfen, ob die SQL-Migrationen aus `supabase/` ausgeführt wurden

**FFT sieht komisch aus**
- Abtastrate sollte ≥ 2× der höchsten interessanten Signalfrequenz sein (Nyquist)
- Ein Fenster (Hann/Hamming/Blackman) reduziert meist Leck-Effekte

---

Ursprüngliches Python/PySide-Desktoptool als Vorlage; Web-Port und Weiterentwicklung
mit Vue 3 und Vuetify.

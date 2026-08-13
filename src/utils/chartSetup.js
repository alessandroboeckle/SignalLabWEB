// Central Chart.js registration.
//
// Every chart-drawing view used to do `import Chart from "chart.js/auto"`,
// which registers *every* controller/scale/plugin Chart.js ships (bar, pie,
// doughnut, radar, polar area, bubble, scatter, decimation, sub-title, ...)
// regardless of whether the app uses them. SignalLabWEB only ever draws
// line charts, so all of that extra weight was being shipped and parsed
// for nothing.
//
// This module registers only what's actually used across the app:
//   - LineController               every chart here is `type: "line"`
//   - LineElement, PointElement    required by LineController
//   - CategoryScale                default x-axis (Overview, Generator preview,
//                                  MtExport quick-preview chart) when labels
//                                  are plain strings instead of numeric x/y pairs
//   - LinearScale                  numeric x/y axes (ChartCard-based charts:
//                                  MtAnalyse, MtVergleich, MtExport detail view)
//   - LogarithmicScale             Bode plot (MtFilter) + the log-scale toggles
//                                  in ChartCard and the Generator preview
//   - Filler                       `fill: true` area charts
//   - Tooltip, Legend              used everywhere
//
// If a future chart needs something else (e.g. a bar chart, or Decimation
// for very large datasets), register it here — not per-file — so this stays
// the single source of truth.
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  Filler,
  Tooltip,
  Legend,
  zoomPlugin,
);

export default Chart;

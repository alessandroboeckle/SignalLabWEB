// Pure Chart.js coordinate/range math shared by ChartCard.vue's click
// handling, cursor/marker/playhead plugins and zoom limiting. Extracted
// out of the component (previously inline) because none of it touches
// Vue reactivity or component state — every function takes a Chart.js
// `chart` instance (plus a plain value) and returns a plain result, so
// it's directly unit-testable without mounting anything.

// Works for both scale types ChartCard is used with: category scale with
// numeric-string labels (Analyse/Filter/Verarbeitung/Export), and a linear
// scale with raw {x,y} points and parsing:false (Vergleich).
// Reads the clicked x-value directly from the click's pixel position via
// the x-scale itself — not by finding "the nearest data point" (the old
// approach), which depends on there actually being a point close by and
// can silently come up empty (e.g. clicking a gap, a sparse chart, or
// just an unlucky spot), making clicks seem to do nothing at all.
// Reading straight off the scale always works anywhere inside the chart
// area, regardless of the data.
export function xValueAtEvent(chart, evt) {
  const xScale = chart.scales?.x;
  if (!xScale) return null;

  const rect = chart.canvas.getBoundingClientRect();
  const pixelX = evt.clientX - rect.left;
  if (pixelX < chart.chartArea.left || pixelX > chart.chartArea.right) return null;

  const rawValue = xScale.getValueForPixel(pixelX);
  if (rawValue == null || Number.isNaN(rawValue)) return null;

  if (chart.data.labels && chart.data.labels.length) {
    // Category scale: getValueForPixel returns a (possibly fractional)
    // index, not the real label value — round to the nearest label.
    const idx = Math.max(0, Math.min(chart.data.labels.length - 1, Math.round(rawValue)));
    const label = chart.data.labels[idx];
    return typeof label === "number" ? label : parseFloat(label);
  }
  return rawValue;
}

// Custom plugin: draws vertical lines + dots at cursor positions.
// Chart.js's category scale treats a raw JS number passed to
// getPixelForValue() as an INDEX into the labels array, not a data value
// to look up — so passing an actual x-value (e.g. 23.625 seconds) there
// silently gives a nonsense position (it just happens to look plausible
// often enough to go unnoticed). This converts a *real* x-axis value into
// whatever getPixelForValue actually expects for the chart's current
// scale: a fractional index for category scales (interpolating between
// the two bracketing labels), or the value itself for a linear scale
// (e.g. Vergleich's overlay, which isn't label-based at all).
export function xValueToPixel(chart, value) {
  const xScale = chart.scales?.x;
  // A chart built from an empty placeholder config (no datasets yet —
  // e.g. Anzeige's "Frequenzgang" while the FFT is still computing) has
  // no x scale at all. Returning NaN lets every caller's existing
  // "off-screen, skip it" check handle it instead of throwing.
  if (!xScale || value == null || !Number.isFinite(value)) return NaN;
  if (!chart.data.labels || !chart.data.labels.length) {
    return xScale.getPixelForValue(value);
  }
  const labels = chart.data.labels.map(Number);
  if (value <= labels[0]) return xScale.getPixelForValue(0);
  if (value >= labels[labels.length - 1]) return xScale.getPixelForValue(labels.length - 1);
  for (let i = 0; i < labels.length - 1; i++) {
    if (labels[i] <= value && labels[i + 1] >= value) {
      const frac = labels[i + 1] > labels[i] ? (value - labels[i]) / (labels[i + 1] - labels[i]) : 0;
      return xScale.getPixelForValue(i + frac);
    }
  }
  return xScale.getPixelForValue(0);
}

// Reads the chart's true full data range (set once by applyZoomLimits),
// not just whatever's currently zoomed/panned into — playback should be
// able to scrub across the *whole* recording, not just the visible slice.
export function getFullXRange(chart) {
  const limits = chart.options.plugins?.zoom?.limits?.x;
  if (limits && typeof limits.min === "number" && typeof limits.max === "number") {
    return limits;
  }
  return { min: chart.scales.x.min, max: chart.scales.x.max };
}

// Without a minRange, chartjs-plugin-zoom lets the wheel zoom in until the
// visible x-range shrinks to (numerically) nothing — no data point falls
// inside it any more and the chart appears to just vanish. Cap how far in
// you can go to a small fraction of the chart's own full data range, and
// keep pan/zoom from wandering past the actual data on either side.
//
// minRange used to be a flat 1% of the full span, which made the mouse
// wheel simply stop zooming far too early on long recordings (a 2 h file
// could never be zoomed closer than a ~72 s window). For the x-axis of
// point-based ({x,y}) charts it's now derived from the actual sample
// spacing instead — you can zoom until only a handful of samples are
// visible — with the old 1% kept only as a fallback when the spacing
// can't be determined.
export function applyZoomLimits(chart) {
  const limits = chart.options.plugins.zoom.limits;
  for (const key of Object.keys(chart.scales || {})) {
    const scale = chart.scales[key];
    if (!scale || typeof scale.min !== "number" || typeof scale.max !== "number") continue;
    const span = scale.max - scale.min;
    if (!(span > 0)) continue;
    let minRange = span * 0.01;
    if (key === "x") {
      const dx = smallestXStep(chart);
      if (dx > 0) minRange = Math.min(minRange, Math.max(dx * 4, span * 1e-9));
    } else {
      minRange = span * 1e-4;
    }
    limits[key] = { min: scale.min, max: scale.max, minRange };
  }
}

// Smallest positive x step in the chart's point data ({x,y} datasets) —
// or 1 for a label/category chart, where the x-axis is an index axis.
// Scans at most ~20k points per dataset so huge files stay cheap.
function smallestXStep(chart) {
  const labels = chart.data?.labels;
  if (Array.isArray(labels) && labels.length) return 1;
  let best = Infinity;
  for (const ds of chart.data?.datasets || []) {
    const d = ds?.data;
    if (!Array.isArray(d) || d.length < 2 || typeof d[0] !== "object" || d[0] == null) continue;
    const stride = Math.max(1, Math.floor(d.length / 20000));
    for (let i = stride; i < d.length; i += stride) {
      const a = d[i - stride]?.x, b = d[i]?.x;
      if (typeof a !== "number" || typeof b !== "number") continue;
      const step = (b - a) / stride;
      if (step > 0 && step < best) best = step;
    }
  }
  return Number.isFinite(best) ? best : 0;
}

// Captures/restores the visible x-range across a chart rebuild — see the
// comment on buildInline() in ChartCard.vue for why this exists.
export function captureXRange(chart) {
  const xScale = chart?.scales?.x;
  if (!xScale || typeof xScale.min !== "number" || typeof xScale.max !== "number") return null;
  return { min: xScale.min, max: xScale.max };
}
export function restoreXRange(chart, range) {
  if (!chart || !range || typeof chart.zoomScale !== "function") return;
  chart.zoomScale("x", range, "none");
}

export const CURSOR_COLORS = ["#DC2626", "#059669", "#7C3AED", "#DB2777", "#D97706", "#0891B2"];

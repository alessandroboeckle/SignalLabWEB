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
  const xScale = chart.scales.x;
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
export function applyZoomLimits(chart) {
  const limits = chart.options.plugins.zoom.limits;
  for (const key of Object.keys(chart.scales || {})) {
    const scale = chart.scales[key];
    if (!scale || typeof scale.min !== "number" || typeof scale.max !== "number") continue;
    const span = scale.max - scale.min;
    if (!(span > 0)) continue;
    limits[key] = { min: scale.min, max: scale.max, minRange: span * 0.01 };
  }
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

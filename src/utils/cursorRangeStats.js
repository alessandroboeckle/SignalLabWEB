// Statistics of every plotted series BETWEEN two x positions — the
// "what happens between cursor C1 and C2" readout (mean, RMS, min, max,
// peak-to-peak, number of points, plus where min/max occur).
//
// Works on a Chart.js chart (or a plain { data: { labels, datasets } }
// object in tests) with either data shape ChartCard sees:
//   - {x, y} point datasets on a linear/log axis
//   - label arrays (category axis) + plain value arrays
// Computed from the points the chart holds — with "Exakte Messpunkte"
// (the default) that's every sample; with point reduction it's the
// displayed points only (callers flag that via `reduced`).
//
// Skipped: datasets hidden via the legend, datasets without a label,
// and helper datasets marked `statsExclude: true` (mean/RMS/σ lines,
// window bands, …) whose "statistics" would be meaningless.

function toNum(v) {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function statsBetweenX(chartLike, xA, xB) {
  const a = toNum(xA), b = toNum(xB);
  if (a == null || b == null) return [];
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const labels = chartLike?.data?.labels;
  const hasLabels = Array.isArray(labels) && labels.length > 0;
  const labelXs = hasLabels ? labels.map(toNum) : null;
  const out = [];

  (chartLike?.data?.datasets || []).forEach((ds, dsIndex) => {
    if (!ds || ds.statsExclude || ds.label == null || ds.label === "") return;
    if (typeof chartLike.isDatasetVisible === "function" && !chartLike.isDatasetVisible(dsIndex)) return;
    const data = Array.isArray(ds.data) ? ds.data : [];
    let n = 0, sum = 0, sumSq = 0;
    let min = Infinity, max = -Infinity, minAt = null, maxAt = null;
    let firstY = null, lastY = null;
    for (let i = 0; i < data.length; i++) {
      const raw = data[i];
      const x = hasLabels ? labelXs[i] : toNum(raw && typeof raw === "object" ? raw.x : null);
      if (x == null || x < lo || x > hi) continue;
      const y = toNum(raw && typeof raw === "object" ? raw.y : raw);
      if (y == null) continue;
      n++;
      sum += y;
      sumSq += y * y;
      if (y < min) { min = y; minAt = x; }
      if (y > max) { max = y; maxAt = x; }
      if (firstY == null) firstY = y;
      lastY = y;
    }
    out.push({
      dsIndex,
      label: ds.label,
      color: ds.borderColor || "#059669",
      n,
      mean: n ? sum / n : null,
      rms: n ? Math.sqrt(sumSq / n) : null,
      min: n ? min : null,
      max: n ? max : null,
      minAt,
      maxAt,
      pp: n ? max - min : null,
      delta: n ? lastY - firstY : null,
    });
  });
  return out;
}

// Consecutive pairs of the given (already active, in display order)
// cursors: [{ aLabel, bLabel, a, b, dx, series }] — C1–C2, C2–C3, …
export function cursorRangeStats(chartLike, cursors) {
  const res = [];
  for (let i = 1; i < (cursors?.length || 0); i++) {
    const A = cursors[i - 1], B = cursors[i];
    res.push({
      aLabel: A.label, bLabel: B.label, a: A.x, b: B.x,
      dx: Math.abs(B.x - A.x),
      series: statsBetweenX(chartLike, A.x, B.x),
    });
  }
  return res;
}

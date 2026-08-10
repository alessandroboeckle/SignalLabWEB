// Interpolates every dataset's y-value at an exact x position (linear
// interpolation between the two bracketing points). Works with both
// shapes ChartCard's configs use:
//   - category scale: chart.data.labels (numeric strings/numbers) + plain
//     ds.data value arrays
//   - linear scale: ds.data as [{x, y}, ...] point objects, no labels
//
// This mirrors ChartCard.vue's interpolateDatasetsAtX exactly (kept here
// so it's actually testable — see the .test.js file).
export function interpolateDatasetsAtX(chartLike, x) {
  const { labels, datasets } = chartLike.data;
  const results = [];
  // Chart.js normalizes a config with no "labels" key to data.labels = []
  // internally — an empty array is truthy in JS, so `labels ? ... : ...`
  // wrongly took the category-scale branch for every linear-scale
  // ({x,y} point) chart in the app (the whole Anzeige/Vergleich page).
  // dsXs ended up [] for every dataset, so the cursor could never find
  // ANY value, anywhere, regardless of how dense or continuous the real
  // data was — matching exactly what was reported. Must check length,
  // not just truthiness.
  const hasLabels = Array.isArray(labels) && labels.length > 0;

  datasets.forEach((ds, dsIndex) => {
    if (!ds.data.length) return;
    const dsXs = hasLabels
      ? labels.map(Number)
      : ds.data.map((p) => (p && typeof p === "object" ? p.x : null));

    // Pulls a usable number out of whatever's actually in the data —
    // Chart.js itself is lenient about what it'll plot (numeric strings,
    // booleans), so a cursor rejecting anything that isn't a strict JS
    // number would fail on every single point of an otherwise perfectly
    // visible, densely-plotted line. Real invalid values (null, empty
    // string, NaN, objects) still correctly come back as "no value".
    const toFiniteNumber = (v) => {
      if (v == null) return null;
      if (typeof v === "boolean") return v ? 1 : 0;
      if (typeof v === "number") return Number.isFinite(v) ? v : null;
      if (typeof v === "string") {
        const trimmed = v.trim();
        if (trimmed === "") return null;
        const n = Number(trimmed);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    };
    const getY = (raw) => toFiniteNumber(raw && typeof raw === "object" ? raw.y : raw);

    // Primary: find the two points bracketing x and linearly interpolate
    // between them — precise, and correct even on a steep slope.
    let lo = -1;
    for (let i = 0; i < dsXs.length - 1; i++) {
      if (dsXs[i] <= x && dsXs[i + 1] >= x) {
        lo = i;
        break;
      }
    }

    let yVal = null;
    if (lo !== -1) {
      const yLo = getY(ds.data[lo]);
      const yHi = getY(ds.data[lo + 1]);
      if (yLo != null && yHi != null && Number.isFinite(yLo) && Number.isFinite(yHi)) {
        const xLo = dsXs[lo];
        const xHi = dsXs[lo + 1];
        const frac = xHi > xLo ? (x - xLo) / (xHi - xLo) : 0;
        yVal = yLo + (yHi - yLo) * frac;
      }
    }

    // Fallback: the strict bracket search can come up empty in edge cases
    // (a stray NaN x, floating-point ties, a measurement gap where the
    // two points straddling x are both null, or anything else that isn't
    // a clean ascending sweep) even though there's clearly real data in
    // the file — rather than silently showing nothing, fall back to
    // whichever point *with an actual value* is nearest to x by plain
    // distance (skipping null/gap points along the way). No range check
    // here on purpose: if this dataset has even one real value anywhere,
    // that's a genuine measured value worth showing, full stop — a
    // cursor should never come up empty just because of where exactly
    // the nearest real point happens to sit.
    if (yVal == null) {
      let nearestIdx = -1;
      let nearestDist = Infinity;
      for (let i = 0; i < dsXs.length; i++) {
        const xi = dsXs[i];
        if (xi == null || !Number.isFinite(xi)) continue;
        const yi = getY(ds.data[i]);
        if (yi == null || !Number.isFinite(yi)) continue; // skip gaps — keep looking
        const d = Math.abs(xi - x);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }
      if (nearestIdx !== -1) {
        yVal = getY(ds.data[nearestIdx]);
      }
    }

    if (yVal == null) return;

    results.push({
      dsIndex,
      label: ds.label || `Serie ${dsIndex + 1}`,
      color: ds.borderColor || "#059669",
      yAxisID: ds.yAxisID || "y",
      value: yVal,
    });
  });

  return results;
}

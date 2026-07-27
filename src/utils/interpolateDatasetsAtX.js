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

  datasets.forEach((ds, dsIndex) => {
    if (!ds.data.length) return;
    const dsXs = labels
      ? labels.map(Number)
      : ds.data.map((p) => (p && typeof p === "object" ? p.x : null));

    let lo = -1;
    for (let i = 0; i < dsXs.length - 1; i++) {
      if (dsXs[i] <= x && dsXs[i + 1] >= x) {
        lo = i;
        break;
      }
    }
    if (lo === -1) return;

    const rawLo = ds.data[lo];
    const rawHi = ds.data[lo + 1];
    const yLo = rawLo && typeof rawLo === "object" ? rawLo.y : rawLo;
    const yHi = rawHi && typeof rawHi === "object" ? rawHi.y : rawHi;
    if (yLo == null || yHi == null || !Number.isFinite(yLo) || !Number.isFinite(yHi)) return;

    const xLo = dsXs[lo];
    const xHi = dsXs[lo + 1];
    const frac = xHi > xLo ? (x - xLo) / (xHi - xLo) : 0;
    const yVal = yLo + (yHi - yLo) * frac;

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

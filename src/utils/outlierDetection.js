// Flags points that sit more than `threshold` standard deviations from
// their own series mean (z-score outlier detection) — used by ChartCard's
// "Ausreisser" toggle to highlight likely sensor glitches or genuinely
// extreme events without eyeballing the whole trace.

export function findOutlierIndices(values, threshold = 3) {
  const valid = values
    .map((v, i) => [v, i])
    .filter(([v]) => v != null && Number.isFinite(v));
  if (valid.length < 5) return [];

  const mean = valid.reduce((a, [v]) => a + v, 0) / valid.length;
  const variance = valid.reduce((a, [v]) => a + (v - mean) ** 2, 0) / valid.length;
  const std = Math.sqrt(variance);
  if (std === 0) return []; // constant signal, nothing to flag

  return valid.filter(([v]) => Math.abs(v - mean) > threshold * std).map(([, i]) => i);
}

// Finds the time offset that best aligns a "target" signal onto a
// "reference" signal, via normalized cross-correlation on a shared
// uniform time grid. Used by the Vergleich page's "Automatisch
// ausrichten" toggle — no manual offset-guessing needed.
//
// Both signals are resampled (linear interpolation) onto the same
// uniform grid spanning their combined time range, then z-normalized
// (zero mean, unit variance) so amplitude differences between the two
// recordings don't skew the match — only the *shape* over time matters.

function resampleUniform(t, y, tMin, tMax, n) {
  const out = new Array(n);
  if (t.length < 2) return out.fill(y[0] ?? 0);
  const dt = (tMax - tMin) / (n - 1);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const x = tMin + i * dt;
    while (j < t.length - 2 && t[j + 1] < x) j++;
    const t0 = t[j];
    const t1 = t[j + 1] ?? t[j];
    const y0 = y[j] ?? 0;
    const y1 = y[j + 1] ?? y0;
    const frac = t1 > t0 ? (x - t0) / (t1 - t0) : 0;
    out[i] = y0 + (y1 - y0) * frac;
  }
  return out;
}

function zNormalize(arr) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const centered = arr.map((v) => v - mean);
  const variance = centered.reduce((a, b) => a + b * b, 0) / arr.length;
  const std = Math.sqrt(variance) || 1;
  return centered.map((v) => v / std);
}

// Returns { offsetSec, confidence }. offsetSec is what to ADD to the
// target's time axis to line it up with the reference (matches the sign
// convention Vergleich's per-file offsetSec already uses). confidence is
// the normalized correlation score at the best lag, roughly -1..1 — low
// values (e.g. under ~0.2) mean the two signals probably don't actually
// share a recognizable common event, and the result shouldn't be trusted.
export function findBestOffset(refTime, refValues, targetTime, targetValues, opts = {}) {
  if (refTime.length < 2 || targetTime.length < 2) {
    return { offsetSec: 0, confidence: 0 };
  }

  const gridN = opts.gridN ?? 500;
  const tMin = Math.min(refTime[0], targetTime[0]);
  const tMax = Math.max(refTime[refTime.length - 1], targetTime[targetTime.length - 1]);
  const dt = (tMax - tMin) / (gridN - 1);
  if (!(dt > 0)) return { offsetSec: 0, confidence: 0 };

  const maxLagSec = opts.maxLagSec ?? (tMax - tMin) * 0.5;
  const maxLagSamples = Math.max(1, Math.floor(maxLagSec / dt));

  const a = zNormalize(resampleUniform(refTime, refValues, tMin, tMax, gridN));
  const b = zNormalize(resampleUniform(targetTime, targetValues, tMin, tMax, gridN));

  let bestLag = 0;
  let bestScore = -Infinity;
  for (let lag = -maxLagSamples; lag <= maxLagSamples; lag++) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < a.length; i++) {
      const j = i + lag;
      if (j < 0 || j >= b.length) continue;
      sum += a[i] * b[j];
      count++;
    }
    if (count < a.length * 0.3) continue; // too little overlap at this lag to trust it
    const score = sum / count;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  return { offsetSec: -bestLag * dt, confidence: bestScore };
}

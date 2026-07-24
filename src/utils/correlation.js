// How similar are two signals, really — not just "do they look alike
// overlaid", but an actual number. Resamples both onto a shared uniform
// time grid first (since two series being compared can have different
// sample rates/time bases/offsets), then computes the Pearson
// correlation coefficient (-1..1; 1 = perfectly aligned, 0 = unrelated,
// -1 = perfectly inverse).

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

// Returns the Pearson r, or null if there's no meaningful overlap /
// either signal is constant (correlation is undefined for a flat line).
export function correlateSeries(t1, y1, t2, y2, gridN = 500) {
  if (t1.length < 2 || t2.length < 2) return null;

  const tMin = Math.max(t1[0], t2[0]);
  const tMax = Math.min(t1[t1.length - 1], t2[t2.length - 1]);
  if (tMax <= tMin) return null; // no overlapping time range at all

  const a = resampleUniform(t1, y1, tMin, tMax, gridN);
  const b = resampleUniform(t2, y2, tMin, tMax, gridN);

  const n = a.length;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;

  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den === 0 ? null : num / den;
}

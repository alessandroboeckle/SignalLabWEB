// Downsampling for plotting. Two modes:
//
//  "simple"  – take every Nth point. Fast, but can miss short spikes.
//  "minmax"  – split into buckets, keep the min and max of each bucket.
//              Preserves peaks (both up and down), so short spikes stay
//              visible. Emits the two extrema per bucket in time order so
//              the x-axis stays monotonic.
//
// Returns { rx: number[], ry: number[], indices: number[] } — indices are
// the original positions the rx/ry points came from, so a caller can look
// up a third parallel array (e.g. real clock time) at the exact same
// points without it needing its own separate downsampling pass.

export function downsample(values, xs, mode = "simple", target = 800) {
  const n = values.length;
  if (n <= target) {
    return { rx: xs.slice(), ry: values.slice(), indices: xs.map((_, i) => i) };
  }

  if (mode === "minmax") {
    const buckets = Math.max(1, Math.floor(target / 2));
    const size = Math.ceil(n / buckets);
    const rx = [];
    const ry = [];
    const indices = [];
    for (let b = 0; b < n; b += size) {
      const end = Math.min(b + size, n);
      let minI = b, maxI = b;
      for (let i = b; i < end; i++) {
        const v = values[i] ?? 0;
        if (v < (values[minI] ?? 0)) minI = i;
        if (v > (values[maxI] ?? 0)) maxI = i;
      }
      // emit in the order they occur so x stays increasing
      const [firstI, secondI] = minI <= maxI ? [minI, maxI] : [maxI, minI];
      rx.push(xs[firstI]);
      ry.push(values[firstI]);
      indices.push(firstI);
      if (secondI !== firstI) {
        rx.push(xs[secondI]);
        ry.push(values[secondI]);
        indices.push(secondI);
      }
    }
    return { rx, ry, indices };
  }

  // simple: every Nth point
  const step = Math.max(1, Math.ceil(n / target));
  const rx = [];
  const ry = [];
  const indices = [];
  for (let i = 0; i < n; i += step) {
    rx.push(xs[i]);
    ry.push(values[i]);
    indices.push(i);
  }
  return { rx, ry, indices };
}

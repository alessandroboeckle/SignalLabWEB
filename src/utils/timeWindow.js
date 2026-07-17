// Finds the [startIdx, endIdx) slice of a time array falling within an
// optional [startSec, endSec] window — used by Analyse's "Zeitbereich"
// feature to restrict stats/derivative/integral/FFT to part of a
// recording instead of always the whole file. Either bound can be null
// (meaning "from the start" / "to the end").
export function findWindowBounds(t, startSec, endSec) {
  if (!t.length) return [0, 0];
  let startIdx = 0;
  let endIdx = t.length;
  if (startSec != null) {
    const idx = t.findIndex((v) => v >= startSec);
    startIdx = idx === -1 ? t.length : idx;
  }
  if (endSec != null) {
    const idx = t.findIndex((v) => v > endSec);
    endIdx = idx === -1 ? t.length : idx;
  }
  return [startIdx, Math.max(startIdx, endIdx)];
}

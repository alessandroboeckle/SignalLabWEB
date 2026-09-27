// Common wall-clock time base for charts that show several recordings
// (Anzeige "Uhrzeit" axis). Each recording has elapsed `time[]` plus the
// real clock `clockSec[]` (seconds since midnight). All series are
// placed on one axis: x = time + shift, where x = 0 is the earliest
// recording start — so the same x is the same clock moment everywhere.

// elapsed → clock offset of one series (clock = time + offset), or null
export function clockOffsetOf(s) {
  if (!s?.clockSec?.length || !s?.time?.length) return null;
  const c0 = s.clockSec[0];
  const t0 = s.time[0];
  if (c0 == null || t0 == null || !Number.isFinite(c0) || !Number.isFinite(t0)) return null;
  return c0 - t0;
}

// Clock time (s since midnight) at x = 0: earliest start over all series
// that have clock info; null if none does.
export function clockReference(seriesList) {
  let ref = null;
  for (const s of seriesList || []) {
    const co = clockOffsetOf(s);
    if (co == null) continue;
    const start = s.time[0] + co;
    if (ref == null || start < ref) ref = start;
  }
  return ref;
}

// Amount to add to a series' elapsed x values on the shared axis.
export function clockShift(s, ref) {
  if (ref == null) return 0;
  const co = clockOffsetOf(s);
  return co == null ? 0 : co - ref;
}

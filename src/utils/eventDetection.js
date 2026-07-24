// Finds contiguous time segments where a signal crosses a threshold — the
// "find the braking event automatically" feature, instead of hunting for
// it by eye in the chart.
//
// mode:
//   "abs"   — |value| > threshold (default; catches both positive and
//             negative excursions, e.g. braking OR accelerating hard)
//   "above" — value > threshold
//   "below" — value < threshold
export function findEvents(y, t, threshold, { mode = "abs", minDurationSec = 0 } = {}) {
  const exceeds = (v) => {
    if (v == null || !Number.isFinite(v)) return false;
    if (mode === "above") return v > threshold;
    if (mode === "below") return v < threshold;
    return Math.abs(v) > threshold;
  };

  const events = [];
  let inEvent = false;
  let startIdx = null;

  const closeEvent = (endIdx) => {
    const duration = t[endIdx] - t[startIdx];
    if (duration < minDurationSec) return;
    let peakIdx = startIdx;
    for (let j = startIdx; j <= endIdx; j++) {
      if (Math.abs(y[j]) > Math.abs(y[peakIdx])) peakIdx = j;
    }
    events.push({
      startTime: t[startIdx],
      endTime: t[endIdx],
      durationSec: +duration.toFixed(3),
      peakValue: y[peakIdx],
      peakTime: t[peakIdx],
    });
  };

  for (let i = 0; i < y.length; i++) {
    const e = exceeds(y[i]);
    if (e && !inEvent) {
      inEvent = true;
      startIdx = i;
    } else if (!e && inEvent) {
      inEvent = false;
      closeEvent(i - 1);
    }
  }
  if (inEvent) closeEvent(y.length - 1);

  return events;
}

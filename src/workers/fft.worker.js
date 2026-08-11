// Runs the FFT (amplitude + phase spectrum) for one or more signals off
// the main thread. Same motivation as csvParser.worker.js: FFT over a
// long, densely-sampled measurement signal is real CPU work, and doing
// it on the main thread would freeze the whole tab — chart interactions,
// scrolling, everything — for however long it takes, every time someone
// toggles the frequency-response view or the compared signal set changes.
import { fft } from "../utils/messtoolAnalysis.js";

self.onmessage = (e) => {
  const { series, windowType, normalize } = e.data;
  try {
    const results = series.map((s) => ({
      key: s.key,
      ...fft(s.y, s.t, { windowType, normalize }),
    }));
    self.postMessage({ type: "done", results });
  } catch (err) {
    self.postMessage({ type: "error", message: err?.message || String(err) });
  }
};

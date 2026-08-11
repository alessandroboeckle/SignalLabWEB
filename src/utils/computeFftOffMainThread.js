import { fft } from "./messtoolAnalysis.js";

function computeOnMainThread(series, windowType, normalize) {
  return series.map((s) => ({ key: s.key, ...fft(s.y, s.t, { windowType, normalize }) }));
}

// Runs fft() for a batch of series (e.g. every signal currently shown on
// the Anzeige page's frequency-response plot) via fft.worker.js, so the
// UI stays responsive no matter how many signals or how long each one
// is. Falls back to computing directly on the main thread — same
// reasoning as parseCsvOffMainThread.js — if Workers aren't available,
// if the worker fails to start, or if it never responds within a
// reasonable time (a stuck worker should never leave the caller hanging
// forever).
export function computeFftOffMainThread(series, { windowType = "hann", normalize = true } = {}) {
  if (typeof Worker === "undefined") {
    return Promise.resolve(computeOnMainThread(series, windowType, normalize));
  }

  return new Promise((resolve) => {
    let worker;
    try {
      worker = new Worker(new URL("../workers/fft.worker.js", import.meta.url), { type: "module" });
    } catch {
      resolve(computeOnMainThread(series, windowType, normalize));
      return;
    }

    let settled = false;
    const timeoutMs = 20000;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      worker.terminate();
      resolve(computeOnMainThread(series, windowType, normalize));
    }, timeoutMs);

    function finish(results) {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      worker.terminate();
      resolve(results);
    }

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "done") finish(msg.results);
      else if (msg.type === "error") finish(computeOnMainThread(series, windowType, normalize));
    };
    worker.onerror = () => finish(computeOnMainThread(series, windowType, normalize));
    worker.postMessage({
      series: series.map((s) => ({ key: s.key, y: s.y, t: s.t })),
      windowType,
      normalize,
    });
  });
}

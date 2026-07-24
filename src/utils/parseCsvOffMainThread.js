import { parseMesstoolCsv } from "./messtoolParser.js";

// Parses a CSV string off the main thread via csvParser.worker.js, so the
// rest of the UI stays responsive during a big parse. Falls back to
// parsing directly on the main thread (the old behavior) if Worker isn't
// available for some reason, or if the worker itself fails to start —
// import should never be silently broken by this.
export function parseCsvOffMainThread(text, options = {}, onProgress) {
  if (typeof Worker === "undefined") {
    return parseMesstoolCsv(text, { ...options, onProgress });
  }

  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(new URL("../workers/csvParser.worker.js", import.meta.url), {
        type: "module",
      });
    } catch {
      // Worker construction itself failed (unusual, but be defensive) —
      // fall back to the main thread instead of failing the import.
      parseMesstoolCsv(text, { ...options, onProgress }).then(resolve, reject);
      return;
    }

    let settled = false;
    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "progress") {
        onProgress?.(msg.frac);
      } else if (msg.type === "done") {
        settled = true;
        resolve(msg.result);
        worker.terminate();
      } else if (msg.type === "error") {
        settled = true;
        reject(new Error(msg.message));
        worker.terminate();
      }
    };
    worker.onerror = () => {
      if (settled) return;
      // Something went wrong in the worker itself (not a parse error) —
      // fall back to parsing on the main thread rather than failing.
      worker.terminate();
      parseMesstoolCsv(text, { ...options, onProgress }).then(resolve, reject);
    };
    worker.postMessage({ text, options });
  });
}

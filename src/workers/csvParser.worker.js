// Runs parseMesstoolCsv off the main thread. The parser already yields
// periodically (via setTimeout) to avoid freezing the tab during a big
// parse, but that only helps so much — actual work still runs on the
// main thread between yields. A worker moves *all* of it off, so the
// rest of the UI (scrolling, other components, anything else running)
// stays fully responsive no matter how big the file is.
import { parseMesstoolCsv } from "../utils/messtoolParser.js";

self.onmessage = async (e) => {
  const { text, options } = e.data;
  try {
    const result = await parseMesstoolCsv(text, {
      ...options,
      onProgress: (frac) => self.postMessage({ type: "progress", frac }),
    });
    self.postMessage({ type: "done", result });
  } catch (err) {
    self.postMessage({ type: "error", message: err?.message || String(err) });
  }
};

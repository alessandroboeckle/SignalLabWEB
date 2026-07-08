// Signal processing operations, built object-oriented.
//
// Every operation extends `ProcessingOp` and implements apply(y, t) -> number[].
// This keeps the UI simple: it just holds a list of ops and applies them in
// sequence, without special-casing each type. Adding a new operation = adding
// a new class, nothing else changes.
//
// Formulas mirror hilfsklassen/daten_verarbeiter.py from the original Messtool.

// --- window helper (shared with smoothing) ---
function windowWeights(len, type) {
  const w = new Array(len);
  if (type === "hamming") {
    for (let i = 0; i < len; i++) w[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (len - 1));
  } else if (type === "hanning" || type === "hann") {
    for (let i = 0; i < len; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (len - 1));
  } else {
    w.fill(1); // rectangular / moving average
  }
  return w;
}

// Base class: common shape for all operations.
export class ProcessingOp {
  constructor(id, label, params = {}) {
    this.id = id;
    this.label = label;
    this.params = params;
  }
  // Override in subclasses. Returns a new array, never mutates the input.
  apply(y /*, t */) {
    return y.slice();
  }
}

// Moving-average / windowed smoothing with edge reflection (like np.convolve trick).
export class SmoothOp extends ProcessingOp {
  constructor(params = {}) {
    super("smooth", "Glätten", {
      windowLen: params.windowLen ?? 11,
      windowType: params.windowType ?? "hanning",
    });
  }
  apply(y) {
    let { windowLen, windowType } = this.params;
    if (!y || y.length < windowLen) return y ? y.slice() : [];
    if (windowLen < 3) return y.slice();
    if (windowLen % 2 === 0) windowLen += 1; // force odd

    // reflect edges: y[wl-1..1], y, y[-2..-wl]
    const left = [];
    for (let i = windowLen - 1; i >= 1; i--) left.push(y[i]);
    const right = [];
    for (let i = y.length - 2; i >= y.length - windowLen; i--) right.push(y[i] ?? 0);
    const s = left.concat(y, right);

    const w = windowWeights(windowLen, windowType);
    const wsum = w.reduce((a, b) => a + b, 0);
    const kernel = w.map((v) => v / wsum);

    // valid convolution
    const outLen = s.length - windowLen + 1;
    const conv = new Array(outLen);
    for (let i = 0; i < outLen; i++) {
      let acc = 0;
      for (let k = 0; k < windowLen; k++) acc += (s[i + k] ?? 0) * kernel[k];
      conv[i] = acc;
    }
    // trim to original length
    const start = Math.floor(windowLen / 2);
    return conv.slice(start, start + y.length);
  }
}

// Linear detrend: subtract best-fit line (polyfit degree 1).
export class DetrendOp extends ProcessingOp {
  constructor() {
    super("detrend", "Detrend (linear)", {});
  }
  apply(y) {
    const n = y.length;
    if (n < 2) return y.slice();
    // least-squares line over x = 0..n-1
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let i = 0; i < n; i++) {
      const v = y[i] ?? 0;
      sx += i; sy += v; sxx += i * i; sxy += i * v;
    }
    const denom = n * sxx - sx * sx;
    const slope = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
    const intercept = (sy - slope * sx) / n;
    return y.map((v, i) => (v ?? 0) - (slope * i + intercept));
  }
}

// Normalize to a target peak absolute amplitude (default 1).
export class NormalizeOp extends ProcessingOp {
  constructor(params = {}) {
    super("normalize", "Normalisieren", { target: params.target ?? 1 });
  }
  apply(y) {
    let maxAbs = 0;
    for (const v of y) {
      const a = Math.abs(v ?? 0);
      if (a > maxAbs) maxAbs = a;
    }
    if (maxAbs === 0) return y.slice();
    const scale = this.params.target / maxAbs;
    return y.map((v) => (v ?? 0) * scale);
  }
}

// Remove the mean (DC offset).
export class RemoveOffsetOp extends ProcessingOp {
  constructor() {
    super("offset", "Offset entfernen (Mittelwert)", {});
  }
  apply(y) {
    let s = 0, n = 0;
    for (const v of y) if (v != null) { s += v; n++; }
    const m = n ? s / n : 0;
    return y.map((v) => (v ?? 0) - m);
  }
}

// Registry so the UI can offer the available operations generically.
export const OP_REGISTRY = [
  { id: "smooth", label: "Glätten", make: (p) => new SmoothOp(p) },
  { id: "detrend", label: "Detrend (linear)", make: () => new DetrendOp() },
  { id: "normalize", label: "Normalisieren", make: (p) => new NormalizeOp(p) },
  { id: "offset", label: "Offset entfernen", make: () => new RemoveOffsetOp() },
];

// Apply a chain of operations in sequence.
export function applyChain(y, t, ops) {
  let out = y.slice();
  for (const op of ops) out = op.apply(out, t);
  return out;
}

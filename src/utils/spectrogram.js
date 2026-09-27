// Spectrogram (short-time Fourier transform): the signal is cut into
// windows of `segN` samples, stepped by `hop` samples (overlap), each
// window transformed with the same fft() as the spectrum plot (same
// window functions and 2/N amplitude scaling), giving amplitude over
// time (columns) × frequency (rows).
//
// Pure numbers here (unit-tested); turning them into a picture is
// buildSpectrogramPixels() (also pure) + the canvas wrapper at the end.

import { fft } from "./messtoolAnalysis.js";

const isPow2 = (n) => n > 0 && (n & (n - 1)) === 0;

// Default window length when none is given: a power of two (fast FFT)
// giving roughly 100–200 time columns for the signal length.
export function autoSegmentSamples(n) {
  if (!(n > 0)) return 0;
  const target = n / 128;
  let p = 64;
  while (p * 2 <= target && p < 8192) p *= 2;
  return Math.min(p, Math.max(8, Math.floor(n / 2)));
}

// Cost guard: at most ~MAX_WORK sample-operations so a long recording
// can't freeze the tab. If the requested overlap would exceed it, the
// step (hop) is enlarged instead and `hopIncreased` is reported.
const MAX_WORK = 8e6;
const MAX_COLUMNS = 4000;

// detrend (default true, like scipy.signal.spectrogram's detrend="constant"):
// subtract each window's mean before transforming, so a DC offset (e.g.
// 750 V link voltage) doesn't dominate the 0 Hz row and squeeze all real
// content into the bottom of the colour scale.
export function spectrogram(y, t, { segmentSec = null, overlapPct = 50, windowType = "hann", detrend = true } = {}) {
  const N = y?.length || 0;
  const empty = { cols: 0, bins: 0, times: [], freqs: [], amp: new Float32Array(0), segN: 0, hop: 0, hopSec: 0, dt: 0, fs: 0, df: 0, hopIncreased: false };
  if (N < 16 || !t || t.length !== N) return empty;
  const dt = (t[N - 1] - t[0]) / (N - 1);
  if (!(dt > 0)) return empty;

  let segN = Number(segmentSec) > 0 ? Math.round(Number(segmentSec) / dt) : autoSegmentSamples(N);
  segN = Math.max(8, Math.min(segN, N));
  const overlap = Math.min(90, Math.max(0, Number(overlapPct) || 0)) / 100;
  let hop = Math.max(1, Math.round(segN * (1 - overlap)));

  const costPerCol = segN * (isPow2(segN) ? 1 : 6);
  let cols = Math.floor((N - segN) / hop) + 1;
  let hopIncreased = false;
  const maxCols = Math.max(1, Math.min(MAX_COLUMNS, Math.floor(MAX_WORK / costPerCol)));
  if (cols > maxCols) {
    hop = Math.ceil((N - segN) / Math.max(1, maxCols - 1)) || 1;
    cols = Math.floor((N - segN) / hop) + 1;
    hopIncreased = true;
  }

  const bins = Math.floor(segN / 2) + 1;
  const amp = new Float32Array(cols * bins);
  const times = new Array(cols);
  let freqs = null;
  for (let c = 0; c < cols; c++) {
    const i0 = c * hop;
    let seg = y.slice(i0, i0 + segN);
    if (detrend) {
      let m = 0;
      for (let i = 0; i < seg.length; i++) m += seg[i] || 0;
      m /= seg.length;
      seg = seg.map((v) => (v || 0) - m);
    }
    const r = fft(seg, t.slice(i0, i0 + segN), { windowType, normalize: true });
    if (!freqs) freqs = r.freq;
    for (let k = 0; k < bins; k++) amp[c * bins + k] = r.amp[k] || 0;
    times[c] = (t[i0] + t[i0 + segN - 1]) / 2;
  }
  const fs = 1 / dt;
  return {
    cols, bins, times, freqs, amp,
    segN, hop, hopSec: hop * dt, dt, fs, df: fs / segN,
    hopIncreased,
  };
}

// Frequency with the largest amplitude in every column (optionally only
// up to maxFreq; DC bin skipped so an offset doesn't always "win").
export function dominantFrequencies(spec, maxFreq = null) {
  const { cols, bins, freqs, amp } = spec;
  const out = new Array(cols);
  for (let c = 0; c < cols; c++) {
    let best = -1, bestK = 0;
    for (let k = 1; k < bins; k++) {
      if (maxFreq != null && freqs[k] > maxFreq) break;
      const a = amp[c * bins + k];
      if (a > best) { best = a; bestK = k; }
    }
    out[c] = freqs[bestK] ?? 0;
  }
  return out;
}

// Perceptually uniform "viridis"-like colour ramp, 256 entries.
const STOPS = [
  [0.0, [68, 1, 84]], [0.13, [72, 36, 117]], [0.25, [65, 68, 135]],
  [0.38, [53, 95, 141]], [0.5, [42, 120, 142]], [0.63, [33, 145, 140]],
  [0.75, [34, 168, 132]], [0.88, [122, 209, 81]], [1.0, [253, 231, 37]],
];
export const COLORMAP = (() => {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const v = i / 255;
    let j = 1;
    while (j < STOPS.length - 1 && STOPS[j][0] < v) j++;
    const [p0, c0] = STOPS[j - 1], [p1, c1] = STOPS[j];
    const f = p1 > p0 ? (v - p0) / (p1 - p0) : 0;
    for (let ch = 0; ch < 3; ch++) lut[i * 3 + ch] = Math.round(c0[ch] + (c1[ch] - c0[ch]) * f);
  }
  return lut;
})();
export function colormapCss(stops = 8) {
  const parts = [];
  for (let i = 0; i <= stops; i++) {
    const idx = Math.round((i / stops) * 255) * 3;
    parts.push(`rgb(${COLORMAP[idx]},${COLORMAP[idx + 1]},${COLORMAP[idx + 2]}) ${Math.round((i / stops) * 100)}%`);
  }
  return `linear-gradient(90deg, ${parts.join(", ")})`;
}

// RGBA pixels for the picture: width ≤ maxW columns, height ≤ maxH rows
// (max-pooling neighbouring cells so short peaks never disappear), rows
// top = highest frequency. Colour = amplitude in dB relative to the
// strongest cell shown, clamped to [-dbRange, 0].
// Returns the extents the image covers in data units (x in s, f in Hz).
export function buildSpectrogramPixels(spec, { dbRange = 60, maxFreq = null, maxW = 1200, maxH = 512 } = {}) {
  const { cols, bins, freqs, amp, hopSec, df, times } = spec;
  if (!cols || !bins) return null;
  let usedBins = bins;
  if (maxFreq != null && maxFreq > 0) {
    usedBins = 1;
    while (usedBins < bins && freqs[usedBins] <= maxFreq) usedBins++;
  }
  const gc = Math.max(1, Math.ceil(cols / maxW));
  const gr = Math.max(1, Math.ceil(usedBins / maxH));
  const W = Math.ceil(cols / gc);
  const H = Math.ceil(usedBins / gr);

  const pooled = new Float32Array(W * H);
  let ref = 0;
  for (let cx = 0; cx < W; cx++) {
    for (let ry = 0; ry < H; ry++) {
      let m = 0;
      for (let c = cx * gc; c < Math.min(cols, (cx + 1) * gc); c++) {
        for (let k = ry * gr; k < Math.min(usedBins, (ry + 1) * gr); k++) {
          const a = amp[c * bins + k];
          if (a > m) m = a;
        }
      }
      pooled[cx * H + ry] = m;
      if (m > ref) ref = m;
    }
  }
  const pixels = new Uint8ClampedArray(W * H * 4);
  const range = Math.max(1, Number(dbRange) || 60);
  for (let cx = 0; cx < W; cx++) {
    for (let ry = 0; ry < H; ry++) {
      const a = pooled[cx * H + ry];
      const db = a > 0 && ref > 0 ? 20 * Math.log10(a / ref) : -Infinity;
      const v = Math.max(0, Math.min(1, (db + range) / range));
      const li = Math.round(v * 255) * 3;
      const row = H - 1 - ry; // top row = highest frequency
      const p = (row * W + cx) * 4;
      pixels[p] = COLORMAP[li];
      pixels[p + 1] = COLORMAP[li + 1];
      pixels[p + 2] = COLORMAP[li + 2];
      pixels[p + 3] = 255;
    }
  }
  const x0 = times[0] - hopSec / 2;
  const f0 = -df / 2;
  return {
    pixels, width: W, height: H,
    x0, x1: x0 + W * gc * hopSec,
    f0, f1: f0 + H * gr * df,
    fMaxShown: freqs[usedBins - 1],
    refAmp: ref,
    dbRange: range,
  };
}

// Browser-only: pixels → a canvas that Chart.js plugins can drawImage().
export function pixelsToCanvas(img) {
  if (!img || typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.putImageData(new ImageData(img.pixels, img.width, img.height), 0, 0);
  return canvas;
}

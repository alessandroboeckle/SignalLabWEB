import { describe, it, expect } from "vitest";
import { spectrogram, dominantFrequencies, autoSegmentSamples, buildSpectrogramPixels, COLORMAP, colormapCss } from "../spectrogram.js";

function signal(n, fs, fn) {
  const t = Array.from({ length: n }, (_, i) => i / fs);
  return { t, y: t.map(fn) };
}

describe("spectrogram", () => {
  it("finds a constant sine at its frequency in every column", () => {
    const { t, y } = signal(8000, 1000, (x) => Math.sin(2 * Math.PI * 50 * x));
    const s = spectrogram(y, t, { segmentSec: 0.256, overlapPct: 50 });
    expect(s.segN).toBe(256);
    expect(s.hop).toBe(128);
    expect(s.cols).toBe(Math.floor((8000 - 256) / 128) + 1);
    expect(s.bins).toBe(129);
    const dom = dominantFrequencies(s);
    for (const f of dom) expect(Math.abs(f - 50)).toBeLessThanOrEqual(s.df);
  });

  it("tracks a frequency step over time", () => {
    const { t, y } = signal(10000, 1000, (x) => Math.sin(2 * Math.PI * (x < 5 ? 20 : 120) * x));
    const s = spectrogram(y, t, { segmentSec: 0.5, overlapPct: 0 });
    const dom = dominantFrequencies(s);
    expect(Math.abs(dom[0] - 20)).toBeLessThanOrEqual(s.df);
    expect(Math.abs(dom[dom.length - 1] - 120)).toBeLessThanOrEqual(s.df);
    // column times are window centres, increasing
    for (let i = 1; i < s.times.length; i++) expect(s.times[i]).toBeGreaterThan(s.times[i - 1]);
    expect(s.times[0]).toBeCloseTo(0.2495, 3);
  });

  it("keeps amplitude scaling consistent with the FFT (2/N, rect window)", () => {
    const { t, y } = signal(4096, 1024, (x) => 3 * Math.sin(2 * Math.PI * 64 * x));
    const s = spectrogram(y, t, { segmentSec: 0.25, overlapPct: 0, windowType: "none" });
    const k = s.freqs.findIndex((f) => Math.abs(f - 64) < 1e-6);
    expect(k).toBeGreaterThan(0);
    expect(s.amp[0 * s.bins + k]).toBeCloseTo(3, 1);
  });

  it("enlarges the step instead of doing unbounded work on huge inputs", () => {
    const n = 400000;
    const { t, y } = signal(n, 1000, (x) => Math.sin(x));
    // 1000-sample windows (not a power of two -> Bluestein, ~6x cost) at
    // 90 % overlap would be ~4000 FFTs; the budget allows ~1333.
    const s = spectrogram(y, t, { segmentSec: 1.0, overlapPct: 90 });
    expect(s.segN).toBe(1000);
    expect(s.hopIncreased).toBe(true);
    expect(s.cols * s.segN * 6).toBeLessThanOrEqual(8e6 + 6 * s.segN);
    expect(s.times[s.times.length - 1]).toBeGreaterThan(390); // still covers the whole signal
  });

  it("returns an empty result for too-short or invalid input", () => {
    expect(spectrogram([1, 2, 3], [0, 1, 2]).cols).toBe(0);
    expect(spectrogram(new Array(100).fill(0), new Array(100).fill(0)).cols).toBe(0);
    expect(spectrogram(null, null).cols).toBe(0);
  });

  it("auto window is a power of two and never larger than half the signal", () => {
    expect(autoSegmentSamples(20000)).toBe(128);
    expect(autoSegmentSamples(1000000)).toBe(4096);
    expect(autoSegmentSamples(100)).toBe(50);
  });
});

describe("spectrogram detrend", () => {
  it("removes the DC offset per window by default, keeps it when asked", () => {
    const { t, y } = signal(4096, 1024, (x) => 750 + Math.sin(2 * Math.PI * 64 * x));
    const on = spectrogram(y, t, { segmentSec: 0.25, overlapPct: 0, windowType: "none" });
    const off = spectrogram(y, t, { segmentSec: 0.25, overlapPct: 0, windowType: "none", detrend: false });
    expect(on.amp[0]).toBeLessThan(1e-9);
    expect(off.amp[0]).toBeGreaterThan(1000);
  });
});

describe("buildSpectrogramPixels", () => {
  it("pools to the size limits and maps the strongest cell to the top colour", () => {
    const { t, y } = signal(20000, 1000, (x) => Math.sin(2 * Math.PI * 100 * x));
    const s = spectrogram(y, t, { segmentSec: 0.128, overlapPct: 50 });
    const img = buildSpectrogramPixels(s, { maxW: 50, maxH: 20, dbRange: 60 });
    expect(img.width).toBeLessThanOrEqual(50);
    expect(img.height).toBeLessThanOrEqual(20);
    expect(img.pixels.length).toBe(img.width * img.height * 4);
    const top = [COLORMAP[255 * 3], COLORMAP[255 * 3 + 1], COLORMAP[255 * 3 + 2]];
    let found = false;
    for (let p = 0; p < img.pixels.length; p += 4) {
      if (img.pixels[p] === top[0] && img.pixels[p + 1] === top[1] && img.pixels[p + 2] === top[2]) found = true;
    }
    expect(found).toBe(true);
    expect(img.f0).toBeLessThan(0);
    expect(img.f1).toBeGreaterThanOrEqual(500);
    expect(img.x1).toBeGreaterThan(img.x0);
  });

  it("limits the frequency range with maxFreq", () => {
    const { t, y } = signal(8000, 1000, (x) => Math.sin(2 * Math.PI * 30 * x));
    const s = spectrogram(y, t, { segmentSec: 0.256 });
    const img = buildSpectrogramPixels(s, { maxFreq: 100 });
    expect(img.fMaxShown).toBeLessThanOrEqual(100 + s.df);
    expect(img.f1).toBeLessThan(110);
  });

  it("returns null for an empty spectrogram and builds a CSS gradient", () => {
    expect(buildSpectrogramPixels({ cols: 0, bins: 0 })).toBeNull();
    expect(colormapCss()).toMatch(/^linear-gradient/);
  });
});

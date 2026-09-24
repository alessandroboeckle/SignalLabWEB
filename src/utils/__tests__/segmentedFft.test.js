import { describe, it, expect } from "vitest";
import { fft, segmentedFft } from "../messtoolAnalysis.js";

function sine(n, fs, f, a = 1) {
  const t = Array.from({ length: n }, (_, i) => i / fs);
  return { t, y: t.map((x) => a * Math.sin(2 * Math.PI * f * x)) };
}

describe("segmentedFft", () => {
  it("falls back to a plain fft when no segment length is set", () => {
    const { t, y } = sine(1000, 100, 5);
    const a = fft(y, t, { windowType: "none" });
    const b = segmentedFft(y, t, null, { windowType: "none" });
    expect(b.segments).toBe(1);
    expect(b.amp).toEqual(a.amp);
    expect(b.freq).toEqual(a.freq);
  });

  it("falls back when the segment is at least as long as the signal", () => {
    const { t, y } = sine(500, 100, 5);
    expect(segmentedFft(y, t, 10, { windowType: "none" }).segments).toBe(1);
  });

  it("splits into non-overlapping windows and coarsens df to 1/segmentSec", () => {
    const { t, y } = sine(1000, 100, 5); // 10 s @ 100 Hz
    const r = segmentedFft(y, t, 2, { windowType: "none" });
    expect(r.segments).toBe(5);
    expect(r.segmentSamples).toBe(200);
    expect(r.freq[1] - r.freq[0]).toBeCloseTo(0.5, 6);
    expect(r.freq.length).toBe(101);
  });

  it("keeps the peak at the signal frequency with the right amplitude", () => {
    const { t, y } = sine(4000, 100, 5, 3);
    const r = segmentedFft(y, t, 4, { windowType: "none" });
    const k = r.amp.indexOf(Math.max(...r.amp));
    expect(r.freq[k]).toBeCloseTo(5, 0);
    expect(r.amp[k]).toBeGreaterThan(2.5);
    expect(r.amp[k]).toBeLessThan(3.1);
  });

  it("drops a trailing partial window", () => {
    const { t, y } = sine(1050, 100, 5);
    expect(segmentedFft(y, t, 2).segments).toBe(5);
  });
});

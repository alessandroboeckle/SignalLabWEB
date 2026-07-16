import { describe, it, expect } from "vitest";
import { applyFilter } from "../messtoolFilter.js";

function rms(y) {
  return Math.sqrt(y.reduce((a, b) => a + b * b, 0) / y.length);
}

describe("messtoolFilter", () => {
  it("a low-pass filter reduces overall signal energy when high-frequency content is removed", () => {
    const fs = 1000;
    const n = 2000;
    const lowFreq = 5; // Hz, well below cutoff
    const highFreq = 200; // Hz, well above cutoff
    const y = Array.from({ length: n }, (_, i) => {
      const t = i / fs;
      return Math.sin(2 * Math.PI * lowFreq * t) + Math.sin(2 * Math.PI * highFreq * t);
    });

    const filtered = applyFilter(y, {
      order: 4,
      cutoffHz: 20,
      sampleRate: fs,
      btype: "low",
      characteristic: "butterworth",
    });

    // Original has two unit-amplitude sines (rms ~1); after removing the
    // high-frequency one, it should look close to the lone low-frequency
    // sine (rms ~ 1/sqrt(2)) — clearly less energy than the original.
    expect(rms(filtered)).toBeLessThan(rms(y));
    expect(rms(filtered)).toBeGreaterThan(0.5);
  });

  it("preserves the output length", () => {
    const y = Array.from({ length: 500 }, (_, i) => Math.sin(i / 10));
    const filtered = applyFilter(y, {
      order: 2, cutoffHz: 10, sampleRate: 100, btype: "low", characteristic: "butterworth",
    });
    expect(filtered).toHaveLength(y.length);
  });
});

import { describe, it, expect } from "vitest";
import { applyFilter, designSOS, computeFrequencyResponse } from "../messtoolFilter.js";

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

describe("computeFrequencyResponse", () => {
  it("passes DC (~0 Hz) at ~0dB for a Butterworth low-pass", () => {
    const sos = designSOS(4, 20 / 500, "low", "butterworth");
    const { freqs, magDb } = computeFrequencyResponse(sos, 1000, 300);
    expect(magDb[0]).toBeCloseTo(0, 0);
    expect(freqs[0]).toBeGreaterThan(0);
  });

  it("sits close to -3dB right at the Butterworth cutoff frequency", () => {
    const cutoffHz = 20;
    const sampleRate = 1000;
    const sos = designSOS(4, cutoffHz / (sampleRate / 2), "low", "butterworth");
    const { freqs, magDb } = computeFrequencyResponse(sos, sampleRate, 2000);
    let closestIdx = 0, closestDist = Infinity;
    for (let i = 0; i < freqs.length; i++) {
      const d = Math.abs(freqs[i] - cutoffHz);
      if (d < closestDist) { closestDist = d; closestIdx = i; }
    }
    expect(magDb[closestIdx]).toBeCloseTo(-3, 0);
  });

  it("attenuates strongly well above the low-pass cutoff", () => {
    const sos = designSOS(4, 20 / 500, "low", "butterworth");
    const { freqs, magDb } = computeFrequencyResponse(sos, 1000, 300);
    const highIdx = freqs.findIndex((f) => f > 400);
    expect(magDb[highIdx]).toBeLessThan(-40);
  });

  it("a higher filter order rolls off more steeply than a lower one", () => {
    const sampleRate = 1000;
    const wn = 20 / (sampleRate / 2);
    const sos2 = designSOS(2, wn, "low", "butterworth");
    const sos8 = designSOS(8, wn, "low", "butterworth");
    const resp2 = computeFrequencyResponse(sos2, sampleRate, 300);
    const resp8 = computeFrequencyResponse(sos8, sampleRate, 300);
    const idx = resp2.freqs.findIndex((f) => f > 60);
    // steeper roll-off -> more attenuation at the same frequency past cutoff
    expect(resp8.magDb[idx]).toBeLessThan(resp2.magDb[idx]);
  });
});

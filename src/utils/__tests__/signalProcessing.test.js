import { describe, it, expect } from "vitest";
import { computeFFT, computeFFTMagnitude } from "../generator/signalProcessing.js";

describe("computeFFT (Generator tool) — correctness after the real-only-recursion bug fix", () => {
  it("recovers the correct peak frequency and amplitude for a pure sine", () => {
    const n = 256;
    const fs = 256; // fs/n = 1 Hz per bin exactly, so freqHz below lands exactly on a bin
    const freqHz = 50;
    const amplitude = 2;
    const signal = new Float64Array(n);
    for (let i = 0; i < n; i++) signal[i] = amplitude * Math.sin((2 * Math.PI * freqHz * i) / fs);

    const { magnitude, frequency } = computeFFTMagnitude(signal, fs);
    let peakIdx = 0;
    for (let i = 1; i < magnitude.length; i++) if (magnitude[i] > magnitude[peakIdx]) peakIdx = i;

    expect(frequency[peakIdx]).toBeCloseTo(freqHz, 0);
    expect(magnitude[peakIdx]).toBeCloseTo(amplitude, 1);
  });

  it("works for non-power-of-2 lengths too (no zero-padding needed)", () => {
    const n = 137; // prime
    const fs = 500;
    const freqHz = 25;
    const signal = new Float64Array(n);
    for (let i = 0; i < n; i++) signal[i] = Math.sin((2 * Math.PI * freqHz * i) / fs);

    const { magnitude, frequency } = computeFFTMagnitude(signal, fs);
    expect(frequency).toHaveLength(Math.floor(n / 2) + 1);
    let peakIdx = 0;
    for (let i = 1; i < magnitude.length; i++) if (magnitude[i] > magnitude[peakIdx]) peakIdx = i;
    // fs/n ≈ 3.65 Hz per bin here — 25Hz won't land exactly on a bin, so
    // allow for that (this is spectral leakage, not a bug).
    expect(Math.abs(frequency[peakIdx] - freqHz)).toBeLessThan(fs / n);
  });

  it("correctly tracks the imaginary component (regression test for the old bug)", () => {
    const n = 128;
    const fs = 200;
    const freqHz = 20;
    const cosSignal = new Float64Array(n);
    const sinSignal = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      cosSignal[i] = Math.cos((2 * Math.PI * freqHz * i) / fs);
      sinSignal[i] = Math.sin((2 * Math.PI * freqHz * i) / fs);
    }
    const cosResult = computeFFTMagnitude(cosSignal, fs);
    const sinResult = computeFFTMagnitude(sinSignal, fs);

    let cosPeak = 0, sinPeak = 0;
    for (let i = 1; i < cosResult.magnitude.length; i++) {
      if (cosResult.magnitude[i] > cosResult.magnitude[cosPeak]) cosPeak = i;
      if (sinResult.magnitude[i] > sinResult.magnitude[sinPeak]) sinPeak = i;
    }
    expect(cosResult.frequency[cosPeak]).toBeCloseTo(freqHz, 0);
    expect(sinResult.frequency[sinPeak]).toBeCloseTo(freqHz, 0);
    expect(cosResult.magnitude[cosPeak]).toBeCloseTo(sinResult.magnitude[sinPeak], 1);
  });
});

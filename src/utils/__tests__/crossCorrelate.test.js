import { describe, it, expect } from "vitest";
import { findBestOffset } from "../crossCorrelate.js";

function makeSpikeSignal(n, dt, spikeAt) {
  const t = Array.from({ length: n }, (_, i) => i * dt);
  const y = new Array(n).fill(0);
  const spikeIdx = Math.round(spikeAt / dt);
  // a little bump, not just one sample, so resampling doesn't lose it
  for (let i = -3; i <= 3; i++) {
    const idx = spikeIdx + i;
    if (idx >= 0 && idx < n) y[idx] = 10 - Math.abs(i) * 1.5;
  }
  return { t, y };
}

describe("findBestOffset", () => {
  it("finds a known positive shift between two otherwise-identical signals", () => {
    const ref = makeSpikeSignal(2000, 0.01, 5); // spike at t=5s
    const target = makeSpikeSignal(2000, 0.01, 8); // same spike, but at t=8s

    const { offsetSec, confidence } = findBestOffset(ref.t, ref.y, target.t, target.y);

    // target's event is 3s later than ref's -> needs to be shifted back by ~3s
    expect(offsetSec).toBeCloseTo(-3, 0);
    expect(confidence).toBeGreaterThan(0.5);
  });

  it("finds a known negative shift", () => {
    const ref = makeSpikeSignal(2000, 0.01, 10);
    const target = makeSpikeSignal(2000, 0.01, 6); // 4s earlier than ref

    const { offsetSec } = findBestOffset(ref.t, ref.y, target.t, target.y);
    expect(offsetSec).toBeCloseTo(4, 0);
  });

  it("reports low confidence for unrelated random signals", () => {
    const n = 1000;
    const t = Array.from({ length: n }, (_, i) => i * 0.01);
    const a = Array.from({ length: n }, () => Math.random() - 0.5);
    const b = Array.from({ length: n }, () => Math.random() - 0.5);

    const { confidence } = findBestOffset(t, a, t, b);
    expect(Math.abs(confidence)).toBeLessThan(0.3);
  });

  it("returns a zero offset (not a crash) for degenerate single-point input", () => {
    const result = findBestOffset([0], [1], [0], [1]);
    expect(result.offsetSec).toBe(0);
  });
});

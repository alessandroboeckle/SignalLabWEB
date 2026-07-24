import { describe, it, expect } from "vitest";
import { correlateSeries } from "../correlation.js";

describe("correlateSeries", () => {
  it("gives ~1 for identical signals", () => {
    const n = 1000;
    const t = Array.from({ length: n }, (_, i) => i * 0.01);
    const y = t.map((x) => Math.sin(x));
    expect(correlateSeries(t, y, t, y)).toBeCloseTo(1, 2);
  });

  it("gives ~-1 for perfectly inverted signals", () => {
    const n = 1000;
    const t = Array.from({ length: n }, (_, i) => i * 0.01);
    const y = t.map((x) => Math.sin(x));
    const yInv = y.map((v) => -v);
    expect(correlateSeries(t, y, t, yInv)).toBeCloseTo(-1, 2);
  });

  it("gives ~0 for unrelated (random) signals", () => {
    const n = 3000;
    const t = Array.from({ length: n }, (_, i) => i * 0.01);
    const a = t.map(() => Math.random() - 0.5);
    const b = t.map(() => Math.random() - 0.5);
    expect(Math.abs(correlateSeries(t, a, t, b))).toBeLessThan(0.15);
  });

  it("still finds a strong correlation across different sample resolutions", () => {
    const t1 = Array.from({ length: 1000 }, (_, i) => i * 0.01); // 0..10s, fine grid
    const y1 = t1.map((x) => Math.sin(x));
    const t2 = Array.from({ length: 200 }, (_, i) => i * 0.05); // 0..10s, coarser grid
    const y2 = t2.map((x) => Math.sin(x));
    expect(correlateSeries(t1, y1, t2, y2)).toBeCloseTo(1, 1);
  });

  it("returns null when the two time ranges don't overlap at all", () => {
    const t1 = [0, 1, 2, 3];
    const y1 = [1, 2, 3, 4];
    const t2 = [100, 101, 102, 103];
    const y2 = [1, 2, 3, 4];
    expect(correlateSeries(t1, y1, t2, y2)).toBeNull();
  });

  it("returns null for a constant (zero-variance) signal", () => {
    const t = [0, 1, 2, 3];
    const flat = [5, 5, 5, 5];
    const other = [1, 2, 3, 4];
    expect(correlateSeries(t, flat, t, other)).toBeNull();
  });
});

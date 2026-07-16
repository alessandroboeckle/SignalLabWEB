import { describe, it, expect } from "vitest";
import { downsample } from "../downsample.js";

describe("downsample", () => {
  it("returns the data unchanged when already at/below the target size", () => {
    const values = [1, 2, 3];
    const xs = [0, 1, 2];
    const { rx, ry } = downsample(values, xs, "simple", 800);
    expect(rx).toEqual(xs);
    expect(ry).toEqual(values);
  });

  it("simple mode reduces to roughly the target size", () => {
    const n = 10000;
    const values = Array.from({ length: n }, (_, i) => i);
    const xs = Array.from({ length: n }, (_, i) => i);
    const { rx, ry } = downsample(values, xs, "simple", 500);
    expect(rx.length).toBeLessThanOrEqual(500 + 1);
    expect(rx.length).toBeGreaterThan(0);
    expect(ry.length).toBe(rx.length);
  });

  it("minmax mode preserves a short spike that simple mode would skip over", () => {
    const n = 10000;
    const values = new Array(n).fill(0);
    const spikeIndex = 4237;
    values[spikeIndex] = 999; // one lone spike, easy to step over with a big stride
    const xs = Array.from({ length: n }, (_, i) => i);

    const minmax = downsample(values, xs, "minmax", 100);

    expect(Math.max(...minmax.ry)).toBe(999);
    expect(minmax.rx.length).toBeGreaterThan(0);
  });

  it("minmax mode keeps x values monotonically non-decreasing", () => {
    const n = 5000;
    const values = Array.from({ length: n }, () => Math.random());
    const xs = Array.from({ length: n }, (_, i) => i * 0.1);
    const { rx } = downsample(values, xs, "minmax", 200);
    for (let i = 1; i < rx.length; i++) {
      expect(rx[i]).toBeGreaterThanOrEqual(rx[i - 1]);
    }
  });
});

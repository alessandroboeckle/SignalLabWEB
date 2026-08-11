import { describe, it, expect } from "vitest";
import { computeFftOffMainThread } from "../computeFftOffMainThread.js";
import { fft } from "../messtoolAnalysis.js";

describe("computeFftOffMainThread", () => {
  it("matches the direct fft() result for each series (falls back to the main thread when Worker isn't available, as in this test environment)", async () => {
    const N = 200;
    const fs = 100;
    const t = Array.from({ length: N }, (_, i) => i / fs);
    const y1 = t.map((ti) => Math.sin(2 * Math.PI * 10 * ti));
    const y2 = t.map((ti) => 2 * Math.cos(2 * Math.PI * 5 * ti));

    const results = await computeFftOffMainThread(
      [
        { key: "a", y: y1, t },
        { key: "b", y: y2, t },
      ],
      { windowType: "hann", normalize: true },
    );

    expect(results).toHaveLength(2);
    const expectedA = fft(y1, t, { windowType: "hann", normalize: true });
    const expectedB = fft(y2, t, { windowType: "hann", normalize: true });

    const a = results.find((r) => r.key === "a");
    const b = results.find((r) => r.key === "b");
    expect(a.amp).toEqual(expectedA.amp);
    expect(a.phaseDeg).toEqual(expectedA.phaseDeg);
    expect(b.amp).toEqual(expectedB.amp);
    expect(b.phaseDeg).toEqual(expectedB.phaseDeg);
  });

  it("returns an empty array for an empty series list rather than throwing", async () => {
    const results = await computeFftOffMainThread([]);
    expect(results).toEqual([]);
  });
});

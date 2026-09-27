import { describe, it, expect } from "vitest";
import { statsBetweenX, cursorRangeStats } from "../cursorRangeStats.js";

const pointChart = {
  data: {
    datasets: [
      { label: "U", borderColor: "#111", data: [0, 1, 2, 3, 4, 5].map((x) => ({ x, y: [5, -1, 3, 7, 2, 9][x] })) },
      { label: "Mittelwert", statsExclude: true, data: [{ x: 0, y: 1 }, { x: 5, y: 1 }] },
      { label: undefined, data: [{ x: 0, y: 1 }] },
    ],
  },
};

describe("statsBetweenX", () => {
  it("computes mean/rms/min/max/pp over the inclusive range, either order", () => {
    const [s] = statsBetweenX(pointChart, 3, 1);
    expect(s.label).toBe("U");
    expect(s.n).toBe(3); // x = 1,2,3 -> -1, 3, 7
    expect(s.mean).toBeCloseTo(3, 10);
    expect(s.rms).toBeCloseTo(Math.sqrt((1 + 9 + 49) / 3), 10);
    expect(s.min).toBe(-1);
    expect(s.minAt).toBe(1);
    expect(s.max).toBe(7);
    expect(s.maxAt).toBe(3);
    expect(s.pp).toBe(8);
    expect(s.delta).toBe(8);
  });

  it("skips excluded, unlabeled and legend-hidden datasets", () => {
    const hidden = { ...pointChart, isDatasetVisible: (i) => i !== 0 };
    expect(statsBetweenX(pointChart, 0, 5).map((s) => s.label)).toEqual(["U"]);
    expect(statsBetweenX(hidden, 0, 5)).toEqual([]);
  });

  it("works with category labels (numeric strings) and ignores nulls", () => {
    const cat = { data: { labels: ["0.0", "0.5", "1.0", "1.5"], datasets: [{ label: "I", data: [1, null, 3, 5] }] } };
    const [s] = statsBetweenX(cat, 0, 1);
    expect(s.n).toBe(2);
    expect(s.mean).toBe(2);
  });

  it("returns n = 0 and null stats when no point falls inside", () => {
    const [s] = statsBetweenX(pointChart, 1.2, 1.8);
    expect(s.n).toBe(0);
    expect(s.mean).toBeNull();
    expect(s.pp).toBeNull();
  });

  it("returns nothing for invalid x", () => {
    expect(statsBetweenX(pointChart, null, 2)).toEqual([]);
    expect(statsBetweenX(pointChart, NaN, 2)).toEqual([]);
  });
});

describe("cursorRangeStats", () => {
  it("builds consecutive pairs", () => {
    const r = cursorRangeStats(pointChart, [
      { label: "C1", x: 0 }, { label: "C2", x: 2 }, { label: "C3", x: 5 },
    ]);
    expect(r.map((p) => `${p.aLabel}-${p.bLabel}`)).toEqual(["C1-C2", "C2-C3"]);
    expect(r[0].dx).toBe(2);
    expect(r[1].series[0].max).toBe(9);
  });
  it("needs at least two cursors", () => {
    expect(cursorRangeStats(pointChart, [{ label: "C1", x: 1 }])).toEqual([]);
  });
});

import { describe, it, expect } from "vitest";
import { findOutlierIndices } from "../outlierDetection.js";

describe("findOutlierIndices", () => {
  it("flags a single extreme spike in an otherwise flat noisy signal", () => {
    const values = new Array(200).fill(0).map(() => (Math.random() - 0.5) * 0.1);
    values[100] = 50; // way outside normal noise band
    const outliers = findOutlierIndices(values);
    expect(outliers).toContain(100);
    expect(outliers.length).toBeLessThan(5); // shouldn't flag the noise itself
  });

  it("flags nothing for a constant signal (std = 0, avoids divide-by-zero)", () => {
    expect(findOutlierIndices(new Array(50).fill(3))).toEqual([]);
  });

  it("flags nothing when there are too few points to judge", () => {
    expect(findOutlierIndices([1, 2, 3])).toEqual([]);
  });

  it("ignores null/NaN entries instead of misclassifying them", () => {
    const baseline = new Array(40).fill(0).map(() => (Math.random() - 0.5) * 0.2);
    const values = [...baseline, null, NaN, 100]; // spike well after a real baseline
    const outliers = findOutlierIndices(values);
    expect(outliers).toContain(values.length - 1); // the real spike
    expect(outliers).not.toContain(values.length - 3); // the null
    expect(outliers).not.toContain(values.length - 2); // the NaN
  });

  it("a stricter threshold flags fewer points than a looser one", () => {
    const values = Array.from({ length: 300 }, () => (Math.random() - 0.5) * 2);
    values[150] = 8;
    const strict = findOutlierIndices(values, 4);
    const loose = findOutlierIndices(values, 2);
    expect(loose.length).toBeGreaterThanOrEqual(strict.length);
  });
});

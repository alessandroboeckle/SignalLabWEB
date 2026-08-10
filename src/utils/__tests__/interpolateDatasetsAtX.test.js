import { describe, it, expect } from "vitest";
import { interpolateDatasetsAtX } from "../interpolateDatasetsAtX.js";

describe("interpolateDatasetsAtX", () => {
  it("interpolates a linear-scale ({x,y} point) dataset, matching Vergleich's overlay shape", () => {
    const chart = {
      data: {
        datasets: [
          {
            label: "Testfile.csv — IITCU_A.rP_VLU [kW]",
            borderColor: "#2563EB",
            data: [
              { x: 0, y: 0 },
              { x: 50, y: 1 },
              { x: 100, y: 2 },
              { x: 150, y: 3 },
            ],
          },
        ],
      },
    };
    const result = interpolateDatasetsAtX(chart, 83.385);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBeCloseTo(1.6677, 3);
    expect(result[0].label).toBe("Testfile.csv — IITCU_A.rP_VLU [kW]");
  });

  it("interpolates a category-scale (labels + plain value array) dataset, matching Analyse's shape", () => {
    const chart = {
      data: {
        labels: [0, 1, 2, 3, 4],
        datasets: [{ label: "Signal", borderColor: "#2563EB", data: [10, 12, 14, 16, 18] }],
      },
    };
    const result = interpolateDatasetsAtX(chart, 2.5);
    expect(result[0].value).toBeCloseTo(15, 5);
  });

  it("finds values for a near-zero-valued signal (the exact reported scenario)", () => {
    const n = 5000;
    const duration = 312;
    const t = Array.from({ length: n }, (_, i) => (i / (n - 1)) * duration);
    const y = t.map(() => 0);
    y[2000] = 0.026;
    const chart = {
      data: {
        datasets: [{
          label: "Testfile — IITCU_A.rP_VLU [kW]",
          borderColor: "#2563EB",
          data: t.map((x, i) => ({ x, y: y[i] })),
        }],
      },
    };
    const atC1 = interpolateDatasetsAtX(chart, 83.385);
    const atC2 = interpolateDatasetsAtX(chart, 133.191);
    expect(atC1).toHaveLength(1);
    expect(atC2).toHaveLength(1);
    expect(atC1[0].value).toBeCloseTo(0, 5);
    expect(atC2[0].value).toBeCloseTo(0, 5);
  });

  it("returns the nearest real value even when x is outside every dataset's range (never a hard empty if data exists)", () => {
    const chart = { data: { datasets: [{ data: [{ x: 0, y: 1 }, { x: 10, y: 2 }] }] } };
    const result = interpolateDatasetsAtX(chart, 500);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(2);
  });

  it("skips empty datasets instead of throwing", () => {
    const chart = { data: { datasets: [{ data: [] }, { data: [{ x: 0, y: 1 }, { x: 10, y: 2 }] }] } };
    const result = interpolateDatasetsAtX(chart, 5);
    expect(result).toHaveLength(1);
  });

  it("handles multiple datasets with their own independent x-ranges (Vergleich with several files)", () => {
    const chart = {
      data: {
        datasets: [
          { label: "A", data: [{ x: 0, y: 10 }, { x: 100, y: 20 }] },
          { label: "B", data: [{ x: 5, y: 100 }, { x: 105, y: 200 }] },
        ],
      },
    };
    const result = interpolateDatasetsAtX(chart, 52.5);
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.label === "A").value).toBeCloseTo(10 + 10 * (52.5 / 100), 3);
  });
});

describe("interpolateDatasetsAtX — robustness fallback", () => {
  it("still finds a value via the nearest-point fallback when a NaN x sits right where x would normally bracket", () => {
    const chart = {
      data: {
        datasets: [{
          label: "Signal",
          data: [
            { x: 600, y: 5 },
            { x: 650, y: 40 }, // this is what we click near
            { x: NaN, y: 42 }, // a corrupt/stray point right after it
            { x: 700, y: 10 },
          ],
        }],
      },
    };
    const result = interpolateDatasetsAtX(chart, 654.95);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBeGreaterThan(0);
  });

  it("finds a value near a real downsampled peak even with large gaps elsewhere in the series", () => {
    // Mimics minmax-downsampled real field data: long flat/quiet stretches
    // (big x gaps) punctuated by dense little bursts around actual events.
    const data = [
      { x: 0, y: 0 },
      { x: 300, y: 0.1 },
      { x: 640, y: 2 },
      { x: 650, y: 55 }, // the peak someone would click on
      { x: 660, y: 3 },
      { x: 780, y: 32 },
      { x: 790, y: 1 },
      { x: 2000, y: 0.05 },
      { x: 2077, y: 100 },
      { x: 2100, y: 1 },
      { x: 2500, y: 0 },
    ];
    const chart = { data: { datasets: [{ label: "Signal", data }] } };

    const atPeak1 = interpolateDatasetsAtX(chart, 654.95);
    const atPeak2 = interpolateDatasetsAtX(chart, 779.413);
    expect(atPeak1[0].value).toBeGreaterThan(0);
    expect(atPeak2[0].value).toBeGreaterThan(0);
  });

  it("skips a null measurement gap and still surfaces the nearest real value instead of reporting none found", () => {
    // A cursor placed right on/next to a dropout (null) shouldn't come up
    // empty just because the immediate bracketing points are gaps — there
    // is always a real value somewhere close by in the file, and the
    // Cursorbox should find it rather than showing
    // "(keine Werte an dieser Stelle gefunden)".
    const data = [
      { x: 0, y: 12 },
      { x: 1, y: 13 },
      { x: 2, y: null }, // dropout starts
      { x: 3, y: null },
      { x: 4, y: null }, // clicked right here, in the middle of the gap
      { x: 5, y: null },
      { x: 6, y: 14 }, // nearest real value
      { x: 7, y: 15 },
    ];
    const chart = { data: { datasets: [{ label: "Signal", data }] } };
    const result = interpolateDatasetsAtX(chart, 4);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(14); // nearest non-null point (x=6), not fabricated, not "no value"
  });

  it("returns the nearest available value even far outside the dataset's usual range (better than a hard 'no value')", () => {
    // Deliberate: a cursor showing the nearest real measurement — however
    // far off — beats it showing nothing at all.
    const chart = { data: { datasets: [{ label: "Signal", data: [{ x: 0, y: 1 }, { x: 10, y: 2 }] }] } };
    const result = interpolateDatasetsAtX(chart, 5000);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(2); // x=10 is the nearest of the two points
  });

  it("treats boolean signal values (isOn/isReleased/...) as real 0/1 values, not 'no value'", () => {
    const chart = {
      data: {
        datasets: [{ label: "Flag", data: [{ x: 0, y: false }, { x: 10, y: true }] }],
      },
    };
    const result = interpolateDatasetsAtX(chart, 5);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBeCloseTo(0.5); // interpolated halfway between 0 and 1
  });
});

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

  it("returns an empty array when x is outside every dataset's range", () => {
    const chart = { data: { datasets: [{ data: [{ x: 0, y: 1 }, { x: 10, y: 2 }] }] } };
    expect(interpolateDatasetsAtX(chart, 500)).toEqual([]);
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

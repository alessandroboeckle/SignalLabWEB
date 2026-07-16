import { describe, it, expect } from "vitest";
import { generateBrakeTestCsv } from "../messtoolTestGenerator.js";
import { parseMesstoolCsv } from "../messtoolParser.js";

describe("messtoolTestGenerator", () => {
  it("is deterministic for a given seed", () => {
    const fixedDate = new Date(2025, 2, 7, 14, 34, 28, 90);
    const a = generateBrakeTestCsv({ rows: 300, fs: 8, seed: 42, startDate: fixedDate });
    const b = generateBrakeTestCsv({ rows: 300, fs: 8, seed: 42, startDate: fixedDate });
    expect(a).toBe(b);
  });

  it("produces different output for different seeds", () => {
    const fixedDate = new Date(2025, 2, 7, 14, 34, 28, 90);
    const a = generateBrakeTestCsv({ rows: 300, fs: 8, seed: 1, startDate: fixedDate });
    const b = generateBrakeTestCsv({ rows: 300, fs: 8, seed: 2, startDate: fixedDate });
    expect(a).not.toBe(b);
  });

  it("round-trips cleanly through the real parser", async () => {
    const csv = generateBrakeTestCsv({ rows: 1000, fs: 8, seed: 7 });
    const result = await parseMesstoolCsv(csv, {});
    expect(result.signals).toHaveLength(35);
    expect(result.time).toHaveLength(1000);
    expect(result.meta.sampleRateInfo.detectedFs).toBeCloseTo(8, 0);
    expect(result.meta.sampleRateInfo.gapCount).toBe(0);
  });

  it("keeps bogie B at exactly zero, matching the modeled real-world behavior", async () => {
    const csv = generateBrakeTestCsv({ rows: 500, fs: 8, seed: 3 });
    const result = await parseMesstoolCsv(csv, {});
    const bogieB = result.signals.find((s) => s.name === "IITCU_B.rP_VLU");
    expect(new Set(bogieB.data)).toEqual(new Set([0]));
  });

  it("reports the float-underflow sentinel before the speed system activates", async () => {
    const csv = generateBrakeTestCsv({ rows: 500, fs: 8, seed: 3, cycles: 1 });
    const result = await parseMesstoolCsv(csv, {});
    const speed = result.signals.find((s) => s.name === "ZV.R_VehicleSpeed");
    expect(speed.data[0]).toBeCloseTo(3.27e-38, 40);
  });
});

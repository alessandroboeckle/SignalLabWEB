import { describe, it, expect } from "vitest";
import { cursorDeltas, formatCursorNumber, createdByLine } from "../chartsPdf.js";

describe("chartsPdf helpers", () => {
  it("computes consecutive cursor deltas per shared series", () => {
    const d = cursorDeltas([
      { label: "C1", x: 1, series: [{ label: "U", value: 10 }, { label: "I", value: 2 }] },
      { label: "C2", x: 4, series: [{ label: "U", value: 7 }] },
      { label: "C3", x: 5, series: [{ label: "U", value: 8 }] },
    ]);
    expect(d).toEqual([
      { label: "C1–C2", dx: 3, series: [{ label: "U", value: -3 }] },
      { label: "C2–C3", dx: 1, series: [{ label: "U", value: 1 }] },
    ]);
  });

  it("returns no deltas for fewer than two cursors", () => {
    expect(cursorDeltas([])).toEqual([]);
    expect(cursorDeltas([{ label: "C1", x: 0, series: [] }])).toEqual([]);
  });

  it("formats numbers compactly", () => {
    expect(formatCursorNumber(12.34567)).toBe("12.346");
    expect(formatCursorNumber(123456.78)).toBe("123456.8");
    expect(formatCursorNumber(0.0000123)).toBe("1.230e-5");
    expect(formatCursorNumber(null)).toBe("–");
  });
});

describe("createdByLine", () => {
  it("names the exporting user", () => {
    expect(createdByLine("alessandro.boeckle")).toBe("Erstellt von SignalLab – alessandro.boeckle");
  });
  it("falls back without a user", () => {
    expect(createdByLine("")).toBe("Erstellt mit SignalLab");
    expect(createdByLine(null)).toBe("Erstellt mit SignalLab");
  });
});

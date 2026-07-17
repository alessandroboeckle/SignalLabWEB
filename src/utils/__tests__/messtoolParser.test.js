import { describe, it, expect } from "vitest";
import { parseMesstoolCsv, colRefToNumber } from "../messtoolParser.js";

function buildCsv(rows, { withGapAt = null } = {}) {
  const lines = [
    "SECTION;LOGITEMS",
    "LOGITEM;Sig1;;X;desc [unit: bar]",
    "LOGITEM;Sig2;;X;desc [unit: degC]",
    "LOGITEM;Sig3;;X;desc [unit: A]",
    "SECTION;LOGDATA",
    "Nb;Type;Date;Time;Sig1;Sig2;Sig3",
  ];
  let t = 0;
  for (let i = 0; i < rows; i++) {
    if (withGapAt === i) t += 5;
    const totalSec = 28 + t;
    const h = 14, m = 34 + Math.floor(totalSec / 60), s = totalSec % 60;
    lines.push(`${169503 + i};+;07.03.2025;${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:090;${i};${i * 2};${i * 3}`);
    t += 1;
  }
  return lines.join("\n");
}

describe("colRefToNumber", () => {
  it("parses plain numbers", () => {
    expect(colRefToNumber("5")).toBe(5);
  });
  it("parses single letters", () => {
    expect(colRefToNumber("A")).toBe(1);
    expect(colRefToNumber("Z")).toBe(26);
  });
  it("parses multi-letter columns", () => {
    expect(colRefToNumber("AA")).toBe(27);
    expect(colRefToNumber("CC")).toBe(81);
  });
  it("returns null for empty/invalid input", () => {
    expect(colRefToNumber("")).toBeNull();
    expect(colRefToNumber(null)).toBeNull();
  });
});

describe("parseMesstoolCsv", () => {
  it("parses signals, units, and row count from a basic file", async () => {
    const csv = buildCsv(10);
    const result = await parseMesstoolCsv(csv, {});
    expect(result.signals).toHaveLength(3);
    expect(result.signals[0].name).toBe("Sig1");
    expect(result.signals[0].unit).toBe("bar");
    expect(result.time).toHaveLength(10);
    expect(result.meta.rowCount).toBe(10);
  });

  it("restricts to a row range when startRow/endRow are given", async () => {
    const csv = buildCsv(20);
    const result = await parseMesstoolCsv(csv, { startRow: 5, endRow: 10 });
    expect(result.time).toHaveLength(6); // rows 5..10 inclusive
    expect(result.signals[0].data[0]).toBe(4); // row 5 -> index 4 (0-based i)
  });

  it("restricts to a column range using letter references", async () => {
    const csv = buildCsv(5);
    const result = await parseMesstoolCsv(csv, { startCol: "B", endCol: "C" });
    expect(result.signals.map((s) => s.name)).toEqual(["Sig2", "Sig3"]);
  });

  it("overrides the time axis when sampleFrequenz is given", async () => {
    const csv = buildCsv(5);
    const result = await parseMesstoolCsv(csv, { sampleFrequenz: 10 });
    expect(result.time).toEqual([0, 0.1, 0.2, 0.3, 0.4]);
    // overriding the axis means we trust it, so no gap analysis is run
    expect(result.meta.sampleRateInfo).toBeNull();
  });

  it("detects a timestamp gap and reports the detected sample rate", async () => {
    const csv = buildCsv(20, { withGapAt: 10 });
    const result = await parseMesstoolCsv(csv, {});
    expect(result.meta.sampleRateInfo.gapCount).toBe(1);
    expect(result.meta.sampleRateInfo.detectedFs).toBeCloseTo(1, 1);
  });

  it("parses BOOL columns as 1/0 instead of leaving them null", async () => {
    const csv = [
      "SECTION;LOGITEMS",
      "LOGITEM;Flag;;BOOL;a boolean flag",
      "SECTION;LOGDATA",
      "Nb;Type;Date;Time;Flag",
      "1;+;07.03.2025;14:34:28:090;TRUE",
      "2;+;07.03.2025;14:34:29:090;FALSE",
    ].join("\n");
    const result = await parseMesstoolCsv(csv, {});
    expect(result.signals[0].isBoolean).toBe(true);
    expect(result.signals[0].data).toEqual([1, 0]);
  });

  it("flags a suspiciously high share of empty/constant signals", async () => {
    const csv = [
      "SECTION;LOGITEMS",
      "LOGITEM;Good;;X;desc",
      "LOGITEM;Constant;;X;desc",
      "LOGITEM;AllNull;;X;desc",
      "SECTION;LOGDATA",
      "Nb;Type;Date;Time;Good;Constant;AllNull",
      "1;+;07.03.2025;14:34:28:090;1;5;",
      "2;+;07.03.2025;14:34:29:090;2;5;",
    ].join("\n");
    const result = await parseMesstoolCsv(csv, {});
    expect(result.meta.qualityWarnings.constantSignals).toEqual(["Constant"]);
    expect(result.meta.qualityWarnings.allNullSignals).toEqual(["AllNull"]);
    expect(result.meta.qualityWarnings.suspicious).toBe(true);
  });

  it("reports progress callbacks that reach 100%", async () => {
    const csv = buildCsv(9000);
    const updates = [];
    await parseMesstoolCsv(csv, { onProgress: (f) => updates.push(f) });
    expect(updates[updates.length - 1]).toBe(1);
    expect(updates.every((f) => f >= 0 && f <= 1)).toBe(true);
  });
});

describe("formatClockTime", () => {
  it("formats seconds-since-midnight as HH:MM:SS", async () => {
    const { formatClockTime } = await import("../messtoolParser.js");
    expect(formatClockTime(14 * 3600 + 34 * 60 + 28.09)).toBe("14:34:28");
  });

  it("includes milliseconds when requested", async () => {
    const { formatClockTime } = await import("../messtoolParser.js");
    expect(formatClockTime(14 * 3600 + 34 * 60 + 28.09, true)).toBe("14:34:28.090");
  });

  it("returns a dash for null/invalid input", async () => {
    const { formatClockTime } = await import("../messtoolParser.js");
    expect(formatClockTime(null)).toBe("-");
    expect(formatClockTime(NaN)).toBe("-");
  });
});

describe("parseMesstoolCsv clockSec", () => {
  it("keeps the real wall-clock time per row alongside the relative time axis", async () => {
    const { parseMesstoolCsv } = await import("../messtoolParser.js");
    const csv = [
      "SECTION;LOGITEMS",
      "LOGITEM;Sig1;;X;desc",
      "SECTION;LOGDATA",
      "Nb;Type;Date;Time;Sig1",
      "1;+;07.03.2025;14:34:28:000;1",
      "2;+;07.03.2025;14:34:29:000;2",
    ].join("\n");
    const result = await parseMesstoolCsv(csv, {});
    expect(result.clockSec).toHaveLength(2);
    expect(result.clockSec[0]).toBeCloseTo(14 * 3600 + 34 * 60 + 28, 3);
    expect(result.time).toEqual([0, 1]); // relative axis unaffected
  });
});

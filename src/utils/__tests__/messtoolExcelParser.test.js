import { describe, it, expect } from "vitest";
import {
  listExcelSheets,
  parseMesstoolExcel,
} from "../messtoolExcelParser.js";

// Builds an in-memory .xlsx workbook (as an ArrayBuffer) from an array of
// row arrays, exactly like the real files this parser has to read — so
// these tests exercise the real SheetJS read/write path, not a mock.
async function buildWorkbookBuffer(rows, sheetName = "Sheet1") {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return out;
}

function singleHeaderRows() {
  return [
    ["Time", "Bremsdruck [bar]", "Temperatur [degC]"],
    ["07.03.2025 14:34:28.090", 0, 20],
    ["07.03.2025 14:34:29.090", 1.5, 20.5],
    ["07.03.2025 14:34:30.090", 3, 21],
  ];
}

function twoRowHeaderRows() {
  return [
    ["Time", "Bremsdruck", "Temperatur"],
    ["s", "bar", "degC"],
    [0, 0, 20],
    [1, 1.5, 20.5],
    [2, 3, 21],
  ];
}

describe("listExcelSheets", () => {
  it("lists all sheet names in a workbook", async () => {
    const XLSX = await import("xlsx");
    const ws1 = XLSX.utils.aoa_to_sheet(singleHeaderRows());
    const ws2 = XLSX.utils.aoa_to_sheet(singleHeaderRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Fahrt1");
    XLSX.utils.book_append_sheet(wb, ws2, "Fahrt2");
    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const sheets = await listExcelSheets(buffer);
    expect(sheets).toEqual(["Fahrt1", "Fahrt2"]);
  });
});

describe("parseMesstoolExcel — single header row ('Name [Einheit]')", () => {
  it("parses signal names, units and data", async () => {
    const buffer = await buildWorkbookBuffer(singleHeaderRows());
    const result = await parseMesstoolExcel(buffer, "Sheet1", {});
    expect(result.signals).toHaveLength(2);
    expect(result.signals[0].name).toBe("Bremsdruck");
    expect(result.signals[0].unit).toBe("bar");
    expect(result.signals[1].name).toBe("Temperatur");
    expect(result.signals[1].unit).toBe("degC");
    expect(result.signals[0].data).toEqual([0, 1.5, 3]);
  });

  it("builds a zero-based elapsed time axis from the Time column", async () => {
    const buffer = await buildWorkbookBuffer(singleHeaderRows());
    const result = await parseMesstoolExcel(buffer, "Sheet1", {});
    expect(result.time[0]).toBe(0);
    expect(result.time[1]).toBeCloseTo(1, 1);
    expect(result.time[2]).toBeCloseTo(2, 1);
    expect(result.meta.rowCount).toBe(3);
  });
});

describe("parseMesstoolExcel — two header rows (name row + unit row)", () => {
  it("parses signal names and units from separate rows", async () => {
    const buffer = await buildWorkbookBuffer(twoRowHeaderRows());
    const result = await parseMesstoolExcel(buffer, "Sheet1", {});
    expect(result.signals).toHaveLength(2);
    expect(result.signals[0].name).toBe("Bremsdruck");
    expect(result.signals[0].unit).toBe("bar");
    expect(result.signals[0].data).toEqual([0, 1.5, 3]);
  });

  it("uses a numeric Time column directly as the elapsed-time axis", async () => {
    const buffer = await buildWorkbookBuffer(twoRowHeaderRows());
    const result = await parseMesstoolExcel(buffer, "Sheet1", {});
    expect(result.time).toEqual([0, 1, 2]);
  });
});

describe("parseMesstoolExcel — row/column range options", () => {
  it("restricts to a start/end row range (1-based, inclusive)", async () => {
    const rows = [
      ["Time", "Sig [x]"],
      [0, 10],
      [1, 20],
      [2, 30],
      [3, 40],
      [4, 50],
    ];
    const buffer = await buildWorkbookBuffer(rows);
    const result = await parseMesstoolExcel(buffer, "Sheet1", { startRow: 2, endRow: 4 });
    expect(result.signals[0].data).toEqual([20, 30, 40]);
  });

  it("restricts to a start/end signal-column range, excluding the Time column", async () => {
    const rows = [
      ["Time", "A [x]", "B [x]", "C [x]"],
      [0, 1, 2, 3],
      [1, 4, 5, 6],
    ];
    const buffer = await buildWorkbookBuffer(rows);
    const result = await parseMesstoolExcel(buffer, "Sheet1", { startCol: 2, endCol: 3 });
    expect(result.signals.map((s) => s.name)).toEqual(["B", "C"]);
  });

  it("overrides the time axis with an index/samplefrequenz grid when requested", async () => {
    const buffer = await buildWorkbookBuffer(twoRowHeaderRows());
    const result = await parseMesstoolExcel(buffer, "Sheet1", { sampleFrequenz: 10 });
    expect(result.time).toEqual([0, 0.1, 0.2]);
  });
});

describe("parseMesstoolExcel — edge cases", () => {
  it("skips fully blank rows", async () => {
    const rows = [
      ["Time", "Sig [x]"],
      [0, 1],
      [null, null],
      [1, 2],
    ];
    const buffer = await buildWorkbookBuffer(rows);
    const result = await parseMesstoolExcel(buffer, "Sheet1", {});
    expect(result.signals[0].data).toEqual([1, 2]);
  });

  it("falls back to the first column as the time axis if no 'Time' header is found", async () => {
    const rows = [
      ["Sekunden", "Sig [x]"],
      [0, 1],
      [1, 2],
    ];
    const buffer = await buildWorkbookBuffer(rows);
    const result = await parseMesstoolExcel(buffer, "Sheet1", {});
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0].name).toBe("Sig");
    expect(result.time).toEqual([0, 1]);
  });

  it("throws a clear error for a sheet name that doesn't exist", async () => {
    const buffer = await buildWorkbookBuffer(singleHeaderRows());
    await expect(parseMesstoolExcel(buffer, "Nichtvorhanden", {})).rejects.toThrow(/Tabellenblatt/);
  });

  it("marks non-numeric cells as null instead of NaN", async () => {
    const rows = [
      ["Time", "Sig [x]"],
      [0, "n/a"],
      [1, 5],
    ];
    const buffer = await buildWorkbookBuffer(rows);
    const result = await parseMesstoolExcel(buffer, "Sheet1", {});
    expect(result.signals[0].data[0]).toBeNull();
    expect(result.signals[0].data[1]).toBe(5);
  });
});

import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { buildMultiSignalWorkbook } from "../xlsxExport.js";

describe("buildMultiSignalWorkbook", () => {
  it("builds a workbook with one sheet named 'Signale'", async () => {
    const wb = await buildMultiSignalWorkbook([0, 1], [{ name: "A", unit: "bar", data: [1, 2] }]);
    expect(wb.SheetNames).toEqual(["Signale"]);
  });

  it("writes a header row with unit suffixes, and rows in the right order", async () => {
    const time = [0, 0.1, 0.2];
    const signals = [
      { name: "Sig1", unit: "bar", data: [1, 2, 3] },
      { name: "Sig2", unit: "", data: [10, 20, 30] },
    ];
    const wb = await buildMultiSignalWorkbook(time, signals);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets.Signale, { header: 1 });
    expect(rows[0]).toEqual(["Zeit_s", "Sig1_[bar]", "Sig2"]);
    expect(rows[1]).toEqual([0, 1, 10]);
    expect(rows[3]).toEqual([0.2, 3, 30]);
  });

  it("writes null/NaN values as empty cells, not the literal word 'null'", async () => {
    const wb = await buildMultiSignalWorkbook([0, 1], [{ name: "A", unit: "", data: [1, null] }]);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets.Signale, { header: 1, defval: "" });
    expect(rows[2][1]).toBe("");
  });
});

import { describe, it, expect, vi } from "vitest";

vi.mock("../parseCsvOffMainThread.js", () => ({
  parseCsvOffMainThread: vi.fn(async (text) => (text.includes("LEER")
    ? { signals: [], time: [], meta: {} }
    : { signals: [{ name: "csv", data: [1] }], time: [0], meta: {} })),
}));
vi.mock("../messtoolExcelParser.js", () => ({
  parseMesstoolExcel: vi.fn(async () => ({ signals: [{ name: "xlsx", data: [1] }], time: [0], meta: {} })),
}));
vi.mock("../messtoolStorage.js", () => ({
  downloadMessfile: vi.fn(async () => new TextEncoder().encode("a;b").buffer),
}));

const { isExcelName, parseMessfileBuffer, downloadAndParseMessfile } = await import("../loadMessfile.js");

describe("loadMessfile", () => {
  it("detects Excel by extension, case-insensitively", () => {
    expect(isExcelName("m.XLSX")).toBe(true);
    expect(isExcelName("m.xls")).toBe(true);
    expect(isExcelName("m.csv")).toBe(false);
    expect(isExcelName(undefined)).toBe(false);
  });

  it("routes .xlsx to the Excel parser and .csv to the CSV parser", async () => {
    const buf = new TextEncoder().encode("x").buffer;
    expect((await parseMessfileBuffer(buf, "a.xlsx")).signals[0].name).toBe("xlsx");
    expect((await parseMessfileBuffer(buf, "a.csv")).signals[0].name).toBe("csv");
  });

  it("uses the Excel parser for cloud files too (was CSV-only before)", async () => {
    const r = await downloadAndParseMessfile({ name: "cloud.xlsx", storagePath: "u/1_cloud.xlsx" });
    expect(r.signals[0].name).toBe("xlsx");
  });

  it("rejects files without signals", async () => {
    const buf = new TextEncoder().encode("LEER").buffer;
    await expect(parseMessfileBuffer(buf, "leer.csv")).rejects.toThrow(/keine Signale/);
  });
});

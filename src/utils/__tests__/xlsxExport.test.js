import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { buildMultiSignalWorkbook, buildGeneratorSignalWorkbook } from "../xlsxExport.js";

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

describe("buildGeneratorSignalWorkbook", () => {
  function sampleSignal(overrides = {}) {
    return {
      name: "Testsignal",
      waveType: "sinus",
      frequency: 5,
      amplitude: 10,
      phase: 0,
      duration: 2,
      samplingRate: 1000,
      timeData: [0, 0.001, 0.002],
      amplitudeData: [0, 0.314, 0.628],
      meta: { rms: 7.07, peak: 10, peakToPeak: 20 },
      ...overrides,
    };
  }

  it("builds a workbook with a 'Signal' and an 'Info' sheet", async () => {
    const wb = await buildGeneratorSignalWorkbook(sampleSignal());
    expect(wb.SheetNames).toEqual(["Signal", "Info"]);
  });

  it("writes the time/amplitude data in order on the Signal sheet", async () => {
    const signal = sampleSignal();
    const wb = await buildGeneratorSignalWorkbook(signal);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets.Signal, { header: 1 });
    expect(rows[0]).toEqual(["Zeit_s", "Amplitude"]);
    expect(rows[1]).toEqual([0, 0]);
    expect(rows[2]).toEqual([0.001, 0.314]);
    expect(rows[3]).toEqual([0.002, 0.628]);
  });

  it("writes generation parameters and stats on the Info sheet", async () => {
    const wb = await buildGeneratorSignalWorkbook(sampleSignal());
    const rows = XLSX.utils.sheet_to_json(wb.Sheets.Info, { header: 1 });
    const asMap = Object.fromEntries(rows);
    expect(asMap["Name"]).toBe("Testsignal");
    expect(asMap["Kurvenform"]).toBe("Sinus");
    expect(asMap["Frequenz [Hz]"]).toBe(5);
    expect(asMap["Amplitude"]).toBe(10);
    expect(asMap["Samplerate [Hz]"]).toBe(1000);
    expect(asMap["RMS"]).toBe(7.07);
    expect(asMap["Spitzenwert (Peak)"]).toBe(10);
    expect(asMap["Spitze-Spitze (Peak-Peak)"]).toBe(20);
  });

  it("falls back gracefully when meta/stat fields are missing", async () => {
    const wb = await buildGeneratorSignalWorkbook(sampleSignal({ meta: {} }));
    const rows = XLSX.utils.sheet_to_json(wb.Sheets.Info, { header: 1, defval: "" });
    const asMap = Object.fromEntries(rows);
    expect(asMap["RMS"]).toBe("");
  });
});

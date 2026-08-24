import { describe, it, expect } from "vitest";
import { buildLogDataFromSignal, buildLogDataFromSignals } from "../generator/generatorToLogdata.js";
import { parseMesstoolCsv } from "../messtoolParser.js";

describe("buildLogDataFromSignal", () => {
  it("throws a clear error for empty data or an invalid sampling rate", () => {
    expect(() => buildLogDataFromSignal({ data: [], samplingRate: 100 })).toThrow();
    expect(() => buildLogDataFromSignal({ data: [1, 2, 3], samplingRate: 0 })).toThrow();
  });

  it("produces the same SECTION/LOGITEM structure the Messtool parser expects", () => {
    const csv = buildLogDataFromSignal({
      name: "Test.Sinus", unit: "V", data: [0, 1, 0, -1, 0], samplingRate: 10,
    });
    expect(csv).toContain("SECTION;LOGITEMS");
    expect(csv).toContain("SECTION;LOGDATA");
    expect(csv).toContain("LOGITEM;Test.Sinus;");
    expect(csv).toContain("[unit: V]");
    expect(csv).toContain("Nb;Type;Date;Time;Test.Sinus");
  });

  it("round-trips cleanly through the real Messtool parser", async () => {
    const n = 500;
    const fs = 100;
    const data = Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 5 * i) / fs));
    const csv = buildLogDataFromSignal({ name: "Gen.Sinus5Hz", unit: "V", data, samplingRate: fs });

    const result = await parseMesstoolCsv(csv, {});
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0].name).toBe("Gen.Sinus5Hz");
    expect(result.signals[0].unit).toBe("V");
    expect(result.time).toHaveLength(n);
    expect(result.meta.sampleRateInfo.detectedFs).toBeCloseTo(fs, 0);
    for (let i = 0; i < n; i += 50) {
      expect(result.signals[0].data[i]).toBeCloseTo(data[i], 4);
    }
  });

  it("sanitizes an unsafe signal name into a valid LOGITEM identifier", async () => {
    const csv = buildLogDataFromSignal({
      name: "My Cool Signal #1!", data: [1, 2, 3], samplingRate: 10,
    });
    const result = await parseMesstoolCsv(csv, {});
    expect(result.signals[0].name).toMatch(/^My_Cool_Signal__1_$/);
  });

  it("falls back to a default name when none is given", async () => {
    const csv = buildLogDataFromSignal({ name: "", data: [1, 2, 3], samplingRate: 10 });
    const result = await parseMesstoolCsv(csv, {});
    expect(result.signals[0].name).toBe("GeneratedSignal");
  });
});

describe("buildLogDataFromSignals (whole session, multiple channels)", () => {
  it("throws when there are no usable signals", () => {
    expect(() => buildLogDataFromSignals({ signals: [] })).toThrow();
    expect(() => buildLogDataFromSignals({ signals: [{ name: "A", data: [] }] })).toThrow();
  });

  it("round-trips a session of several signals through the real parser, each as its own channel", async () => {
    const fs = 50;
    const n = 300;
    const sig1 = Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 3 * i) / fs));
    const sig2 = Array.from({ length: n }, (_, i) => Math.cos((2 * Math.PI * 3 * i) / fs) * 5);
    const csv = buildLogDataFromSignals({
      signals: [
        { name: "Sig.Sinus", unit: "V", data: sig1, samplingRate: fs },
        { name: "Sig.Cosinus", unit: "A", data: sig2, samplingRate: fs },
      ],
    });

    const result = await parseMesstoolCsv(csv, {});
    expect(result.signals).toHaveLength(2);
    expect(result.signals.map((s) => s.name)).toEqual(["Sig.Sinus", "Sig.Cosinus"]);
    expect(result.signals[0].unit).toBe("V");
    expect(result.signals[1].unit).toBe("A");
    expect(result.time).toHaveLength(n);
    for (let i = 0; i < n; i += 60) {
      expect(result.signals[0].data[i]).toBeCloseTo(sig1[i], 4);
      expect(result.signals[1].data[i]).toBeCloseTo(sig2[i], 4);
    }
  });

  it("gives duplicate signal names distinct channel names instead of colliding", async () => {
    const csv = buildLogDataFromSignals({
      signals: [
        { name: "Signal 1", data: [1, 2, 3], samplingRate: 10 },
        { name: "Signal 1", data: [4, 5, 6], samplingRate: 10 },
      ],
    });
    const result = await parseMesstoolCsv(csv, {});
    const names = result.signals.map((s) => s.name);
    expect(new Set(names).size).toBe(2); // both present, both unique
  });

  it("pads shorter signals with blanks instead of misaligning the rest of the file", async () => {
    const csv = buildLogDataFromSignals({
      signals: [
        { name: "Long", data: [1, 2, 3, 4, 5], samplingRate: 10 },
        { name: "Short", data: [10, 20], samplingRate: 10 },
      ],
    });
    const result = await parseMesstoolCsv(csv, {});
    expect(result.time).toHaveLength(5);
    const shortSignal = result.signals.find((s) => s.name === "Short");
    expect(shortSignal.data[0]).toBeCloseTo(10, 4);
    expect(shortSignal.data[1]).toBeCloseTo(20, 4);
    expect(shortSignal.data[2]).toBeNull(); // ran out, left blank
  });
});

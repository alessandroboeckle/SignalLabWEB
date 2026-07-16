import { describe, it, expect } from "vitest";
import { buildCsv } from "../csvExport.js";

describe("csvExport", () => {
  it("builds a semicolon-delimited CSV with a units-in-header format", () => {
    const time = [0, 0.1, 0.2];
    const columns = [
      { name: "Original", unit: "bar", data: [1, 2, null] },
      { name: "Verarbeitet", unit: "bar", data: [1.1, 2.1, 3.1] },
    ];
    const csv = buildCsv(time, columns);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Zeit_s;Original_[bar];Verarbeitet_[bar]");
    expect(lines[1]).toBe("0;1;1.1");
    expect(lines[3]).toBe("0.2;;3.1"); // null -> empty field, not "null"
  });

  it("omits the unit suffix for columns with no unit", () => {
    const csv = buildCsv([0], [{ name: "Raw", unit: "", data: [42] }]);
    expect(csv.split("\n")[0]).toBe("Zeit_s;Raw");
  });
});

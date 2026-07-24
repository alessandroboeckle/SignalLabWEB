import { describe, it, expect, beforeEach } from "vitest";
import { listRecentFiles, addRecentFile, removeRecentFile } from "../recentFiles.js";

beforeEach(() => {
  globalThis.localStorage = {
    _d: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
  };
});

describe("recentFiles", () => {
  it("adds a file to the front of the list", () => {
    addRecentFile({ name: "a.csv", messfileId: "1", storagePath: "p1" });
    const list = listRecentFiles();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("a.csv");
  });

  it("moves a re-opened file back to the front instead of duplicating it", () => {
    addRecentFile({ name: "a.csv" });
    addRecentFile({ name: "b.csv" });
    addRecentFile({ name: "a.csv" });
    const list = listRecentFiles();
    expect(list.map((f) => f.name)).toEqual(["a.csv", "b.csv"]);
  });

  it("caps the list at 8 entries", () => {
    for (let i = 0; i < 12; i++) addRecentFile({ name: `f${i}.csv` });
    expect(listRecentFiles()).toHaveLength(8);
    expect(listRecentFiles()[0].name).toBe("f11.csv"); // newest first
  });

  it("removes a file by name", () => {
    addRecentFile({ name: "a.csv" });
    addRecentFile({ name: "b.csv" });
    removeRecentFile("a.csv");
    expect(listRecentFiles().map((f) => f.name)).toEqual(["b.csv"]);
  });

  it("ignores a call with no name", () => {
    addRecentFile({});
    expect(listRecentFiles()).toEqual([]);
  });
});

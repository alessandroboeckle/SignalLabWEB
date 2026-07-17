import { describe, it, expect, beforeEach } from "vitest";
import { listGroups, saveGroup, deleteGroup, resolveGroupIndices } from "../messtoolSignalGroups.js";

beforeEach(() => {
  globalThis.localStorage = {
    _d: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
  };
});

describe("messtoolSignalGroups", () => {
  it("saves and lists a group", () => {
    saveGroup("Temperaturen", ["A.temp", "B.temp"]);
    const groups = listGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0].signalNames).toEqual(["A.temp", "B.temp"]);
  });

  it("rejects an empty name or empty signal list", () => {
    expect(() => saveGroup("", ["A.temp"])).toThrow();
    expect(() => saveGroup("Leer", [])).toThrow();
  });

  it("overwrites an existing group with the same name", () => {
    saveGroup("G", ["A"]);
    saveGroup("G", ["A", "B"]);
    const groups = listGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0].signalNames).toEqual(["A", "B"]);
  });

  it("deletes a group by name", () => {
    saveGroup("G1", ["A"]);
    saveGroup("G2", ["B"]);
    deleteGroup("G1");
    expect(listGroups().map((g) => g.name)).toEqual(["G2"]);
  });

  it("resolveGroupIndices matches by name regardless of order, ignoring missing ones", () => {
    const group = { signalNames: ["Temp", "Volt"] };
    const signals = [{ name: "Speed" }, { name: "Volt" }, { name: "Temp" }];
    // returned in the file's own order, not the group's save order
    expect(resolveGroupIndices(group, signals)).toEqual([1, 2]);
  });

  it("resolveGroupIndices returns an empty array when nothing matches", () => {
    const group = { signalNames: ["Unrelated"] };
    const signals = [{ name: "Speed" }, { name: "Volt" }];
    expect(resolveGroupIndices(group, signals)).toEqual([]);
  });
});

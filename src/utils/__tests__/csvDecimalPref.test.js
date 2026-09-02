import { describe, it, expect, beforeEach } from "vitest";
import { getCsvDecimalCommaPref, setCsvDecimalCommaPref } from "../csvDecimalPref.js";

beforeEach(() => {
  globalThis.localStorage = {
    _d: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
  };
});

describe("csvDecimalPref", () => {
  it("defaults to false when nothing is stored", () => {
    expect(getCsvDecimalCommaPref()).toBe(false);
  });

  it("round-trips true/false through localStorage", () => {
    setCsvDecimalCommaPref(true);
    expect(getCsvDecimalCommaPref()).toBe(true);
    setCsvDecimalCommaPref(false);
    expect(getCsvDecimalCommaPref()).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { formatDate } from "../formatDate.js";

describe("formatDate", () => {
  it("returns an empty string for falsy input", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("")).toBe("");
  });

  it("formats a date as DD.MM.YYYY, HH:MM in de-DE style", () => {
    const d = new Date(2025, 2, 7, 14, 34); // 7 March 2025, 14:34 (local time)
    const out = formatDate(d);
    expect(out).toMatch(/^07\.03\.2025,?\s+14:34$/);
  });

  it("accepts an ISO string as well as a Date object", () => {
    const iso = new Date(2025, 2, 7, 14, 34).toISOString();
    expect(formatDate(iso)).toBe(formatDate(new Date(iso)));
  });
});

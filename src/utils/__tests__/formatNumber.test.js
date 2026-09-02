import { describe, it, expect } from "vitest";
import { formatNumber } from "../formatNumber.js";

describe("formatNumber", () => {
  it("formats a number to 3 decimals", () => {
    expect(formatNumber(1.23456)).toBe("1.235");
    expect(formatNumber(2)).toBe("2.000");
  });

  it("returns '0' for non-numbers", () => {
    expect(formatNumber(null)).toBe("0");
    expect(formatNumber(undefined)).toBe("0");
    expect(formatNumber("1.5")).toBe("0");
  });
});

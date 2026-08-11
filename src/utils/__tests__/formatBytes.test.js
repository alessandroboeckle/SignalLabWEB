import { describe, it, expect } from "vitest";
import { formatBytes } from "../formatBytes.js";

describe("formatBytes", () => {
  it("formats bytes below 1KB as whole bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(0)).toBe("0 B");
  });

  it("switches units automatically as the value grows", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(2.5 * 1024 * 1024)).toBe("2.5 MB");
    expect(formatBytes(1.3 * 1024 * 1024 * 1024)).toBe("1.3 GB");
  });

  it("returns a placeholder for null/undefined/NaN instead of throwing or showing 'NaN'", () => {
    expect(formatBytes(null)).toBe("–");
    expect(formatBytes(undefined)).toBe("–");
    expect(formatBytes(NaN)).toBe("–");
  });
});

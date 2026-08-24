import { describe, it, expect } from "vitest";
import { friendlyError } from "../friendlyError.js";

describe("friendlyError", () => {
  it("translates network failures", () => {
    expect(friendlyError(new Error("Failed to fetch"))).toMatch(/Verbindung/);
    expect(friendlyError(new Error("NetworkError when attempting to fetch resource"))).toMatch(/Verbindung/);
  });

  it("translates timeouts", () => {
    expect(friendlyError(new Error("Timeout after 25000ms"))).toMatch(/antwortet nicht rechtzeitig/);
  });

  it("translates expired-session errors", () => {
    expect(friendlyError(new Error("JWT expired"))).toMatch(/Sitzung ist abgelaufen/);
  });

  it("translates permission errors", () => {
    expect(friendlyError(new Error("permission denied for table messfiles"))).toMatch(/keine Berechtigung/);
    expect(friendlyError(new Error("new row violates row-level security policy"))).toMatch(/keine Berechtigung/);
  });

  it("leaves an already-friendly quota message untouched", () => {
    const msg = "Speicherlimit von 30 MB erreicht (aktuell 28.4 MB belegt).";
    expect(friendlyError(new Error(msg))).toBe(msg);
  });

  it("falls back to the original message for unrecognized errors", () => {
    expect(friendlyError(new Error("some obscure backend detail"))).toBe("some obscure backend detail");
  });

  it("handles non-Error values without throwing", () => {
    expect(friendlyError("plain string error")).toBe("plain string error");
    expect(friendlyError(null)).toBe("Unbekannter Fehler");
    expect(friendlyError(undefined)).toBe("Unbekannter Fehler");
  });
});

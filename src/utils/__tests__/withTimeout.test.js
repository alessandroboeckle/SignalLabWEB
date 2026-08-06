import { describe, it, expect, vi } from "vitest";
import { withTimeout } from "../withTimeout.js";

describe("withTimeout", () => {
  it("resolves normally when the promise settles before the timeout", async () => {
    const result = await withTimeout(Promise.resolve("ok"), 1000);
    expect(result).toBe("ok");
  });

  it("rejects with the timeout message when the promise never settles", async () => {
    vi.useFakeTimers();
    const neverSettles = new Promise(() => {});
    const promise = withTimeout(neverSettles, 5000, "Zeitüberschreitung — bitte erneut versuchen.");
    const assertion = expect(promise).rejects.toThrow("Zeitüberschreitung — bitte erneut versuchen.");
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
    vi.useRealTimers();
  });

  it("propagates the original rejection when the promise rejects before the timeout", async () => {
    await expect(withTimeout(Promise.reject(new Error("boom")), 1000)).rejects.toThrow("boom");
  });
});

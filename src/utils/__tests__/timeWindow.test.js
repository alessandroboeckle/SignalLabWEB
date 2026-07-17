import { describe, it, expect } from "vitest";
import { findWindowBounds } from "../timeWindow.js";

describe("findWindowBounds", () => {
  const t = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it("returns the full range when no bounds are set", () => {
    expect(findWindowBounds(t, null, null)).toEqual([0, 11]);
  });

  it("restricts the start only", () => {
    expect(findWindowBounds(t, 5, null)).toEqual([5, 11]);
  });

  it("restricts the end only", () => {
    expect(findWindowBounds(t, null, 5)).toEqual([0, 6]);
  });

  it("restricts both start and end", () => {
    expect(findWindowBounds(t, 3, 7)).toEqual([3, 8]);
  });

  it("clamps to an empty-but-valid range when start is past the end of the data", () => {
    const [i0, i1] = findWindowBounds(t, 50, null);
    expect(i0).toBe(t.length);
    expect(i1).toBe(t.length);
  });

  it("handles an empty time array without crashing", () => {
    expect(findWindowBounds([], 1, 5)).toEqual([0, 0]);
  });

  it("never returns end before start even with an inverted-looking window", () => {
    const [i0, i1] = findWindowBounds(t, 8, 2); // end < start
    expect(i1).toBeGreaterThanOrEqual(i0);
  });
});

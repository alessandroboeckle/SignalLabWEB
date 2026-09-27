import { describe, it, expect } from "vitest";
import { clockOffsetOf, clockReference, clockShift } from "../clockAxis.js";

// Two recordings: A starts 10:08:43, B starts 10:08:53 (10 s later)
const hms = (h, m, s) => h * 3600 + m * 60 + s;
const A = { time: [0, 1, 2], clockSec: [hms(10, 8, 43), hms(10, 8, 44), hms(10, 8, 45)] };
const B = { time: [0, 1, 2], clockSec: [hms(10, 8, 53), hms(10, 8, 54), hms(10, 8, 55)] };
const noClock = { time: [0, 1, 2], clockSec: null };

describe("clockAxis", () => {
  it("uses the earliest start as reference", () => {
    expect(clockReference([B, A])).toBe(hms(10, 8, 43));
  });

  it("puts the same clock moment at the same x in every series", () => {
    const ref = clockReference([A, B]);
    // 10:08:54 is A's elapsed 11 s (outside, but on the same axis) and B's elapsed 1 s
    const xA = 11 + clockShift(A, ref);
    const xB = 1 + clockShift(B, ref);
    expect(xA).toBe(xB);
    expect(xB).toBe(11);
  });

  it("leaves series without clock info at their elapsed time", () => {
    const ref = clockReference([A, noClock]);
    expect(clockShift(noClock, ref)).toBe(0);
    expect(clockOffsetOf(noClock)).toBeNull();
  });

  it("returns no reference / no shift when nothing has a clock", () => {
    expect(clockReference([noClock])).toBeNull();
    expect(clockShift(A, null)).toBe(0);
  });
});

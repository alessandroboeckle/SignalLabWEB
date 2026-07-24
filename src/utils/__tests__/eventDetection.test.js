import { describe, it, expect } from "vitest";
import { findEvents } from "../eventDetection.js";

describe("findEvents", () => {
  it("finds a single event above a threshold", () => {
    const t = [0, 1, 2, 3, 4, 5, 6];
    const y = [0, 0, 5, 8, 6, 0, 0];
    const events = findEvents(y, t, 3, { mode: "above" });
    expect(events).toHaveLength(1);
    expect(events[0].startTime).toBe(2);
    expect(events[0].endTime).toBe(4);
    expect(events[0].peakValue).toBe(8);
    expect(events[0].peakTime).toBe(3);
  });

  it("finds multiple separate events", () => {
    const t = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const y = [0, 5, 0, 0, 0, 6, 0, 0, 0];
    const events = findEvents(y, t, 3, { mode: "above" });
    expect(events).toHaveLength(2);
  });

  it("abs mode catches negative excursions too", () => {
    const t = [0, 1, 2, 3];
    const y = [0, -8, -9, 0];
    const events = findEvents(y, t, 3, { mode: "abs" });
    expect(events).toHaveLength(1);
    expect(events[0].peakValue).toBe(-9);
  });

  it("below mode only catches values under the threshold", () => {
    const t = [0, 1, 2, 3];
    const y = [0, -8, -9, 0];
    const events = findEvents(y, t, -3, { mode: "below" });
    expect(events).toHaveLength(1);
  });

  it("filters out events shorter than minDurationSec", () => {
    const t = [0, 1, 2, 3, 4];
    const y = [0, 5, 0, 0, 0]; // a single-sample blip, duration 0
    const events = findEvents(y, t, 3, { mode: "above", minDurationSec: 0.5 });
    expect(events).toHaveLength(0);
  });

  it("handles an event that runs to the very end of the signal", () => {
    const t = [0, 1, 2, 3];
    const y = [0, 0, 5, 8];
    const events = findEvents(y, t, 3, { mode: "above" });
    expect(events).toHaveLength(1);
    expect(events[0].endTime).toBe(3);
  });

  it("ignores null/NaN values instead of treating them as exceeding", () => {
    const t = [0, 1, 2, 3];
    const y = [0, null, NaN, 0];
    const events = findEvents(y, t, 1, { mode: "above" });
    expect(events).toHaveLength(0);
  });

  it("returns no events when nothing crosses the threshold", () => {
    const t = [0, 1, 2];
    const y = [1, 1, 1];
    expect(findEvents(y, t, 5, { mode: "above" })).toEqual([]);
  });
});

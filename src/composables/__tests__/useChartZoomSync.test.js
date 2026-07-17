import { describe, it, expect, vi } from "vitest";
import { subscribeZoomSync, broadcastZoomSync } from "../useChartZoomSync.js";

describe("useChartZoomSync", () => {
  it("delivers a broadcast to all subscribers of the same group", () => {
    const a = vi.fn();
    const b = vi.fn();
    subscribeZoomSync("g1", a);
    subscribeZoomSync("g1", b);
    broadcastZoomSync("g1", { min: 0, max: 10 }, "src1");
    expect(a).toHaveBeenCalledWith({ min: 0, max: 10 }, "src1");
    expect(b).toHaveBeenCalledWith({ min: 0, max: 10 }, "src1");
  });

  it("does not deliver to a different group", () => {
    const a = vi.fn();
    subscribeZoomSync("g2", a);
    broadcastZoomSync("g3", { min: 0, max: 5 }, "src");
    expect(a).not.toHaveBeenCalled();
  });

  it("unsubscribe stops further delivery", () => {
    const a = vi.fn();
    const unsub = subscribeZoomSync("g4", a);
    unsub();
    broadcastZoomSync("g4", { min: 0, max: 5 }, "src");
    expect(a).not.toHaveBeenCalled();
  });

  it("broadcasting to a group with no subscribers is a no-op (no crash)", () => {
    expect(() => broadcastZoomSync("nobody-here", { min: 0, max: 1 }, "src")).not.toThrow();
  });

  it("ignores group=null/undefined gracefully", () => {
    expect(() => subscribeZoomSync(null, () => {})).not.toThrow();
    expect(() => broadcastZoomSync(null, {}, "x")).not.toThrow();
  });
});

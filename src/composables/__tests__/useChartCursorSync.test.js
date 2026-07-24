import { describe, it, expect, vi } from "vitest";
import { subscribeCursorSync, broadcastCursorSync } from "../useChartCursorSync.js";

describe("useChartCursorSync", () => {
  it("delivers a broadcast to all subscribers of the same group", () => {
    const a = vi.fn();
    const b = vi.fn();
    subscribeCursorSync("g1", a);
    subscribeCursorSync("g1", b);
    broadcastCursorSync("g1", { type: "add", x: 5 }, "src1");
    expect(a).toHaveBeenCalledWith({ type: "add", x: 5 }, "src1");
    expect(b).toHaveBeenCalledWith({ type: "add", x: 5 }, "src1");
  });

  it("does not deliver to a different group", () => {
    const a = vi.fn();
    subscribeCursorSync("g2", a);
    broadcastCursorSync("g3", { type: "add", x: 1 }, "src");
    expect(a).not.toHaveBeenCalled();
  });

  it("unsubscribe stops further delivery", () => {
    const a = vi.fn();
    const unsub = subscribeCursorSync("g4", a);
    unsub();
    broadcastCursorSync("g4", { type: "clear" }, "src");
    expect(a).not.toHaveBeenCalled();
  });

  it("broadcasting to a group with no subscribers is a no-op (no crash)", () => {
    expect(() => broadcastCursorSync("nobody-here", { type: "add", x: 1 }, "src")).not.toThrow();
  });

  it("ignores group=null/undefined gracefully", () => {
    expect(() => subscribeCursorSync(null, () => {})).not.toThrow();
    expect(() => broadcastCursorSync(null, {}, "x")).not.toThrow();
  });
});

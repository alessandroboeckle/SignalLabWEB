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

describe("useChartCursorSync — late joiners", () => {
  it("hands the current mode + cursors to a chart that subscribes later", () => {
    const first = vi.fn();
    subscribeCursorSync("late1", first);
    broadcastCursorSync("late1", { type: "mode", active: true }, "a");
    broadcastCursorSync("late1", { type: "add", id: "c1", x: 2.5 }, "a");
    broadcastCursorSync("late1", { type: "add", id: "c2", x: 7 }, "a");
    broadcastCursorSync("late1", { type: "toggle", id: "c2", active: false }, "a");

    const late = vi.fn();
    subscribeCursorSync("late1", late);
    expect(late).toHaveBeenCalledTimes(1);
    expect(late).toHaveBeenCalledWith(
      {
        type: "sync",
        mode: true,
        cursors: [
          { id: "c1", x: 2.5, active: true },
          { id: "c2", x: 7, active: false },
        ],
      },
      null,
    );
  });

  it("sends nothing to a late joiner when the group has no cursor state", () => {
    subscribeCursorSync("late2", vi.fn());
    const late = vi.fn();
    subscribeCursorSync("late2", late);
    expect(late).not.toHaveBeenCalled();
  });

  it("forgets the state once the last chart unsubscribes", () => {
    const unsub = subscribeCursorSync("late3", vi.fn());
    broadcastCursorSync("late3", { type: "mode", active: true }, "a");
    unsub();
    const again = vi.fn();
    subscribeCursorSync("late3", again);
    expect(again).not.toHaveBeenCalled();
  });
});

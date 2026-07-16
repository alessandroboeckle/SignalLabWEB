import { describe, it, expect } from "vitest";
import {
  SmoothOp,
  DetrendOp,
  NormalizeOp,
  RemoveOffsetOp,
  OP_REGISTRY,
  applyChain,
} from "../messtoolProcessing.js";

describe("messtoolProcessing", () => {
  it("RemoveOffsetOp subtracts the mean", () => {
    const op = new RemoveOffsetOp();
    const out = op.apply([1, 2, 3, 4, 5]);
    expect(out.reduce((a, b) => a + b, 0) / out.length).toBeCloseTo(0);
  });

  it("NormalizeOp scales the peak absolute value to the target", () => {
    const op = new NormalizeOp({ target: 2 });
    const out = op.apply([-5, 3, 1]);
    const maxAbs = Math.max(...out.map(Math.abs));
    expect(maxAbs).toBeCloseTo(2);
  });

  it("NormalizeOp leaves an all-zero signal untouched (no divide-by-zero)", () => {
    const op = new NormalizeOp({ target: 1 });
    expect(op.apply([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it("DetrendOp removes a perfectly linear trend", () => {
    const op = new DetrendOp();
    const y = [0, 2, 4, 6, 8, 10];
    const out = op.apply(y);
    for (const v of out) expect(v).toBeCloseTo(0, 5);
  });

  it("SmoothOp preserves the length of the input", () => {
    const op = new SmoothOp({ windowLen: 5, windowType: "hann" });
    const y = Array.from({ length: 50 }, (_, i) => Math.sin(i / 3));
    expect(op.apply(y).length).toBe(y.length);
  });

  it("SmoothOp reduces noise variance on a noisy constant signal", () => {
    const op = new SmoothOp({ windowLen: 9, windowType: "hanning" });
    const y = Array.from({ length: 200 }, () => 5 + (Math.random() - 0.5));
    const out = op.apply(y);
    const variance = (arr) => {
      const m = arr.reduce((a, b) => a + b, 0) / arr.length;
      return arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
    };
    expect(variance(out)).toBeLessThan(variance(y));
  });

  it("OP_REGISTRY entries build working instances via make()", () => {
    for (const entry of OP_REGISTRY) {
      const op = entry.make();
      expect(op.id).toBe(entry.id);
      expect(typeof op.apply).toBe("function");
    }
  });

  it("applyChain runs operations in sequence and never mutates the input", () => {
    const y = [1, 2, 3, 4, 5];
    const original = y.slice();
    const ops = [new RemoveOffsetOp(), new NormalizeOp({ target: 1 })];
    const out = applyChain(y, [0, 1, 2, 3, 4], ops);
    expect(y).toEqual(original); // input untouched
    expect(Math.max(...out.map(Math.abs))).toBeCloseTo(1);
  });
});

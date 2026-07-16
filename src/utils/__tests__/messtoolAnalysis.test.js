import { describe, it, expect } from "vitest";
import { mean, rms, variance, stddev, minMax, derivative, integral } from "../messtoolAnalysis.js";

describe("messtoolAnalysis", () => {
  it("mean computes the arithmetic average", () => {
    expect(mean([1, 2, 3, 4])).toBeCloseTo(2.5);
  });

  it("rms computes the root-mean-square", () => {
    expect(rms([3, 4])).toBeCloseTo(Math.sqrt((9 + 16) / 2));
  });

  it("variance and stddev are consistent with each other", () => {
    const y = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(stddev(y)).toBeCloseTo(Math.sqrt(variance(y)));
  });

  it("variance of a constant series is zero", () => {
    expect(variance([5, 5, 5, 5])).toBeCloseTo(0);
  });

  it("minMax finds the extremes", () => {
    expect(minMax([3, -1, 7, 2])).toEqual({ min: -1, max: 7 });
  });

  it("derivative of a linear ramp is constant", () => {
    const t = [0, 1, 2, 3];
    const y = [0, 2, 4, 6]; // slope 2
    const d = derivative(y, t);
    for (const v of d) expect(v).toBeCloseTo(2);
  });

  it("integral of a constant signal grows linearly (cumsum*dt convention)", () => {
    const t = [0, 1, 2, 3];
    const y = [1, 1, 1, 1];
    const i = integral(y, t);
    // documented as cumsum(y)*dt, so with dt=1 this is exactly 1,2,3,4
    expect(i).toEqual([1, 2, 3, 4]);
  });
});

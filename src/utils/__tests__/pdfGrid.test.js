import { describe, it, expect } from "vitest";
import { pdfGrid } from "../chartsPdf.js";

describe("pdfGrid", () => {
  it("stacks 1–2 plots in one column", () => {
    expect(pdfGrid(1, "landscape")).toEqual({ n: 1, cols: 1, rows: 1 });
    expect(pdfGrid(2, "portrait")).toEqual({ n: 2, cols: 1, rows: 2 });
  });
  it("uses two columns from 3 on landscape and from 5 on portrait", () => {
    expect(pdfGrid(3, "landscape")).toEqual({ n: 3, cols: 2, rows: 2 });
    expect(pdfGrid(4, "portrait")).toEqual({ n: 4, cols: 1, rows: 4 });
    expect(pdfGrid(6, "portrait")).toEqual({ n: 6, cols: 2, rows: 3 });
  });
  it("clamps silly values", () => {
    expect(pdfGrid(0, "portrait").n).toBe(1);
    expect(pdfGrid(99, "landscape").n).toBe(12);
    expect(pdfGrid("x", "landscape").n).toBe(1);
  });
});

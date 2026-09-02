import { describe, it, expect } from "vitest";
import {
  xValueAtEvent,
  xValueToPixel,
  getFullXRange,
  applyZoomLimits,
  captureXRange,
  restoreXRange,
} from "../chartInteractionMath.js";

// Minimal fake Chart.js chart — just enough surface for these pure
// helpers, no real canvas/rendering involved.
function makeCategoryChart({ labels = ["0", "1", "2", "3"], min = 0, max = 3 } = {}) {
  return {
    canvas: { getBoundingClientRect: () => ({ left: 0 }) },
    chartArea: { left: 0, right: 300, top: 0, bottom: 100 },
    data: { labels },
    scales: {
      x: {
        min,
        max,
        getValueForPixel: (px) => (px / 300) * (labels.length - 1),
        getPixelForValue: (idx) => (idx / (labels.length - 1)) * 300,
      },
    },
    options: { plugins: { zoom: { limits: {} } } },
  };
}

function makeLinearChart({ min = 0, max = 10 } = {}) {
  return {
    canvas: { getBoundingClientRect: () => ({ left: 0 }) },
    chartArea: { left: 0, right: 300, top: 0, bottom: 100 },
    data: { labels: [] },
    scales: {
      x: {
        min,
        max,
        getValueForPixel: (px) => (px / 300) * 10,
        getPixelForValue: (v) => (v / 10) * 300,
      },
    },
    options: { plugins: { zoom: { limits: {} } } },
  };
}

describe("xValueAtEvent", () => {
  it("rounds to the nearest label on a category scale", () => {
    const chart = makeCategoryChart();
    // px=150 -> raw index 1.5 -> rounds to label index 2 -> "2"
    const x = xValueAtEvent(chart, { clientX: 150 });
    expect(x).toBe(2);
  });

  it("returns the raw value on a linear scale", () => {
    const chart = makeLinearChart();
    const x = xValueAtEvent(chart, { clientX: 150 });
    expect(x).toBeCloseTo(5);
  });

  it("returns null when the click is outside the chart area", () => {
    const chart = makeCategoryChart();
    expect(xValueAtEvent(chart, { clientX: -10 })).toBeNull();
    expect(xValueAtEvent(chart, { clientX: 999 })).toBeNull();
  });

  it("returns null when there is no x scale", () => {
    const chart = { scales: {} };
    expect(xValueAtEvent(chart, { clientX: 10 })).toBeNull();
  });
});

describe("xValueToPixel", () => {
  it("interpolates between bracketing labels on a category scale", () => {
    const chart = makeCategoryChart();
    // value 1.5 sits halfway between label "1" (idx 1) and "2" (idx 2)
    expect(xValueToPixel(chart, 1.5)).toBeCloseTo(150);
  });

  it("clamps to the first/last label outside the data range", () => {
    const chart = makeCategoryChart();
    expect(xValueToPixel(chart, -5)).toBeCloseTo(0);
    expect(xValueToPixel(chart, 99)).toBeCloseTo(300);
  });

  it("passes the value straight through on a linear scale", () => {
    const chart = makeLinearChart();
    expect(xValueToPixel(chart, 5)).toBeCloseTo(150);
  });
});

describe("getFullXRange", () => {
  it("prefers the stored zoom limits over the current (possibly zoomed) scale", () => {
    const chart = makeLinearChart({ min: 2, max: 4 });
    chart.options.plugins.zoom.limits.x = { min: 0, max: 10 };
    expect(getFullXRange(chart)).toEqual({ min: 0, max: 10 });
  });

  it("falls back to the live scale range when no limits are set yet", () => {
    const chart = makeLinearChart({ min: 2, max: 4 });
    expect(getFullXRange(chart)).toEqual({ min: 2, max: 4 });
  });
});

describe("applyZoomLimits", () => {
  it("fills limits with a 1% minRange per scale", () => {
    const chart = makeLinearChart({ min: 0, max: 10 });
    applyZoomLimits(chart);
    expect(chart.options.plugins.zoom.limits.x).toEqual({ min: 0, max: 10, minRange: 0.1 });
  });

  it("skips scales without a numeric min/max", () => {
    const chart = makeLinearChart();
    chart.scales.y = {};
    applyZoomLimits(chart);
    expect(chart.options.plugins.zoom.limits.y).toBeUndefined();
  });
});

describe("captureXRange / restoreXRange", () => {
  it("round-trips the visible range through a rebuild", () => {
    const chart = makeLinearChart({ min: 3, max: 7 });
    const range = captureXRange(chart);
    expect(range).toEqual({ min: 3, max: 7 });

    const rebuilt = makeLinearChart({ min: 0, max: 10 });
    let called = null;
    rebuilt.zoomScale = (axis, r) => { called = [axis, r]; };
    restoreXRange(rebuilt, range);
    expect(called).toEqual(["x", range]);
  });

  it("does nothing when there is no captured range or no chart", () => {
    expect(() => restoreXRange(null, { min: 0, max: 1 })).not.toThrow();
    expect(() => restoreXRange(makeLinearChart(), null)).not.toThrow();
  });

  it("returns null when the chart has no usable x scale", () => {
    expect(captureXRange(null)).toBeNull();
    expect(captureXRange({ scales: {} })).toBeNull();
  });
});

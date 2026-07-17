import { describe, it, expect } from "vitest";
import { buildLineChartSvg } from "../svgChart.js";

describe("buildLineChartSvg", () => {
  it("produces a well-formed SVG with the requested dimensions", () => {
    const svg = buildLineChartSvg({
      x: [0, 1, 2, 3], y: [1, 2, 1.5, 3],
      width: 800, height: 400, title: "Test", xLabel: "Zeit [s]", yLabel: "Wert",
    });
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"');
    expect(svg).toContain("</svg>");
    expect(svg).toContain("<polyline");
  });

  it("includes exactly as many polyline points as valid data points", () => {
    const svg = buildLineChartSvg({ x: [0, 1, 2], y: [1, 2, 3] });
    const match = svg.match(/<polyline points="([^"]+)"/);
    expect(match[1].trim().split(" ")).toHaveLength(3);
  });

  it("skips null/NaN values instead of breaking the path", () => {
    const svg = buildLineChartSvg({ x: [0, 1, 2, 3], y: [1, null, NaN, 4] });
    const match = svg.match(/<polyline points="([^"]+)"/);
    expect(match[1].trim().split(" ")).toHaveLength(2);
  });

  it("escapes XML-unsafe characters in text fields", () => {
    const svg = buildLineChartSvg({ x: [0, 1], y: [1, 2], title: "A & B <test>" });
    expect(svg).toContain("A &amp; B &lt;test&gt;");
    expect(svg).not.toContain("<test>");
  });

  it("handles a perfectly flat (zero-span) signal without dividing by zero", () => {
    const svg = buildLineChartSvg({ x: [0, 1, 2], y: [5, 5, 5] });
    expect(svg).toContain("<polyline");
    expect(svg).not.toMatch(/NaN/);
  });
});

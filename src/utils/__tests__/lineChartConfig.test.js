import { describe, it, expect } from "vitest";
import { buildLineChartConfig, emptyLineChartConfig } from "../lineChartConfig.js";

describe("buildLineChartConfig", () => {
  it("builds a category-scale (labels array) config", () => {
    const cfg = buildLineChartConfig({
      datasets: [{ label: "Signal", data: [1, 2, 3] }],
      labels: [0, 1, 2],
      xTitle: "Zeit [s]",
      xScale: { ticks: { maxTicksLimit: 8 } },
      yTitle: "V",
    });
    expect(cfg).toEqual({
      type: "line",
      data: { labels: [0, 1, 2], datasets: [{ label: "Signal", data: [1, 2, 3] }] },
      options: {
        responsive: true,
        animation: false,
        scales: {
          x: { title: { display: true, text: "Zeit [s]" }, ticks: { maxTicksLimit: 8 } },
          y: { title: { display: true, text: "V" } },
        },
      },
    });
  });

  it("omits data.labels entirely when not passed (point-dataset / linear-scale charts)", () => {
    const cfg = buildLineChartConfig({
      datasets: [{ label: "Signal", data: [{ x: 0, y: 1 }] }],
      parsing: false,
      xTitle: "Zeit [s]",
      xScale: { type: "linear" },
      yTitle: "Wert",
    });
    expect(cfg.data).toEqual({ datasets: [{ label: "Signal", data: [{ x: 0, y: 1 }] }] });
    expect(cfg.options.parsing).toBe(false);
    expect(cfg.options.scales.x.type).toBe("linear");
  });

  it("keeps an explicit empty labels array when passed", () => {
    const cfg = buildLineChartConfig({ datasets: [], labels: [] });
    expect(cfg.data.labels).toEqual([]);
  });

  it("merges arbitrary y-scale options (min/max/ticks) alongside the title", () => {
    const cfg = buildLineChartConfig({
      datasets: [],
      yTitle: "Phase [°]",
      yScale: { min: -180, max: 180, ticks: { stepSize: 90 } },
    });
    expect(cfg.options.scales.y).toEqual({
      title: { display: true, text: "Phase [°]" },
      min: -180,
      max: 180,
      ticks: { stepSize: 90 },
    });
  });

  it("merges extraScales in alongside x/y as-is (no title default applied)", () => {
    const cfg = buildLineChartConfig({
      datasets: [],
      yTitle: "Wert",
      extraScales: {
        y1: { position: "right", title: { display: true, text: "Wert (rechte Achse)" }, grid: { drawOnChartArea: false } },
      },
    });
    expect(cfg.options.scales.y1).toEqual({
      position: "right",
      title: { display: true, text: "Wert (rechte Achse)" },
      grid: { drawOnChartArea: false },
    });
    expect(cfg.options.scales.y).toEqual({ title: { display: true, text: "Wert" } });
  });

  it("only sets options.plugins when explicitly provided", () => {
    const withoutPlugins = buildLineChartConfig({ datasets: [] });
    expect(withoutPlugins.options.plugins).toBeUndefined();

    const legend = { legend: { labels: { filter: () => true } } };
    const withPlugins = buildLineChartConfig({ datasets: [], plugins: legend });
    expect(withPlugins.options.plugins).toBe(legend);
  });
});

describe("emptyLineChartConfig", () => {
  it("defaults to an empty labels array", () => {
    expect(emptyLineChartConfig()).toEqual({ type: "line", data: { labels: [], datasets: [] } });
  });

  it("omits labels when withLabels is false", () => {
    expect(emptyLineChartConfig(false)).toEqual({ type: "line", data: { datasets: [] } });
  });
});

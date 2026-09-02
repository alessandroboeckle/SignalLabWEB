// The `{ type: "line", data: {...}, options: { responsive, animation:
// false, scales: {...} } }` shell shows up nearly identically at every
// ChartCard config site across Messtool (Analyse alone had it 9 times) —
// only the datasets themselves (colors, fills, point-vs-label data) and
// the axis titles/scale tweaks actually differ. This pulls that shell out
// so each call site just supplies what's actually specific to it.
//
// xScale/yScale are shallow-merged onto `{ title: { display: true, text }
// }` — pass whatever Chart.js scale options that chart needs (type,
// ticks, min, max, ...) and they land exactly where they would have if
// written out by hand.
export function buildLineChartConfig({
  datasets,
  labels, // omit for {x,y} point datasets on a linear/logarithmic scale; set (even []) for category-scale/label-array charts
  parsing, // false for {x,y} point datasets — Chart.js would otherwise try to read .x/.y off plain numbers
  xTitle,
  xScale = {},
  yTitle,
  yScale = {},
  // Extra named scales beyond x/y — e.g. MtVergleich's optional right-hand
  // "y1" axis for signals that opted into a second axis. Merged in as-is
  // (no title/{} default applied), since which of these exist at all is
  // usually conditional.
  extraScales = {},
  plugins,
} = {}) {
  const options = {
    responsive: true,
    animation: false,
    scales: {
      x: { title: { display: true, text: xTitle }, ...xScale },
      y: { title: { display: true, text: yTitle }, ...yScale },
      ...extraScales,
    },
  };
  if (parsing === false) options.parsing = false;
  if (plugins) options.plugins = plugins;

  const data = { datasets };
  if (labels !== undefined) data.labels = labels;

  return { type: "line", data, options };
}

// The placeholder Chart.js config used by every one of those configs
// before there's a signal/window/data to actually plot yet.
export function emptyLineChartConfig(withLabels = true) {
  return withLabels
    ? { type: "line", data: { labels: [], datasets: [] } }
    : { type: "line", data: { datasets: [] } };
}

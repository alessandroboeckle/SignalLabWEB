// Chart.js renders to <canvas>, not SVG — there's no built-in way to get
// a vector export out of it. This builds a small, self-contained SVG line
// chart directly from the (already downsampled) data points instead, so
// "Als SVG speichern" gives a genuine, editable vector file rather than a
// canvas screenshot wrapped in an <svg> tag.

function niceTicks(min, max, count) {
  if (min === max) return [min];
  const span = max - min;
  const rough = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 1e-9; v += step) ticks.push(+v.toFixed(10));
  return ticks;
}

function escapeXml(str) {
  return String(str).replace(/[<>&"']/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  }[c]));
}

export function buildLineChartSvg({
  x,
  y,
  width = 900,
  height = 500,
  title = "",
  xLabel = "",
  yLabel = "",
  color = "#2563EB",
} = {}) {
  const margin = { top: 40, right: 24, bottom: 56, left: 64 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const validIdx = y.map((v, i) => (v != null && Number.isFinite(v) ? i : -1)).filter((i) => i !== -1);
  const xs = validIdx.map((i) => x[i]);
  const ys = validIdx.map((i) => y[i]);

  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;
  // small headroom so the line doesn't touch the plot edges
  const yPad = ySpan * 0.08;

  const px = (v) => margin.left + ((v - xMin) / xSpan) * plotW;
  const py = (v) => margin.top + plotH - ((v - (yMin - yPad)) / (ySpan + 2 * yPad)) * plotH;

  const points = xs.map((xv, i) => `${px(xv).toFixed(2)},${py(ys[i]).toFixed(2)}`).join(" ");

  const xTicks = niceTicks(xMin, xMax, 8);
  const yTicks = niceTicks(yMin - yPad, yMax + yPad, 6);

  const gridLines = [];
  const tickLabels = [];
  for (const t of xTicks) {
    const gx = px(t);
    gridLines.push(`<line x1="${gx}" y1="${margin.top}" x2="${gx}" y2="${margin.top + plotH}" stroke="#334155" stroke-width="0.5" opacity="0.3"/>`);
    tickLabels.push(`<text x="${gx}" y="${margin.top + plotH + 18}" font-size="11" fill="#334155" text-anchor="middle">${t}</text>`);
  }
  for (const t of yTicks) {
    const gy = py(t);
    gridLines.push(`<line x1="${margin.left}" y1="${gy}" x2="${margin.left + plotW}" y2="${gy}" stroke="#334155" stroke-width="0.5" opacity="0.3"/>`);
    tickLabels.push(`<text x="${margin.left - 8}" y="${gy + 4}" font-size="11" fill="#334155" text-anchor="end">${t}</text>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  <text x="${width / 2}" y="20" font-size="15" font-weight="bold" fill="#0f172a" text-anchor="middle">${escapeXml(title)}</text>
  ${gridLines.join("\n  ")}
  <rect x="${margin.left}" y="${margin.top}" width="${plotW}" height="${plotH}" fill="none" stroke="#334155" stroke-width="1"/>
  <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5"/>
  ${tickLabels.join("\n  ")}
  <text x="${margin.left + plotW / 2}" y="${height - 12}" font-size="12" fill="#334155" text-anchor="middle">${escapeXml(xLabel)}</text>
  <text x="16" y="${margin.top + plotH / 2}" font-size="12" fill="#334155" text-anchor="middle" transform="rotate(-90 16 ${margin.top + plotH / 2})">${escapeXml(yLabel)}</text>
</svg>`;
}

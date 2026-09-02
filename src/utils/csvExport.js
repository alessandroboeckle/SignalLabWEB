// Build and download a CSV of one or more signal columns sharing a time axis.
// Used by Verarbeitung and Filter to export processed data (not just PNG/PDF).

// columns: [{ name, unit, data }]  — data.length must match time.length
// decimalComma: false (default) keeps numbers dot-decimal, matching the
// original Stadler LOGDATA format's own convention (its parser reads
// values with parseFloat, which only understands "."). Set true for a
// German/Swiss-locale Excel-friendly export instead — plain double-click
// opens with columns recognized as numbers rather than text, at the cost
// of no longer matching the raw LOGDATA files byte-for-byte.
export function buildCsv(time, columns, { decimalComma = false } = {}) {
  const header = [
    "Zeit_s",
    ...columns.map((c) => (c.unit ? `${c.name}_[${c.unit}]` : c.name)),
  ].join(";");

  const fmt = decimalComma
    ? (v) => (v == null || !Number.isFinite(v) ? "" : String(v).replace(".", ","))
    : (v) => (v == null || !Number.isFinite(v) ? "" : v);

  const lines = new Array(time.length + 1);
  lines[0] = header;
  for (let i = 0; i < time.length; i++) {
    const row = [fmt(time[i])];
    for (const c of columns) {
      row.push(fmt(c.data[i]));
    }
    lines[i + 1] = row.join(";");
  }
  return lines.join("\n");
}

export function downloadCsv(csvText, filename) {
  const blob = new Blob(["\uFEFF" + csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

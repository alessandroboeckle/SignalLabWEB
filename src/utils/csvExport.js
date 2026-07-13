// Build and download a CSV of one or more signal columns sharing a time axis.
// Used by Verarbeitung and Filter to export processed data (not just PNG/PDF).

// columns: [{ name, unit, data }]  — data.length must match time.length
export function buildCsv(time, columns) {
  const header = [
    "Zeit_s",
    ...columns.map((c) => (c.unit ? `${c.name}_[${c.unit}]` : c.name)),
  ].join(";");

  const lines = new Array(time.length + 1);
  lines[0] = header;
  for (let i = 0; i < time.length; i++) {
    const row = [time[i]];
    for (const c of columns) {
      const v = c.data[i];
      row.push(v == null || !Number.isFinite(v) ? "" : v);
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

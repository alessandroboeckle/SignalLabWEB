// Exports all (or a chosen subset of) signals from a single file into one
// Excel workbook, sharing the file's own time axis as the first column —
// matches the original desktop tool's "MultiSignals_Export.xlsx". CSV
// export already covers the single-signal case; this is for "give me
// everything in one spreadsheet" instead.
//
// xlsx is dynamically imported inside each function (not statically at
// the top) so it isn't bundled into the app's main chunk for everyone —
// only fetched the moment someone actually uses this export.

// signals: [{ name, unit, data }], time: number[]
export async function buildMultiSignalWorkbook(time, signals) {
  const XLSX = await import("xlsx");
  const header = ["Zeit_s", ...signals.map((s) => (s.unit ? `${s.name}_[${s.unit}]` : s.name))];
  const rows = new Array(time.length + 1);
  rows[0] = header;
  for (let i = 0; i < time.length; i++) {
    const row = new Array(signals.length + 1);
    row[0] = time[i];
    for (let s = 0; s < signals.length; s++) {
      const v = signals[s].data[i];
      row[s + 1] = v == null || !Number.isFinite(v) ? "" : v;
    }
    rows[i + 1] = row;
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Signale");
  return workbook;
}

export async function downloadWorkbook(workbook, filename) {
  const XLSX = await import("xlsx");
  XLSX.writeFile(workbook, filename);
}

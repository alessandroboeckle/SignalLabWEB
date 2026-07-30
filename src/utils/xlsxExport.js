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

// Generator export: a single signal (not a whole measurement file) with
// its generation parameters — two sheets: "Signal" (Zeit_s/Amplitude, same
// shape as the CSV export) and "Info" (wave type, frequency, amplitude,
// phase, duration, sampling rate + the computed RMS/Peak/Peak-Peak stats)
// so the Excel file is self-documenting instead of just raw numbers.
export async function buildGeneratorSignalWorkbook(signal) {
  const XLSX = await import("xlsx");

  const t = signal.timeData || [];
  const y = signal.amplitudeData || [];
  const dataRows = [["Zeit_s", "Amplitude"]];
  for (let i = 0; i < t.length; i++) {
    dataRows.push([t[i], y[i]]);
  }
  const dataSheet = XLSX.utils.aoa_to_sheet(dataRows);

  const WAVE_LABELS = {
    sinus: "Sinus", rechteck: "Rechteck", dreieck: "Dreieck",
    saegezahn: "Sägezahn", rauschen: "Rauschen",
  };
  const meta = signal.meta || {};
  const infoRows = [
    ["Name", signal.name || ""],
    ["Kurvenform", WAVE_LABELS[signal.waveType] || signal.waveType || ""],
    ["Frequenz [Hz]", signal.frequency ?? ""],
    ["Amplitude", signal.amplitude ?? ""],
    ["Phase [deg]", signal.phase ?? ""],
    ["Dauer [s]", signal.duration ?? ""],
    ["Samplerate [Hz]", signal.samplingRate ?? ""],
    ["RMS", meta.rms ?? ""],
    ["Spitzenwert (Peak)", meta.peak ?? ""],
    ["Spitze-Spitze (Peak-Peak)", meta.peakToPeak ?? ""],
  ];
  const infoSheet = XLSX.utils.aoa_to_sheet(infoRows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, dataSheet, "Signal");
  XLSX.utils.book_append_sheet(workbook, infoSheet, "Info");
  return workbook;
}

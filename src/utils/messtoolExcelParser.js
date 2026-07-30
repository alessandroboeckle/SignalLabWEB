// Parser for Excel measurement files (.xlsx/.xls), e.g. a "DWS"-style
// export with either:
//   - a single header row: "Signalname [Einheit]" per column, or
//   - two header rows: row 1 = signal names, row 2 = units
// and a "Time" column holding either real Excel date/time cells or text
// timestamps like "07.03.2025 14:34:28.090".
//
// xlsx (SheetJS) is dynamically imported so it isn't bundled into the
// main chunk for everyone — only fetched the moment someone actually
// imports an Excel file (same lazy-load pattern as xlsxExport.js).

import { colRefToNumber } from "./messtoolParser.js";

export async function listExcelSheets(arrayBuffer) {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(arrayBuffer, { type: "array", bookSheets: true });
  return wb.SheetNames;
}

// "Signal [Einheit]" / "Signal (Einheit)" -> { name, unit }
function splitHeaderUnit(raw) {
  const text = String(raw ?? "").trim();
  let m = text.match(/^(.*?)\s*\[([^\]]{1,20})\]\s*$/);
  if (m) return { name: m[1].trim(), unit: m[2].trim() };
  m = text.match(/^(.*?)\s*\(([^)]{1,20})\)\s*$/);
  if (m) return { name: m[1].trim(), unit: m[2].trim() };
  return { name: text, unit: "" };
}

// Any timestamp cell -> seconds (arbitrary but consistent epoch; only
// differences between rows matter, same as the CSV parser's clockSec).
function cellToSeconds(val) {
  if (val == null || val === "") return null;
  if (val instanceof Date) return val.getTime() / 1000;
  if (typeof val === "number") {
    // Excel serial date (days since 1899-12-30, fractional part = time of day)
    const utcDays = Math.floor(val - 25569);
    const fractionalDay = val - Math.floor(val);
    return utcDays * 86400 + Math.round(fractionalDay * 86400 * 1000) / 1000;
  }
  if (typeof val === "string") {
    const s = val.trim().replace(",", ".");
    const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})[ T](\d{1,2}):(\d{1,2}):(\d{1,2})(?:\.(\d+))?$/);
    if (m) {
      const [, d, mo, y, h, mi, se, ms] = m;
      const msNum = ms ? Math.round(Number(`0.${ms}`) * 1000) : 0;
      return Date.UTC(+y, +mo - 1, +d, +h, +mi, +se, msNum) / 1000;
    }
    const parsed = Date.parse(s);
    return Number.isFinite(parsed) ? parsed / 1000 : null;
  }
  return null;
}

// Parse an already-loaded ArrayBuffer for one sheet into the same shape
// parseMesstoolCsv() returns: { signals, time, clockSec, meta }.
// options: startRow, endRow, startCol, endCol (same semantics as the CSV
// parser, applied over the signal columns i.e. excluding the Time column).
export async function parseMesstoolExcel(arrayBuffer, sheetName, options = {}) {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  const name = sheetName || wb.SheetNames[0];
  const sheet = wb.Sheets[name];
  if (!sheet) throw new Error(`Tabellenblatt "${name}" nicht gefunden.`);

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
  if (rows.length < 2) throw new Error("Zu wenige Zeilen im Tabellenblatt.");

  const row0 = (rows[0] || []).map((c) => (c == null ? "" : c));
  const row1 = rows[1] || [];
  // Two-row header if row1 looks like short unit strings (not numbers/dates)
  // and row2+ actually holds numeric/date data.
  const row1LooksLikeUnits =
    row1.length > 0 &&
    row1.every((c) => c == null || (typeof c === "string" && c.length <= 12));
  const row2 = rows[2] || [];
  const row2LooksLikeData = row2.some((c) => typeof c === "number" || c instanceof Date);

  let headerRowCount, names, units;
  if (row1LooksLikeUnits && row2LooksLikeData && rows.length > 2) {
    headerRowCount = 2;
    names = row0.map((c) => String(c));
    units = row1.map((c) => (c == null ? "" : String(c)));
  } else {
    headerRowCount = 1;
    const split = row0.map(splitHeaderUnit);
    names = split.map((s) => s.name);
    units = split.map((s) => s.unit);
  }

  const dataRows = rows.slice(headerRowCount);

  let timeColIdx = names.findIndex((n) => String(n).trim().toLowerCase() === "time");
  if (timeColIdx === -1) timeColIdx = 0; // fallback: first column is the time axis

  const startColNum = colRefToNumber(options.startCol);
  const endColNum = colRefToNumber(options.endCol);
  const startRow = options.startRow || null;
  const endRow = options.endRow || null;
  const sampleFrequenz =
    options.sampleFrequenz && options.sampleFrequenz > 0 ? options.sampleFrequenz : null;

  const allSignalIdxs = names.map((_, i) => i).filter((i) => i !== timeColIdx && names[i]);
  const colFrom = startColNum ? Math.max(1, startColNum) - 1 : 0;
  const colTo = endColNum ? Math.min(allSignalIdxs.length, endColNum) - 1 : allSignalIdxs.length - 1;
  const signalIdxs =
    colFrom > 0 || colTo < allSignalIdxs.length - 1
      ? allSignalIdxs.slice(colFrom, colTo + 1)
      : allSignalIdxs;

  const signalNames = signalIdxs.map((i) => names[i] || `Signal_${i}`);
  const signalUnits = signalIdxs.map((i) => units[i] || "");

  const time = [];
  const clockSec = [];
  const signalData = signalIdxs.map(() => []);

  let t0 = null;
  let rowCounter = 0;
  for (const row of dataRows) {
    if (!row || row.every((c) => c == null || c === "")) continue;
    rowCounter++;
    if (startRow && rowCounter < startRow) continue;
    if (endRow && rowCounter > endRow) break;

    const tSec = cellToSeconds(row[timeColIdx]);
    if (t0 === null && tSec !== null) t0 = tSec;
    time.push(tSec !== null ? +(tSec - t0).toFixed(3) : time.length);
    clockSec.push(tSec);

    signalIdxs.forEach((colIdx, s) => {
      const raw = row[colIdx];
      const v = typeof raw === "number" ? raw : parseFloat(raw);
      signalData[s].push(Number.isFinite(v) ? v : null);
    });
  }

  if (sampleFrequenz) {
    for (let i = 0; i < time.length; i++) time[i] = +(i / sampleFrequenz).toFixed(6);
  }

  const signals = signalNames.map((n, idx) => ({
    name: n,
    unit: signalUnits[idx] || "",
    type: "",
    isBoolean: false,
    data: signalData[idx],
  }));

  return {
    signals,
    time,
    clockSec,
    meta: {
      rowCount: time.length,
      signalCount: signals.length,
      duration: time.length ? time[time.length - 1] : 0,
      sampleRateInfo: null,
      qualityWarnings: null,
      source: "excel",
      sheetName: name,
    },
  };
}

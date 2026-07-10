// Parser for Stadler "LOGDATA" measurement CSV files.
//
// Structure of these files:
//   SECTION;COMMON ... header sections ...
//   SECTION;LOGITEMS
//   LOGITEM;<signalName>;;<type>;<description with [unit: X]>;...
//   SECTION;LOGDATA
//   Nb;Type;Date;Time;<signal1>;<signal2>;...      <- column header
//   169503;+;07.03.2025;14:34:28:090;0;29.2;...     <- data rows
//
// Files are semicolon-separated and ISO-8859-1 encoded. The first 4 data
// columns are Nb / Type / Date / Time; signals start at column 5.

// Extract a unit from a LOGITEM description, mirroring the Python logic.
function extractUnit(text) {
  // 1. [unit: X]
  let m = text.match(/\[unit\s*:\s*([^\]]+)\]/i);
  if (m) return m[1].trim();
  // 2. (unit) anywhere
  m = text.match(/\(([^)]{1,20})\)/);
  if (m && m[1].trim()) return m[1].trim();
  // 3. [unit] in brackets
  const all = [...text.matchAll(/\[([^\]]{1,20})\]/g)];
  for (const bm of all) {
    if (bm[1].trim()) return bm[1].trim();
  }
  return "";
}

// Convert a spreadsheet-style column reference to a 1-based index.
// Accepts plain numbers ("12") or letters ("A", "CC", ...).
export function colRefToNumber(ref) {
  if (ref === null || ref === undefined || ref === "") return null;
  const s = String(ref).trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  if (!/^[A-Za-z]+$/.test(s)) return null;
  let n = 0;
  const up = s.toUpperCase();
  for (let i = 0; i < up.length; i++) {
    n = n * 26 + (up.charCodeAt(i) - 64);
  }
  return n;
}

// Parse the raw text of a measurement CSV.
// options:
//   startRow, endRow   - 1-based range over the data rows to import (inclusive)
//   startCol, endCol   - 1-based range (or column-letter, e.g. "A"/"CC") over
//                        the signal columns (i.e. excluding Nb/Type/Date/Time)
//   sampleFrequenz     - if set, overrides the time axis with index/fs instead
//                        of the timestamps found in the file
// Returns { signals: [{name, unit, data:[numbers]}], time: [...], meta }.
export function parseMesstoolCsv(text, options = {}) {
  const delimiter = ";";
  const lines = text.split(/\r?\n/);

  const startRow = options.startRow || null;
  const endRow = options.endRow || null;
  const startColNum = colRefToNumber(options.startCol);
  const endColNum = colRefToNumber(options.endCol);
  const sampleFrequenz =
    options.sampleFrequenz && options.sampleFrequenz > 0
      ? options.sampleFrequenz
      : null;

  // --- units from LOGITEM lines ---
  const unitMap = {};
  for (const raw of lines) {
    const line = raw.replace(/^\s+/, "");
    if (!line.startsWith("LOGITEM")) continue;
    const parts = line.split(delimiter).map((p) => p.trim());
    if (parts.length < 2) continue;
    const signalName = parts[1];
    const desc = parts.slice(2).join(" ");
    const unit = extractUnit(desc);
    if (unit) unitMap[signalName] = unit;
  }

  // --- find the data header row (starts with "Nb") ---
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split(delimiter);
    if (cells[0].trim() === "Nb") {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    throw new Error("Keine Datenzeile gefunden (kein 'Nb'-Header).");
  }

  const headerCells = lines[headerIdx].split(delimiter).map((c) => c.trim());
  // meta columns: Nb, Type, Date, Time -> signals from index 4 on
  const META_COLS = 4;
  const allSignalNames = headerCells.slice(META_COLS).filter((n) => n.length > 0);

  // apply optional column range (1-based, inclusive) over the signal columns
  const colFrom = startColNum ? Math.max(1, startColNum) - 1 : 0;
  const colTo = endColNum
    ? Math.min(allSignalNames.length, endColNum) - 1
    : allSignalNames.length - 1;
  const signalNames =
    colFrom > 0 || colTo < allSignalNames.length - 1
      ? allSignalNames.slice(colFrom, colTo + 1)
      : allSignalNames;

  // prepare containers
  const time = [];
  const signalData = signalNames.map(() => []);

  let t0 = null;
  let rowCounter = 0;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cells = line.split(delimiter);
    if (cells.length < META_COLS + 1) continue;

    rowCounter++;
    if (startRow && rowCounter < startRow) continue;
    if (endRow && rowCounter > endRow) break;

    // Time column is index 3, format HH:MM:SS:mmm
    const tSec = parseTimeToSeconds(cells[3]);
    if (t0 === null && tSec !== null) t0 = tSec;
    time.push(tSec !== null ? +(tSec - t0).toFixed(3) : time.length);

    for (let s = 0; s < signalNames.length; s++) {
      const v = parseFloat(cells[META_COLS + colFrom + s]);
      signalData[s].push(Number.isFinite(v) ? v : null);
    }
  }

  // optional samplefrequency override: replace the timestamp-derived time
  // axis with a plain index/fs grid (e.g. when timestamps are unreliable)
  if (sampleFrequenz) {
    for (let i = 0; i < time.length; i++) {
      time[i] = +(i / sampleFrequenz).toFixed(6);
    }
  }

  const signals = signalNames.map((name, idx) => ({
    name,
    unit: unitMap[name] || "",
    data: signalData[idx],
  }));

  return {
    signals,
    time,
    meta: {
      rowCount: time.length,
      signalCount: signals.length,
      duration: time.length ? time[time.length - 1] : 0,
    },
  };
}

// "14:34:28:090" -> seconds since midnight (with millis)
function parseTimeToSeconds(str) {
  if (!str) return null;
  const p = str.trim().split(":");
  if (p.length < 3) return null;
  const h = parseInt(p[0], 10);
  const m = parseInt(p[1], 10);
  const s = parseInt(p[2], 10);
  const ms = p.length >= 4 ? parseInt(p[3], 10) : 0;
  if ([h, m, s].some((n) => Number.isNaN(n))) return null;
  return h * 3600 + m * 60 + s + (Number.isNaN(ms) ? 0 : ms / 1000);
}

// Decode an ArrayBuffer as ISO-8859-1 (latin1), which these files use.
export function decodeLatin1(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let out = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return out;
}

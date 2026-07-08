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

// Parse the raw text of a measurement CSV.
// Returns { signals: [{name, unit, data:[numbers]}], time: [...], meta }.
export function parseMesstoolCsv(text) {
  const delimiter = ";";
  const lines = text.split(/\r?\n/);

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
  const signalNames = headerCells.slice(META_COLS).filter((n) => n.length > 0);

  // prepare containers
  const time = [];
  const signalData = signalNames.map(() => []);

  let t0 = null;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cells = line.split(delimiter);
    if (cells.length < META_COLS + 1) continue;

    // Time column is index 3, format HH:MM:SS:mmm
    const tSec = parseTimeToSeconds(cells[3]);
    if (t0 === null && tSec !== null) t0 = tSec;
    time.push(tSec !== null ? +(tSec - t0).toFixed(3) : time.length);

    for (let s = 0; s < signalNames.length; s++) {
      const v = parseFloat(cells[META_COLS + s]);
      signalData[s].push(Number.isFinite(v) ? v : null);
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

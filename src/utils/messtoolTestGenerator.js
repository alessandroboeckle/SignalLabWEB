// Generates large, realistic Stadler LOGDATA test CSVs matching the
// Brake_Resisitor_Powermeasure template (see brakeFileTemplate.js): same
// header/LOGITEM structure as a real file, with per-signal value generation
// that mimics how each channel actually behaved (drifting temperatures,
// noisy DC-link voltages, energy counters that barely move, bogies that
// are wired up vs. always-zero, a speed profile with accel/cruise/brake
// cycles, etc.) so the output is realistic enough to test import/filter/
// analysis/processing against.

import { BRAKE_LOGRESOURCE_NAME, BRAKE_LOGITEM_LINES, BRAKE_SIGNALS } from "./brakeFileTemplate.js";

function gaussian(rng) {
  // Box-Muller
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Small deterministic PRNG (mulberry32) so a given seed always reproduces
// the same file — handy for re-running the same "random" test case.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Build a speed profile (km/h) across `rows` samples at `fs` Hz, as a
// sequence of accelerate -> cruise -> brake -> idle cycles.
function buildSpeedProfile(rows, fs, rng, cycles) {
  const speed = new Array(rows).fill(0);
  const segLen = Math.floor(rows / cycles);
  let activationIdx = rows; // stays at "rows" (never activates) if no cycle fits

  for (let c = 0; c < cycles; c++) {
    const segStart = c * segLen;
    const segEnd = c === cycles - 1 ? rows : segStart + segLen;
    const segRows = segEnd - segStart;
    if (segRows < 8) continue;

    const vmax = 35 + rng() * 35; // 35..70 km/h, roughly matching the sample's ~50-60
    const idleFrac = 0.08;
    const accelFrac = 0.25;
    const brakeFrac = 0.25;
    const idleRows = Math.floor(segRows * idleFrac);
    const accelRows = Math.floor(segRows * accelFrac);
    const brakeRows = Math.floor(segRows * brakeFrac);
    const cruiseRows = segRows - idleRows - accelRows - brakeRows;

    if (activationIdx === rows) activationIdx = segStart + idleRows;

    let idx = segStart;
    for (let i = 0; i < idleRows; i++) speed[idx++] = 0;
    for (let i = 0; i < accelRows; i++) speed[idx++] = vmax * (i / accelRows);
    for (let i = 0; i < cruiseRows; i++) speed[idx++] = vmax;
    for (let i = 0; i < brakeRows; i++) speed[idx++] = vmax * (1 - i / brakeRows);
    while (idx < segEnd) speed[idx++] = 0;
  }
  return { speed, activationIdx };
}

// One AR(1)-smoothed noisy value generator: reverts toward `base` with
// small gaussian steps, so it looks like a slowly wandering sensor reading
// rather than pure white noise (matches how the real voltages/aux-power
// channels behave).
function makeSmoothSeries(rows, rng, { base, step = 0.4, revert = 0.08, min = null, max = null }) {
  const out = new Array(rows);
  let v = base;
  for (let i = 0; i < rows; i++) {
    v += (base - v) * revert + gaussian(rng) * step;
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    out[i] = v;
  }
  return out;
}

// Generate the full CSV text (header sections + LOGDATA rows) for `rows`
// samples at `fs` Hz. Returns a plain JS string (caller encodes to
// ISO-8859-1 bytes for download, matching real exported files).
export function generateBrakeTestCsv({
  rows = 10000,
  fs = 8,
  cycles = null,
  seed = null,
  startDate = new Date(),
} = {}) {
  rows = Math.max(2, Math.floor(rows));
  fs = fs > 0 ? fs : 8;
  const rng = mulberry32(seed ?? Math.floor(Math.random() * 2 ** 31));
  const numCycles = cycles ?? Math.max(1, Math.round(rows / 4000));

  const { speed: speedKmh, activationIdx } = buildSpeedProfile(rows, fs, rng, numCycles);

  // acceleration (finite difference of speed), scaled down to roughly match
  // the tiny magnitudes seen in the real file (unit there is unclear, but
  // values sit in the 0..0.3 range)
  const accel = new Array(rows);
  for (let i = 0; i < rows; i++) {
    const prev = i > 0 ? speedKmh[i - 1] : speedKmh[0];
    accel[i] = ((speedKmh[i] - prev) / (1 / fs)) * 0.003 + gaussian(rng) * 0.01;
  }

  const dcVoltageA = makeSmoothSeries(rows, rng, { base: 803, step: 0.5, revert: 0.1 });
  const dcVoltageAL = makeSmoothSeries(rows, rng, { base: 801, step: 0.5, revert: 0.1 });
  const dcVoltageC = makeSmoothSeries(rows, rng, { base: 802, step: 0.5, revert: 0.1 });
  const dcVoltageCL = makeSmoothSeries(rows, rng, { base: 798, step: 0.5, revert: 0.1 });
  const dcVoltageD = makeSmoothSeries(rows, rng, { base: 803, step: 0.5, revert: 0.1 });
  const dcVoltageDL = makeSmoothSeries(rows, rng, { base: 805, step: 0.5, revert: 0.1 });

  const auxSeries = {}; // cache per-signal random walks keyed by signal name

  // when each energy counter should bump by +1 (once, partway through)
  const counterBumpIdx = {};

  function valueFor(def, i) {
    switch (def.profile) {
      case "zero":
        return 0;

      case "tempDrift": {
        const t = i / (rows - 1 || 1);
        const v = def.base + (def.driftTo - def.base) * t + gaussian(rng) * 0.15;
        return Math.fround(v);
      }

      case "voltage": {
        const map = {
          "IITCU_A.rUD": dcVoltageA, "IITCU_A.rUL": dcVoltageAL,
          "IITCU_C.rUD": dcVoltageC, "IITCU_C.rUL": dcVoltageCL,
          "IITCU_D.rUD": dcVoltageD, "IITCU_D.rUL": dcVoltageDL,
        };
        return Math.fround(map[def.name][i]);
      }

      case "randomWalk": {
        if (!auxSeries[def.name]) {
          auxSeries[def.name] = makeSmoothSeries(rows, rng, {
            base: def.base, step: 2.5, revert: 0.05, min: def.min, max: def.max,
          });
        }
        return Math.fround(auxSeries[def.name][i]);
      }

      case "brakePower": {
        // In the source file this stayed at (almost) 0 throughout — model
        // the same, with a rare tiny blip so it isn't a completely dead
        // column in the test file either.
        return rng() < 0.0005 ? Math.fround(rng() * 2) : 0;
      }

      case "counter": {
        if (counterBumpIdx[def.name] === undefined) {
          counterBumpIdx[def.name] = Math.floor(rows * (0.5 + rng() * 0.45));
        }
        return def.base + (i >= counterBumpIdx[def.name] ? 1 : 0);
      }

      case "effort": {
        if (i < activationIdx) return 0;
        return Math.fround(-accel[i] * 25 + gaussian(rng) * 1.2);
      }

      case "speedKmh":
        return Math.fround(speedKmh[i] + gaussian(rng) * 0.2);

      case "speedMph":
        return Math.fround(speedKmh[i] * 0.621371 + gaussian(rng) * 0.15);

      case "accel":
        return Math.fround(Math.abs(accel[i]) + Math.abs(gaussian(rng) * 0.005));

      case "speedSentinel":
        if (i < activationIdx) return "3.27E-38";
        return Math.fround(speedKmh[i] + gaussian(rng) * 0.2);

      case "boolTrue":
        return "TRUE";

      default:
        return 0;
    }
  }

  // --- assemble header ---
  const guid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (rng() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  const pad = (n, w) => String(n).padStart(w, "0");
  const dateStr = `${pad(startDate.getDate(), 2)}.${pad(startDate.getMonth() + 1, 2)}.${startDate.getFullYear()}`;

  const lines = [];
  lines.push("SECTION;COMMON");
  lines.push(`DATE;${dateStr}`);
  lines.push(`TIME;${pad(startDate.getHours(), 2)}:${pad(startDate.getMinutes(), 2)}:${pad(startDate.getSeconds(), 2)}`);
  lines.push(`COMMENT;guid=${guid}`);
  lines.push("");
  lines.push("SECTION;LOGRESOURCE");
  lines.push("PARENT_NODE;NO_NODETYPE");
  lines.push(`LOGRESOURCE_NAME;${BRAKE_LOGRESOURCE_NAME}`);
  lines.push("");
  lines.push("SECTION;LOGITEMS");
  for (const l of BRAKE_LOGITEM_LINES) lines.push(l);
  lines.push("");
  lines.push("SECTION;LOGDATA");
  lines.push(["Nb", "Type", "Date", "Time", ...BRAKE_SIGNALS.map((s) => s.name)].join(";"));

  // --- assemble data rows ---
  const nbBase = 100000 + Math.floor(rng() * 500000);
  const msPerSample = 1000 / fs;
  let curMs = startDate.getHours() * 3600000 + startDate.getMinutes() * 60000 +
    startDate.getSeconds() * 1000 + startDate.getMilliseconds();

  for (let i = 0; i < rows; i++) {
    const totalMs = Math.round(curMs + i * msPerSample);
    const h = Math.floor(totalMs / 3600000) % 24;
    const m = Math.floor(totalMs / 60000) % 60;
    const s = Math.floor(totalMs / 1000) % 60;
    const ms = totalMs % 1000;
    const timeStr = `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}:${pad(ms, 3)}`;

    const row = [nbBase + i, "+", dateStr, timeStr];
    for (const def of BRAKE_SIGNALS) row.push(valueFor(def, i));
    lines.push(row.join(";"));
  }

  return lines.join("\r\n");
}

// Encode a JS string as ISO-8859-1 (latin1) bytes, matching the encoding
// real Stadler LOGDATA exports use (so the generated file round-trips
// through the app's decodeLatin1 exactly like a real one).
export function encodeLatin1(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    bytes[i] = code <= 0xff ? code : 0x3f; // '?' fallback, shouldn't happen here
  }
  return bytes;
}

export function downloadBrakeTestCsv(text, filename) {
  const bytes = encodeLatin1(text);
  const blob = new Blob([bytes], { type: "text/csv;charset=iso-8859-1;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

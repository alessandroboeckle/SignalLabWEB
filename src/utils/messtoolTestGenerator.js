// Generates large, realistic Stadler LOGDATA test CSVs matching the
// drivetrain/braking template (see brakeFileTemplate.js): same header/
// LOGITEM structure as a real file, with per-signal value generation that
// mimics how each channel actually behaves (drifting temperatures, noisy
// DC-link voltages, energy counters that barely move, bogies that are
// wired up vs. always-zero, a speed profile with accel/cruise/brake
// cycles, etc.) so the output is realistic enough to test import/filter/
// analysis/processing against.
//
// Built object-oriented, mirroring messtoolProcessing.js: every value
// profile is a small class extending SignalGenerator, registered in
// GENERATOR_REGISTRY so BrakeTestFileGenerator can stay generic and just
// look each one up by name — adding a new profile means adding a new
// class, nothing else changes.

import { BRAKE_LOGRESOURCE_NAME, BRAKE_LOGITEM_LINES, BRAKE_SIGNALS } from "./brakeFileTemplate.js";

// --- small deterministic RNG + gaussian sampling -------------------------

// mulberry32: tiny, fast, seedable PRNG so a given seed always reproduces
// the same file (handy for re-running the same "random" test case).
class Rng {
  constructor(seed) {
    this.state = (seed ?? Math.floor(Math.random() * 2 ** 31)) >>> 0;
  }
  next() {
    let a = (this.state |= 0);
    a = (a + 0x6d2b79f5) | 0;
    this.state = a;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  // Box-Muller
  gaussian() {
    let u = 0, v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

// --- speed profile (shared context all "moving vehicle" signals derive from) ---

// Builds a speed curve (km/h) across `rows` samples as a sequence of
// accelerate -> cruise -> brake -> idle cycles, and remembers the index
// where the vehicle first starts moving ("activation").
class SpeedProfile {
  constructor(rows, rng, cycles) {
    this.rows = rows;
    this.rng = rng;
    this.cycles = cycles;
    this.speed = new Array(rows).fill(0);
    this.activationIdx = rows; // "never activates" unless a cycle fits
    this._build();
  }

  _build() {
    const segLen = Math.floor(this.rows / this.cycles);
    for (let c = 0; c < this.cycles; c++) {
      const segStart = c * segLen;
      const segEnd = c === this.cycles - 1 ? this.rows : segStart + segLen;
      this._buildSegment(segStart, segEnd);
    }
  }

  _buildSegment(segStart, segEnd) {
    const segRows = segEnd - segStart;
    if (segRows < 8) return;

    const vmax = 35 + this.rng.next() * 35; // 35..70 km/h
    const idleRows = Math.floor(segRows * 0.08);
    const accelRows = Math.floor(segRows * 0.25);
    const brakeRows = Math.floor(segRows * 0.25);
    const cruiseRows = segRows - idleRows - accelRows - brakeRows;

    if (this.activationIdx === this.rows) this.activationIdx = segStart + idleRows;

    let idx = segStart;
    for (let i = 0; i < idleRows; i++) this.speed[idx++] = 0;
    for (let i = 0; i < accelRows; i++) this.speed[idx++] = vmax * (i / accelRows);
    for (let i = 0; i < cruiseRows; i++) this.speed[idx++] = vmax;
    for (let i = 0; i < brakeRows; i++) this.speed[idx++] = vmax * (1 - i / brakeRows);
    while (idx < segEnd) this.speed[idx++] = 0;
  }

  at(i) {
    return this.speed[i];
  }
}

// Finite-difference acceleration derived from a SpeedProfile, scaled down
// to roughly match the tiny magnitudes real telemetry shows for this kind
// of channel, plus a little sensor noise.
class AccelProfile {
  constructor(speedProfile, fs, rng) {
    const { rows } = speedProfile;
    this.values = new Array(rows);
    for (let i = 0; i < rows; i++) {
      const prev = i > 0 ? speedProfile.at(i - 1) : speedProfile.at(0);
      const raw = ((speedProfile.at(i) - prev) / (1 / fs)) * 0.003;
      this.values[i] = raw + rng.gaussian() * 0.01;
    }
  }
  at(i) {
    return this.values[i];
  }
}

// An AR(1)-smoothed noisy series: reverts toward `base` with small
// gaussian steps, so it looks like a slowly wandering sensor reading
// rather than pure white noise (matches how real voltage/aux-power
// channels behave).
class SmoothSeries {
  constructor(rows, rng, { base, step = 0.4, revert = 0.08, min = null, max = null }) {
    this.values = new Array(rows);
    let v = base;
    for (let i = 0; i < rows; i++) {
      v += (base - v) * revert + rng.gaussian() * step;
      if (min != null) v = Math.max(min, v);
      if (max != null) v = Math.min(max, v);
      this.values[i] = v;
    }
  }
  at(i) {
    return this.values[i];
  }
}

// --- signal generators -----------------------------------------------------
//
// Every generator extends SignalGenerator and implements valueAt(i, ctx).
// `prepare(ctx)` runs once up front for generators that need to precompute
// a full series (e.g. a SmoothSeries or a counter bump index).

class SignalGenerator {
  constructor(def) {
    this.def = def;
  }
  // Override for generators that need one-time setup using shared context
  // (rows, rng, fs, speedProfile, accelProfile, activationIdx).
  prepare(_ctx) {}
  // Override: return the value for row i.
  valueAt(_i, _ctx) {
    return 0;
  }
}

class ZeroGenerator extends SignalGenerator {
  valueAt() {
    return 0;
  }
}

// Slow linear drift from `base` to `driftTo` over the whole file, plus
// small sensor noise (e.g. resistor temperature warming up over a trip).
class TempDriftGenerator extends SignalGenerator {
  prepare(ctx) {
    this.rows = ctx.rows;
    this.rng = ctx.rng;
  }
  valueAt(i) {
    const t = i / (this.rows - 1 || 1);
    const v = this.def.base + (this.def.driftTo - this.def.base) * t + this.rng.gaussian() * 0.15;
    return Math.fround(v);
  }
}

// Smoothly wandering value around a fixed baseline (e.g. DC-link voltage).
class VoltageGenerator extends SignalGenerator {
  prepare(ctx) {
    this.series = new SmoothSeries(ctx.rows, ctx.rng, { base: this.def.base, step: 0.5, revert: 0.1 });
  }
  valueAt(i) {
    return Math.fround(this.series.at(i));
  }
}

// Same idea as VoltageGenerator but with a wider, bounded random walk
// (e.g. auxiliary inverter power draw).
class RandomWalkGenerator extends SignalGenerator {
  prepare(ctx) {
    this.series = new SmoothSeries(ctx.rows, ctx.rng, {
      base: this.def.base, step: 2.5, revert: 0.05, min: this.def.min, max: this.def.max,
    });
  }
  valueAt(i) {
    return Math.fround(this.series.at(i));
  }
}

// Brake-resistor power: stays at (almost) zero, with a rare tiny blip —
// mirrors a resistor that's rarely engaged during normal running.
class BrakePowerGenerator extends SignalGenerator {
  prepare(ctx) {
    this.rng = ctx.rng;
  }
  valueAt() {
    return this.rng.next() < 0.0005 ? Math.fround(this.rng.next() * 2) : 0;
  }
}

// Slow-moving integer counter (e.g. an energy accumulator, in kWh) that
// bumps by exactly +1 once, at a random point past the file's midpoint.
class CounterGenerator extends SignalGenerator {
  prepare(ctx) {
    this.bumpIdx = Math.floor(ctx.rows * (0.5 + ctx.rng.next() * 0.45));
  }
  valueAt(i) {
    return this.def.base + (i >= this.bumpIdx ? 1 : 0);
  }
}

// Traction-effort style channel: silent until the vehicle "activates",
// then tracks (negative) acceleration with noise — i.e. mostly nonzero
// during braking.
class EffortGenerator extends SignalGenerator {
  prepare(ctx) {
    this.rng = ctx.rng;
    this.accelProfile = ctx.accelProfile;
    this.activationIdx = ctx.activationIdx;
  }
  valueAt(i) {
    if (i < this.activationIdx) return 0;
    return Math.fround(-this.accelProfile.at(i) * 25 + this.rng.gaussian() * 1.2);
  }
}

class SpeedKmhGenerator extends SignalGenerator {
  prepare(ctx) {
    this.rng = ctx.rng;
    this.speedProfile = ctx.speedProfile;
  }
  valueAt(i) {
    return Math.fround(this.speedProfile.at(i) + this.rng.gaussian() * 0.2);
  }
}

class SpeedMphGenerator extends SignalGenerator {
  prepare(ctx) {
    this.rng = ctx.rng;
    this.speedProfile = ctx.speedProfile;
  }
  valueAt(i) {
    return Math.fround(this.speedProfile.at(i) * 0.621371 + this.rng.gaussian() * 0.15);
  }
}

class AccelGenerator extends SignalGenerator {
  prepare(ctx) {
    this.rng = ctx.rng;
    this.accelProfile = ctx.accelProfile;
  }
  valueAt(i) {
    return Math.fround(Math.abs(this.accelProfile.at(i)) + Math.abs(this.rng.gaussian() * 0.005));
  }
}

// Reports a float-underflow sentinel value before the reference speed
// system "activates", then real speed data afterwards — a realistic
// edge case for testing a parser's handling of invalid/uninitialized
// telemetry values.
class SpeedSentinelGenerator extends SignalGenerator {
  static SENTINEL = "3.27E-38";

  prepare(ctx) {
    this.rng = ctx.rng;
    this.speedProfile = ctx.speedProfile;
    this.activationIdx = ctx.activationIdx;
  }
  valueAt(i) {
    if (i < this.activationIdx) return SpeedSentinelGenerator.SENTINEL;
    return Math.fround(this.speedProfile.at(i) + this.rng.gaussian() * 0.2);
  }
}

class BoolConstantGenerator extends SignalGenerator {
  constructor(def, value = "TRUE") {
    super(def);
    this.value = value;
  }
  valueAt() {
    return this.value;
  }
}

// Registry so BrakeTestFileGenerator can look up the right class for each
// signal's `profile` name generically, the same pattern as OP_REGISTRY in
// messtoolProcessing.js.
const GENERATOR_REGISTRY = {
  zero: (def) => new ZeroGenerator(def),
  tempDrift: (def) => new TempDriftGenerator(def),
  voltage: (def) => new VoltageGenerator(def),
  randomWalk: (def) => new RandomWalkGenerator(def),
  brakePower: (def) => new BrakePowerGenerator(def),
  counter: (def) => new CounterGenerator(def),
  effort: (def) => new EffortGenerator(def),
  speedKmh: (def) => new SpeedKmhGenerator(def),
  speedMph: (def) => new SpeedMphGenerator(def),
  accel: (def) => new AccelGenerator(def),
  speedSentinel: (def) => new SpeedSentinelGenerator(def),
  boolTrue: (def) => new BoolConstantGenerator(def, "TRUE"),
};

// --- header assembly ---------------------------------------------------

// Builds the SECTION/LOGITEM header block shared by every generated file.
class LogDataHeaderBuilder {
  constructor({ startDate, rng }) {
    this.startDate = startDate;
    this.rng = rng;
  }

  _pad(n, w) {
    return String(n).padStart(w, "0");
  }

  _guid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (this.rng.next() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  dateStr() {
    const d = this.startDate;
    return `${this._pad(d.getDate(), 2)}.${this._pad(d.getMonth() + 1, 2)}.${d.getFullYear()}`;
  }

  build(signalNames) {
    const d = this.startDate;
    const lines = [];
    lines.push("SECTION;COMMON");
    lines.push(`DATE;${this.dateStr()}`);
    lines.push(`TIME;${this._pad(d.getHours(), 2)}:${this._pad(d.getMinutes(), 2)}:${this._pad(d.getSeconds(), 2)}`);
    lines.push(`COMMENT;guid=${this._guid()}`);
    lines.push("");
    lines.push("SECTION;LOGRESOURCE");
    lines.push("PARENT_NODE;NO_NODETYPE");
    lines.push(`LOGRESOURCE_NAME;${BRAKE_LOGRESOURCE_NAME}`);
    lines.push("");
    lines.push("SECTION;LOGITEMS");
    for (const l of BRAKE_LOGITEM_LINES) lines.push(l);
    lines.push("");
    lines.push("SECTION;LOGDATA");
    lines.push(["Nb", "Type", "Date", "Time", ...signalNames].join(";"));
    return lines;
  }
}

// --- top-level orchestrator ---------------------------------------------

// Builds one full LOGDATA CSV (header + data rows) for `rows` samples at
// `fs` Hz, driven by BRAKE_SIGNALS + GENERATOR_REGISTRY. This is the class
// that ties everything above together; generateBrakeTestCsv() below is
// just a thin functional wrapper around it for callers that don't need
// the class directly.
export class BrakeTestFileGenerator {
  constructor({ rows = 10000, fs = 8, cycles = null, seed = null, startDate = new Date() } = {}) {
    this.rows = Math.max(2, Math.floor(rows));
    this.fs = fs > 0 ? fs : 8;
    this.cycles = cycles ?? Math.max(1, Math.round(this.rows / 4000));
    this.rng = new Rng(seed);
    this.startDate = startDate;
  }

  _buildContext() {
    const speedProfile = new SpeedProfile(this.rows, this.rng, this.cycles);
    const accelProfile = new AccelProfile(speedProfile, this.fs, this.rng);
    return {
      rows: this.rows,
      fs: this.fs,
      rng: this.rng,
      speedProfile,
      accelProfile,
      activationIdx: speedProfile.activationIdx,
    };
  }

  _instantiateGenerators(ctx) {
    return BRAKE_SIGNALS.map((def) => {
      const factory = GENERATOR_REGISTRY[def.profile];
      if (!factory) throw new Error(`Unbekanntes Generator-Profil: ${def.profile}`);
      const gen = factory(def);
      gen.prepare(ctx);
      return gen;
    });
  }

  generate() {
    const ctx = this._buildContext();
    const generators = this._instantiateGenerators(ctx);

    const header = new LogDataHeaderBuilder({ startDate: this.startDate, rng: this.rng });
    const lines = header.build(BRAKE_SIGNALS.map((s) => s.name));

    const nbBase = 100000 + Math.floor(this.rng.next() * 500000);
    const msPerSample = 1000 / this.fs;
    const dateStr = header.dateStr();
    const d = this.startDate;
    const startMs = d.getHours() * 3600000 + d.getMinutes() * 60000 + d.getSeconds() * 1000 + d.getMilliseconds();

    for (let i = 0; i < this.rows; i++) {
      const totalMs = Math.round(startMs + i * msPerSample);
      const h = Math.floor(totalMs / 3600000) % 24;
      const m = Math.floor(totalMs / 60000) % 60;
      const s = Math.floor(totalMs / 1000) % 60;
      const ms = totalMs % 1000;
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(ms).padStart(3, "0")}`;

      const row = [nbBase + i, "+", dateStr, timeStr];
      for (const gen of generators) row.push(gen.valueAt(i, ctx));
      lines.push(row.join(";"));
    }

    return lines.join("\r\n");
  }
}

// Thin functional wrapper for callers that just want the CSV text.
export function generateBrakeTestCsv(options) {
  return new BrakeTestFileGenerator(options).generate();
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

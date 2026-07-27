// Wraps a single signal from the Generator tool into the same LOGDATA
// header/row structure the Messtool's own test-file generator produces
// (see messtoolTestGenerator.js) — same SECTION/LOGITEM layout, same
// Date/Time column format — so a generated waveform can be exported and
// re-imported straight into the Messtool (Import → Filter → Analyse →
// ...) instead of only staying inside the Generator tool.

function pad(n, w = 2) {
  return String(n).padStart(w, "0");
}

function dateStr(d) {
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function randomGuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// A signal name safe to use as a LOGITEM identifier — LOGDATA channel
// names are effectively bare identifiers (dots/underscores only), not
// free text.
function safeSignalName(name) {
  const cleaned = (name || "").trim().replace(/[^A-Za-z0-9_.]/g, "_");
  return cleaned || "GeneratedSignal";
}

// Same idea as buildLogDataFromSignal, but for a whole Session's worth of
// signals at once — multiple channels sharing one file, matching how a
// real LOGDATA file has several columns. Signals are aligned by row
// position against whichever one has the most samples; a shorter signal
// just runs out and leaves blank cells for the rest (same as how the
// Messtool parser already treats missing values elsewhere). Channel name
// collisions get a numeric suffix so every column stays addressable.
export function buildLogDataFromSignals({ signals, startDate = new Date() } = {}) {
  if (!Array.isArray(signals) || signals.length === 0) {
    throw new Error("Keine Signale zum Exportieren vorhanden.");
  }
  const usable = signals.filter((s) => Array.isArray(s.data) && s.data.length > 0);
  if (usable.length === 0) {
    throw new Error("Keines der Signale in dieser Session hat Daten.");
  }

  const seenNames = new Set();
  const channels = usable.map((s) => {
    let base = safeSignalName(s.name);
    let candidate = base;
    let n = 2;
    while (seenNames.has(candidate)) {
      candidate = `${base}_${n}`;
      n++;
    }
    seenNames.add(candidate);
    return { ...s, channel: candidate };
  });

  const rowCount = Math.max(...channels.map((c) => c.data.length));
  const reference = channels.find((c) => c.data.length === rowCount);
  const samplingRate = reference.samplingRate;
  if (!(samplingRate > 0)) {
    throw new Error("Ungültige Abtastrate.");
  }

  const d = startDate;
  const dStr = dateStr(d);

  const lines = [];
  lines.push("SECTION;COMMON");
  lines.push(`DATE;${dStr}`);
  lines.push(`TIME;${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
  lines.push(`COMMENT;guid=${randomGuid()}`);
  lines.push("");
  lines.push("SECTION;LOGRESOURCE");
  lines.push("PARENT_NODE;NO_NODETYPE");
  lines.push("LOGRESOURCE_NAME;SignalLab_Generator_Session");
  lines.push("");
  lines.push("SECTION;LOGITEMS");
  for (const c of channels) {
    lines.push(
      `LOGITEM;${c.channel};;REAL;[] Generator-erzeugtes Signal${c.unit ? ` [unit: ${c.unit}]` : ""};;CHECKED;-1`,
    );
  }
  lines.push("");
  lines.push("SECTION;LOGDATA");
  lines.push(["Nb", "Type", "Date", "Time", ...channels.map((c) => c.channel)].join(";"));

  const nbBase = 100000 + Math.floor(Math.random() * 500000);
  const msPerSample = 1000 / samplingRate;
  const startMs = d.getHours() * 3600000 + d.getMinutes() * 60000 + d.getSeconds() * 1000 + d.getMilliseconds();

  for (let i = 0; i < rowCount; i++) {
    const totalMs = Math.round(startMs + i * msPerSample);
    const h = Math.floor(totalMs / 3600000) % 24;
    const m = Math.floor(totalMs / 60000) % 60;
    const s = Math.floor(totalMs / 1000) % 60;
    const ms = totalMs % 1000;
    const timeStr = `${pad(h)}:${pad(m)}:${pad(s)}:${pad(ms, 3)}`;
    const values = channels.map((c) => {
      const v = c.data[i];
      return Number.isFinite(v) ? v.toFixed(6) : "";
    });
    lines.push([nbBase + i, "+", dStr, timeStr, ...values].join(";"));
  }

  return lines.join("\r\n");
}
export function buildLogDataFromSignal({
  name = "GeneratedSignal",
  unit = "",
  data,
  samplingRate,
  startDate = new Date(),
} = {}) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Kein Signal zum Exportieren vorhanden.");
  }
  if (!(samplingRate > 0)) {
    throw new Error("Ungültige Abtastrate.");
  }

  const channel = safeSignalName(name);
  const d = startDate;
  const dStr = dateStr(d);

  const lines = [];
  lines.push("SECTION;COMMON");
  lines.push(`DATE;${dStr}`);
  lines.push(`TIME;${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
  lines.push(`COMMENT;guid=${randomGuid()}`);
  lines.push("");
  lines.push("SECTION;LOGRESOURCE");
  lines.push("PARENT_NODE;NO_NODETYPE");
  lines.push("LOGRESOURCE_NAME;SignalLab_Generator");
  lines.push("");
  lines.push("SECTION;LOGITEMS");
  lines.push(
    `LOGITEM;${channel};;REAL;[] Generator-erzeugtes Signal${unit ? ` [unit: ${unit}]` : ""};;CHECKED;-1`,
  );
  lines.push("");
  lines.push("SECTION;LOGDATA");
  lines.push(["Nb", "Type", "Date", "Time", channel].join(";"));

  const nbBase = 100000 + Math.floor(Math.random() * 500000);
  const msPerSample = 1000 / samplingRate;
  const startMs = d.getHours() * 3600000 + d.getMinutes() * 60000 + d.getSeconds() * 1000 + d.getMilliseconds();

  for (let i = 0; i < data.length; i++) {
    const totalMs = Math.round(startMs + i * msPerSample);
    const h = Math.floor(totalMs / 3600000) % 24;
    const m = Math.floor(totalMs / 60000) % 60;
    const s = Math.floor(totalMs / 1000) % 60;
    const ms = totalMs % 1000;
    const timeStr = `${pad(h)}:${pad(m)}:${pad(s)}:${pad(ms, 3)}`;
    const v = data[i];
    const valueStr = Number.isFinite(v) ? v.toFixed(6) : "";
    lines.push([nbBase + i, "+", dStr, timeStr, valueStr].join(";"));
  }

  return lines.join("\r\n");
}

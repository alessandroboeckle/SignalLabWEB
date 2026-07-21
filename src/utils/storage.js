// Supabase-backed storage with a synchronous in-memory cache.
//
// Reads are synchronous (from the cache) so existing computed properties in the
// views keep working. Writes are async: they update Supabase AND the cache.
// Call `init()` once after the user is approved to fill the cache.

import { supabase } from "../lib/supabase";

let _sessions = []; // app-shaped sessions
let _signals = []; // app-shaped signals (flat list, with sessionId)
let _ready = false;

// ---- mapping between DB (snake_case) and app (camelCase) ----

function sessionFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes || "",
    created: row.created_at || new Date().toISOString(),
    signals: [],
  };
}

function signalFromDb(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    waveType: row.wave_type,
    frequency: row.frequency,
    amplitude: row.amplitude,
    phase: row.phase,
    duration: row.duration,
    samplingRate: row.sampling_rate,
    timeData: row.time_data || [],
    amplitudeData: row.amplitude_data || [],
    meta: row.meta || {},
    savedAt: row.created_at,
  };
}

function signalToDb(signal, userId) {
  return {
    session_id: signal.sessionId,
    name: signal.name,
    wave_type: signal.waveType,
    frequency: signal.frequency,
    amplitude: signal.amplitude,
    phase: signal.phase,
    duration: signal.duration,
    sampling_rate: signal.samplingRate,
    time_data: signal.timeData,
    amplitude_data: signal.amplitudeData,
    meta: signal.meta || {},
    created_by: userId || null,
  };
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

// ---- initial load ----

export async function init() {
  const { data: sessionRows, error: sErr } = await supabase
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: true });
  if (sErr) throw sErr;

  const { data: signalRows, error: gErr } = await supabase
    .from("signals")
    .select("*")
    .order("created_at", { ascending: true });
  if (gErr) throw gErr;

  _sessions = (sessionRows || []).map(sessionFromDb);
  _signals = (signalRows || []).map(signalFromDb);
  _ready = true;
}

export function isReady() {
  return _ready;
}

// ---- synchronous reads (from cache) ----

export function loadAllSessions() {
  return [..._sessions];
}

export function loadSession(sessionId) {
  return _sessions.find((s) => s.id === sessionId) || null;
}

export function loadAllSignals() {
  return [..._signals];
}

export function loadSessionSignals(sessionId) {
  return _signals.filter((s) => s.sessionId === sessionId);
}

export function loadSignal(signalId) {
  return _signals.find((s) => s.id === signalId) || null;
}

export function getStorageInfo() {
  let byteSize = 0;
  try {
    byteSize = new Blob([JSON.stringify({ sessions: _sessions, signals: _signals })]).size;
  } catch {
    byteSize = 0;
  }
  return {
    sessionCount: _sessions.length,
    signalCount: _signals.length,
    byteSize,
    storageUsage: formatByteSize(byteSize),
  };
}

function formatByteSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ---- async writes (Supabase + cache) ----

export async function saveSession(session) {
  const userId = await currentUserId();

  if (session.id && _sessions.some((s) => s.id === session.id)) {
    // update
    const { error } = await supabase
      .from("sessions")
      .update({ name: session.name, notes: session.notes || "" })
      .eq("id", session.id);
    if (error) throw error;

    const idx = _sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0)
      _sessions[idx] = { ..._sessions[idx], name: session.name, notes: session.notes };
    return _sessions[idx];
  }

  // insert — let Supabase generate the UUID
  const { data, error } = await supabase
    .from("sessions")
    .insert({ name: session.name, notes: session.notes || "", created_by: userId })
    .select()
    .single();
  if (error) throw error;

  const created = sessionFromDb(data);
  _sessions.push(created);
  return created;
}

export async function updateSession(sessionId, updates) {
  const patch = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.notes !== undefined) patch.notes = updates.notes;

  const { error } = await supabase
    .from("sessions")
    .update(patch)
    .eq("id", sessionId);
  if (error) throw error;

  const idx = _sessions.findIndex((s) => s.id === sessionId);
  if (idx >= 0) _sessions[idx] = { ..._sessions[idx], ...patch };
  return _sessions[idx];
}

export async function deleteSession(sessionId) {
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) throw error;

  _sessions = _sessions.filter((s) => s.id !== sessionId);
  _signals = _signals.filter((s) => s.sessionId !== sessionId);
}

export async function saveSignal(signal) {
  const userId = await currentUserId();

  if (signal.id && _signals.some((s) => s.id === signal.id)) {
    // update
    const { error } = await supabase
      .from("signals")
      .update(signalToDb(signal, userId))
      .eq("id", signal.id);
    if (error) throw error;

    const idx = _signals.findIndex((s) => s.id === signal.id);
    if (idx >= 0) _signals[idx] = { ...signal };
    return _signals[idx];
  }

  // insert
  const { data, error } = await supabase
    .from("signals")
    .insert(signalToDb(signal, userId))
    .select()
    .single();
  if (error) throw error;

  const created = signalFromDb(data);
  _signals.push(created);
  return created;
}

export async function deleteSignal(signalId) {
  const { error } = await supabase.from("signals").delete().eq("id", signalId);
  if (error) throw error;

  _signals = _signals.filter((s) => s.id !== signalId);
}

export async function clearAll() {
  // Deletes ALL sessions (signals cascade). Destructive & shared!
  const ids = _sessions.map((s) => s.id);
  if (ids.length) {
    const { error } = await supabase.from("sessions").delete().in("id", ids);
    if (error) throw error;
  }
  _sessions = [];
  _signals = [];
}

// ---- export helpers (unchanged, still used by views) ----

export function exportSignalAsJSON(signal) {
  const dataStr = JSON.stringify(signal, null, 2);
  return new Blob([dataStr], { type: "application/json" });
}

export function exportSignalAsCSV(signal) {
  let csv = "Time,Amplitude\n";
  const t = signal.timeData;
  const y = signal.amplitudeData;
  for (let i = 0; i < t.length; i++) {
    csv += `${t[i].toFixed(6)},${y[i].toFixed(6)}\n`;
  }
  return new Blob([csv], { type: "text/csv" });
}

export function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

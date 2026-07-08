// Local storage utilities

const SESSIONS_KEY = "signal_lab_sessions";
const SIGNALS_KEY = "signal_lab_signals";

/**
 * Save a session
 */
export function saveSession(session) {
  const sessions = loadAllSessions();
  const existingIndex = sessions.findIndex((s) => s.id === session.id);

  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    if (!session.id) {
      session.id = Date.now().toString();
    }
    sessions.push(session);
  }

  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  return session;
}

/**
 * Load all sessions
 */
export function loadAllSessions() {
  const data = localStorage.getItem(SESSIONS_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * Load session by ID
 */
export function loadSession(sessionId) {
  const sessions = loadAllSessions();
  return sessions.find((s) => s.id === sessionId);
}

/**
 * Delete session
 */
export function deleteSession(sessionId) {
  const sessions = loadAllSessions();
  const filtered = sessions.filter((s) => s.id !== sessionId);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));

  // Also delete all signals in this session
  const signals = loadAllSignals();
  const remainingSignals = signals.filter((s) => s.sessionId !== sessionId);
  localStorage.setItem(SIGNALS_KEY, JSON.stringify(remainingSignals));
}

/**
 * Update session
 */
export function updateSession(sessionId, updates) {
  const session = loadSession(sessionId);
  if (session) {
    Object.assign(session, updates);
    saveSession(session);
  }
  return session;
}

/**
 * Save a signal
 */
export function saveSignal(signal) {
  const signals = loadAllSignals();
  const existingIndex = signals.findIndex((s) => s.id === signal.id);

  if (existingIndex >= 0) {
    signals[existingIndex] = signal;
  } else {
    if (!signal.id) {
      signal.id = Date.now().toString();
    }
    signals.push(signal);
  }

  localStorage.setItem(SIGNALS_KEY, JSON.stringify(signals));
  return signal;
}

/**
 * Load all signals
 */
export function loadAllSignals() {
  const data = localStorage.getItem(SIGNALS_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * Load signals for a session
 */
export function loadSessionSignals(sessionId) {
  const signals = loadAllSignals();
  return signals.filter((s) => s.sessionId === sessionId);
}

/**
 * Load signal by ID
 */
export function loadSignal(signalId) {
  const signals = loadAllSignals();
  return signals.find((s) => s.id === signalId);
}

/**
 * Delete signal
 */
export function deleteSignal(signalId) {
  const signals = loadAllSignals();
  const filtered = signals.filter((s) => s.id !== signalId);
  localStorage.setItem(SIGNALS_KEY, JSON.stringify(filtered));
}

/**
 * Export signal as JSON
 */
export function exportSignalAsJSON(signal) {
  const dataStr = JSON.stringify(signal, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  return dataBlob;
}

/**
 * Export signal as CSV
 */
export function exportSignalAsCSV(signal) {
  let csv = "Time,Amplitude\n";
  const t = signal.timeData;
  const y = signal.amplitudeData;

  for (let i = 0; i < t.length; i++) {
    csv += `${t[i].toFixed(6)},${y[i].toFixed(6)}\n`;
  }

  const dataBlob = new Blob([csv], { type: "text/csv" });
  return dataBlob;
}

/**
 * Download file
 */
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

/**
 * Get storage info
 */
export function getStorageInfo() {
  const sessions = loadAllSessions();
  const signals = loadAllSignals();

  let storageSize = 0;
  const data = localStorage.getItem(SESSIONS_KEY) || "";
  const signalData = localStorage.getItem(SIGNALS_KEY) || "";

  storageSize = (data.length + signalData.length) * 2; // Estimate in bytes

  return {
    sessionCount: sessions.length,
    signalCount: signals.length,
    storageUsage: (storageSize / 1024).toFixed(2) + " KB",
  };
}

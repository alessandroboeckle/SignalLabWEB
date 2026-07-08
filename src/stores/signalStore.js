import { defineStore } from "pinia";
import { reactive, ref } from "vue";
import * as storage from "../utils/storage.js";
import * as signalProcessing from "../utils/signalProcessing.js";

export const useSignalStore = defineStore("signal", () => {
  // State
  const currentSession = reactive({
    id: null,
    name: "Neue Session",
    created: new Date().toISOString(),
    notes: "",
    signals: [],
  });

  const allSessions = reactive([]);
  const loaded = ref(false);

  const currentSignal = reactive({
    id: null,
    name: "Signal 1",
    waveType: "sinus",
    frequency: 5,
    amplitude: 10,
    phase: 0,
    duration: 2,
    samplingRate: 1000,
    timeData: [],
    amplitudeData: [],
    meta: {},
  });

  const settings = reactive({
    theme: localStorage.getItem("signal_lab_theme") || "light",
    autoFFT: false,
    windowFunction: "none",
    gridEnabled: true,
  });

  // Load everything from Supabase (called after approval)
  async function loadSessions() {
    await storage.init();
    const sessions = storage.loadAllSessions();
    allSessions.length = 0;
    allSessions.push(...sessions);
    loaded.value = true;

    if (allSessions.length === 0) {
      await createSession("Default Session");
    } else {
      setCurrentSession(allSessions[0].id);
    }
  }

  // Create new session (async — Supabase generates the UUID)
  async function createSession(name = "Neue Session") {
    const created = await storage.saveSession({ name, notes: "" });
    allSessions.push(created);
    setCurrentSession(created.id);
    return created;
  }

  // Set current session (sync — reads from cache)
  function setCurrentSession(sessionId) {
    const session = storage.loadSession(sessionId);
    if (session) {
      currentSession.id = session.id;
      currentSession.name = session.name;
      currentSession.created = session.created;
      currentSession.notes = session.notes;
      currentSession.signals = storage.loadSessionSignals(sessionId);
    }
  }

  // Update current session (async)
  async function updateSession(updates) {
    Object.assign(currentSession, updates);
    await storage.updateSession(currentSession.id, updates);
    const idx = allSessions.findIndex((s) => s.id === currentSession.id);
    if (idx >= 0) Object.assign(allSessions[idx], updates);
  }

  // Delete session (async)
  async function deleteSession(sessionId) {
    await storage.deleteSession(sessionId);
    const index = allSessions.findIndex((s) => s.id === sessionId);
    if (index >= 0) allSessions.splice(index, 1);

    if (currentSession.id === sessionId) {
      if (allSessions.length > 0) {
        setCurrentSession(allSessions[0].id);
      } else {
        currentSession.id = null;
        currentSession.signals = [];
      }
    }
  }

  // Generate signal (pure computation, stays sync)
  function generateSignal(params) {
    const timeData = signalProcessing.generateTimeArray(
      params.duration,
      params.samplingRate,
    );
    const amplitudeData = signalProcessing.generateSignal(
      timeData,
      params.waveType,
      params.frequency,
      params.amplitude,
      params.phase,
    );

    Object.assign(currentSignal, {
      id: null,
      name: params.name || currentSignal.name,
      waveType: params.waveType,
      frequency: params.frequency,
      amplitude: params.amplitude,
      phase: params.phase,
      duration: params.duration,
      samplingRate: params.samplingRate,
      timeData: Array.from(timeData),
      amplitudeData: Array.from(amplitudeData),
      meta: {
        rms: signalProcessing.calculateRMS(amplitudeData),
        peak: signalProcessing.calculatePeak(amplitudeData),
        peakToPeak: signalProcessing.calculatePeakToPeak(amplitudeData),
      },
    });

    return currentSignal;
  }

  // Save current signal to session (async)
  async function saveCurrentSignal() {
    if (!currentSession.id) {
      await createSession();
    }

    const signal = {
      ...currentSignal,
      sessionId: currentSession.id,
    };

    const saved = await storage.saveSignal(signal);

    const index = currentSession.signals.findIndex((s) => s.id === saved.id);
    if (index >= 0) {
      currentSession.signals[index] = saved;
    } else {
      currentSession.signals.push(saved);
    }
    // keep currentSignal id in sync so re-saving updates instead of duplicating
    currentSignal.id = saved.id;

    return saved;
  }

  // Load signal into currentSignal (sync — from cache)
  function loadSignal(signalId) {
    const signal = storage.loadSignal(signalId);
    if (signal) {
      Object.assign(currentSignal, signal);
    }
    return signal;
  }

  // Delete signal (async)
  async function deleteSignal(signalId) {
    await storage.deleteSignal(signalId);
    const index = currentSession.signals.findIndex((s) => s.id === signalId);
    if (index >= 0) currentSession.signals.splice(index, 1);
  }

  // Compare signals (sync — from cache)
  function compareSignals(signalIds) {
    return signalIds.map((id) => storage.loadSignal(id)).filter(Boolean);
  }

  // Update settings (theme stays in localStorage — personal)
  function updateSettings(newSettings) {
    Object.assign(settings, newSettings);
    localStorage.setItem("signal_lab_theme", settings.theme);
  }

  // Export signal
  function exportSignal(signalId, format = "json") {
    const signal = storage.loadSignal(signalId) || currentSignal;
    if (!signal) return null;

    let blob;
    let filename;
    if (format === "csv") {
      blob = storage.exportSignalAsCSV(signal);
      filename = `${signal.name}.csv`;
    } else {
      blob = storage.exportSignalAsJSON(signal);
      filename = `${signal.name}.json`;
    }
    storage.downloadFile(blob, filename);
  }

  // Clear ALL shared data (async, destructive)
  async function clearAllData() {
    await storage.clearAll();
    allSessions.length = 0;
    currentSession.id = null;
    currentSession.signals = [];
    await createSession("Default Session");
  }

  return {
    currentSession,
    allSessions,
    currentSignal,
    settings,
    loaded,
    loadSessions,
    createSession,
    setCurrentSession,
    updateSession,
    deleteSession,
    generateSignal,
    saveCurrentSignal,
    loadSignal,
    deleteSignal,
    compareSignals,
    updateSettings,
    exportSignal,
    clearAllData,
  };
});

import { defineStore } from "pinia";
import { reactive } from "vue";
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

  // Load sessions on init
  function loadSessions() {
    const sessions = storage.loadAllSessions();
    allSessions.length = 0;
    allSessions.push(...sessions);
  }

  // Create new session
  function createSession(name = "Neue Session") {
    const session = {
      id: Date.now().toString(),
      name,
      created: new Date().toISOString(),
      notes: "",
      signals: [],
    };

    storage.saveSession(session);
    allSessions.push(session);

    setCurrentSession(session.id);
    return session;
  }

  // Set current session
  function setCurrentSession(sessionId) {
    const session = storage.loadSession(sessionId);
    if (session) {
      currentSession.id = session.id;
      currentSession.name = session.name;
      currentSession.created = session.created;
      currentSession.notes = session.notes;

      // Load signals for this session
      const signals = storage.loadSessionSignals(sessionId);
      currentSession.signals = signals;
    }
  }

  // Update session
  function updateSession(updates) {
    Object.assign(currentSession, updates);
    storage.updateSession(currentSession.id, updates);
  }

  // Delete session
  function deleteSession(sessionId) {
    storage.deleteSession(sessionId);
    const index = allSessions.findIndex((s) => s.id === sessionId);
    if (index >= 0) {
      allSessions.splice(index, 1);
    }
    if (currentSession.id === sessionId) {
      if (allSessions.length > 0) {
        setCurrentSession(allSessions[0].id);
      } else {
        currentSession.id = null;
        currentSession.signals = [];
      }
    }
  }

  // Generate signal
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
      id: Date.now().toString(),
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

  // Save current signal to session
  function saveCurrentSignal() {
    if (!currentSession.id) {
      createSession();
    }

    const signal = {
      ...currentSignal,
      sessionId: currentSession.id,
      savedAt: new Date().toISOString(),
    };

    storage.saveSignal(signal);
    const index = currentSession.signals.findIndex((s) => s.id === signal.id);
    if (index >= 0) {
      currentSession.signals[index] = signal;
    } else {
      currentSession.signals.push(signal);
    }

    return signal;
  }

  // Load signal
  function loadSignal(signalId) {
    const signal = storage.loadSignal(signalId);
    if (signal) {
      Object.assign(currentSignal, signal);
    }
    return signal;
  }

  // Delete signal
  function deleteSignal(signalId) {
    storage.deleteSignal(signalId);
    const index = currentSession.signals.findIndex((s) => s.id === signalId);
    if (index >= 0) {
      currentSession.signals.splice(index, 1);
    }
  }

  // Compare signals
  function compareSignals(signalIds) {
    const signals = signalIds
      .map((id) => storage.loadSignal(id))
      .filter(Boolean);
    return signals;
  }

  // Update settings
  function updateSettings(newSettings) {
    Object.assign(settings, newSettings);
    localStorage.setItem("signal_lab_theme", settings.theme);
  }

  // Export signal
  function exportSignal(signalId, format = "json") {
    const signal = storage.loadSignal(signalId);
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

  // Clear all data
  function clearAllData() {
    localStorage.removeItem("signal_lab_sessions");
    localStorage.removeItem("signal_lab_signals");
    allSessions.length = 0;
    currentSession.id = null;
    currentSession.signals = [];
  }

  return {
    currentSession,
    allSessions,
    currentSignal,
    settings,
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

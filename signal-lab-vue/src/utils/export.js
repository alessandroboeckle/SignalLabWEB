/**
 * Enhanced export utilities with better error handling
 */

/**
 * Download a blob as a file
 */
export function downloadFile(blob, filename) {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "download";

    // Append to body, click, then remove
    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);

    return true;
  } catch (error) {
    console.error("Download failed:", error);
    return false;
  }
}

/**
 * Export signal as JSON
 */
export function exportSignalAsJSON(signal) {
  try {
    const data = {
      name: signal.name,
      waveType: signal.waveType,
      frequency: signal.frequency,
      amplitude: signal.amplitude,
      phase: signal.phase,
      duration: signal.duration,
      samplingRate: signal.samplingRate,
      metadata: signal.meta,
      exportDate: new Date().toISOString(),
      timeData: signal.timeData,
      amplitudeData: signal.amplitudeData,
    };

    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], {
      type: "application/json;charset=utf-8",
    });

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `${signal.name || "signal"}_${timestamp}.json`;

    downloadFile(blob, filename);
    return true;
  } catch (error) {
    console.error("JSON export failed:", error);
    return false;
  }
}

/**
 * Export signal as CSV
 */
export function exportSignalAsCSV(signal) {
  try {
    let csv = "Time (s),Amplitude\n";

    const t = signal.timeData;
    const y = signal.amplitudeData;

    if (!t || !y || t.length === 0) {
      throw new Error("No signal data to export");
    }

    for (let i = 0; i < t.length; i++) {
      const time = typeof t[i] === "number" ? t[i].toFixed(6) : t[i];
      const amplitude = typeof y[i] === "number" ? y[i].toFixed(6) : y[i];
      csv += `${time},${amplitude}\n`;
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `${signal.name || "signal"}_${timestamp}.csv`;

    downloadFile(blob, filename);
    return true;
  } catch (error) {
    console.error("CSV export failed:", error);
    return false;
  }
}

/**
 * Export session as JSON
 */
export function exportSessionAsJSON(session, signals) {
  try {
    const data = {
      session: {
        name: session.name,
        created: session.created,
        notes: session.notes,
      },
      signals: signals,
      exportDate: new Date().toISOString(),
      signalCount: signals.length,
    };

    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], {
      type: "application/json;charset=utf-8",
    });

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `session_${session.name}_${timestamp}.json`;

    downloadFile(blob, filename);
    return true;
  } catch (error) {
    console.error("Session export failed:", error);
    return false;
  }
}

/**
 * Export all data as JSON
 */
export function exportAllDataAsJSON(sessions, signals) {
  try {
    const data = {
      export: {
        date: new Date().toISOString(),
        version: "1.0",
      },
      statistics: {
        sessionCount: sessions.length,
        signalCount: signals.length,
        totalDataPoints: signals.reduce(
          (sum, s) => sum + (s.timeData?.length || 0),
          0,
        ),
      },
      sessions: sessions,
      signals: signals,
    };

    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], {
      type: "application/json;charset=utf-8",
    });

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")[0];
    const filename = `signal-lab-backup_${timestamp}.json`;

    downloadFile(blob, filename);
    return true;
  } catch (error) {
    console.error("All data export failed:", error);
    return false;
  }
}

/**
 * Export multiple signals as CSV (combined)
 */
export function exportMultipleSignalsAsCSV(signals) {
  try {
    if (!signals || signals.length === 0) {
      throw new Error("No signals to export");
    }

    // Use the first signal's time data as reference
    const t = signals[0].timeData;

    if (!t || t.length === 0) {
      throw new Error("No time data to export");
    }

    // Header with all signal names
    let csv =
      "Time (s)," + signals.map((s) => s.name || "Signal").join(",") + "\n";

    // Data rows
    for (let i = 0; i < t.length; i++) {
      const time = typeof t[i] === "number" ? t[i].toFixed(6) : t[i];
      const values = signals
        .map((signal) => {
          if (signal.amplitudeData && signal.amplitudeData[i] !== undefined) {
            const amp = signal.amplitudeData[i];
            return typeof amp === "number" ? amp.toFixed(6) : amp;
          }
          return "0";
        })
        .join(",");

      csv += `${time},${values}\n`;
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });

    const timestamp = new Date().toISOString().split("T")[0];
    const signalNames = signals
      .slice(0, 2)
      .map((s) => s.name)
      .join("_");
    const filename = `signals_${signalNames}_${timestamp}.csv`;

    downloadFile(blob, filename);
    return true;
  } catch (error) {
    console.error("Multiple signals CSV export failed:", error);
    return false;
  }
}

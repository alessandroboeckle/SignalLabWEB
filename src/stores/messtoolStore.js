import { defineStore } from "pinia";
import { ref, watch } from "vue";

// A small fixed palette so colors stay distinct and consistent across
// re-renders (assigned in order as files are added).
const COMPARE_PALETTE = [
  "#2563EB", "#FF6B35", "#10B981", "#7C3AED",
  "#DC2626", "#059669", "#D97706", "#DB2777",
];

// Holds the measurement file currently loaded in the Messtool,
// so Import / Analyse / Filter / etc. all work on the same data.
export const useMesstoolStore = defineStore("messtool", () => {
  const parsed = ref(null); // { signals:[{name,unit,data}], time:[], meta:{} }
  const fileName = ref("");
  // FFT window type preselected during Import (Analyse falls back to "hann"
  // if this is null, and keeps working the way it always has).
  const fftWindowDefault = ref(null);
  // Which signal index is "active" — shared across Analyse/Filter/
  // Verarbeitung/Export so switching pages doesn't reset back to signal 0.
  const selectedSignalIdx = ref(0);

  // --- session persistence (survive an accidental reload/tab close) -----
  //
  // Best-effort only: browsers cap localStorage around 5-10MB per origin,
  // and a large measurement file can get close to or exceed that once
  // serialized. Rather than risk a quota error breaking something else,
  // we simply skip persisting when a session would be too big — the user
  // just has to re-import in that case, same as today.
  const SESSION_KEY = "sl_messtool_session";
  const MAX_PERSIST_BYTES = 4 * 1024 * 1024;
  const sessionRestored = ref(false);
  const sessionTooLargeToPersist = ref(false);

  function persistSession() {
    try {
      if (!parsed.value) {
        localStorage.removeItem(SESSION_KEY);
        return;
      }
      const payload = JSON.stringify({
        parsed: parsed.value,
        fileName: fileName.value,
        selectedSignalIdx: selectedSignalIdx.value,
        fftWindowDefault: fftWindowDefault.value,
      });
      if (payload.length > MAX_PERSIST_BYTES) {
        sessionTooLargeToPersist.value = true;
        localStorage.removeItem(SESSION_KEY);
        return;
      }
      sessionTooLargeToPersist.value = false;
      localStorage.setItem(SESSION_KEY, payload);
    } catch {
      // storage full/unavailable/disabled — auto-save is a convenience,
      // not a requirement, so fail silently rather than disrupt the user
    }
  }

  function restoreSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || !data.parsed) return false;
      parsed.value = data.parsed;
      fileName.value = data.fileName || "";
      selectedSignalIdx.value = data.selectedSignalIdx || 0;
      fftWindowDefault.value = data.fftWindowDefault || null;
      return true;
    } catch {
      return false;
    }
  }

  function dismissRestoredNotice() {
    sessionRestored.value = false;
  }

  sessionRestored.value = restoreSession();

  function setData(result, name) {
    parsed.value = result;
    fileName.value = name || "";
    selectedSignalIdx.value = 0; // new file -> back to the first signal
    sessionRestored.value = false; // this is a fresh explicit import now
    persistSession();
  }

  function clear() {
    parsed.value = null;
    fileName.value = "";
    selectedSignalIdx.value = 0;
    persistSession();
  }

  watch(selectedSignalIdx, () => persistSession());

  // ---- Multi-file comparison (Messtool -> Vergleich) ----
  // Each entry: { id, name, parsed, color, selectedIdx }
  const compareFiles = ref([]);

  function addCompareFile(name, parsedData) {
    // avoid adding the exact same name twice
    if (compareFiles.value.some((f) => f.name === name)) return null;
    const color = COMPARE_PALETTE[compareFiles.value.length % COMPARE_PALETTE.length];
    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      parsed: parsedData,
      color,
      selectedIdx: 0,
    };
    compareFiles.value.push(entry);
    return entry;
  }

  function removeCompareFile(id) {
    compareFiles.value = compareFiles.value.filter((f) => f.id !== id);
  }

  function clearCompare() {
    compareFiles.value = [];
  }

  return {
    parsed,
    fileName,
    fftWindowDefault,
    selectedSignalIdx,
    sessionRestored,
    sessionTooLargeToPersist,
    dismissRestoredNotice,
    setData,
    clear,
    compareFiles,
    addCompareFile,
    removeCompareFile,
    clearCompare,
  };
});

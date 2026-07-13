import { defineStore } from "pinia";
import { ref, watch } from "vue";
import * as idbSession from "../utils/idbSession.js";

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
  // Backed by IndexedDB rather than localStorage: localStorage tops out
  // around 5-10MB per origin in most browsers, which a multi-tens-of-MB
  // measurement file blows straight through. IndexedDB's quota is
  // normally a generous slice of free disk space instead. We still guard
  // against genuinely pathological sizes (hundreds of MB) rather than
  // trust it's unlimited, and any storage error (quota, private browsing,
  // disabled IndexedDB, ...) is swallowed — auto-save is a convenience,
  // never a requirement for the app to keep working.
  const MAX_PERSIST_BYTES = 300 * 1024 * 1024;
  const sessionRestored = ref(false);
  const sessionTooLargeToPersist = ref(false);
  let persistTimer = null;

  async function persistSessionNow() {
    try {
      if (!parsed.value) {
        await idbSession.clearSession();
        return;
      }
      // Rough size estimate for the guard only — the actual write stores
      // the live object directly (structured clone), not this string.
      const approxBytes = JSON.stringify(parsed.value).length;
      if (approxBytes > MAX_PERSIST_BYTES) {
        sessionTooLargeToPersist.value = true;
        await idbSession.clearSession();
        return;
      }
      sessionTooLargeToPersist.value = false;
      await idbSession.saveSession({
        parsed: parsed.value,
        fileName: fileName.value,
        selectedSignalIdx: selectedSignalIdx.value,
        fftWindowDefault: fftWindowDefault.value,
      });
    } catch {
      // storage full/unavailable/disabled — fail silently, see above
    }
  }

  // Debounced so rapid changes (e.g. switching signals quickly) don't
  // trigger a disk write on every single one.
  function persistSession() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(persistSessionNow, 300);
  }

  async function restoreSession() {
    try {
      const data = await idbSession.loadSession();
      if (!data || !data.parsed) return;
      parsed.value = data.parsed;
      fileName.value = data.fileName || "";
      selectedSignalIdx.value = data.selectedSignalIdx || 0;
      fftWindowDefault.value = data.fftWindowDefault || null;
      sessionRestored.value = true;
    } catch {
      // nothing to restore, or storage unavailable — start with a clean slate
    }
  }

  function dismissRestoredNotice() {
    sessionRestored.value = false;
  }

  restoreSession();

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

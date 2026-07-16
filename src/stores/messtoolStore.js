import { defineStore } from "pinia";
import { ref, watch, computed } from "vue";
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

  // Which cloud messfiles row (if any) the currently loaded file
  // corresponds to. Null for a freshly-uploaded local file that hasn't
  // been saved to the cloud yet — Sessions need this to know which file
  // to re-download later, so saving a session requires it to be set.
  const messfileId = ref(null);
  const messfileStoragePath = ref(null);

  function setCloudRef(id, storagePath) {
    messfileId.value = id || null;
    messfileStoragePath.value = storagePath || null;
  }

  // Verarbeitung chain + Filter settings, shared so they survive
  // switching pages and can be captured/restored wholesale by a Session.
  // Verarbeitung keeps its live ProcessingOp instances locally (for
  // .apply()) and mirrors a plain {id,params} snapshot here.
  const verarbeitungSnapshot = ref([]); // [{id, params}, ...]
  const filterSettings = ref({
    characteristic: "butterworth",
    btype: "low",
    order: 4,
    cutoff: 1,
    cutoff2: 3,
    stopbandDb: 40,
  });

  // Time-point annotations on the current file (e.g. "Bremsereignis hier"),
  // shared across every ChartCard on every Messtool page so a marker set
  // while looking at Filter also shows up in Analyse/Verarbeitung/etc.
  const markers = ref([]); // [{id, timeSec, note}]

  function addMarker(timeSec, note) {
    markers.value.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timeSec,
      note,
    });
    markers.value.sort((a, b) => a.timeSec - b.timeSec);
    persistSession();
  }

  function removeMarker(id) {
    markers.value = markers.value.filter((m) => m.id !== id);
    persistSession();
  }

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
        markers: markers.value,
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
      markers.value = data.markers || [];
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
    messfileId.value = null; // caller sets this via setCloudRef() if known
    messfileStoragePath.value = null;
    verarbeitungSnapshot.value = [];
    filterSettings.value = {
      characteristic: "butterworth", btype: "low", order: 4,
      cutoff: 1, cutoff2: 3, stopbandDb: 40,
    };
    markers.value = [];
    sessionRestored.value = false; // this is a fresh explicit import now
    persistSession();
  }

  function clear() {
    parsed.value = null;
    fileName.value = "";
    selectedSignalIdx.value = 0;
    messfileId.value = null;
    messfileStoragePath.value = null;
    markers.value = [];
    persistSession();
  }

  watch(selectedSignalIdx, () => persistSession());

  // ---- Multi-file comparison (Messtool -> Vergleich) ----
  // Each entry: { id, name, parsed, selectedIndices, offsetSec }. A file
  // can have several signals selected at once (e.g. compare two channels
  // from the same recording) — colors are assigned per displayed *series*
  // (file+signal pair), not per file, via compareSeries below. offsetSec
  // shifts that whole file's time axis so an event (e.g. a braking event)
  // can be lined up with the same event in another file, even if the two
  // recordings didn't start at the same real-world moment.
  const compareFiles = ref([]);

  function addCompareFile(name, parsedData, cloudRef = null) {
    // avoid adding the exact same file twice — to compare more signals
    // from a file that's already in the list, just select more signals
    // on that existing entry instead
    if (compareFiles.value.some((f) => f.name === name)) return null;

    // "Smart" default: if other files are already in the list, try to
    // auto-select the same signal(s) by name in this new file too — so
    // comparing the same channel across several recordings doesn't need
    // manually re-picking it in every single file you add. Falls back to
    // the first signal if nothing matches (e.g. the very first file, or
    // genuinely different channel sets).
    let selectedIndices = [0];
    if (compareFiles.value.length > 0) {
      const wantedNames = new Set();
      for (const f of compareFiles.value) {
        for (const idx of f.selectedIndices) {
          const sig = f.parsed.signals[idx];
          if (sig) wantedNames.add(sig.name);
        }
      }
      const matches = parsedData.signals
        .map((s, i) => (wantedNames.has(s.name) ? i : -1))
        .filter((i) => i !== -1);
      if (matches.length) selectedIndices = matches;
    }

    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      parsed: parsedData,
      // Only set when the file is actually in the cloud (opened from
      // there, or just uploaded) — needed to re-download it later when
      // restoring a saved Vergleichs-Session. Null for a raw local upload
      // that was never saved to the cloud.
      messfileId: cloudRef?.messfileId || null,
      messfileStoragePath: cloudRef?.storagePath || null,
      selectedIndices,
      offsetSec: 0,
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

  // Flattened (file, signal) pairs actually shown in the comparison chart/
  // stats/batch-export, each with its own color assigned in display order
  // — so two signals from the same file get two distinct, stable colors
  // just like two signals from two different files would.
  const compareSeries = computed(() => {
    const out = [];
    let colorIdx = 0;
    for (const f of compareFiles.value) {
      const indices = f.selectedIndices && f.selectedIndices.length ? f.selectedIndices : [];
      for (const idx of indices) {
        const signal = f.parsed.signals[idx];
        if (!signal) continue;
        out.push({
          key: `${f.id}:${idx}`,
          fileId: f.id,
          fileName: f.name,
          time: f.parsed.time,
          offsetSec: f.offsetSec || 0,
          signalIdx: idx,
          signal,
          color: COMPARE_PALETTE[colorIdx % COMPARE_PALETTE.length],
        });
        colorIdx++;
      }
    }
    return out;
  });

  return {
    parsed,
    fileName,
    fftWindowDefault,
    selectedSignalIdx,
    messfileId,
    messfileStoragePath,
    setCloudRef,
    verarbeitungSnapshot,
    filterSettings,
    markers,
    addMarker,
    removeMarker,
    sessionRestored,
    sessionTooLargeToPersist,
    dismissRestoredNotice,
    setData,
    clear,
    compareFiles,
    compareSeries,
    addCompareFile,
    removeCompareFile,
    clearCompare,
  };
});

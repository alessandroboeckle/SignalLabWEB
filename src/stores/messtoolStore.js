import { defineStore } from "pinia";
import { ref } from "vue";

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

  function setData(result, name) {
    parsed.value = result;
    fileName.value = name || "";
  }

  function clear() {
    parsed.value = null;
    fileName.value = "";
  }

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
    setData,
    clear,
    compareFiles,
    addCompareFile,
    removeCompareFile,
    clearCompare,
  };
});

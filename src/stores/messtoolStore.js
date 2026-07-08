import { defineStore } from "pinia";
import { ref } from "vue";

// Holds the measurement file currently loaded in the Messtool,
// so Import / Analyse / Filter / etc. all work on the same data.
export const useMesstoolStore = defineStore("messtool", () => {
  const parsed = ref(null); // { signals:[{name,unit,data}], time:[], meta:{} }
  const fileName = ref("");

  function setData(result, name) {
    parsed.value = result;
    fileName.value = name || "";
  }

  function clear() {
    parsed.value = null;
    fileName.value = "";
  }

  return { parsed, fileName, setData, clear };
});

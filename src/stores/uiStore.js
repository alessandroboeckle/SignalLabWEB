import { defineStore } from "pinia";
import { ref } from "vue";

// Tiny cross-page signal, nothing more: a page's help icon needs to (a)
// switch the active top-level tab to "Hilfe" and (b) tell the Hilfe page
// which section to jump to — but activeTab lives as local state in
// App.vue, and the page components (MtImport, MtFilter, ...) have no
// direct line to each other or to App.vue beyond their own single
// "navigate" emit. Routing this through a shared store instead of
// threading a second emit through every page component keeps each page's
// help button a one-line drop-in.
export const useUiStore = defineStore("ui", () => {
  const helpTarget = ref(null); // Hilfe section key to expand + scroll to
  const pendingTab = ref(null); // App.vue watches this and applies it to activeTab

  function openHelp(sectionKey) {
    helpTarget.value = sectionKey;
    pendingTab.value = "hilfe";
  }

  return { helpTarget, pendingTab, openHelp };
});

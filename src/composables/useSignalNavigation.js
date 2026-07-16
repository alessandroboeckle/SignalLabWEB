// Arrow-key navigation for the shared "which signal am I looking at" state
// (mtStore.selectedSignalIdx). Used on every Messtool page that has a
// signal picker (Analyse/Filter/Verarbeitung/Export), so you can flip
// through a file's channels without reaching for the mouse each time.
//
// Deliberately global (attached to window, not a specific element) so it
// works no matter where focus currently is on the page — except inside
// text inputs/selects, where arrow keys obviously need to do their normal
// job (moving the cursor, changing a dropdown, etc.) instead.

import { onMounted, onBeforeUnmount } from "vue";

function isEditableTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function useSignalNavigationShortcuts(mtStore) {
  function onKeydown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // leave other shortcuts (undo/redo, browser) alone
    if (isEditableTarget(e.target)) return;
    if (!mtStore.parsed) return;

    const count = mtStore.parsed.signals.length;
    if (!count) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      mtStore.selectedSignalIdx = (mtStore.selectedSignalIdx + 1) % count;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      mtStore.selectedSignalIdx = (mtStore.selectedSignalIdx - 1 + count) % count;
    }
  }

  onMounted(() => window.addEventListener("keydown", onKeydown));
  onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
}

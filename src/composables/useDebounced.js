// Debounces a reactive getter so expensive downstream computations (e.g.
// re-running a filter/processing chain on a large signal) don't fire on
// every single keystroke while typing a number field. `pending` flips true
// the instant the source changes and back to false once `value` has caught
// up, so callers can show a lightweight "wird berechnet" indicator instead
// of the UI silently freezing for a moment.

import { ref, watch } from "vue";

export function useDebounced(sourceGetter, delay = 200) {
  const value = ref(structuredCloneSafe(sourceGetter()));
  const pending = ref(false);
  let timer = null;

  watch(sourceGetter, (v) => {
    pending.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      value.value = structuredCloneSafe(v);
      pending.value = false;
    }, delay);
  }, { deep: true });

  return { value, pending };
}

function structuredCloneSafe(v) {
  return Array.isArray(v) ? [...v] : v;
}

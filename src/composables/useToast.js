// Tiny global toast/snackbar system. One reactive singleton, so any
// component can call showToast(...) without needing to wire up its own
// snackbar state — App.vue renders the actual <v-snackbar> once, reading
// from this shared state.
//
// Deliberately not a Pinia store: this is pure UI/ephemeral notification
// state, not application data, so a plain module-level reactive object is
// simpler and avoids mixing concerns in the real stores.

import { reactive } from "vue";

const state = reactive({
  show: false,
  message: "",
  color: "success", // success | error | warning | info
  timeout: 3000,
});

export function showToast(message, { color = "success", timeout = 3000 } = {}) {
  state.message = message;
  state.color = color;
  state.timeout = timeout;
  state.show = true;
}

export function useToast() {
  return { toast: state, showToast };
}

import { toRaw, isRef, isProxy } from "vue";

// toRaw() only strips the OUTERMOST reactive Proxy layer — if a nested
// property happens to itself be (or hold onto) a separately-reactive
// value, e.g. because it was assigned by reference from another ref's
// .value elsewhere in the app rather than being a brand-new plain
// object, toRaw() on the parent won't touch it. structuredClone (what
// IndexedDB's put() uses internally, see messtoolStore.js) rejects a
// Proxy anywhere in the object graph — so one such leftover nested
// Proxy is enough to fail the *entire* write, silently, wherever the
// caller swallows the error.
//
// Recurses through plain objects/arrays and toRaw()s every level, not
// just the top one, so it doesn't matter how a Proxy reference ended up
// nested in there.
export function deepToRaw(value) {
  if (Array.isArray(value)) {
    return value.map(deepToRaw);
  }
  if (isRef(value)) {
    return deepToRaw(value.value);
  }
  if (value instanceof Date || value instanceof RegExp) {
    return value;
  }
  if (value && typeof value === "object") {
    const raw = isProxy(value) ? toRaw(value) : value;
    const out = {};
    for (const key of Object.keys(raw)) {
      out[key] = deepToRaw(raw[key]);
    }
    return out;
  }
  return value;
}

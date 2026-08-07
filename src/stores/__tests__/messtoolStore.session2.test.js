import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import * as idbSession from "../../utils/idbSession.js";

// The default test environment here is plain Node (no jsdom), so
// window/document aren't defined at all — stub just enough of the
// EventTarget surface for beforeunload/visibilitychange, rather than
// pulling in a full DOM environment for one test.
function installMinimalDomStubs() {
  const listeners = { window: new Map(), document: new Map() };
  const makeTarget = (bucket) => ({
    addEventListener: (type, fn) => {
      if (!listeners[bucket].has(type)) listeners[bucket].set(type, []);
      listeners[bucket].get(type).push(fn);
    },
    dispatchEvent: (event) => {
      for (const fn of listeners[bucket].get(event.type) || []) fn(event);
    },
  });
  globalThis.window = { ...makeTarget("window") };
  globalThis.document = { ...makeTarget("document"), visibilityState: "visible" };
  return { setHidden: () => { globalThis.document.visibilityState = "hidden"; } };
}

describe("messtoolStore session persistence - compareFile then marker then reload", () => {
  beforeEach(async () => {
    await idbSession.clearSession();
    vi.resetModules();
    installMinimalDomStubs();
  });

  afterEach(() => {
    delete globalThis.window;
    delete globalThis.document;
  });

  it("survives: add compare file -> add marker -> reload", async () => {
    setActivePinia(createPinia());
    const { useMesstoolStore } = await import("../messtoolStore.js");
    const store = useMesstoolStore();

    store.setData({ signals: [{ name: "Sig1", unit: "V", data: [1, 2, 3] }], time: [0, 1, 2] }, "test.csv");
    store.addCompareFile("compare1.csv", {
      signals: [{ name: "CompSig", unit: "A", data: [4, 5, 6] }],
      time: [0, 1, 2],
    });
    store.addMarker(1.5, "Ereignis hier");

    await new Promise((r) => setTimeout(r, 500));

    const saved = await idbSession.loadSession();
    expect(saved).toBeTruthy();
    expect(saved.markers).toHaveLength(1);
    expect(saved.compareFiles).toHaveLength(1);

    vi.resetModules();
    setActivePinia(createPinia());
    const { useMesstoolStore: useAgain } = await import("../messtoolStore.js");
    const restored = useAgain();
    await new Promise((r) => setTimeout(r, 100));

    expect(restored.markers).toHaveLength(1);
    expect(restored.compareFiles).toHaveLength(1);
  });

  it("flushes immediately on beforeunload instead of waiting out the debounce (fast add-then-reload)", async () => {
    setActivePinia(createPinia());
    const { useMesstoolStore } = await import("../messtoolStore.js");
    const store = useMesstoolStore();

    store.setData({ signals: [{ name: "Sig1", unit: "V", data: [1, 2, 3] }], time: [0, 1, 2] }, "test.csv");
    store.addCompareFile("compare1.csv", {
      signals: [{ name: "CompSig", unit: "A", data: [4, 5, 6] }],
      time: [0, 1, 2],
    });
    store.addMarker(1.5, "Ereignis hier");

    // Simulate an immediate reload — well within the 300ms debounce
    // window, no manual wait at all.
    window.dispatchEvent({ type: "beforeunload" });
    // The IndexedDB write itself is still async even though it's no
    // longer debounced — give it a brief moment to actually land.
    await new Promise((r) => setTimeout(r, 50));

    const saved = await idbSession.loadSession();
    expect(saved).toBeTruthy();
    expect(saved.markers).toHaveLength(1);
    expect(saved.compareFiles).toHaveLength(1);
  });
});

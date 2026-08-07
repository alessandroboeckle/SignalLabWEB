import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import * as idbSession from "../../utils/idbSession.js";

describe("messtoolStore session persistence - compareFile then marker then reload", () => {
  beforeEach(async () => {
    await idbSession.clearSession();
    vi.resetModules();
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
    console.log("SAVED:", JSON.stringify(saved && { hasMarkers: saved.markers, hasCompare: saved.compareFiles?.length }));
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
});

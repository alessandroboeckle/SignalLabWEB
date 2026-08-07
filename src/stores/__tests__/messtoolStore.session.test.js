import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import * as idbSession from "../../utils/idbSession.js";

// Round-trips the real IndexedDB-backed session save/restore (via
// fake-indexeddb, not a mock of our own code) to catch exactly the class
// of bug reported: "F5 stays on the page now, but everything I set up is
// still gone" — i.e. persistSessionNow() writing a field, or
// restoreSession() reading it back, silently not actually happening.
describe("messtoolStore session persistence", () => {
  beforeEach(async () => {
    await idbSession.clearSession();
    vi.resetModules(); // force a fresh module + fresh useMesstoolStore per test
  });

  it("persists compareFiles, filterSettings and verarbeitungSnapshot, and a fresh store instance restores them", async () => {
    setActivePinia(createPinia());
    const { useMesstoolStore } = await import("../messtoolStore.js");
    const store = useMesstoolStore();

    // Needs a main file loaded — persistSessionNow() bails out early
    // (and clears any saved session) if parsed.value is null.
    store.setData({ signals: [{ name: "Sig1", unit: "V", data: [1, 2, 3] }], time: [0, 1, 2] }, "test.csv");

    store.addCompareFile("compare1.csv", {
      signals: [{ name: "CompSig", unit: "A", data: [4, 5, 6] }],
      time: [0, 1, 2],
    });
    store.compareFiles[0].selectedIndices = [0];
    store.compareFiles[0].offsetSec = 12.5;

    store.filterSettings = { characteristic: "bessel", btype: "high", order: 6, cutoff: 5, cutoff2: 9, stopbandDb: 60 };
    store.verarbeitungSnapshot = [{ id: "op1", params: { foo: "bar" } }];

    // persistSession() debounces the actual write by 300ms.
    await new Promise((r) => setTimeout(r, 500));

    const saved = await idbSession.loadSession();
    expect(saved).toBeTruthy();
    expect(saved.compareFiles).toHaveLength(1);
    expect(saved.compareFiles[0].name).toBe("compare1.csv");
    expect(saved.compareFiles[0].offsetSec).toBe(12.5);
    expect(saved.filterSettings.characteristic).toBe("bessel");
    expect(saved.verarbeitungSnapshot).toEqual([{ id: "op1", params: { foo: "bar" } }]);

    // Simulate a real reload: a brand new Pinia instance + a freshly
    // re-imported store module, exactly like what happens after F5.
    vi.resetModules();
    setActivePinia(createPinia());
    const { useMesstoolStore: useMesstoolStoreAgain } = await import("../messtoolStore.js");
    const restored = useMesstoolStoreAgain();

    // restoreSession() is fire-and-forget (called at store setup, not
    // awaited by anything) — give its IndexedDB read a moment to resolve.
    await new Promise((r) => setTimeout(r, 100));

    expect(restored.compareFiles).toHaveLength(1);
    expect(restored.compareFiles[0].name).toBe("compare1.csv");
    expect(restored.compareFiles[0].offsetSec).toBe(12.5);
    expect(restored.filterSettings.characteristic).toBe("bessel");
    expect(restored.verarbeitungSnapshot).toEqual([{ id: "op1", params: { foo: "bar" } }]);
  });
});

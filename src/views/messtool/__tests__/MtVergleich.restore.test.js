// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import * as idbSession from "../../../utils/idbSession.js";

// ChartCard actually instantiates Chart.js against a <canvas>, which
// jsdom doesn't support (no 2D context) — irrelevant to what this test
// checks (does the restored file show up in the list at all), so stub
// it out entirely rather than fighting canvas mocking.
vi.mock("../ChartCard.vue", () => ({
  default: { name: "ChartCardStub", template: "<div class='chartcard-stub' />" },
}));

const vuetify = createVuetify({ components, directives });

describe("MtVergleich.vue reflects a session restored from IndexedDB (real mount, not just store state)", () => {
  beforeEach(async () => {
    await idbSession.clearSession();
    vi.resetModules();
  });

  it("shows the restored compare file in the list after the component mounts fresh (simulates landing on Anzeige right after F5)", async () => {
    await idbSession.saveSession({
      parsed: { signals: [{ name: "Sig1", unit: "V", data: [1, 2, 3] }], time: [0, 1, 2] },
      fileName: "test.csv",
      selectedSignalIdx: 0,
      fftWindowDefault: null,
      markers: [],
      filterSettings: { characteristic: "butterworth", btype: "low", order: 4, cutoff: 1, cutoff2: 3 },
      verarbeitungSnapshot: [],
      compareFiles: [{
        id: "abc123",
        name: "restored_compare.csv",
        parsed: { signals: [{ name: "CompSig", unit: "A", data: [4, 5, 6] }], time: [0, 1, 2] },
        messfileId: null,
        messfileStoragePath: null,
        selectedIndices: [0],
        offsetSec: 0,
        useSecondAxis: false,
        autoAlign: false,
        useFilter: false,
        filterOnly: false,
        filterSettings: { characteristic: "butterworth", btype: "low", order: 4, cutoff: 10, cutoff2: 20 },
      }],
    });

    setActivePinia(createPinia());
    const { default: MtVergleich } = await import("../MtVergleich.vue");

    const wrapper = mount(MtVergleich, {
      global: { plugins: [vuetify] },
    });

    await new Promise((r) => setTimeout(r, 150));
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("restored_compare.csv");
    expect(wrapper.text()).not.toContain("Keine Signale ausgewählt");
    expect(wrapper.text()).not.toContain("Zuerst auf der Import-Seite eine Datei laden");
  });
});

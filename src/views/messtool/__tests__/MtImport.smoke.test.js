// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

vi.mock("../ChartCard.vue", () => ({
  default: { name: "ChartCardStub", template: "<div />" },
}));
vi.mock("../../../lib/supabase.js", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: null } }), onAuthStateChange: () => {} },
    from: () => ({
      select: () => ({ order: async () => ({ data: [], error: null }) }),
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
    storage: { from: () => ({}) },
  },
}));

const vuetify = createVuetify({ components, directives });

// jsdom doesn't implement ResizeObserver — Vuetify's VProgressCircular
// (shown here via the "Liste aktualisieren" loading spinner) uses it.
// Not a real app bug, just a test-environment gap; stub it so it doesn't
// show up as noise in the output and mask an actual future failure.
global.ResizeObserver =
  global.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

// This is exactly the class of bug that the "watch is not defined" crash
// in MtVergleich.vue was — correct-looking code that throws the instant
// the component actually mounts, which neither `npm run build` nor any
// logic-only unit test would ever catch. A plain successful mount is a
// cheap, high-value smoke test for every page.
describe("MtImport.vue smoke test", () => {
  it("mounts without throwing (catches missing-import / undefined-reference crashes)", async () => {
    setActivePinia(createPinia());
    const { default: MtImport } = await import("../MtImport.vue");

    expect(() => {
      mount(MtImport, { global: { plugins: [vuetify] } });
    }).not.toThrow();
  });
});

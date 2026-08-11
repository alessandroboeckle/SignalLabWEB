// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

const vuetify = createVuetify({ components, directives });

// This whole file exists because of a real, hours-long bug hunt: an icon
// on a specific v-btn wasn't rendering in production. The actual root
// cause was never fully pinned down with certainty — a stale deploy was
// confirmed to be part of it, and the fix (wrapping v-tooltip around the
// button via its own #activator slot instead of nesting it inside) is
// also just cleaner, Vuetify-recommended markup regardless. What matters
// going forward: these tests assert against the real rendered DOM, not
// just the surrounding JS logic — that's the category of check that was
// missing and cost hours of screenshot back-and-forth to diagnose by hand.
describe("icon-only v-btn rendering (regression coverage for the icon rendering bug)", () => {
  it("a bare icon v-btn (no slot content) gets Vuetify's v-btn--icon class and renders the icon glyph", () => {
    const wrapper = mount(
      { template: '<v-btn icon="mdi-delete" aria-label="Löschen"></v-btn>' },
      { global: { plugins: [vuetify] } },
    );
    expect(wrapper.classes()).toContain("v-btn--icon");
    expect(wrapper.find(".v-icon").exists()).toBe(true);
  });

  it("an icon v-btn wrapped by v-tooltip's #activator slot (the pattern now used app-wide) gets v-btn--icon and renders the glyph", () => {
    const wrapper = mount(
      {
        template: `
          <v-tooltip location="bottom">
            <template #activator="{ props }">
              <v-btn icon="mdi-delete" aria-label="Löschen" v-bind="props"></v-btn>
            </template>
            Löschen
          </v-tooltip>
        `,
      },
      { global: { plugins: [vuetify] } },
    );
    const btn = wrapper.findComponent({ name: "VBtn" });
    expect(btn.exists()).toBe(true);
    expect(btn.classes()).toContain("v-btn--icon");
    expect(btn.find(".v-icon").exists()).toBe(true);
  });
});

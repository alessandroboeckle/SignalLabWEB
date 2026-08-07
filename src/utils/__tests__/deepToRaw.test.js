import { describe, it, expect } from "vitest";
import { ref, reactive } from "vue";
import { deepToRaw } from "../deepToRaw.js";

describe("deepToRaw", () => {
  it("passes plain data through unchanged", () => {
    expect(deepToRaw({ a: 1, b: [1, 2, 3] })).toEqual({ a: 1, b: [1, 2, 3] });
  });

  it("unwraps a reactive object", () => {
    const r = reactive({ a: 1, b: [1, 2, 3] });
    const out = deepToRaw(r);
    expect(out).toEqual({ a: 1, b: [1, 2, 3] });
    expect(() => structuredClone(out)).not.toThrow();
  });

  it("unwraps a Proxy nested inside an otherwise-plain array (the actual bug)", () => {
    const parsed = ref(null);
    parsed.value = { signals: [{ name: "s", data: [1, 2, 3] }] };

    const compareFiles = ref([]);
    // Same pattern as "add the currently loaded file to Anzeige": the
    // live parsed.value reference (a separate reactive Proxy) gets
    // stored directly as a nested property.
    compareFiles.value.push({ id: "x", name: "current.csv", parsed: parsed.value });

    const out = deepToRaw(compareFiles.value);
    expect(out).toEqual([{ id: "x", name: "current.csv", parsed: { signals: [{ name: "s", data: [1, 2, 3] }] } }]);
    expect(() => structuredClone(out)).not.toThrow();
  });

  it("leaves Date objects intact instead of expanding them into plain objects", () => {
    const d = new Date("2026-01-01");
    const out = deepToRaw({ when: d });
    expect(out.when).toBeInstanceOf(Date);
    expect(out.when.getTime()).toBe(d.getTime());
  });
});

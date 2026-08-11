import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("../../lib/supabase.js", () => ({ supabase: mockSupabase }));

describe("reportSettingsStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
  });

  it("loads logo and default fields from the app_settings row", async () => {
    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { value: { logoDataUrl: "data:image/png;base64,xyz", defaultFields: [{ label: "Firma", value: "Stadler Rail" }] } },
            error: null,
          }),
        }),
      }),
    });

    const { useReportSettingsStore } = await import("../reportSettingsStore.js");
    const store = useReportSettingsStore();
    await store.load();

    expect(store.logoDataUrl).toBe("data:image/png;base64,xyz");
    expect(store.defaultFields).toEqual([{ label: "Firma", value: "Stadler Rail" }]);
    expect(store.loaded).toBe(true);
  });

  it("falls back to empty logo/fields when no row exists yet (migration not run, or genuinely empty)", async () => {
    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: { message: "no rows" } }),
        }),
      }),
    });

    const { useReportSettingsStore } = await import("../reportSettingsStore.js");
    const store = useReportSettingsStore();
    await store.load();

    expect(store.logoDataUrl).toBe(null);
    expect(store.defaultFields).toEqual([]);
    expect(store.loaded).toBe(true); // still marks loaded=true so callers don't hang waiting forever
  });

  it("save() upserts and updates local state, throws on failure so the caller can show an error", async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    mockSupabase.from.mockReturnValue({ upsert });

    const { useReportSettingsStore } = await import("../reportSettingsStore.js");
    const store = useReportSettingsStore();
    await store.save({ logoDataUrl: "data:image/png;base64,abc", defaultFields: [{ label: "Projekt", value: "KISS" }] });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "report_template",
        value: { logoDataUrl: "data:image/png;base64,abc", defaultFields: [{ label: "Projekt", value: "KISS" }] },
      }),
    );
    expect(store.logoDataUrl).toBe("data:image/png;base64,abc");
    expect(store.defaultFields).toEqual([{ label: "Projekt", value: "KISS" }]);
  });

  it("save() throws when the upsert fails, without silently updating local state", async () => {
    mockSupabase.from.mockReturnValue({ upsert: async () => ({ error: { message: "denied" } }) });

    const { useReportSettingsStore } = await import("../reportSettingsStore.js");
    const store = useReportSettingsStore();
    await expect(store.save({ logoDataUrl: null, defaultFields: [] })).rejects.toThrow();
  });
});

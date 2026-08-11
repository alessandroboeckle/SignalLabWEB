import { defineStore } from "pinia";
import { ref } from "vue";
import { supabase } from "../lib/supabase";

const SETTINGS_KEY = "report_template";

// Team-wide report template — one shared logo + a set of default custom
// fields (e.g. "Firma: Stadler Rail") that show up on every PDF export
// unless someone edits/removes them for that one export. Admin-editable
// only (see the RLS policy in add_app_settings.sql) since this is shared
// branding, not a personal setting.
export const useReportSettingsStore = defineStore("reportSettings", () => {
  const logoDataUrl = ref(null);
  const defaultFields = ref([]); // [{ label, value }]
  const loaded = ref(false);

  async function load() {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", SETTINGS_KEY)
        .single();
      if (!error && data?.value) {
        logoDataUrl.value = data.value.logoDataUrl || null;
        defaultFields.value = Array.isArray(data.value.defaultFields) ? data.value.defaultFields : [];
      }
    } catch {
      // No row yet, migration not run, or offline — reports just render
      // without a logo/default fields instead of failing to load.
    }
    loaded.value = true;
  }

  async function save({ logoDataUrl: logo, defaultFields: fields }) {
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: SETTINGS_KEY, value: { logoDataUrl: logo, defaultFields: fields }, updated_at: new Date().toISOString() });
    if (error) throw error;
    logoDataUrl.value = logo;
    defaultFields.value = fields;
  }

  return { logoDataUrl, defaultFields, loaded, load, save };
});

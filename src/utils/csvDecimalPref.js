// A tiny personal (not team-wide) preference: whether CSV exports
// (Filter/Verarbeitung) use "," instead of "." as the decimal separator.
// Defaults to false — matching the raw Stadler LOGDATA format's own
// dot-decimal convention (see messtoolParser.js's parseFloat calls) — so
// nothing changes for anyone unless they explicitly opt in. localStorage
// rather than the (Supabase-backed, admin-only) reportSettingsStore since
// this is a personal "how I like my own exports" toggle, not shared
// branding/config other users should see.
const STORAGE_KEY = "sl_csv_decimal_comma";

export function getCsvDecimalCommaPref() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setCsvDecimalCommaPref(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Private browsing / storage disabled — the toggle just won't persist
    // across reloads, not worth surfacing an error for.
  }
}

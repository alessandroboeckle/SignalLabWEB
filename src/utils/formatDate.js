// "DD.MM.YYYY, HH:MM" — the app's standard timestamp display (file
// upload dates, admin user list, ...). Was defined identically in both
// MtImport.vue and AdminTab.vue; pulled out here so there's one place to
// change if the format ever needs to.
export function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

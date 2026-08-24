// Turns common raw error messages (network failures, timeouts, Supabase/
// Postgres errors) into plain German a non-technical user can actually
// act on, instead of "Failed to fetch" or a raw Postgres constraint text.
//
// Unknown errors fall through to the original message rather than being
// swallowed — better an ugly-but-honest message than a friendly lie.
export function friendlyError(e) {
  const raw = (e && (e.message || String(e))) || "Unbekannter Fehler";
  const lower = raw.toLowerCase();

  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("network request failed")) {
    return "Keine Verbindung zum Server — bitte Internetverbindung prüfen und nochmal versuchen.";
  }
  if (lower.includes("timeout") || lower.includes("zeitüberschreitung")) {
    return "Der Server antwortet nicht rechtzeitig — bitte kurz warten und nochmal versuchen.";
  }
  if (lower.includes("jwt") || lower.includes("not authenticated") || lower.includes("invalid_grant")) {
    return "Deine Sitzung ist abgelaufen — bitte die Seite neu laden und erneut anmelden.";
  }
  if (lower.includes("permission denied") || lower.includes("row-level security") || lower.includes("rls")) {
    return "Du hast keine Berechtigung für diese Aktion.";
  }
  if (lower.includes("speicherlimit")) {
    return raw; // already a friendly German message from the quota trigger — keep as-is
  }
  if (lower.includes("payload too large") || lower.includes("file too large") || lower.includes("exceeded the maximum")) {
    return "Die Datei ist zu gross.";
  }

  return raw;
}

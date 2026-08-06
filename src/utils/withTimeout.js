// Wraps a promise so it can never hang the UI forever — if it hasn't
// settled within `ms`, this rejects with a clear error instead of leaving
// whatever's waiting on it (a loading spinner, a button's disabled state)
// stuck indefinitely. Same defensive idea already used for the CSV parser
// worker (parseCsvOffMainThread's own 20s fallback) — applied here to
// network calls (Supabase storage downloads), which had no such guard:
// a stalled request or an auth-token-refresh deadlock in the Supabase
// client would otherwise never resolve or reject on its own, and the
// "Zur Anzeige hinzufügen" icon would just spin forever.
export function withTimeout(promise, ms, message = "Zeitüberschreitung — bitte erneut versuchen.") {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

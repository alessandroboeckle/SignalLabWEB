// Lets several ChartCard instances stay zoomed/panned in sync on their
// shared x-axis (e.g. Analyse's "Signal & Ableitung" and "Integral"
// charts, which both plot against the same "Zeit [s]" domain) — matches
// the original desktop tool's "Synchroner Zoom" checkbox.
//
// Deliberately a plain module-level pub/sub, not a Pinia store: this is
// pure ephemeral UI wiring between chart instances, not application data.

const groups = new Map(); // groupName -> Set<callback>

export function subscribeZoomSync(group, callback) {
  if (!group) return () => {};
  if (!groups.has(group)) groups.set(group, new Set());
  groups.get(group).add(callback);
  return () => groups.get(group)?.delete(callback);
}

export function broadcastZoomSync(group, range, sourceId) {
  if (!group) return;
  const subs = groups.get(group);
  if (!subs) return;
  for (const cb of subs) cb(range, sourceId);
}

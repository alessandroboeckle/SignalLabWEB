// Lets several ChartCard instances share the same set of cursors — click
// a cursor onto one chart, it appears at the same x on every other chart
// in the same group too. Same plain module-level pub/sub pattern as
// useChartZoomSync.js, kept as a separate group namespace so cursor sync
// and zoom sync can be toggled independently.

const groups = new Map(); // groupName -> Set<callback>

export function subscribeCursorSync(group, callback) {
  if (!group) return () => {};
  if (!groups.has(group)) groups.set(group, new Set());
  groups.get(group).add(callback);
  return () => groups.get(group)?.delete(callback);
}

export function broadcastCursorSync(group, action, sourceId) {
  if (!group) return;
  const subs = groups.get(group);
  if (!subs) return;
  for (const cb of subs) cb(action, sourceId);
}

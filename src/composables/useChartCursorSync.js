// Lets several ChartCard instances share the same set of cursors — click
// a cursor onto one chart, it appears at the same x on every other chart
// in the same group too. Same plain module-level pub/sub pattern as
// useChartZoomSync.js, kept as a separate group namespace so cursor sync
// and zoom sync can be toggled independently.
//
// Besides relaying actions, each group now also REMEMBERS its current
// state (cursor mode on/off + the cursor list). Before, a chart that
// joined the group later — e.g. a new plot in "Gestapelt" after adding
// another signal — only heard about actions from then on, so it started
// with the cursor mode off and no cursors, and you had to switch the
// ruler off and on again to get them onto the new plot. A new subscriber
// now immediately receives a { type: "sync" } snapshot of that state.

const groups = new Map(); // groupName -> { subs: Set<callback>, state: { mode, cursors } }

function emptyState() {
  return { mode: false, cursors: [] };
}

function applyToState(state, action) {
  switch (action?.type) {
    case "mode":
      state.mode = !!action.active;
      state.cursors = [];
      break;
    case "add":
      state.cursors = [...state.cursors, { id: action.id, x: action.x, active: true }];
      break;
    case "toggle":
      state.cursors = state.cursors.map((c) => (c.id === action.id ? { ...c, active: action.active } : c));
      break;
    case "remove":
      state.cursors = state.cursors.filter((c) => c.id !== action.id);
      break;
    case "clear":
      state.cursors = [];
      break;
    default:
      break;
  }
}

export function getCursorSyncState(group) {
  const g = groups.get(group);
  return g ? { mode: g.state.mode, cursors: g.state.cursors.map((c) => ({ ...c })) } : emptyState();
}

export function subscribeCursorSync(group, callback) {
  if (!group) return () => {};
  if (!groups.has(group)) groups.set(group, { subs: new Set(), state: emptyState() });
  const g = groups.get(group);
  g.subs.add(callback);
  // Late joiner: hand over what the group already has.
  if (g.state.mode || g.state.cursors.length) {
    callback({ type: "sync", ...getCursorSyncState(group) }, null);
  }
  return () => {
    g.subs.delete(callback);
    // Last chart gone (page closed / sync switched off) — forget the
    // state, so re-enabling sync later doesn't resurrect stale cursors.
    if (g.subs.size === 0) groups.delete(group);
  };
}

export function broadcastCursorSync(group, action, sourceId) {
  if (!group) return;
  const g = groups.get(group);
  if (!g) return;
  applyToState(g.state, action);
  for (const cb of g.subs) cb(action, sourceId);
}

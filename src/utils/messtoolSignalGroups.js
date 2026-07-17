// Named, reusable signal-name groups — e.g. save "all 4 bogie temperature
// channels" once, then reselect that exact combination with one click
// instead of picking each signal individually every time.
//
// Groups store signal *names* (not indices), so a group created against
// one file still applies correctly to a different file with the same
// channel naming (matching the same idea as Vergleich's auto-select).
//
// Stored per-browser in localStorage.

const STORAGE_KEY = "sl_signal_groups";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(groups) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

// [{ name, signalNames: [...], createdAt }], newest first
export function listGroups() {
  return readAll().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function saveGroup(name, signalNames) {
  const trimmed = (name || "").trim();
  if (!trimmed) throw new Error("Bitte einen Namen für die Gruppe angeben.");
  if (!signalNames || signalNames.length === 0) {
    throw new Error("Die Gruppe braucht mindestens ein Signal.");
  }
  const groups = readAll().filter((g) => g.name !== trimmed);
  groups.push({ name: trimmed, signalNames: [...signalNames], createdAt: Date.now() });
  writeAll(groups);
  return groups;
}

export function deleteGroup(name) {
  const groups = readAll().filter((g) => g.name !== name);
  writeAll(groups);
  return groups;
}

// Given a group and a file's own signal list, returns the indices of the
// signals in *this* file that match the group's saved names — so a group
// still applies sensibly even if this file has a different channel order
// or is missing a few of the group's signals.
export function resolveGroupIndices(group, signals) {
  const wanted = new Set(group.signalNames);
  return signals.map((s, i) => (wanted.has(s.name) ? i : -1)).filter((i) => i !== -1);
}

// A small, localStorage-backed list of recently opened files — quick
// access on the Import page instead of hunting through the whole cloud
// file list every time. Newest first, capped at a handful of entries.

const STORAGE_KEY = "sl_recent_files";
const MAX_ENTRIES = 8;

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// [{ name, messfileId, storagePath, openedAt }], newest first
export function listRecentFiles() {
  return readAll();
}

export function addRecentFile({ name, messfileId, storagePath }) {
  if (!name) return listRecentFiles();
  const list = readAll().filter((f) => f.name !== name);
  list.unshift({ name, messfileId: messfileId || null, storagePath: storagePath || null, openedAt: Date.now() });
  const trimmed = list.slice(0, MAX_ENTRIES);
  writeAll(trimmed);
  return trimmed;
}

export function removeRecentFile(name) {
  const list = readAll().filter((f) => f.name !== name);
  writeAll(list);
  return list;
}

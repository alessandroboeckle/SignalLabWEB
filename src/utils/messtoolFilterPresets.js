// Presets for the Filter page. Unlike Verarbeitung's op-chain presets, a
// filter "preset" is just a flat settings object (characteristic, btype,
// order, cutoffs, stopband) — no live class instances involved, so this is
// simpler: no instantiation step needed, just save/restore the plain object.
//
// Stored per-browser in localStorage.

const STORAGE_KEY = "sl_filter_presets";

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

function writeAll(presets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

// [{ name, settings:{characteristic,btype,order,cutoff,cutoff2,stopbandDb}, createdAt }]
export function listPresets() {
  return readAll().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function savePreset(name, settings) {
  const trimmed = (name || "").trim();
  if (!trimmed) throw new Error("Bitte einen Namen für das Preset angeben.");
  const presets = readAll().filter((p) => p.name !== trimmed);
  presets.push({ name: trimmed, settings: { ...settings }, createdAt: Date.now() });
  writeAll(presets);
  return presets;
}

export function deletePreset(name) {
  const presets = readAll().filter((p) => p.name !== name);
  writeAll(presets);
  return presets;
}

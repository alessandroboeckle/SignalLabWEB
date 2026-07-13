// Presets for the Verarbeitung processing chain.
//
// A preset just stores the op IDs + their params (not live ProcessingOp
// instances, since those aren't JSON-serializable). Loading a preset looks
// up each ID in OP_REGISTRY and re-creates a fresh instance with the saved
// params, so it works even if defaults in OP_REGISTRY change later.
//
// Stored per-browser in localStorage; nothing here goes to Supabase, so
// presets don't sync across devices (yet).

const STORAGE_KEY = "sl_verarbeitung_presets";

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

// List all saved presets, newest first: [{ name, ops:[{id,params}], createdAt }]
export function listPresets() {
  return readAll().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

// Save (or overwrite) a preset by name. `ops` is the live array of
// ProcessingOp instances from the current chain.
export function savePreset(name, ops) {
  const trimmed = (name || "").trim();
  if (!trimmed) throw new Error("Bitte einen Namen für das Preset angeben.");
  const serialized = ops.map((o) => ({ id: o.id, params: { ...o.params } }));
  const presets = readAll().filter((p) => p.name !== trimmed);
  presets.push({ name: trimmed, ops: serialized, createdAt: Date.now() });
  writeAll(presets);
  return presets;
}

export function deletePreset(name) {
  const presets = readAll().filter((p) => p.name !== name);
  writeAll(presets);
  return presets;
}

// Reconstruct live op instances for a saved preset using OP_REGISTRY.
// Unknown op IDs (e.g. from an older/newer version) are skipped rather
// than throwing, so a partially-matching preset still loads what it can.
export function instantiatePreset(preset, registry) {
  const out = [];
  for (const saved of preset.ops) {
    const entry = registry.find((r) => r.id === saved.id);
    if (!entry) continue;
    out.push(entry.make(saved.params));
  }
  return out;
}

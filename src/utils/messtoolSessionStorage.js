// Cloud storage for Messtool sessions — named snapshots of a working state
// (file reference + Verarbeitung chain + Filter settings + selected
// signal), optionally shared with other approved users. Backed by the
// public.messtool_sessions table (see supabase/messtool_sessions.sql).

import { supabase } from "../lib/supabase";

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

// List sessions visible to the current user (their own + anything shared),
// newest first. RLS on the table already enforces the visibility rule —
// this just orders it for display.
export async function listSessions() {
  const { data, error } = await supabase
    .from("messtool_sessions")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// payload: { name, isShared, messfileId, messfileStoragePath, messfileName,
//            selectedSignalIdx, verarbeitungOps, filterSettings }
export async function createSession(payload) {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("messtool_sessions")
    .insert({
      name: payload.name,
      is_shared: !!payload.isShared,
      created_by: userId,
      messfile_id: payload.messfileId || null,
      messfile_storage_path: payload.messfileStoragePath || null,
      messfile_name: payload.messfileName || null,
      selected_signal_idx: payload.selectedSignalIdx || 0,
      verarbeitung_ops: payload.verarbeitungOps || [],
      filter_settings: payload.filterSettings || {},
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Partial update — pass only the camelCase fields that changed, same
// naming as createSession's payload.
export async function updateSession(id, payload) {
  const patch = {};
  if (payload.name !== undefined) patch.name = payload.name;
  if (payload.isShared !== undefined) patch.is_shared = !!payload.isShared;
  if (payload.selectedSignalIdx !== undefined) patch.selected_signal_idx = payload.selectedSignalIdx;
  if (payload.verarbeitungOps !== undefined) patch.verarbeitung_ops = payload.verarbeitungOps;
  if (payload.filterSettings !== undefined) patch.filter_settings = payload.filterSettings;

  const { data, error } = await supabase
    .from("messtool_sessions")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSession(id) {
  const { error } = await supabase.from("messtool_sessions").delete().eq("id", id);
  if (error) throw error;
}

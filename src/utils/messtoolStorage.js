// Cloud storage for measurement files.
// Raw CSV goes into the Supabase Storage bucket "messfiles";
// metadata goes into the public.messfiles table.

import { supabase } from "../lib/supabase";

const BUCKET = "messfiles";

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

// Upload a raw File plus its parsed meta. Returns the new messfiles row.
export async function uploadMessfile(file, meta) {
  const userId = await currentUserId();

  // unique storage path: <userId>/<timestamp>_<name>
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${userId || "anon"}/${Date.now()}_${safeName}`;

  // 1. upload the raw file to the bucket
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: "text/csv" });
  if (upErr) throw upErr;

  // 2. insert the metadata row
  const { data, error: insErr } = await supabase
    .from("messfiles")
    .insert({
      name: file.name,
      storage_path: path,
      size_bytes: file.size,
      signal_count: meta.signalCount,
      row_count: meta.rowCount,
      duration_s: meta.duration,
      uploaded_by: userId,
    })
    .select()
    .single();
  if (insErr) {
    // roll back the uploaded file if the row failed
    await supabase.storage.from(BUCKET).remove([path]);
    throw insErr;
  }
  return data;
}

// List all uploaded measurement files (shared, newest first).
export async function listMessfiles() {
  const { data, error } = await supabase
    .from("messfiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Download the raw file content of a messfile row. Returns an ArrayBuffer.
export async function downloadMessfile(storagePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);
  if (error) throw error;
  return await data.arrayBuffer();
}

// Delete a messfile: storage object + metadata row.
export async function deleteMessfile(row) {
  const { error: sErr } = await supabase.storage
    .from(BUCKET)
    .remove([row.storage_path]);
  if (sErr) throw sErr;

  const { error: dErr } = await supabase
    .from("messfiles")
    .delete()
    .eq("id", row.id);
  if (dErr) throw dErr;
}

-- Adds Vergleich (comparison) support to messtool_sessions: a session can
-- now optionally carry a list of files+signals+offsets from the Vergleich
-- page too, alongside (or instead of) the single-file working state it
-- already supported. Run this once, after messtool_sessions.sql.

alter table public.messtool_sessions
  add column if not exists compare_files jsonb not null default '[]'::jsonb;
  -- each entry: { name, messfileId, messfileStoragePath, selectedIndices, offsetSec }

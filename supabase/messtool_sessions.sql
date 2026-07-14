-- Messtool Sessions: a named, saveable snapshot of your working state
-- (which cloud file, the Verarbeitung chain, Filter settings, selected
-- signal) so you can pick up exactly where you left off — on any device,
-- and optionally shared with other approved users.
--
-- Run this once in the Supabase SQL editor. Assumes the existing
-- is_approved() function and messfiles table (from the earlier Messtool
-- setup) are already in place.

create table if not exists public.messtool_sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_shared boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,

  -- Denormalized file reference: both the FK (for convenience / joins) and
  -- the raw storage_path + name, so a session still knows which file it
  -- meant even if that messfiles row is later deleted.
  messfile_id uuid references public.messfiles(id) on delete set null,
  messfile_storage_path text,
  messfile_name text,

  selected_signal_idx integer not null default 0,
  verarbeitung_ops jsonb not null default '[]'::jsonb,   -- [{id, params}, ...]
  filter_settings jsonb not null default '{}'::jsonb,    -- {characteristic, btype, order, cutoff, cutoff2, stopbandDb}

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.messtool_sessions enable row level security;

-- Everyone approved can see their own sessions, plus anything marked shared.
create policy "messtool_sessions_select"
  on public.messtool_sessions for select
  using (is_approved() and (is_shared or created_by = auth.uid()));

create policy "messtool_sessions_insert"
  on public.messtool_sessions for insert
  with check (is_approved() and created_by = auth.uid());

-- Only the owner can rename/update or delete/unshare a session, even if
-- it's currently shared with everyone else.
create policy "messtool_sessions_update"
  on public.messtool_sessions for update
  using (is_approved() and created_by = auth.uid());

create policy "messtool_sessions_delete"
  on public.messtool_sessions for delete
  using (is_approved() and created_by = auth.uid());

-- Keep updated_at current on every edit.
create or replace function public.messtool_sessions_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists messtool_sessions_touch on public.messtool_sessions;
create trigger messtool_sessions_touch
  before update on public.messtool_sessions
  for each row execute function public.messtool_sessions_set_updated_at();

-- Base schema for Signal Lab: auth/profiles, admin, storage quota, the
-- Generator tool's sessions/signals, and the Messtool's file library
-- (messfiles/messfile_folders) plus app-wide settings.
--
-- This existed only in the live Supabase project (built up by hand over
-- time) and had drifted from what was checked in — this file reconstructs
-- it from the live schema as of 2026-08-31 so a fresh project can be
-- bootstrapped from the repo alone. Run this FIRST, before
-- messtool_sessions.sql / messtool_sessions_compare.sql.

-- ==================== profiles ====================
-- One row per auth user. New signups start unapproved (approved = false)
-- and locked out of writes until an admin flips it.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  approved boolean default false,
  is_admin boolean default false,
  created_at timestamptz default now(),
  last_seen_at timestamptz
);

alter table public.profiles enable row level security;

create policy "own profile read"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can update their own last_seen_at"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "admin read all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "admin update profiles"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- Auto-create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==================== helper functions ====================
-- Referenced by RLS policies across every other table below.

create or replace function public.is_approved()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and approved = true
  );
$$ language sql security definer stable;

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$ language sql security definer stable;

-- Admin-only RPCs used by the in-app Admin page.
create or replace function public.admin_list_users()
returns table (
  id uuid, email text, display_name text, approved boolean,
  is_admin boolean, created_at timestamptz, last_seen_at timestamptz
) as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
    select p.id, p.email, p.display_name, p.approved, p.is_admin, p.created_at, p.last_seen_at
    from public.profiles p
    order by p.approved asc, p.created_at desc;
end;
$$ language plpgsql security definer;

create or replace function public.admin_set_admin(target_user_id uuid, make_admin boolean)
returns void as $$
begin
  -- Only an existing admin may call this at all (RLS on profiles would
  -- otherwise block a non-admin from updating someone else's row anyway,
  -- but this makes the requirement explicit and gives a clear error).
  if not is_admin() then
    raise exception 'Nur Admins dürfen Admin-Rechte vergeben oder entziehen.';
  end if;

  -- Guard against an admin locking themselves out by demoting their own
  -- account (e.g. accidental click, or the only remaining admin).
  if target_user_id = auth.uid() and make_admin = false then
    raise exception 'Du kannst dir nicht selbst die Admin-Rechte entziehen.';
  end if;

  update public.profiles
  set is_admin = make_admin
  where id = target_user_id;
end;
$$ language plpgsql security definer;

-- ==================== app_settings ====================
-- App-wide key/value config, readable by any logged-in (not necessarily
-- approved) user, writable only by admins.
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.app_settings enable row level security;

create policy "Anyone can read app settings"
  on public.app_settings for select
  using (auth.uid() is not null);

create policy "Only admins can write app settings"
  on public.app_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- ==================== Generator tool: sessions / signals ====================
-- The signal-generator side of the app (separate from the Messtool below).

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.sessions enable row level security;

create policy "sessions_select"
  on public.sessions for select
  using (public.is_approved() and (created_by = auth.uid() or created_by is null or public.is_admin()));

create policy "sessions_insert"
  on public.sessions for insert
  with check (public.is_approved() and (created_by = auth.uid() or created_by is null));

create policy "sessions_update"
  on public.sessions for update
  using (public.is_approved() and (created_by = auth.uid() or public.is_admin()));

create policy "sessions_delete"
  on public.sessions for delete
  using (public.is_approved() and (created_by = auth.uid() or public.is_admin()));

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name text not null,
  wave_type text,
  frequency double precision,
  amplitude double precision,
  phase double precision,
  duration double precision,
  sampling_rate double precision,
  time_data jsonb,
  amplitude_data jsonb,
  meta jsonb,
  created_by uuid,
  created_at timestamptz default now()
);

alter table public.signals enable row level security;

create policy "signals_select"
  on public.signals for select
  using (public.is_approved() and (created_by = auth.uid() or created_by is null or public.is_admin()));

create policy "signals_insert"
  on public.signals for insert
  with check (public.is_approved() and (created_by = auth.uid() or created_by is null));

create policy "signals_update"
  on public.signals for update
  using (public.is_approved() and (created_by = auth.uid() or public.is_admin()));

create policy "signals_delete"
  on public.signals for delete
  using (public.is_approved() and (created_by = auth.uid() or public.is_admin()));

-- ==================== Messtool: folders / files ====================

create table if not exists public.messfile_folders (
  name text not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

alter table public.messfile_folders enable row level security;

create policy "messfile_folders_select"
  on public.messfile_folders for select
  using (public.is_approved() and (created_by = auth.uid() or created_by is null or public.is_admin()));

create policy "messfile_folders_insert"
  on public.messfile_folders for insert
  with check (public.is_approved() and (created_by = auth.uid() or created_by is null));

create policy "messfile_folders_delete"
  on public.messfile_folders for delete
  using (public.is_approved() and (created_by = auth.uid() or public.is_admin()));

create table if not exists public.messfiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  storage_path text not null,
  size_bytes bigint,
  signal_count integer,
  row_count integer,
  duration_s double precision,
  uploaded_by uuid,
  created_at timestamptz default now(),
  folder text
);

alter table public.messfiles enable row level security;

create policy "messfiles_select"
  on public.messfiles for select
  using (public.is_approved() and (uploaded_by = auth.uid() or uploaded_by is null or public.is_admin()));

create policy "messfiles_insert"
  on public.messfiles for insert
  with check (public.is_approved() and (uploaded_by = auth.uid() or uploaded_by is null));

create policy "messfiles_update"
  on public.messfiles for update
  using (public.is_approved() and (uploaded_by = auth.uid() or public.is_admin()));

create policy "messfiles_delete"
  on public.messfiles for delete
  using (public.is_approved() and (uploaded_by = auth.uid() or public.is_admin()));

-- Per-user storage quota: 30MB for regular users, 100MB for admins.
-- Enforced on insert against the sum of that user's existing messfiles.
create or replace function public.check_messfile_quota()
returns trigger as $$
declare
  used_bytes bigint;
  quota_bytes bigint;
begin
  quota_bytes := case when is_admin() then 100 * 1024 * 1024 else 30 * 1024 * 1024 end;

  select coalesce(sum(size_bytes), 0) into used_bytes
  from public.messfiles
  where uploaded_by = new.uploaded_by;

  if used_bytes + new.size_bytes > quota_bytes then
    raise exception 'Speicherlimit von % MB erreicht (aktuell % MB belegt).',
      round(quota_bytes / 1024.0 / 1024.0, 0), round(used_bytes / 1024.0 / 1024.0, 1);
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists messfiles_check_quota on public.messfiles;
create trigger messfiles_check_quota
  before insert on public.messfiles
  for each row execute function public.check_messfile_quota();

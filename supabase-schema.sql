-- HOKSH / Supabase schema for isolated per-user data
-- Run this in Supabase SQL Editor after creating the project.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.user_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  storage_path text,
  mime_type text,
  file_size bigint,
  last_page integer not null default 1,
  last_opened_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.user_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_id uuid references public.user_files(id) on delete cascade,
  page_number integer not null default 1,
  annotation_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.user_files enable row level security;
alter table public.user_annotations enable row level security;
drop policy if exists "profile owner can read" on public.profiles;
create policy "profile owner can read" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profile owner can insert" on public.profiles;
create policy "profile owner can insert" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profile owner can update" on public.profiles;
create policy "profile owner can update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "owner manages own files" on public.user_files;
create policy "owner manages own files" on public.user_files for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "owner manages own annotations" on public.user_annotations;
create policy "owner manages own annotations" on public.user_annotations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists user_files_owner_recent_idx on public.user_files(user_id, last_opened_at desc);
create index if not exists user_annotations_file_idx on public.user_annotations(user_id, file_id);
-- Storage setup: create a PRIVATE bucket named "hoksh-files" in Supabase Storage.
-- Each object path must start with the authenticated user's UUID, e.g. <user-id>/<file-name>.
drop policy if exists "users read own HOKSH objects" on storage.objects;
create policy "users read own HOKSH objects" on storage.objects for select to authenticated using (bucket_id = 'hoksh-files' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "users upload own HOKSH objects" on storage.objects;
create policy "users upload own HOKSH objects" on storage.objects for insert to authenticated with check (bucket_id = 'hoksh-files' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "users update own HOKSH objects" on storage.objects;
create policy "users update own HOKSH objects" on storage.objects for update to authenticated using (bucket_id = 'hoksh-files' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'hoksh-files' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "users delete own HOKSH objects" on storage.objects;
create policy "users delete own HOKSH objects" on storage.objects for delete to authenticated using (bucket_id = 'hoksh-files' and (storage.foldername(name))[1] = auth.uid()::text);

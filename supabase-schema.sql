-- HOKSH production-oriented Supabase schema
-- Run in Supabase SQL Editor AFTER creating a project. Uses RLS; never put service_role keys in the website.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'user' check (role in ('user','admin','owner')),
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists is_suspended boolean not null default false;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
do $ begin
  if not exists (select 1 from pg_constraint where conname='profiles_role_check' and conrelid='public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_role_check check (role in ('user','admin','owner'));
  end if;
end $;

create table if not exists public.user_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text not null default 'application/octet-stream',
  file_size bigint not null default 0,
  last_page integer not null default 1,
  last_opened_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, storage_path)
);
create table if not exists public.user_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_id uuid not null references public.user_files(id) on delete cascade,
  page_number integer not null default 1,
  annotation_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(file_id,page_number)
);
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open' check(status in ('open','in_progress','closed')),
  admin_reply text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.hoksh_is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','owner') and not p.is_suspended); $$;
create or replace function public.hoksh_is_owner()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='owner' and not p.is_suspended); $$;

create or replace function public.hoksh_new_profile()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name',''))
  on conflict(id) do nothing;
  return new;
end; $$;
drop trigger if exists hoksh_auth_user_profile on auth.users;
create trigger hoksh_auth_user_profile after insert on auth.users for each row execute procedure public.hoksh_new_profile();

alter table public.profiles enable row level security;
alter table public.user_files enable row level security;
alter table public.user_annotations enable row level security;
alter table public.support_tickets enable row level security;
alter table public.app_settings enable row level security;
alter table public.admin_audit_log enable row level security;

drop policy if exists "profiles own or admin read" on public.profiles;
create policy "profiles own or admin read" on public.profiles for select to authenticated using (id=auth.uid() or public.hoksh_is_admin());
-- No direct client-side INSERT/UPDATE policy on profiles: users must not be able to grant themselves roles.
drop policy if exists "file owner or admin access" on public.user_files;
create policy "file owner or admin access" on public.user_files for all to authenticated
using ((user_id=auth.uid() and not exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_suspended)) or public.hoksh_is_admin())
with check ((user_id=auth.uid() and not exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_suspended)) or public.hoksh_is_admin());
drop policy if exists "annotation owner or admin access" on public.user_annotations;
create policy "annotation owner or admin access" on public.user_annotations for all to authenticated
using ((user_id=auth.uid() and not exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_suspended)) or public.hoksh_is_admin())
with check ((user_id=auth.uid() and not exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_suspended)) or public.hoksh_is_admin());
drop policy if exists "ticket owner read create" on public.support_tickets;
create policy "ticket owner read create" on public.support_tickets for select to authenticated using (user_id=auth.uid() or public.hoksh_is_admin());
drop policy if exists "ticket owner create" on public.support_tickets;
create policy "ticket owner create" on public.support_tickets for insert to authenticated with check (user_id=auth.uid() and not public.hoksh_is_admin());
drop policy if exists "ticket admin update" on public.support_tickets;
create policy "ticket admin update" on public.support_tickets for update to authenticated using (public.hoksh_is_admin()) with check (public.hoksh_is_admin());
drop policy if exists "settings authenticated read" on public.app_settings;
create policy "settings authenticated read" on public.app_settings for select to authenticated using (true);
drop policy if exists "settings admin write" on public.app_settings;
create policy "settings admin write" on public.app_settings for all to authenticated using (public.hoksh_is_admin()) with check (public.hoksh_is_admin());
drop policy if exists "audit admin read" on public.admin_audit_log;
create policy "audit admin read" on public.admin_audit_log for select to authenticated using (public.hoksh_is_admin());

create or replace function public.hoksh_admin_list_users()
returns table(id uuid,email text,display_name text,role text,is_suspended boolean,created_at timestamptz)
language plpgsql security definer set search_path=public
as $
begin
  if not public.hoksh_is_admin() then raise exception 'Admin permission required'; end if;
  return query select u.id,u.email,coalesce(p.display_name,''),p.role,p.is_suspended,u.created_at
    from auth.users u join public.profiles p on p.id=u.id order by u.created_at desc limit 500;
end; $;

create or replace function public.hoksh_admin_set_role(target_user_id uuid, new_role text)
returns void language plpgsql security definer set search_path=public
as $$
begin
  if not public.hoksh_is_owner() then raise exception 'Only the HOKSH owner can change roles'; end if;
  if new_role not in ('user','admin') then raise exception 'Invalid role'; end if;
  if target_user_id=auth.uid() then raise exception 'Owner cannot change their own role'; end if;
  update public.profiles set role=new_role,updated_at=now() where id=target_user_id;
  if not found then raise exception 'User profile not found'; end if;
  insert into public.admin_audit_log(actor_id,action,target_user_id,details) values(auth.uid(),'set_role',target_user_id,jsonb_build_object('role',new_role));
end; $$;
create or replace function public.hoksh_admin_set_suspended(target_user_id uuid, suspended boolean)
returns void language plpgsql security definer set search_path=public
as $$
begin
  if not public.hoksh_is_admin() then raise exception 'Admin permission required'; end if;
  if target_user_id=auth.uid() then raise exception 'You cannot suspend your own account'; end if;
  update public.profiles set is_suspended=suspended,updated_at=now() where id=target_user_id and role<>'owner';
  if not found then raise exception 'User not found or cannot be suspended'; end if;
  insert into public.admin_audit_log(actor_id,action,target_user_id,details) values(auth.uid(),case when suspended then 'suspend_user' else 'reactivate_user' end,target_user_id,'{}'::jsonb);
end; $$;
create or replace function public.hoksh_admin_update_ticket(ticket_id uuid, new_status text, reply_text text)
returns void language plpgsql security definer set search_path=public
as $$
begin
  if not public.hoksh_is_admin() then raise exception 'Admin permission required'; end if;
  if new_status not in ('open','in_progress','closed') then raise exception 'Invalid ticket status'; end if;
  update public.support_tickets set status=new_status,admin_reply=coalesce(reply_text,''),updated_at=now() where id=ticket_id;
  insert into public.admin_audit_log(actor_id,action,details) values(auth.uid(),'update_support_ticket',jsonb_build_object('ticket_id',ticket_id,'status',new_status));
end; $$;

grant execute on function public.hoksh_is_admin() to authenticated;
grant execute on function public.hoksh_is_owner() to authenticated;
revoke all on function public.hoksh_admin_list_users() from public, anon;\ngrant execute on function public.hoksh_admin_list_users() to authenticated;
revoke all on function public.hoksh_admin_set_role(uuid,text) from public, anon;\ngrant execute on function public.hoksh_admin_set_role(uuid,text) to authenticated;
revoke all on function public.hoksh_admin_set_suspended(uuid,boolean) from public, anon;\ngrant execute on function public.hoksh_admin_set_suspended(uuid,boolean) to authenticated;
revoke all on function public.hoksh_admin_update_ticket(uuid,text,text) from public, anon;\ngrant execute on function public.hoksh_admin_update_ticket(uuid,text,text) to authenticated;

create index if not exists hoksh_user_files_owner_recent_idx on public.user_files(user_id,last_opened_at desc);
create index if not exists hoksh_annotations_file_idx on public.user_annotations(file_id,page_number);
create index if not exists hoksh_support_status_idx on public.support_tickets(status,created_at desc);
create index if not exists hoksh_audit_recent_idx on public.admin_audit_log(created_at desc);

-- Create/ensure a PRIVATE bucket for PDFs and whiteboards.
insert into storage.buckets(id,name,public) values('hoksh-files','hoksh-files',false) on conflict(id) do update set public=false;
drop policy if exists "hoksh objects owner or admin read" on storage.objects;
create policy "hoksh objects owner or admin read" on storage.objects for select to authenticated
using (bucket_id='hoksh-files' and (((storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_suspended)) or public.hoksh_is_admin()));
drop policy if exists "hoksh objects owner upload" on storage.objects;
create policy "hoksh objects owner upload" on storage.objects for insert to authenticated
with check (bucket_id='hoksh-files' and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_suspended));
drop policy if exists "hoksh objects owner or admin update" on storage.objects;
create policy "hoksh objects owner or admin update" on storage.objects for update to authenticated
using (bucket_id='hoksh-files' and (((storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_suspended)) or public.hoksh_is_admin()))
with check (bucket_id='hoksh-files' and (((storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_suspended)) or public.hoksh_is_admin()));
drop policy if exists "hoksh objects owner or admin delete" on storage.objects;
create policy "hoksh objects owner or admin delete" on storage.objects for delete to authenticated
using (bucket_id='hoksh-files' and (((storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_suspended)) or public.hoksh_is_admin()));

-- After creating your first account and confirming its email, run a one-time owner bootstrap
-- in SQL Editor, replacing the email with the exact email you registered:
-- update public.profiles p set role='owner' from auth.users u where p.id=u.id and lower(u.email)=lower('YOUR_EMAIL_HERE');

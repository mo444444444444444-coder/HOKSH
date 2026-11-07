-- HOKSH cloud accounts, platform administrators, and tenant isolation.
-- Run this file in Supabase SQL Editor as project owner.

create table if not exists public.hoksh_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  is_suspended boolean not null default false
);

create table if not exists public.hoksh_platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.hoksh_business_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint hoksh_business_data_object check (jsonb_typeof(data) = 'object')
);

alter table public.hoksh_accounts enable row level security;
alter table public.hoksh_platform_admins enable row level security;
alter table public.hoksh_business_data enable row level security;

-- No client may add itself to the platform-admin list.
revoke all on public.hoksh_platform_admins from anon, authenticated;
revoke all on public.hoksh_accounts from anon;
revoke all on public.hoksh_business_data from anon;
grant select, update on public.hoksh_accounts to authenticated;
grant select, insert, update, delete on public.hoksh_business_data to authenticated;

create or replace function public.hoksh_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.hoksh_platform_admins a
    where a.user_id = auth.uid()
  );
$$;
revoke all on function public.hoksh_is_platform_admin() from public;
grant execute on function public.hoksh_is_platform_admin() to authenticated;

create or replace function public.hoksh_is_account_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.hoksh_accounts a
    where a.user_id = auth.uid() and a.is_suspended = false
  );
$$;
revoke all on function public.hoksh_is_account_active() from public;
grant execute on function public.hoksh_is_account_active() to authenticated;

-- Create/update a public account directory row for every email or Google signup.
create or replace function public.hoksh_sync_auth_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.hoksh_accounts(user_id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (user_id) do update
    set email = excluded.email,
        full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists hoksh_auth_account_sync on auth.users;
create trigger hoksh_auth_account_sync
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.hoksh_sync_auth_account();

-- Backfill users who registered before this schema was installed.
insert into public.hoksh_accounts(user_id, email, full_name)
select id, email,
       coalesce(raw_user_meta_data ->> 'full_name',
                raw_user_meta_data ->> 'name',
                split_part(coalesce(email, ''), '@', 1))
from auth.users
on conflict (user_id) do update
  set email = excluded.email,
      full_name = excluded.full_name;

-- Account directory: users can see their own profile; platform admins can see all.
drop policy if exists "Users read own HOKSH account or admins read all" on public.hoksh_accounts;
create policy "Users read own HOKSH account or admins read all"
on public.hoksh_accounts for select to authenticated
using (auth.uid() = user_id or public.hoksh_is_platform_admin());

drop policy if exists "Only platform admins update HOKSH accounts" on public.hoksh_accounts;
create policy "Only platform admins update HOKSH accounts"
on public.hoksh_accounts for update to authenticated
using (public.hoksh_is_platform_admin())
with check (public.hoksh_is_platform_admin());

-- Platform admin membership is private and can only be changed in the SQL editor
-- by the Supabase project owner (never by a normal signed-in client).

-- Each user can access only their own business record, and suspended accounts
-- cannot read or write their business data.
drop policy if exists "Users can read only their HOKSH data" on public.hoksh_business_data;
create policy "Users can read only their HOKSH data"
on public.hoksh_business_data for select to authenticated
using (auth.uid() = user_id and public.hoksh_is_account_active());

drop policy if exists "Users can create only their HOKSH data" on public.hoksh_business_data;
create policy "Users can create only their HOKSH data"
on public.hoksh_business_data for insert to authenticated
with check (auth.uid() = user_id and public.hoksh_is_account_active());

drop policy if exists "Users can update only their HOKSH data" on public.hoksh_business_data;
create policy "Users can update only their HOKSH data"
on public.hoksh_business_data for update to authenticated
using (auth.uid() = user_id and public.hoksh_is_account_active())
with check (auth.uid() = user_id and public.hoksh_is_account_active());

drop policy if exists "Users can delete only their HOKSH data" on public.hoksh_business_data;
create policy "Users can delete only their HOKSH data"
on public.hoksh_business_data for delete to authenticated
using (auth.uid() = user_id and public.hoksh_is_account_active());

create index if not exists hoksh_business_data_updated_at_idx
on public.hoksh_business_data (updated_at desc);

-- IMPORTANT: after you create your own HOKSH account, replace the email below
-- with the exact email address you registered with, then run this statement
-- separately in SQL Editor to make ONLY that account the platform admin:
--
-- insert into public.hoksh_platform_admins(user_id)
-- select id from auth.users where lower(email) = lower('YOUR-ADMIN-EMAIL@example.com')
-- on conflict (user_id) do nothing;

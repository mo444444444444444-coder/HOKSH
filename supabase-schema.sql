-- HOKSH cloud account data: one isolated business record per Supabase Auth user.
create table if not exists public.hoksh_business_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint hoksh_business_data_object check (jsonb_typeof(data) = 'object')
);

alter table public.hoksh_business_data enable row level security;

revoke all on public.hoksh_business_data from anon;
grant select, insert, update, delete on public.hoksh_business_data to authenticated;

drop policy if exists "Users can read only their HOKSH data" on public.hoksh_business_data;
create policy "Users can read only their HOKSH data"
on public.hoksh_business_data for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create only their HOKSH data" on public.hoksh_business_data;
create policy "Users can create only their HOKSH data"
on public.hoksh_business_data for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update only their HOKSH data" on public.hoksh_business_data;
create policy "Users can update only their HOKSH data"
on public.hoksh_business_data for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete only their HOKSH data" on public.hoksh_business_data;
create policy "Users can delete only their HOKSH data"
on public.hoksh_business_data for delete to authenticated
using (auth.uid() = user_id);

create index if not exists hoksh_business_data_updated_at_idx
on public.hoksh_business_data (updated_at desc);
